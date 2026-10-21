@extends('layouts.app')
@section('content')
<div class="page-title"><div><div class="crumbs">Sales › {{ $title }}</div><h1>{{ $title }}</h1></div>@include('partials.range')</div>
<section class="card">
    <form method="get"><input name="q" value="{{ request('q') }}" placeholder="Search invoice or customer">@foreach(request()->only(['type','from','to']) as $key=>$value)<input type="hidden" name="{{ $key }}" value="{{ $value }}">@endforeach</form>
    <table>
        <thead><tr><th>SL</th><th>Date</th><th>Invoice</th><th>Customer</th><th>Biller</th><th>Discount</th><th>Tax</th><th>Total</th><th>Due</th><th></th></tr></thead>
        <tbody>
        @forelse($sales as $sale)
            <tr>
                <td>{{ $loop->iteration }}</td>
                <td>{{ $sale->sold_at->format('d-m-Y h:i A') }}</td>
                <td><a href="{{ route('sales.show', $sale) }}">{{ $sale->invoice_no }}</a></td>
                <td>{{ $sale->customer->name ?? 'Walk-in Customer' }}</td>
                <td>{{ $sale->user->name ?? '—' }}</td>
                <td>@money($sale->discount_cents + $sale->coupon_cents)</td>
                <td>@money($sale->tax_cents)</td>
                <td>@money($sale->grand_cents)</td>
                <td>@money($sale->dueCents())</td>
                <td><a href="{{ route('sales.print', $sale) }}">Print</a></td>
            </tr>
        @empty
            <tr><td colspan="10" class="empty">No data found</td></tr>
        @endforelse
        </tbody>
    </table>
    <div class="pager">{{ $sales->links() }}</div>
</section>
@endsection
