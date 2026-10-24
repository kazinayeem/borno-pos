<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Expense;
use App\Models\InventoryMovement;
use App\Models\Payroll;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SaleReturn;
use App\Models\SaleReturnItem;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Support\Carbon;

class ReportService
{
    /**
     * Sales Reports: Summary, staff-wise, customer-wise, payment-method, daily/monthly breakdown.
     */
    public function getSalesReport(int $storeId, Carbon $from, Carbon $to, array $filters = []): array
    {
        $salesQuery = Sale::withoutGlobalScopes()
            ->where('store_id', $storeId)
            ->where('status', 'completed')
            ->whereBetween('sold_at', [$from, $to]);

        if (! empty($filters['staff_id'])) {
            $salesQuery->where('user_id', (int) $filters['staff_id']);
        }
        if (! empty($filters['customer_id'])) {
            $salesQuery->where('customer_id', (int) $filters['customer_id']);
        }
        if (! empty($filters['payment_method'])) {
            $salesQuery->where('payment_method', strtolower((string) $filters['payment_method']));
        }
        if (! empty($filters['warehouse_id'])) {
            $salesQuery->where('warehouse_id', (int) $filters['warehouse_id']);
        }

        $sales = $salesQuery->with(['customer', 'user.shopRole'])->latest('sold_at')->get();
        $totalRevenue = (int) $sales->sum('grand_cents');
        $totalPaid = (int) $sales->sum('paid_cents');
        $totalDue = (int) $sales->sum(fn ($s) => $s->dueCents());
        $totalDiscount = (int) $sales->sum(fn ($s) => (int) $s->discount_cents + (int) $s->coupon_cents);
        $totalTax = (int) $sales->sum('tax_cents');

        // Staff-wise aggregation
        $staffWise = $sales->groupBy('user_id')->map(function ($group) {
            $first = $group->first();
            $user = $first->user;

            return [
                'staff_id' => $user?->id,
                'staff_name' => $user?->name ?? 'Unknown',
                'role_title' => $user?->roleTitle() ?? '',
                'transactions' => $group->count(),
                'total_cents' => (int) $group->sum('grand_cents'),
                'avg_cents' => (int) round($group->sum('grand_cents') / max(1, $group->count())),
                'discount_cents' => (int) $group->sum(fn ($s) => (int) $s->discount_cents + (int) $s->coupon_cents),
            ];
        })->sortByDesc('total_cents')->values();

        // Payment method breakdown
        $paymentWise = $sales->groupBy('payment_method')->map(function ($group, $method) {
            return [
                'method' => ucfirst($method ?: 'cash'),
                'count' => $group->count(),
                'total_cents' => (int) $group->sum('grand_cents'),
            ];
        })->values();

        // Returns in period
        $returns = SaleReturn::withoutGlobalScopes()
            ->where('store_id', $storeId)
            ->whereBetween('returned_on', [$from->toDateString(), $to->toDateString()])
            ->when(! empty($filters['staff_id']), fn ($q) => $q->whereHas('sale', fn ($sq) => $sq->where('user_id', (int) $filters['staff_id'])))
            ->get();
        $totalReturns = (int) $returns->sum('grand_cents');

        return [
            'summary' => [
                'transactions_count' => $sales->count(),
                'total_revenue_cents' => $totalRevenue,
                'total_paid_cents' => $totalPaid,
                'total_due_cents' => $totalDue,
                'total_discount_cents' => $totalDiscount,
                'total_tax_cents' => $totalTax,
                'total_returns_cents' => $totalReturns,
                'net_sales_cents' => $totalRevenue - $totalReturns,
            ],
            'staff_breakdown' => $staffWise,
            'payment_breakdown' => $paymentWise,
            'recent_invoices' => $sales->take(50)->map(fn ($s) => [
                'id' => $s->id,
                'invoice_no' => $s->invoice_no,
                'date' => optional($s->sold_at)->format('d M Y, h:i A'),
                'customer' => $s->customer?->name ?? 'Walk-in',
                'staff' => $s->user?->name ?? 'Staff',
                'payment_method' => ucfirst($s->payment_method ?: 'cash'),
                'grand_cents' => $s->grand_cents,
                'paid_cents' => $s->paid_cents,
                'due_cents' => $s->dueCents(),
                'status' => ucfirst($s->status),
            ])->values(),
        ];
    }

    /**
     * Inventory Reports: Current stock, low/out of stock, valuation, movements.
     */
    public function getInventoryReport(int $storeId, array $filters = []): array
    {
        $productsQuery = Product::withoutGlobalScopes()
            ->where('store_id', $storeId)
            ->with(['category', 'brand', 'unit']);

        if (! empty($filters['category_id'])) {
            $productsQuery->where('category_id', (int) $filters['category_id']);
        }
        if (! empty($filters['warehouse_id'])) {
            $productsQuery->where('warehouse_id', (int) $filters['warehouse_id']);
        }

        $products = $productsQuery->get();

        $totalStockUnits = (int) $products->sum('stock_qty');
        $totalCostValuation = (int) $products->sum(fn ($p) => (int) $p->cost_cents * (int) $p->stock_qty);
        $totalRetailValuation = (int) $products->sum(fn ($p) => (int) $p->price_cents * (int) $p->stock_qty);

        $lowStock = $products->filter(function ($p) {
            $threshold = $p->alert_qty ?? 10;

            return $p->stock_qty <= $threshold && $p->stock_qty > 0;
        })->values();

        $outOfStock = $products->filter(fn ($p) => $p->stock_qty <= 0)->values();

        // Recent stock movements
        $movements = InventoryMovement::withoutGlobalScopes()
            ->where('store_id', $storeId)
            ->with(['product'])
            ->latest()
            ->limit(30)
            ->get();

        return [
            'summary' => [
                'total_products_count' => $products->count(),
                'total_units_in_stock' => $totalStockUnits,
                'cost_valuation_cents' => $totalCostValuation,
                'retail_valuation_cents' => $totalRetailValuation,
                'potential_profit_cents' => max(0, $totalRetailValuation - $totalCostValuation),
                'low_stock_count' => $lowStock->count(),
                'out_of_stock_count' => $outOfStock->count(),
            ],
            'low_stock_items' => $lowStock->take(30)->map(fn ($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'code' => $p->code ?: $p->barcode,
                'category' => $p->category?->name ?? 'General',
                'current_stock' => $p->stock_qty,
                'alert_threshold' => $p->alert_qty ?? 10,
                'price_cents' => $p->price_cents,
            ])->values(),
            'out_of_stock_items' => $outOfStock->take(30)->map(fn ($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'code' => $p->code ?: $p->barcode,
                'category' => $p->category?->name ?? 'General',
                'price_cents' => $p->price_cents,
            ])->values(),
            'stock_movements' => $movements->map(fn ($m) => [
                'id' => $m->id,
                'product_name' => $m->product?->name ?? 'Unknown',
                'change' => $m->qty_change,
                'balance_after' => $m->balance_after,
                'reason' => ucfirst(str_replace('_', ' ', (string) $m->reason)),
                'date' => optional($m->created_at)->format('d M Y, h:i A'),
            ])->values(),
        ];
    }

    /**
     * Financial Reports: Revenue, COGS, Gross Profit, Operating Expenses, Net Profit, Receivables, Payables.
     */
    public function getFinancialReport(int $storeId, Carbon $from, Carbon $to, array $filters = []): array
    {
        $sales = Sale::withoutGlobalScopes()
            ->where('store_id', $storeId)
            ->where('status', 'completed')
            ->whereBetween('sold_at', [$from, $to])
            ->get();

        $saleIds = $sales->pluck('id');
        $saleItems = SaleItem::whereIn('sale_id', $saleIds)->get();

        $returns = SaleReturn::withoutGlobalScopes()
            ->where('store_id', $storeId)
            ->whereBetween('returned_on', [$from->toDateString(), $to->toDateString()])
            ->get();
        $returnItems = SaleReturnItem::whereIn('sale_return_id', $returns->pluck('id'))->get();

        $grossSales = (int) $sales->sum('grand_cents');
        $salesTax = (int) $sales->sum('tax_cents');
        $returnTotal = (int) $returns->sum('grand_cents');
        $returnTax = (int) $returns->sum('tax_cents');

        $cogs = (int) $saleItems->sum(fn ($i) => $i->cost_cents * $i->qty)
            - (int) $returnItems->sum(fn ($i) => $i->cost_cents * $i->qty);

        $netSalesExTax = ($grossSales - $salesTax) - ($returnTotal - $returnTax);
        $grossProfit = $netSalesExTax - $cogs;

        $expenses = Expense::withoutGlobalScopes()
            ->where('store_id', $storeId)
            ->whereBetween('spent_on', [$from->toDateString(), $to->toDateString()])
            ->with('category')
            ->get();
        $totalExpense = (int) $expenses->sum('amount_cents');

        $salaries = Payroll::withoutGlobalScopes()
            ->where('store_id', $storeId)
            ->whereBetween('paid_on', [$from->toDateString(), $to->toDateString()])
            ->get();
        $totalSalary = (int) $salaries->sum('amount_cents');

        $netProfit = $grossProfit - $totalExpense - $totalSalary;

        // Customer receivables & supplier payables
        $customerReceivables = (int) Sale::withoutGlobalScopes()
            ->where('store_id', $storeId)
            ->where('status', 'completed')
            ->get()
            ->sum(fn ($s) => $s->dueCents());

        $supplierPayables = (int) Purchase::withoutGlobalScopes()
            ->where('store_id', $storeId)
            ->where('status', 'received')
            ->get()
            ->sum(fn ($p) => $p->dueCents());

        $expenseCategories = $expenses->groupBy(fn ($e) => $e->category?->name ?? 'Other')->map(fn ($group, $name) => [
            'name' => $name,
            'amount_cents' => (int) $group->sum('amount_cents'),
        ])->sortByDesc('amount_cents')->values();

        return [
            'income_statement' => [
                'gross_sales_cents' => $grossSales,
                'sales_return_cents' => $returnTotal,
                'sales_tax_cents' => $salesTax,
                'net_sales_cents' => $netSalesExTax,
                'cost_of_goods_sold_cents' => $cogs,
                'gross_profit_cents' => $grossProfit,
                'gross_margin_percent' => $netSalesExTax > 0 ? round(($grossProfit / $netSalesExTax) * 100, 1) : 0,
                'operating_expenses_cents' => $totalExpense,
                'salary_costs_cents' => $totalSalary,
                'net_profit_cents' => $netProfit,
                'net_margin_percent' => $netSalesExTax > 0 ? round(($netProfit / $netSalesExTax) * 100, 1) : 0,
            ],
            'balance_summary' => [
                'customer_receivables_cents' => $customerReceivables,
                'supplier_payables_cents' => $supplierPayables,
            ],
            'expense_categories' => $expenseCategories,
        ];
    }

    /**
     * Staff Reports: Employee sales metrics, transaction count, average ticket, returns, and audit trails.
     */
    public function getStaffReport(int $storeId, Carbon $from, Carbon $to): array
    {
        $staffMembers = User::where('store_id', $storeId)
            ->with('shopRole')
            ->orderBy('name')
            ->get();

        $salesGroup = Sale::withoutGlobalScopes()
            ->where('store_id', $storeId)
            ->where('status', 'completed')
            ->whereBetween('sold_at', [$from, $to])
            ->selectRaw('user_id, count(*) as tx_count, coalesce(sum(grand_cents), 0) as total_cents, coalesce(sum(discount_cents + coupon_cents), 0) as discount_cents')
            ->groupBy('user_id')
            ->get()
            ->keyBy('user_id');

        $returnsGroup = SaleReturn::withoutGlobalScopes()
            ->where('store_id', $storeId)
            ->whereBetween('returned_on', [$from->toDateString(), $to->toDateString()])
            ->with('sale:id,user_id')
            ->get()
            ->groupBy(fn ($r) => $r->sale->user_id ?? 0);

        $staffData = $staffMembers->map(function (User $u) use ($salesGroup, $returnsGroup) {
            $s = $salesGroup->get($u->id);
            $txCount = (int) ($s->tx_count ?? 0);
            $totalCents = (int) ($s->total_cents ?? 0);
            $discountCents = (int) ($s->discount_cents ?? 0);

            $userReturns = $returnsGroup->get($u->id) ?? collect();
            $returnsCount = $userReturns->count();
            $returnsTotal = (int) $userReturns->sum('grand_cents');
            $avgTicket = $txCount > 0 ? (int) round($totalCents / $txCount) : 0;

            return [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'phone' => $u->phone,
                'role_title' => $u->roleTitle(),
                'role' => $u->role,
                'is_active' => (bool) $u->is_active,
                'last_login_at' => optional($u->last_login_at)->format('d M Y, h:i A'),
                'transactions_count' => $txCount,
                'total_sales_cents' => $totalCents,
                'average_sale_cents' => $avgTicket,
                'discounts_given_cents' => $discountCents,
                'returns_count' => $returnsCount,
                'returns_total_cents' => $returnsTotal,
            ];
        })->sortByDesc('total_sales_cents')->values();

        $auditLogs = AuditLog::where('store_id', $storeId)
            ->with('user')
            ->latest()
            ->limit(30)
            ->get()
            ->map(fn ($log) => [
                'id' => $log->id,
                'actor' => $log->user?->name ?? 'System',
                'action' => $log->action,
                'target' => $log->target_type ? $log->target_type.' #'.$log->target_id : 'System',
                'date' => optional($log->created_at)->format('d M Y, h:i A'),
                'ip' => $log->ip_address,
            ]);

        return [
            'staff_members' => $staffData,
            'recent_audits' => $auditLogs,
        ];
    }

    /**
     * Customer & Supplier Reports: Outstanding receivables and payables.
     */
    public function getPartiesReport(int $storeId): array
    {
        $customers = Customer::withoutGlobalScopes()
            ->where('store_id', $storeId)
            ->with(['group'])
            ->get();

        $customerSales = Sale::withoutGlobalScopes()
            ->where('store_id', $storeId)
            ->where('status', 'completed')
            ->whereNotNull('customer_id')
            ->get()
            ->groupBy('customer_id');

        $customerList = $customers->map(function ($c) use ($customerSales) {
            $sales = $customerSales->get($c->id) ?? collect();
            $totalPurchased = (int) $sales->sum('grand_cents');
            $totalDue = (int) $sales->sum(fn ($s) => $s->dueCents());

            return [
                'id' => $c->id,
                'name' => $c->name,
                'phone' => $c->phone,
                'group' => $c->group?->name ?? 'General',
                'orders_count' => $sales->count(),
                'total_purchased_cents' => $totalPurchased,
                'outstanding_due_cents' => $totalDue,
            ];
        })->filter(fn ($c) => $c['orders_count'] > 0 || $c['outstanding_due_cents'] > 0)
            ->sortByDesc('outstanding_due_cents')
            ->values();

        $suppliers = Supplier::withoutGlobalScopes()
            ->where('store_id', $storeId)
            ->get();

        $supplierPurchases = Purchase::withoutGlobalScopes()
            ->where('store_id', $storeId)
            ->where('status', 'received')
            ->whereNotNull('supplier_id')
            ->get()
            ->groupBy('supplier_id');

        $supplierList = $suppliers->map(function ($s) use ($supplierPurchases) {
            $purchases = $supplierPurchases->get($s->id) ?? collect();
            $totalBought = (int) $purchases->sum('grand_cents');
            $totalDue = (int) $purchases->sum(fn ($p) => $p->dueCents());

            return [
                'id' => $s->id,
                'name' => $s->name,
                'phone' => $s->phone,
                'orders_count' => $purchases->count(),
                'total_purchased_cents' => $totalBought,
                'outstanding_payable_cents' => $totalDue,
            ];
        })->filter(fn ($s) => $s['orders_count'] > 0 || $s['outstanding_payable_cents'] > 0)
            ->sortByDesc('outstanding_payable_cents')
            ->values();

        return [
            'customers' => $customerList,
            'suppliers' => $supplierList,
            'total_customer_due_cents' => (int) $customerList->sum('outstanding_due_cents'),
            'total_supplier_payable_cents' => (int) $supplierList->sum('outstanding_payable_cents'),
        ];
    }

    /**
     * Generate CSV export based on report category and filters.
     */
    public function exportCsv(int $storeId, string $tab, Carbon $from, Carbon $to, array $filters = []): string
    {
        $output = fopen('php://temp', 'r+');
        // UTF-8 BOM for Excel
        fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));

        if ($tab === 'sales') {
            $data = $this->getSalesReport($storeId, $from, $to, $filters);
            fputcsv($output, ['Invoice No', 'Date', 'Customer', 'Staff', 'Payment Method', 'Grand Total', 'Paid', 'Due', 'Status']);
            foreach ($data['recent_invoices'] as $row) {
                fputcsv($output, [
                    $row['invoice_no'],
                    $row['date'],
                    $row['customer'],
                    $row['staff'],
                    $row['payment_method'],
                    number_format($row['grand_cents'] / 100, 2),
                    number_format($row['paid_cents'] / 100, 2),
                    number_format($row['due_cents'] / 100, 2),
                    $row['status'],
                ]);
            }
        } elseif ($tab === 'staff') {
            $data = $this->getStaffReport($storeId, $from, $to);
            fputcsv($output, ['Staff Name', 'Email', 'Role', 'Status', 'Transactions', 'Total Sales', 'Average Sale', 'Discounts Given', 'Returns Count', 'Returns Total']);
            foreach ($data['staff_members'] as $row) {
                fputcsv($output, [
                    $row['name'],
                    $row['email'],
                    $row['role_title'],
                    $row['is_active'] ? 'Active' : 'Inactive',
                    $row['transactions_count'],
                    number_format($row['total_sales_cents'] / 100, 2),
                    number_format($row['average_sale_cents'] / 100, 2),
                    number_format($row['discounts_given_cents'] / 100, 2),
                    $row['returns_count'],
                    number_format($row['returns_total_cents'] / 100, 2),
                ]);
            }
        } elseif ($tab === 'inventory') {
            $data = $this->getInventoryReport($storeId, $filters);
            fputcsv($output, ['Alert Type', 'Product Name', 'Code', 'Category', 'Stock Qty', 'Price']);
            foreach ($data['low_stock_items'] as $row) {
                fputcsv($output, ['Low Stock', $row['name'], $row['code'], $row['category'], $row['current_stock'], number_format($row['price_cents'] / 100, 2)]);
            }
            foreach ($data['out_of_stock_items'] as $row) {
                fputcsv($output, ['Out of Stock', $row['name'], $row['code'], $row['category'], 0, number_format($row['price_cents'] / 100, 2)]);
            }
        } else {
            $data = $this->getFinancialReport($storeId, $from, $to, $filters);
            fputcsv($output, ['Metric', 'Amount']);
            foreach ($data['income_statement'] as $metric => $val) {
                $formatted = str_ends_with($metric, '_percent') ? $val.'%' : number_format($val / 100, 2);
                fputcsv($output, [ucwords(str_replace('_', ' ', $metric)), $formatted]);
            }
        }

        rewind($output);
        $content = stream_get_contents($output);
        fclose($output);

        return $content ?: '';
    }
}
