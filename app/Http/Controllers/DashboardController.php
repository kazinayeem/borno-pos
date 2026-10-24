<?php

namespace App\Http\Controllers;

use App\Models\AccountTransaction;
use App\Services\DashboardService;
use App\Support\DateRange;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function shop(Request $request, DashboardService $dashboard)
    {
        $authUser = $request->user();
        $storeId = (int) $authUser->store_id;

        [$from, $to, $label] = DateRange::fromRequest($request);

        $filters = [
            'staff_id' => $request->filled('staff_id') ? $request->integer('staff_id') : null,
            'role_id' => $request->filled('role_id') ? $request->integer('role_id') : null,
            'warehouse_id' => $request->filled('warehouse_id') ? $request->integer('warehouse_id') : null,
            'customer_id' => $request->filled('customer_id') ? $request->integer('customer_id') : null,
            'product_id' => $request->filled('product_id') ? $request->integer('product_id') : null,
            'category_id' => $request->filled('category_id') ? $request->integer('category_id') : null,
            'payment_method' => $request->filled('payment_method') ? $request->string('payment_method')->toString() : null,
            'payment_status' => $request->filled('payment_status') ? $request->string('payment_status')->toString() : null,
        ];

        // Role-based visibility: Sellers and staff without staff.view can only view their own performance
        $canViewAllStaff = $authUser->isOwner() || $authUser->isSuperAdmin() || $authUser->canDo('staff.view');
        if (! $canViewAllStaff) {
            $filters['staff_id'] = $authUser->id;
        }

        $data = $dashboard->shop($storeId, $from, $to, $filters);

        $transactions = AccountTransaction::query()
            ->with('account')
            ->where('store_id', $storeId)
            ->whereBetween('transacted_on', [$from->toDateString(), $to->toDateString()])
            ->latest()
            ->limit(8)
            ->get();

        if ($request->expectsJson() || $request->is('api/*')) {
            $data['sales']->loadCount('items');

            return response()->json([
                'label' => $label,
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
                'month' => $from->format('F'),
                'can_view_all_staff' => $canViewAllStaff,
                'applied_filters' => array_filter($filters),
                'kpis' => [
                    'total_sales' => $data['total_sales'],
                    'net_profit' => $data['net_profit'],
                    'gross_profit' => $data['gross_profit'],
                    'sales_return' => $data['sales_return'],
                    'purchase' => $data['purchase'],
                    'purchase_due' => $data['purchase_due'],
                    'expense' => $data['expense'],
                    'salary' => $data['salary'],
                ],
                'sales' => $data['sales']->take(10)->map(fn ($sale) => [
                    'id' => $sale->id,
                    'invoice_no' => $sale->invoice_no,
                    'sold_at' => $sale->sold_at?->format('d M Y H:i'),
                    'items' => $sale->items_count,
                    'grand_cents' => $sale->grand_cents,
                    'customer' => $sale->customer?->name ?? 'Walk-in',
                    'staff' => $sale->user?->name ?? 'Unknown',
                    'staff_role' => $sale->user?->roleTitle() ?? '',
                    'payment_method' => ucfirst($sale->payment_method ?? 'cash'),
                    'paid_cents' => $sale->paid_cents,
                ])->values(),
                'purchases' => $data['purchases']->take(10)->map(fn ($purchase) => [
                    'id' => $purchase->id,
                    'reference' => $purchase->reference,
                    'grand_cents' => $purchase->grand_cents,
                    'supplier' => $purchase->supplier?->name ?? 'Direct',
                ])->values(),
                'top_products' => $data['top_products']->map(fn ($row) => [
                    'name' => $row['product']->name,
                    'qty' => $row['qty'],
                    'total' => $row['total'],
                ])->values(),
                'categories' => $data['categories']->values(),
                'chart' => $data['chart'],
                'cashflow' => $data['cashflow'],
                'staff_performance' => $data['staff_performance'],
                'selected_staff_summary' => $data['selected_staff_summary'],
                'filter_lookups' => $data['filter_lookups'],
                'transactions' => $transactions->map(fn ($row) => [
                    'id' => $row->id,
                    'date' => $row->transacted_on->format('d-m-Y'),
                    'description' => $row->description,
                    'direction' => $row->direction,
                    'amount_cents' => $row->amount_cents,
                ])->values(),
            ]);
        }

        return view('spa');
    }

    public function platform(Request $request, DashboardService $dashboard)
    {
        [$from, $to, $label] = DateRange::fromRequest($request);
        $data = $dashboard->platform($from, $to);

        if ($request->expectsJson() || $request->is('api/*')) {
            return response()->json([
                'label' => $label,
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
                'kpis' => [
                    'subscription_sale' => $data['subscription_sale'],
                    'subscribers' => $data['subscribers'],
                    'shops' => $data['shops'],
                    'stores' => $data['stores'],
                ],
            ]);
        }

        return view('spa');
    }
}
