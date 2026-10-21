<?php

namespace App\Services;

use App\Models\AccountTransaction;
use App\Models\Expense;
use App\Models\Payroll;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SaleReturn;
use App\Models\SaleReturnItem;
use App\Models\Store;
use App\Models\Subscription;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class DashboardService
{
    /**
     * Gross profit is net sales excluding tax, minus the cost captured on each sold unit.
     * Purchases are not subtracted again. Expenses and salaries are deducted only in net profit.
     *
     * @return array<string, mixed>
     */
    public function shop(int $storeId, Carbon $from, Carbon $to): array
    {
        $sales = Sale::withoutGlobalScopes()
            ->where('store_id', $storeId)
            ->where('status', 'completed')
            ->whereBetween('sold_at', [$from, $to])
            ->get();

        $saleIds = $sales->pluck('id');
        $items = SaleItem::whereIn('sale_id', $saleIds)->get();
        $returns = SaleReturn::withoutGlobalScopes()
            ->where('store_id', $storeId)
            ->whereBetween('returned_on', [$from->toDateString(), $to->toDateString()])
            ->get();
        $returnItems = SaleReturnItem::whereIn('sale_return_id', $returns->pluck('id'))->get();

        $salesTotal = (int) $sales->sum('grand_cents');
        $salesTax = (int) $sales->sum('tax_cents');
        $returnTotal = (int) $returns->sum('grand_cents');
        $returnTax = (int) $returns->sum('tax_cents');
        $cogs = (int) $items->sum(fn ($item) => $item->cost_cents * $item->qty)
            - (int) $returnItems->sum(fn ($item) => $item->cost_cents * $item->qty);
        $netRevenueExTax = ($salesTotal - $salesTax) - ($returnTotal - $returnTax);
        $gross = $netRevenueExTax - $cogs;

        $purchases = Purchase::withoutGlobalScopes()
            ->where('store_id', $storeId)
            ->where('status', 'received')
            ->whereBetween('purchased_on', [$from->toDateString(), $to->toDateString()])
            ->get();
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
            'chart' => $this->flow($storeId, $from, $to),
            'cashflow' => $this->cashflow($storeId, $from, $to),
        ];
    }

    public function platform(Carbon $from, Carbon $to): array
    {
        $subs = Subscription::query()
            ->whereBetween('created_at', [$from, $to]);

        return [
            'subscription_sale' => (int) (clone $subs)->where('payment_status', 'paid')->sum('amount_cents'),
            'subscribers' => (int) (clone $subs)->where('status', 'active')->count(),
            'shops' => Store::whereNull('parent_id')->whereBetween('created_at', [$from, $to])->count(),
            'stores' => Store::whereBetween('created_at', [$from, $to])->count(),
            'recent_shops' => Store::latest()->limit(6)->get(),
            'recent_subscriptions' => Subscription::with(['store', 'plan'])->latest()->limit(8)->get(),
        ];
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

    private function flow(int $storeId, Carbon $from, Carbon $to): array
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
            $sales[] = round(Sale::withoutGlobalScopes()->where('store_id', $storeId)->where('status', 'completed')->whereBetween('sold_at', [$start, $end])->sum('grand_cents') / 100, 2);
            $purchases[] = round(Purchase::withoutGlobalScopes()->where('store_id', $storeId)->whereBetween('purchased_on', [$start->toDateString(), $end->toDateString()])->sum('grand_cents') / 100, 2);
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
