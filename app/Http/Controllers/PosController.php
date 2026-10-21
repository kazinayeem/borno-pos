<?php

namespace App\Http\Controllers;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Coupon;
use App\Models\Customer;
use App\Models\Product;
use App\Services\CheckoutService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class PosController extends Controller
{
    public function index(Request $request)
    {
        $products = Product::with('tax')
            ->where('is_active', true)
            ->where('featured_in_pos', true)
            ->orderBy('name')
            ->get();

        if ($request->expectsJson()) {
            return response()->json([
                'products' => $products->map(fn (Product $product) => [
                    'id' => $product->id,
                    'name' => $product->name,
                    'code' => $product->code,
                    'price_cents' => $product->sellingPriceCents(),
                    'stock_qty' => $product->stock_qty,
                    'category_id' => $product->category_id,
                    'brand_id' => $product->brand_id,
                    'tax_bps' => (int) ($product->tax?->rate_bps ?? 0),
                    'tax_method' => $product->tax_method,
                    'image' => $product->image ? Storage::disk('public')->url($product->image) : null,
                ])->values(),
                'categories' => Category::orderBy('name')->get(['id', 'name']),
                'brands' => Brand::orderBy('name')->get(['id', 'name']),
                'customers' => Customer::orderBy('name')->get(['id', 'name']),
                'coupons' => Coupon::where('is_active', true)->get(['id', 'code', 'type', 'value']),
                'idempotency' => (string) Str::uuid(),
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
            return response()->json([
                'message' => $message,
                'sale' => [
                    'id' => $sale->id,
                    'invoice_no' => $sale->invoice_no,
                    'status' => $sale->status,
                    'grand_cents' => $sale->grand_cents,
                    'paid_cents' => $sale->paid_cents,
                ],
            ]);
        }

        return redirect()->route('sales.show', $sale)->with('status', $message);
    }
}
