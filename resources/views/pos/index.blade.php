@extends('layouts.app')
@php
    $payload = [
        'symbol' => $moneySymbol,
        'products' => $products->map(fn ($product) => [
            'id' => $product->id,
            'name' => $product->name,
            'code' => $product->code,
            'price' => $product->sellingPriceCents(),
            'stock' => (int) $product->stock_qty,
            'category_id' => $product->category_id,
            'brand_id' => $product->brand_id,
            'image' => $product->image ? asset('storage/'.$product->image) : null,
            'tax_bps' => $product->tax_method === 'exclusive' ? (int) ($product->tax->rate_bps ?? 0) : 0,
        ])->values(),
        'customers' => $customers,
    ];
@endphp
@section('content')
<form method="post" action="{{ route('pos.store') }}" data-once x-data="pos({{ \Illuminate\Support\Js::from($payload) }})">
    @csrf
    <input type="hidden" name="idempotency_key" value="{{ $idempotency }}">
    <input type="hidden" name="discount" :value="discount">
    <input type="hidden" name="amount_paid" :value="paidValue()">
    <input type="hidden" name="payment_method" :value="method">
    <input type="hidden" name="customer_id" :value="customerId">
    <input type="hidden" name="coupon_code" :value="coupon">
    <template x-for="(line, index) in cart" :key="line.product_id">
        <span>
            <input type="hidden" :name="`items[${index}][product_id]`" :value="line.product_id">
            <input type="hidden" :name="`items[${index}][qty]`" :value="line.qty">
        </span>
    </template>
    <div class="pos-shell">
        <aside class="card">
            <button type="button" class="btn" :class="brand==='all' && category==='all' ? 'primary' : ''" @click="category='all'; brand='all'">All Products</button>
            <h2>Categories</h2>
            @foreach($categories as $category)
                <button type="button" class="btn" style="width:100%;justify-content:space-between;margin-top:6px" @click="category={{ $category->id }}; brand='all'">{{ $category->name }} <span>{{ $category->products_count }}</span></button>
            @endforeach
            <h2>Brands</h2>
            @foreach($brands as $brand)
                <button type="button" class="btn" style="width:100%;justify-content:space-between;margin-top:6px" @click="brand={{ $brand->id }}; category='all'">{{ $brand->name }} <span>{{ $brand->products_count }}</span></button>
            @endforeach
        </aside>
        <section class="card">
            <div class="card-head">
                <h2>Products</h2>
                <input placeholder="Search by name, code or barcode" x-model="query" style="border:1px solid #dbe3ee;border-radius:12px;padding:8px 10px">
            </div>
            <div class="product-grid">
                <template x-for="product in filtered()" :key="product.id">
                    <article class="product-card">
                        <div class="thumb" :style="product.image ? `background-image:url('${product.image}')` : ''"></div>
                        <strong x-text="product.name"></strong>
                        <div class="muted" x-text="product.code"></div>
                        <div>In Stock: <span x-text="product.stock" :style="product.stock < 1 ? 'color:#e11d48' : 'color:#15803d'"></span></div>
                        <div style="display:flex;justify-content:space-between;align-items:center">
                            <b x-text="money(product.price)"></b>
                            <button class="btn primary" type="button" @click="add(product)">+</button>
                        </div>
                    </article>
                </template>
            </div>
        </section>
        <aside class="card">
            <div class="field"><label>Customer</label>
                <select x-model="customerId">
                    <option value="">Walk-in customer</option>
                    @foreach($customers as $customer)<option value="{{ $customer->id }}">{{ $customer->name }} {{ $customer->phone }}</option>@endforeach
                </select>
            </div>
            <table>
                <thead><tr><th>Product</th><th>Price</th><th>QTY</th><th></th></tr></thead>
                <tbody>
                    <template x-for="line in cart" :key="line.product_id">
                        <tr>
                            <td x-text="line.name"></td>
                            <td x-text="money(line.price)"></td>
                            <td><input type="number" min="1" :max="line.stock" x-model.number="line.qty" style="width:64px"></td>
                            <td><button type="button" @click="cart = cart.filter(item => item.product_id !== line.product_id)">✕</button></td>
                        </tr>
                    </template>
                </tbody>
            </table>
            <p x-show="cart.length===0" class="empty">No products added yet</p>
            <div style="display:flex;justify-content:space-between"><span>Total Products</span><span x-text="cart.reduce((s,l)=>s+l.qty,0)"></span></div>
            <div style="display:flex;justify-content:space-between"><span>Total Amount</span><span x-text="money(subtotal())"></span></div>
            <div class="field"><label>Discount</label><input x-model="discount" inputmode="decimal"></div>
            <div class="field"><label>Coupon</label><input x-model="coupon" placeholder="Apply coupon"></div>
            <div style="display:flex;justify-content:space-between"><span>Tax</span><span x-text="money(tax())"></span></div>
            <div class="btn primary" style="width:100%;margin:8px 0">Grand Total <span x-text="money(grand())" style="margin-left:auto"></span></div>
            <div class="filters">
                <button type="button" class="btn" :class="method==='Cash'?'primary':''" @click="method='Cash'">Cash</button>
                <button type="button" class="btn" :class="method==='paystack'?'primary':''" @click="method='paystack'">paystack</button>
                <button type="button" class="btn" :class="method==='Razorpay'?'primary':''" @click="method='Razorpay'">Razorpay</button>
                <button type="button" class="btn" :class="method==='PayPal'?'primary':''" @click="method='PayPal'">PayPal</button>
                <button type="button" class="btn" :class="method==='stripe'?'primary':''" @click="method='stripe'">stripe</button>
            </div>
            <p class="muted">These names match the checkout row. BornoPos only records the tender. It does not charge Paystack, Razorpay, PayPal, or Stripe.</p>
            <div class="field" x-show="method==='Cash'"><label>Cash received</label><input x-model="tendered" inputmode="decimal" placeholder="0.00"></div>
            <div x-show="method==='Cash'">Change <strong x-text="money(Math.max(0, change()))"></strong></div>
            <div class="filters" style="margin-top:10px">
                <a class="btn" href="{{ route('store.dashboard') }}">Cancel</a>
                <button class="btn" type="submit" name="status" value="draft" style="background:#fbbf24">Draft</button>
                <button class="btn primary" type="submit" name="status" value="completed" :disabled="cart.length===0">Save & Complete</button>
            </div>
        </aside>
    </div>
</form>
@endsection
@push('scripts')
<script src="{{ asset('js/pos.js') }}"></script>
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.14.1/dist/cdn.min.js"></script>
@endpush
