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
        [$from, $to, $label] = DateRange::fromRequest($request);
        $data = $dashboard->shop((int) $request->user()->store_id, $from, $to);
        $transactions = AccountTransaction::query()
            ->with('account')
            ->whereBetween('transacted_on', [$from->toDateString(), $to->toDateString()])
            ->latest()
            ->limit(8)
            ->get();

        if ($request->expectsJson()) {
            $data['sales']->loadCount('items');

            return response()->json([
                'label' => $label,
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
                'month' => $from->format('F'),
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
                'sales' => $data['sales']->take(8)->map(fn ($sale) => [
                    'id' => $sale->id,
                    'invoice_no' => $sale->invoice_no,
                    'sold_at' => $sale->sold_at?->format('d M Y H:i'),
                    'items' => $sale->items_count,
                    'grand_cents' => $sale->grand_cents,
                ])->values(),
                'purchases' => $data['purchases']->take(8)->map(fn ($purchase) => [
                    'id' => $purchase->id,
                    'reference' => $purchase->reference,
                    'grand_cents' => $purchase->grand_cents,
                ])->values(),
                'top_products' => $data['top_products']->map(fn ($row) => [
                    'name' => $row['product']->name,
                    'qty' => $row['qty'],
                    'total' => $row['total'],
                ])->values(),
                'categories' => $data['categories']->values(),
                'chart' => $data['chart'],
                'cashflow' => $data['cashflow'],
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

        if ($request->expectsJson()) {
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
