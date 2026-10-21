@extends('layouts.app')
@section('content')
<div class="page-title"><div><h1>Search</h1><div class="muted">{{ $term }}</div></div></div>
<section class="card"><h2>Products</h2>@forelse($products as $product)<div><a href="{{ route('products.show', $product) }}">{{ $product->name }}</a> · {{ $product->code }}</div>@empty<div class="empty">No products</div>@endforelse</section>
<section class="card" style="margin-top:12px"><h2>Customers</h2>@forelse($customers as $customer)<div>{{ $customer->name }} · {{ $customer->phone }}</div>@empty<div class="empty">No customers</div>@endforelse</section>
<section class="card" style="margin-top:12px"><h2>Invoices</h2>@forelse($sales as $sale)<div><a href="{{ route('sales.show', $sale) }}">{{ $sale->invoice_no }}</a> · @money($sale->grand_cents)</div>@empty<div class="empty">No invoices</div>@endforelse</section>
@endsection
