<?php

namespace App\Http\Controllers;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Coupon;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Setting;
use App\Services\CheckoutService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PosController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::with([
            'tax',
            'brand',
            'category',
            'variants',
            'batches' => fn ($query) => $query->where('qty', '>', 0)->orderByRaw('case when expiry_date is null then 1 else 0 end')->orderBy('expiry_date'),
        ])
            ->where('is_active', true);

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->integer('category_id'));
        }

        if ($request->filled('brand_id')) {
            $query->where('brand_id', $request->integer('brand_id'));
        }

        if ($request->filled('q')) {
            $term = trim($request->string('q')->toString());
            $query->where(function ($sub) use ($term) {
                $sub->where('name', 'like', "%{$term}%")
                    ->orWhere('generic_name', 'like', "%{$term}%")
                    ->orWhere('code', 'like', "%{$term}%")
                    ->orWhere('barcode', $term)
                    ->orWhere('strength', 'like', "%{$term}%")
                    ->orWhere('dosage_form', 'like', "%{$term}%")
                    ->orWhereHas('brand', fn ($b) => $b->where('name', 'like', "%{$term}%"));
            });
            $products = $query->orderBy('name')->limit(150)->get();
        } else {
            // Default view: top 150 products (featured or in stock or most recent)
            $products = $query->orderByDesc('featured_in_pos')
                ->orderByDesc('stock_qty')
                ->orderBy('name')
                ->limit(150)
                ->get();

            if ($products->isEmpty()) {
                $products = Product::with(['tax', 'brand', 'category', 'variants', 'batches'])
                    ->where('is_active', true)
                    ->orderBy('name')
                    ->limit(150)
                    ->get();
            }
        }

        if ($request->expectsJson()) {
            return response()->json([
                'products' => $products->map(fn (Product $product) => [
                    'id' => $product->id,
                    'name' => $product->name,
                    'generic_name' => $product->generic_name,
                    'strength' => $product->strength,
                    'dosage_form' => $product->dosage_form,
                    'pack_size' => $product->pack_size,
                    'dar_no' => $product->dar_no,
                    'route' => $product->route,
                    'prescription_required' => (bool) $product->prescription_required,
                    'brand_name' => $product->brand?->name,
                    'category_name' => $product->category?->name,
                    'code' => $product->code,
                    'barcode' => $product->barcode,
                    'price_cents' => $product->sellingPriceCents(),
                    'stock_qty' => $product->stock_qty,
                    'category_id' => $product->category_id,
                    'brand_id' => $product->brand_id,
                    'tax_bps' => (int) ($product->tax?->rate_bps ?? 0),
                    'tax_method' => $product->tax_method,
                    'image' => $product->image ? '/storage/'.$product->image : null,
                    'type' => $product->type,
                    'has_batch' => (bool) $product->has_batch,
                    'has_serial' => (bool) $product->has_serial,
                    'has_variant' => (bool) $product->has_variant,
                    'variants' => $product->variants->map(fn ($row) => [
                        'id' => $row->id,
                        'name' => $row->name,
                        'price_cents' => (int) $row->price_cents,
                        'stock_qty' => (int) $row->stock_qty,
                    ])->values(),
                    'batches' => $product->has_batch ? $product->batches->map(fn ($row) => [
                        'id' => $row->id,
                        'batch_no' => $row->batch_no,
                        'qty' => (int) $row->qty,
                        'expiry_date' => optional($row->expiry_date)->toDateString(),
                        'expired' => $row->expiry_date ? $row->expiry_date->lt(now()->startOfDay()) : false,
                    ])->values() : [],
                ])->values(),
                'categories' => Category::orderBy('name')->get(['id', 'name']),
                'brands' => Brand::orderBy('name')->limit(300)->get(['id', 'name']),
                'customers' => Customer::orderBy('name')->get(['id', 'name', 'phone', 'email', 'address']),
                'coupons' => Coupon::where('is_active', true)->get(['id', 'code', 'type', 'value']),
                'idempotency' => (string) Str::uuid(),
                'currency_symbol' => $request->user()?->store?->symbol() ?? '$',
                'currency_code' => $request->user()?->store?->currency_code ?? 'USD',
                'store' => $request->user()?->store ? [
                    'id' => $request->user()->store->id,
                    'name' => $request->user()->store->name,
                    'currency_symbol' => $request->user()->store->symbol(),
                    'currency_code' => $request->user()->store->currency_code,
                ] : null,
            ]);
        }

        return view('spa');
    }

    public function store(Request $request, CheckoutService $checkout)
    {
        $data = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer'],
            'items.*.qty' => ['required', 'integer', 'min:1'],
            'items.*.serial' => ['nullable', 'string', 'max:80'],
            'items.*.batch_id' => ['nullable', 'integer'],
            'items.*.product_variant_id' => ['nullable', 'integer'],
            'customer_id' => ['nullable', 'integer'],
            'discount' => ['nullable'],
            'coupon_code' => ['nullable', 'string', 'max:40'],
            'payment_method' => ['required', 'string', 'max:40'],
            'amount_paid' => ['nullable'],
            'status' => ['required', 'in:completed,draft'],
            'idempotency_key' => ['required', 'string', 'max:80'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $sale = $checkout->checkout($request->user(), $data, $data['items']);
        $message = $sale->status === 'draft' ? 'Draft saved.' : 'Sale completed.';

        if ($request->expectsJson()) {
            $sale->load(['items.product', 'customer', 'store', 'user']);

            return response()->json([
                'message' => $message,
                'sale' => [
                    'id' => $sale->id,
                    'invoice_no' => $sale->invoice_no,
                    'status' => $sale->status,
                    'grand_cents' => (int) $sale->grand_cents,
                    'paid_cents' => (int) $sale->paid_cents,
                    'subtotal_cents' => (int) $sale->subtotal_cents,
                    'tax_cents' => (int) $sale->tax_cents,
                    'discount_cents' => (int) $sale->discount_cents,
                    'coupon_discount_cents' => (int) $sale->coupon_discount_cents,
                    'change_cents' => max(0, (int) $sale->paid_cents - (int) $sale->grand_cents),
                    'payment_method' => $sale->payment_method,
                    'sold_at' => optional($sale->sold_at)->format('d M Y, h:i A') ?? now()->format('d M Y, h:i A'),
                    'cashier' => $sale->user?->name ?? $request->user()->name,
                    'customer' => $sale->customer ? [
                        'id' => $sale->customer->id,
                        'name' => $sale->customer->name,
                        'phone' => $sale->customer->phone,
                        'email' => $sale->customer->email,
                        'address' => $sale->customer->address,
                    ] : null,
                    'store' => [
                        'name' => $sale->store?->name ?? 'BornoPos',
                        'phone' => $sale->store?->phone,
                        'address' => $sale->store?->address,
                        'logo' => $sale->store?->logo ? '/storage/'.$sale->store->logo : null,
                        'currency_symbol' => $sale->store?->symbol() ?? '$',
                        'currency_code' => $sale->store?->currency_code ?? 'USD',
                        'invoice_footer' => Setting::withoutGlobalScopes()->where('store_id', $sale->store_id)->where('key', 'invoice_footer')->value('value'),
                    ],
                    'items' => $sale->items->map(fn ($item) => [
                        'id' => $item->id,
                        'name' => $item->product?->name ?? 'Product',
                        'code' => $item->product?->code ?? '',
                        'qty' => (int) $item->qty,
                        'price_cents' => (int) $item->price_cents,
                        'subtotal_cents' => (int) $item->subtotal_cents,
                        'serial' => $item->serial,
                    ])->values(),
                ],
            ]);
        }

        return redirect()->route('sales.show', $sale)->with('status', $message);
    }
}
