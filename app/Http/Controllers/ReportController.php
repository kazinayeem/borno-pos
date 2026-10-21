<?php

namespace App\Http\Controllers;

use App\Models\Batch;
use App\Models\Expense;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Sale;
use App\Models\StockCount;
use App\Models\StockCountItem;
use App\Services\DashboardService;
use App\Services\InventoryService;
use App\Support\DateRange;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function summary(Request $request, DashboardService $dashboard)
    {
        [$from, $to, $label] = DateRange::fromRequest($request);
        $data = $dashboard->shop((int) $request->user()->store_id, $from, $to);

        return view('reports.summary', compact('data', 'from', 'to', 'label'));
    }

    public function profit(Request $request, DashboardService $dashboard)
    {
        [$from, $to, $label] = DateRange::fromRequest($request);
        $data = $dashboard->shop((int) $request->user()->store_id, $from, $to);

        return view('reports.profit', compact('data', 'from', 'to', 'label'));
    }

    public function purchases(Request $request)
    {
        [$from, $to, $label] = DateRange::fromRequest($request);
        $rows = Purchase::with('supplier')->whereBetween('purchased_on', [$from->toDateString(), $to->toDateString()])->latest()->paginate(15)->withQueryString();

        return view('reports.purchases', compact('rows', 'from', 'to', 'label'));
    }

    public function sales(Request $request)
    {
        [$from, $to, $label] = DateRange::fromRequest($request);
        $rows = Sale::with('customer')->where('status', 'completed')->whereBetween('sold_at', [$from, $to])->latest()->paginate(15)->withQueryString();

        return view('reports.sales', compact('rows', 'from', 'to', 'label'));
    }

    public function products()
    {
        $rows = Product::with(['category', 'brand'])->orderBy('stock_qty')->paginate(15);

        return view('reports.products', compact('rows'));
    }

    public function expenses(Request $request)
    {
        [$from, $to, $label] = DateRange::fromRequest($request);
        $rows = Expense::with('category')->whereBetween('spent_on', [$from->toDateString(), $to->toDateString()])->latest()->paginate(15)->withQueryString();

        return view('reports.expenses', compact('rows', 'from', 'to', 'label'));
    }

    public function batches()
    {
        return view('reports.batches', [
            'rows' => Batch::with('product')->latest()->paginate(15),
        ]);
    }

    public function stockCount()
    {
        return view('stock.index', [
            'counts' => StockCount::with('warehouse')->latest()->paginate(10),
            'products' => Product::orderBy('name')->get(),
            'warehouses' => \App\Models\Warehouse::orderBy('name')->get(),
        ]);
    }

    public function storeStockCount(Request $request, InventoryService $inventory)
    {
        $data = $request->validate([
            'warehouse_id' => ['required', 'integer'],
            'counted_on' => ['required', 'date'],
            'note' => ['nullable', 'string', 'max:500'],
            'counted' => ['required', 'array'],
        ]);

        DB::transaction(function () use ($request, $data, $inventory) {
            $count = StockCount::create([
                'warehouse_id' => $data['warehouse_id'],
                'user_id' => $request->user()->id,
                'counted_on' => $data['counted_on'],
                'status' => 'completed',
                'note' => $data['note'] ?? null,
            ]);
            foreach ($data['counted'] as $productId => $qty) {
                if ($qty === null || $qty === '') {
                    continue;
                }
                $product = Product::lockForUpdate()->findOrFail($productId);
                StockCountItem::create([
                    'stock_count_id' => $count->id,
                    'product_id' => $product->id,
                    'expected_qty' => $product->stock_qty,
                    'counted_qty' => (int) $qty,
                ]);
                $delta = (int) $qty - (int) $product->stock_qty;
                if ($delta !== 0) {
                    $inventory->move($product, $delta, 'stock_count', $count, $request->user());
                }
            }
        });

        return back()->with('status', 'Stock count applied.');
    }
}
