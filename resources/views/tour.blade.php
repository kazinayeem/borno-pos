@extends('layouts.app')
@section('content')
<div class="page-title"><div><h1>Take a Tour</h1></div></div>
<section class="card">
    <ol>
        <li><a href="{{ route('products.create') }}">Add a product</a> with a code, price, and optional photo.</li>
        <li><a href="{{ route('purchases.create') }}">Record a purchase</a> so stock increases.</li>
        <li><a href="{{ route('pos') }}">Open POS</a>, add items, take cash, and save the invoice.</li>
        <li><a href="{{ route('sales.index') }}">Review the sale</a>, print the receipt, or return items.</li>
        <li><a href="{{ route('reports.profit') }}">Check profit</a> for the same dates as the dashboard.</li>
    </ol>
</section>
@endsection
