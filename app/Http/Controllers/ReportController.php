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

        if ($request->expectsJson()) {
            return response()->json([
                'data' => $data,
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
                'label' => $label,
            ]);
        }

        return view('spa');
    }

    public function profit(Request $request, DashboardService $dashboard)
    {
        [$from, $to, $label] = DateRange::fromRequest($request);
        $data = $dashboard->shop((int) $request->user()->store_id, $from, $to);

        if ($request->expectsJson()) {
            return response()->json([
                'data' => $data,
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
                'label' => $label,
            ]);
        }

        return view('spa');
    }

    public function purchases(Request $request)
    {
        [$from, $to, $label] = DateRange::fromRequest($request);
        $rows = Purchase::with(['supplier', 'warehouse'])->whereBetween('purchased_on', [$from->toDateString(), $to->toDateString()])->latest('purchased_on')->latest('id')->paginate(15)->withQueryString();

        if ($request->expectsJson()) {
            return response()->json([
                'purchases' => $rows->getCollection()->map(fn ($p) => [
                    'id' => $p->id,
                    'reference' => $p->reference,
                    'supplier' => $p->supplier?->name,
                    'warehouse' => $p->warehouse?->name,
                    'status' => $p->status,
                    'grand_cents' => (int) $p->grand_cents,
                    'paid_cents' => (int) $p->paid_cents,
                    'due_cents' => $p->dueCents(),
                    'purchased_on' => optional($p->purchased_on)->format('Y-m-d'),
                ]),
                'meta' => [
                    'current_page' => $rows->currentPage(),
                    'last_page' => $rows->lastPage(),
                    'total' => $rows->total(),
                ],
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
                'label' => $label,
            ]);
        }

        return view('spa');
    }

    public function sales(Request $request)
    {
        [$from, $to, $label] = DateRange::fromRequest($request);
        $rows = Sale::with(['customer', 'user'])->where('status', 'completed')->whereBetween('sold_at', [$from, $to])->latest('sold_at')->paginate(15)->withQueryString();

        if ($request->expectsJson()) {
            return response()->json([
                'sales' => $rows->getCollection()->map(fn ($s) => [
                    'id' => $s->id,
                    'invoice_no' => $s->invoice_no,
                    'customer' => $s->customer?->name ?? 'Walk-in Customer',
                    'user' => $s->user?->name,
                    'grand_cents' => (int) $s->grand_cents,
                    'paid_cents' => (int) $s->paid_cents,
                    'due_cents' => $s->dueCents(),
                    'sold_at' => optional($s->sold_at)->format('Y-m-d H:i'),
                ]),
                'meta' => [
                    'current_page' => $rows->currentPage(),
                    'last_page' => $rows->lastPage(),
                    'total' => $rows->total(),
                ],
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
                'label' => $label,
            ]);
        }

        return view('spa');
    }

    public function products(Request $request)
    {
        $query = Product::with(['category', 'brand', 'unit']);
        if ($request->filled('q')) {
            $term = $request->string('q');
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', "%{$term}%")
                    ->orWhere('code', 'like', "%{$term}%")
                    ->orWhere('barcode', 'like', "%{$term}%");
            });
        }
        $rows = $query->orderBy('stock_qty')->paginate(15)->withQueryString();

        if ($request->expectsJson()) {
            return response()->json([
                'products' => $rows->getCollection()->map(fn ($p) => [
                    'id' => $p->id,
                    'name' => $p->name,
                    'code' => $p->code,
                    'barcode' => $p->barcode,
                    'category' => $p->category?->name,
                    'brand' => $p->brand?->name,
                    'unit' => $p->unit?->name,
                    'stock_qty' => (int) $p->stock_qty,
                    'cost_cents' => (int) $p->cost_cents,
                    'price_cents' => (int) $p->price_cents,
                    'valuation_cents' => (int) ($p->stock_qty * $p->cost_cents),
                ]),
                'meta' => [
                    'current_page' => $rows->currentPage(),
                    'last_page' => $rows->lastPage(),
                    'total' => $rows->total(),
                ],
                'total_valuation_cents' => (int) Product::selectRaw('SUM(stock_qty * cost_cents) as total')->value('total'),
            ]);
        }

        return view('spa');
    }

    public function expenses(Request $request)
    {
        [$from, $to, $label] = DateRange::fromRequest($request);
        $rows = Expense::with('category')->whereBetween('spent_on', [$from->toDateString(), $to->toDateString()])->latest('spent_on')->paginate(15)->withQueryString();

        if ($request->expectsJson()) {
            return response()->json([
                'expenses' => $rows->getCollection()->map(fn ($e) => [
                    'id' => $e->id,
                    'category' => $e->category?->name,
                    'amount_cents' => (int) $e->amount_cents,
                    'spent_on' => optional($e->spent_on)->format('Y-m-d'),
                    'note' => $e->note,
                ]),
                'meta' => [
                    'current_page' => $rows->currentPage(),
                    'last_page' => $rows->lastPage(),
                    'total' => $rows->total(),
                ],
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
                'label' => $label,
                'total_amount_cents' => (int) Expense::whereBetween('spent_on', [$from->toDateString(), $to->toDateString()])->sum('amount_cents'),
            ]);
        }

        return view('spa');
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
        $warehouses = Warehouse::orderBy('name')->get();
        $categories = Category::orderBy('name')->get();

        if ($request->expectsJson()) {
            return response()->json([
                'products' => $products->getCollection()->map(fn ($p) => [
                    'id' => $p->id,
                    'name' => $p->name,
                    'code' => $p->code,
                    'barcode' => $p->barcode,
                    'category' => $p->category?->name,
                    'brand' => $p->brand?->name,
                    'stock_qty' => (int) $p->stock_qty,
                    'cost_cents' => (int) $p->cost_cents,
                ]),
                'meta' => [
                    'current_page' => $products->currentPage(),
                    'last_page' => $products->lastPage(),
                    'total' => $products->total(),
                ],
                'counts' => StockCount::with(['warehouse', 'user'])->latest()->limit(15)->get()->map(fn ($c) => [
                    'id' => $c->id,
                    'warehouse' => $c->warehouse?->name,
                    'counted_on' => optional($c->counted_on)->format('Y-m-d'),
                    'status' => $c->status,
                    'note' => $c->note,
                    'user' => $c->user?->name,
                ]),
                'warehouses' => $warehouses->map(fn ($w) => ['id' => $w->id, 'name' => $w->name]),
                'categories' => $categories->map(fn ($c) => ['id' => $c->id, 'name' => $c->name]),
            ]);
        }

        if ($request->query('view') === 'blade') {
            return view('stock.index', [
                'products' => $products,
                'warehouses' => $warehouses,
                'categories' => $categories,
                'counts' => StockCount::with(['warehouse', 'user'])->latest()->paginate(10, ['*'], 'counts_page'),
            ]);
        }

        return view('spa');
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

        if ($request->expectsJson()) {
            return response()->json(['message' => 'Stock count applied successfully.']);
        }

        return back()->with('status', 'Stock count applied.');
    }
}
