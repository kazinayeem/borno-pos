<?php

namespace App\Http\Controllers;

use App\Models\Batch;
use App\Models\Expense;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Sale;
use App\Models\StockCount;
use App\Models\StockCountItem;
use App\Models\Warehouse;
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

    public function batches(Request $request)
    {
        $today = now()->toDateString();
        $rows = Batch::with('product')
            ->when($request->string('status')->toString() === 'expired', fn ($query) => $query->whereDate('expiry_date', '<', $today))
            ->when($request->string('status')->toString() === 'soon', function ($query) use ($today) {
                $query->whereNotNull('expiry_date')
                    ->whereDate('expiry_date', '>=', $today)
                    ->whereRaw("expiry_date <= date(?, '+' || coalesce((select near_expiry_days from products where products.id = batches.product_id), 30) || ' days')", [$today]);
            })
            ->latest()
            ->paginate(15)
            ->withQueryString();

        if ($request->expectsJson()) {
            return response()->json([
                'data' => $rows->getCollection()->map(function (Batch $batch) {
                    $days = (int) ($batch->product->near_expiry_days ?? 30);
                    $status = 'ok';
                    if ($batch->expiry_date) {
                        if ($batch->expiry_date->lt(now()->startOfDay())) {
                            $status = 'expired';
                        } elseif ($batch->expiry_date->lte(now()->addDays($days)->endOfDay())) {
                            $status = 'soon';
                        }
                    }

                    return [
                        'id' => $batch->id,
                        'product' => $batch->product?->name,
                        'product_id' => $batch->product_id,
                        'batch_no' => $batch->batch_no,
                        'qty' => $batch->qty,
                        'expiry_date' => optional($batch->expiry_date)->toDateString(),
                        'manufactured_on' => optional($batch->manufactured_on)->toDateString(),
                        'cost_cents' => $batch->cost_cents,
                        'status' => $batch->qty < 1 ? 'empty' : $status,
                        'threshold_days' => $days,
                    ];
                })->values(),
                'meta' => [
                    'current_page' => $rows->currentPage(),
                    'last_page' => $rows->lastPage(),
                    'total' => $rows->total(),
                ],
            ]);
        }

        return view('spa');
    }

    public function stockCount()
    {
        return view('stock.index', [
            'counts' => StockCount::with('warehouse')->latest()->paginate(10),
            'products' => Product::orderBy('name')->get(),
            'warehouses' => Warehouse::orderBy('name')->get(),
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
