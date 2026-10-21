<?php

namespace App\Http\Controllers;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Coupon;
use App\Models\Customer;
use App\Models\Product;
use App\Services\CheckoutService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PosController extends Controller
{
    public function index()
    {
        $products = Product::with('tax')
            ->where('is_active', true)
            ->where('featured_in_pos', true)
            ->orderBy('name')
            ->get();

        return view('pos.index', [
            'products' => $products,
            'categories' => Category::withCount(['products' => fn ($q) => $q->where('is_active', true)])->orderBy('name')->get(),
            'brands' => Brand::withCount(['products' => fn ($q) => $q->where('is_active', true)])->orderBy('name')->get(),
            'customers' => Customer::orderBy('name')->get(),
            'coupons' => Coupon::where('is_active', true)->get(),
            'idempotency' => (string) Str::uuid(),
        ]);
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

        return redirect()->route('sales.show', $sale)->with('status', $message);
    }
}
