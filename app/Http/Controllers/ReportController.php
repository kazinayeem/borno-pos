<?php

namespace App\Http\Controllers;

use App\Models\Batch;
use App\Models\Category;
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
        $query = Batch::with('product')
            ->when($request->string('status')->toString() === 'expired', fn ($q) => $q->whereDate('expiry_date', '<', $today))
            ->when($request->string('status')->toString() === 'soon', function ($q) use ($today) {
                $q->whereNotNull('expiry_date')
                    ->whereDate('expiry_date', '>=', $today)
                    ->whereRaw("expiry_date <= date(?, '+' || coalesce((select near_expiry_days from products where products.id = batches.product_id), 30) || ' days')", [$today]);
            })
            ->when($request->filled('q'), function ($q) use ($request) {
                $term = $request->string('q');
                $q->where(function ($inner) use ($term) {
                    $inner->where('batch_no', 'like', "%{$term}%")
                        ->orWhereHas('product', fn ($pq) => $pq->where('name', 'like', "%{$term}%")->orWhere('code', 'like', "%{$term}%"));
                });
            });

        $rows = $query->latest()
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

    public function updateBatch(Request $request, Batch $batch)
    {
        $data = $request->validate([
            'batch_no' => ['required', 'string', 'max:60'],
            'expiry_date' => ['nullable', 'date'],
            'manufactured_on' => ['nullable', 'date'],
        ]);
        $batch->update($data);

        if ($request->expectsJson()) {
            return response()->json(['message' => 'Batch details updated.', 'batch' => $batch]);
        }

        return back()->with('status', 'Batch details updated.');
    }

    public function stockCount(Request $request)
    {
        $productQuery = Product::with(['category', 'brand']);

        if ($request->filled('q')) {
            $term = $request->string('q');
            $productQuery->where(function ($q) use ($term) {
                $q->where('name', 'like', "%{$term}%")
                    ->orWhere('code', 'like', "%{$term}%")
                    ->orWhere('barcode', 'like', "%{$term}%")
                    ->orWhere('generic_name', 'like', "%{$term}%");
            });
        }

        if ($request->filled('category_id')) {
            $productQuery->where('category_id', $request->integer('category_id'));
        }

        if ($request->filled('warehouse_id')) {
            $productQuery->where('warehouse_id', $request->integer('warehouse_id'));
        }

        $products = $productQuery->orderBy('name')->paginate(15)->withQueryString();

        return view('stock.index', [
            'counts' => StockCount::with(['warehouse', 'user'])->latest()->paginate(10, ['*'], 'counts_page')->withQueryString(),
            'products' => $products,
            'warehouses' => Warehouse::orderBy('name')->get(),
            'categories' => Category::orderBy('name')->get(),
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
