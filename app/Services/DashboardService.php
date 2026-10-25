<?php

namespace App\Services;

use App\Models\AccountTransaction;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Expense;
use App\Models\Payroll;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SaleReturn;
use App\Models\SaleReturnItem;
use App\Models\ShopRole;
use App\Models\Store;
use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use App\Models\SubscriptionPayment;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class DashboardService
{
    /**
     * Gross profit is net sales excluding tax, minus the cost captured on each sold unit.
     * Purchases are not subtracted again. Expenses and salaries are deducted only in net profit.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function shop(int $storeId, Carbon $from, Carbon $to, array $filters = []): array
    {
        $salesQuery = Sale::withoutGlobalScopes()
            ->where('store_id', $storeId)
            ->where('status', 'completed')
            ->whereBetween('sold_at', [$from, $to]);

        $this->applySaleFilters($salesQuery, $filters);

        $sales = $salesQuery->with(['customer', 'user.shopRole'])->latest('sold_at')->get();
        $saleIds = $sales->pluck('id');
        $items = SaleItem::whereIn('sale_id', $saleIds)->with('product.category')->get();

        $returnsQuery = SaleReturn::withoutGlobalScopes()
            ->where('store_id', $storeId)
            ->whereBetween('returned_on', [$from->toDateString(), $to->toDateString()]);

        if (! empty($filters['staff_id']) || ! empty($filters['user_id'])) {
            $staffId = (int) ($filters['staff_id'] ?? $filters['user_id']);
            $returnsQuery->whereHas('sale', fn ($q) => $q->where('user_id', $staffId));
        }

        $returns = $returnsQuery->get();
        $returnItems = SaleReturnItem::whereIn('sale_return_id', $returns->pluck('id'))->get();

        $salesTotal = (int) $sales->sum('grand_cents');
        $salesTax = (int) $sales->sum('tax_cents');
        $returnTotal = (int) $returns->sum('grand_cents');
        $returnTax = (int) $returns->sum('tax_cents');
        $cogs = (int) $items->sum(fn ($item) => $item->cost_cents * $item->qty)
            - (int) $returnItems->sum(fn ($item) => $item->cost_cents * $item->qty);
        $netRevenueExTax = ($salesTotal - $salesTax) - ($returnTotal - $returnTax);
        $gross = $netRevenueExTax - $cogs;

        $purchasesQuery = Purchase::withoutGlobalScopes()
            ->where('store_id', $storeId)
            ->where('status', 'received')
            ->whereBetween('purchased_on', [$from->toDateString(), $to->toDateString()]);

        if (! empty($filters['warehouse_id'])) {
            $purchasesQuery->where('warehouse_id', (int) $filters['warehouse_id']);
        }

        $purchases = $purchasesQuery->get();
        $purchaseTotal = (int) $purchases->sum('grand_cents');
        $purchaseDue = (int) $purchases->sum(fn ($purchase) => max(0, $purchase->grand_cents - $purchase->paid_cents));

        $expense = (int) Expense::withoutGlobalScopes()
            ->where('store_id', $storeId)
            ->whereBetween('spent_on', [$from->toDateString(), $to->toDateString()])
            ->sum('amount_cents');
        $salary = (int) Payroll::withoutGlobalScopes()
            ->where('store_id', $storeId)
            ->whereBetween('paid_on', [$from->toDateString(), $to->toDateString()])
            ->sum('amount_cents');

        $staffList = User::where('store_id', $storeId)
            ->with('shopRole')
            ->orderBy('name')
            ->get();

        $staffPerformance = $this->calculateStaffPerformance($storeId, $from, $to, $staffList);

        $selectedStaffSummary = null;
        $selectedStaffId = (int) ($filters['staff_id'] ?? $filters['user_id'] ?? 0);
        if ($selectedStaffId > 0) {
            $staffUser = $staffList->firstWhere('id', $selectedStaffId);
            if ($staffUser) {
                $perf = $staffPerformance->firstWhere('id', $selectedStaffId);
                $selectedStaffSummary = [
                    'user' => [
                        'id' => $staffUser->id,
                        'name' => $staffUser->name,
                        'email' => $staffUser->email,
                        'phone' => $staffUser->phone,
                        'role_title' => $staffUser->roleTitle(),
                        'role' => $staffUser->role,
                        'last_login_at' => $staffUser->last_login_at?->format('d M Y, h:i A'),
                        'is_active' => (bool) $staffUser->is_active,
                    ],
                    'tx_count' => $perf['tx_count'] ?? 0,
                    'total_sales_cents' => $perf['total_sales_cents'] ?? 0,
                    'sold_products_qty' => (int) $items->sum('qty'),
                    'returns_count' => $perf['returns_count'] ?? 0,
                    'returns_cents' => $perf['returns_cents'] ?? 0,
                    'discount_cents' => $perf['discount_cents'] ?? 0,
                    'avg_ticket_cents' => $perf['avg_ticket_cents'] ?? 0,
                ];
            }
        }

        return [
            'total_sales' => $salesTotal,
            'sales_return' => $returnTotal,
            'purchase' => $purchaseTotal,
            'purchase_due' => $purchaseDue,
            'expense' => $expense,
            'salary' => $salary,
            'gross_profit' => $gross,
            'net_profit' => $gross - $expense - $salary,
            'sales' => $sales,
            'purchases' => $purchases,
            'top_products' => $this->topProducts($items, $returnItems),
            'categories' => $this->categories($items),
            'chart' => $this->flow($storeId, $from, $to, $filters),
            'cashflow' => $this->cashflow($storeId, $from, $to),
            'staff_performance' => $staffPerformance->values(),
            'selected_staff_summary' => $selectedStaffSummary,
            'filter_lookups' => [
                'staff' => $staffList->map(fn (User $u) => [
                    'id' => $u->id,
                    'name' => $u->name,
                    'email' => $u->email,
                    'role_title' => $u->roleTitle(),
                    'role_id' => $u->role_id,
                ])->values(),
                'roles' => ShopRole::where('store_id', $storeId)->get(['id', 'name']),
                'warehouses' => Warehouse::where('store_id', $storeId)->get(['id', 'name']),
                'categories' => Category::where('store_id', $storeId)->orderBy('name')->get(['id', 'name']),
                'customers' => Customer::where('store_id', $storeId)->orderBy('name')->limit(100)->get(['id', 'name', 'phone']),
                'payment_methods' => ['cash', 'card', 'bank', 'bkash', 'nagad', 'rocket', 'other'],
            ],
        ];
    }

    private function applySaleFilters(Builder $query, array $filters): void
    {
        if (! empty($filters['staff_id']) || ! empty($filters['user_id'])) {
            $query->where('user_id', (int) ($filters['staff_id'] ?? $filters['user_id']));
        }

        if (! empty($filters['role_id'])) {
            $roleId = (int) $filters['role_id'];
            $query->whereHas('user', fn ($q) => $q->where('role_id', $roleId));
        }

        if (! empty($filters['warehouse_id'])) {
            $query->where('warehouse_id', (int) $filters['warehouse_id']);
        }

        if (! empty($filters['customer_id'])) {
            $query->where('customer_id', (int) $filters['customer_id']);
        }

        if (! empty($filters['payment_method'])) {
            $query->where('payment_method', strtolower((string) $filters['payment_method']));
        }

        if (! empty($filters['payment_status'])) {
            $status = strtolower((string) $filters['payment_status']);
            if ($status === 'paid') {
                $query->whereRaw('paid_cents >= grand_cents');
            } elseif ($status === 'partial') {
                $query->whereRaw('paid_cents > 0 AND paid_cents < grand_cents');
            } elseif ($status === 'due') {
                $query->whereRaw('paid_cents = 0');
            }
        }

        if (! empty($filters['product_id'])) {
            $productId = (int) $filters['product_id'];
            $query->whereHas('items', fn ($q) => $q->where('product_id', $productId));
        }

        if (! empty($filters['category_id'])) {
            $categoryId = (int) $filters['category_id'];
            $query->whereHas('items.product', fn ($q) => $q->where('category_id', $categoryId));
        }
    }

    private function calculateStaffPerformance(int $storeId, Carbon $from, Carbon $to, Collection $staffList): Collection
    {
        $salesSummary = Sale::withoutGlobalScopes()
            ->where('store_id', $storeId)
            ->where('status', 'completed')
            ->whereBetween('sold_at', [$from, $to])
            ->selectRaw('user_id, count(*) as tx_count, coalesce(sum(grand_cents), 0) as total_cents, coalesce(sum(discount_cents + coupon_cents), 0) as discount_cents')
            ->groupBy('user_id')
            ->get()
            ->keyBy('user_id');

        $returns = SaleReturn::withoutGlobalScopes()
            ->where('store_id', $storeId)
            ->whereBetween('returned_on', [$from->toDateString(), $to->toDateString()])
            ->with('sale:id,user_id')
            ->get()
            ->groupBy(fn ($ret) => $ret->sale->user_id ?? 0);

        return $staffList->map(function (User $user) use ($salesSummary, $returns) {
            $saleData = $salesSummary->get($user->id);
            $txCount = (int) ($saleData->tx_count ?? 0);
            $totalCents = (int) ($saleData->total_cents ?? 0);
            $discountCents = (int) ($saleData->discount_cents ?? 0);

            $userReturns = $returns->get($user->id) ?? collect();
            $returnsCount = $userReturns->count();
            $returnsCents = (int) $userReturns->sum('grand_cents');
            $avgTicket = $txCount > 0 ? (int) round($totalCents / $txCount) : 0;

            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role_title' => $user->roleTitle(),
                'role' => $user->role,
                'role_id' => $user->role_id,
                'is_active' => (bool) $user->is_active,
                'tx_count' => $txCount,
                'total_sales_cents' => $totalCents,
                'returns_count' => $returnsCount,
                'returns_cents' => $returnsCents,
                'discount_cents' => $discountCents,
                'avg_ticket_cents' => $avgTicket,
            ];
        })->sortByDesc('total_sales_cents')->values();
    }

    public function platform(Carbon $from, Carbon $to): array
    {
        $approvedPaymentsCents = (int) SubscriptionPayment::where('status', 'approved')
            ->whereBetween('created_at', [$from, $to])
            ->sum('amount_cents');

        $legacyPaidCents = (int) Subscription::where('payment_status', 'paid')
            ->whereDoesntHave('payments')
            ->whereBetween('created_at', [$from, $to])
            ->sum('amount_cents');

        $totalRevenueCents = $approvedPaymentsCents + $legacyPaidCents;

        $totalShops = Store::whereNull('parent_id')->count();
        $activeShops = Store::whereNull('parent_id')
            ->where('is_active', true)
            ->where('subscription_status', 'active')
            ->count();

        $trialShops = Store::whereNull('parent_id')
            ->where('subscription_status', 'trial')
            ->count();

        $expiredSubs = Store::whereNull('parent_id')
            ->where(function ($q) {
                $q->where('subscription_status', 'expired')
                    ->orWhere(fn ($sq) => $sq->whereNotNull('subscription_expires_at')->where('subscription_expires_at', '<', now()));
            })
            ->count();

        $suspendedShops = Store::whereNull('parent_id')
            ->where(function ($q) {
                $q->where('subscription_status', 'suspended')
                    ->orWhereNotNull('suspended_at')
                    ->orWhere('is_active', false);
            })
            ->count();

        $totalSubscribers = User::where('role', 'owner')->count();
        $activeSubscriptions = Subscription::where('status', 'active')->count();

        $expiringSoon = Store::whereNull('parent_id')
            ->where('subscription_status', 'active')
            ->whereBetween('subscription_expires_at', [now(), now()->addDays(7)])
            ->count();

        $paymentsPending = SubscriptionPayment::where('status', 'pending')->count();
        $paymentsApproved = SubscriptionPayment::where('status', 'approved')->whereBetween('created_at', [$from, $to])->count();
        $paymentsRejected = SubscriptionPayment::where('status', 'rejected')->whereBetween('created_at', [$from, $to])->count();

        $outstandingInvoicesCents = (int) SubscriptionInvoice::whereIn('status', ['unpaid', 'overdue', 'partially_paid'])
            ->sum('due_cents');

        $plans = Plan::withCount(['stores as subscribers_count'])->get();
        $totalSubscribedStores = max(1, $plans->sum('subscribers_count'));
        $planDistribution = $plans->map(fn ($p) => [
            'id' => $p->id,
            'name' => $p->name,
            'count' => $p->subscribers_count,
            'percent' => (int) round(($p->subscribers_count / $totalSubscribedStores) * 100),
            'price_cents' => $p->price_cents,
        ]);

        $paymentMethods = SubscriptionPayment::where('status', 'approved')
            ->selectRaw('payment_method, count(*) as count, sum(amount_cents) as total_cents')
            ->groupBy('payment_method')
            ->get();

        $flow = $this->platformFlow($from, $to);

        $pendingQueue = SubscriptionPayment::with(['store', 'plan', 'user'])
            ->where('status', 'pending')
            ->latest()
            ->limit(6)
            ->get();

        $recentShops = Store::with(['owner', 'plan'])
            ->whereNull('parent_id')
            ->latest()
            ->limit(6)
            ->get();

        $recentPayments = SubscriptionPayment::with(['store', 'plan', 'user'])
            ->latest()
            ->limit(8)
            ->get();

        return [
            // Comprehensive SaaS KPIs
            'total_shops' => $totalShops,
            'active_shops' => $activeShops,
            'trial_shops' => $trialShops,
            'expired_subscriptions' => $expiredSubs,
            'suspended_shops' => $suspendedShops,
            'total_subscribers' => $totalSubscribers,
            'active_subscriptions' => $activeSubscriptions,
            'expiring_soon' => $expiringSoon,
            'total_revenue' => $totalRevenueCents,
            'payments_pending' => $paymentsPending,
            'payments_approved' => $paymentsApproved,
            'payments_rejected' => $paymentsRejected,
            'outstanding_invoices' => $outstandingInvoicesCents,

            // Backwards-compatible KPIs
            'subscription_sale' => $totalRevenueCents,
            'subscribers' => $activeSubscriptions ?: $totalSubscribers,
            'shops' => Store::whereNull('parent_id')->whereBetween('created_at', [$from, $to])->count(),
            'stores' => Store::whereBetween('created_at', [$from, $to])->count(),

            // Charts & Distributions
            'chart' => $flow,
            'plan_distribution' => $planDistribution,
            'payment_method_distribution' => $paymentMethods,
            'status_distribution' => [
                ['name' => 'Active', 'count' => $activeShops, 'color' => '#16a34a'],
                ['name' => 'Trial', 'count' => $trialShops, 'color' => '#3b82f6'],
                ['name' => 'Expired', 'count' => $expiredSubs, 'color' => '#ef4444'],
                ['name' => 'Suspended', 'count' => $suspendedShops, 'color' => '#f59e0b'],
            ],
            'pending_queue' => $pendingQueue,
            'recent_shops' => $recentShops,
            'recent_payments' => $recentPayments,
            'recent_subscriptions' => Subscription::with(['store', 'plan'])->latest()->limit(8)->get(),
        ];
    }

    private function platformFlow(Carbon $from, Carbon $to): array
    {
        $labels = [];
        $revenue = [];
        $registrations = [];
        $cursor = $from->copy()->startOfDay();
        $days = $from->diffInDays($to);
        $monthly = $days > 31;

        while ($cursor <= $to) {
            $start = $cursor->copy();
            $end = $monthly ? $cursor->copy()->endOfMonth() : $cursor->copy()->endOfDay();
            if ($end->gt($to)) {
                $end = $to->copy();
            }
            $labels[] = $monthly ? $start->format('M Y') : $start->format('d M');

            $revCents = (int) SubscriptionPayment::where('status', 'approved')
                ->whereBetween('created_at', [$start, $end])
                ->sum('amount_cents');

            $revCents += (int) Subscription::where('payment_status', 'paid')
                ->whereDoesntHave('payments')
                ->whereBetween('created_at', [$start, $end])
                ->sum('amount_cents');

            $revenue[] = round($revCents / 100, 2);

            $registrations[] = Store::whereNull('parent_id')
                ->whereBetween('created_at', [$start, $end])
                ->count();

            $cursor = $monthly ? $cursor->addMonth()->startOfMonth() : $cursor->addDay();
        }

        return compact('labels', 'revenue', 'registrations');
    }

    private function topProducts(Collection $items, Collection $returnItems): Collection
    {
        $sold = [];
        foreach ($items as $item) {
            $sold[$item->product_id]['qty'] = ($sold[$item->product_id]['qty'] ?? 0) + $item->qty;
            $sold[$item->product_id]['total'] = ($sold[$item->product_id]['total'] ?? 0) + $item->subtotal_cents;
        }
        foreach ($returnItems as $item) {
            if (! isset($sold[$item->product_id])) {
                continue;
            }
            $sold[$item->product_id]['qty'] -= $item->qty;
            $sold[$item->product_id]['total'] -= $item->subtotal_cents;
        }
        $products = Product::withoutGlobalScopes()->whereIn('id', array_keys($sold))->get()->keyBy('id');

        return collect($sold)
            ->map(fn ($row, $id) => [
                'product' => $products[$id] ?? null,
                'qty' => $row['qty'],
                'total' => $row['total'],
            ])
            ->filter(fn ($row) => $row['product'] && $row['qty'] > 0)
            ->sortByDesc('total')
            ->take(5)
            ->values();
    }

    private function categories(Collection $items): Collection
    {
        $products = Product::withoutGlobalScopes()->with('category')->whereIn('id', $items->pluck('product_id'))->get()->keyBy('id');
        $groups = [];
        foreach ($items as $item) {
            $name = $products[$item->product_id]->category->name ?? 'Uncategorized';
            $groups[$name] = ($groups[$name] ?? 0) + $item->subtotal_cents;
        }
        $sum = array_sum($groups) ?: 1;

        return collect($groups)->map(fn ($total, $name) => [
            'name' => $name,
            'total' => $total,
            'percent' => (int) round($total / $sum * 100),
        ])->sortByDesc('total')->values();
    }

    private function flow(int $storeId, Carbon $from, Carbon $to, array $filters = []): array
    {
        $labels = [];
        $sales = [];
        $purchases = [];
        $cursor = $from->copy()->startOfDay();
        $days = $from->diffInDays($to);
        $monthly = $days > 31;
        while ($cursor <= $to) {
            $start = $cursor->copy();
            $end = $monthly ? $cursor->copy()->endOfMonth() : $cursor->copy()->endOfDay();
            if ($end->gt($to)) {
                $end = $to->copy();
            }
            $labels[] = $monthly ? $start->format('M') : $start->format('d M');

            $saleQuery = Sale::withoutGlobalScopes()
                ->where('store_id', $storeId)
                ->where('status', 'completed')
                ->whereBetween('sold_at', [$start, $end]);
            $this->applySaleFilters($saleQuery, $filters);
            $sales[] = round($saleQuery->sum('grand_cents') / 100, 2);

            $purchaseQuery = Purchase::withoutGlobalScopes()
                ->where('store_id', $storeId)
                ->whereBetween('purchased_on', [$start->toDateString(), $end->toDateString()]);
            if (! empty($filters['warehouse_id'])) {
                $purchaseQuery->where('warehouse_id', (int) $filters['warehouse_id']);
            }
            $purchases[] = round($purchaseQuery->sum('grand_cents') / 100, 2);

            $cursor = $monthly ? $cursor->addMonth()->startOfMonth() : $cursor->addDay();
        }

        return compact('labels', 'sales', 'purchases');
    }

    private function cashflow(int $storeId, Carbon $from, Carbon $to): array
    {
        $rows = AccountTransaction::withoutGlobalScopes()
            ->where('store_id', $storeId)
            ->whereBetween('transacted_on', [$from->toDateString(), $to->toDateString()])
            ->get();
        $debits = [];
        $credits = [];
        $labels = [];
        $cursor = $from->copy()->startOfDay();
        $monthly = $from->diffInDays($to) > 31;
        while ($cursor <= $to) {
            $start = $cursor->copy();
            $end = $monthly ? $cursor->copy()->endOfMonth() : $cursor->copy()->endOfDay();
            $labels[] = $monthly ? $start->format('M') : $start->format('d M');
            $slice = $rows->filter(fn ($row) => $row->transacted_on->between($start, $end));
            $debits[] = round($slice->where('direction', 'debit')->sum('amount_cents') / 100, 2);
            $credits[] = round($slice->where('direction', 'credit')->sum('amount_cents') / 100, 2);
            $cursor = $monthly ? $cursor->addMonth()->startOfMonth() : $cursor->addDay();
        }

        return compact('labels', 'debits', 'credits');
    }
}
