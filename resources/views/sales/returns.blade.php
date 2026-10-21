@extends('layouts.app')
@section('content')
<div class="page-title"><div><h1>Sale Returns</h1></div>@include('partials.range')</div>
<section class="card">
    <table>
        <thead><tr><th>Date</th><th>Invoice</th><th>Total</th></tr></thead>
        <tbody>
        @forelse($returns as $return)
            <tr><td>{{ $return->returned_on->format('d M Y') }}</td><td><a href="{{ route('sales.show', $return->sale_id) }}">{{ $return->sale->invoice_no ?? $return->sale_id }}</a></td><td>@money($return->grand_cents)</td></tr>
        @empty
            <tr><td colspan="3" class="empty">No returns in this period.</td></tr>
        @endforelse
        </tbody>
    </table>
    <div class="pager">{{ $returns->links() }}</div>
</section>
@endsection
