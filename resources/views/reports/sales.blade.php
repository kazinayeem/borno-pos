@extends('layouts.app')
@section('content')
<div class="page-title"><div><h1>Sales Report</h1></div>@include('partials.range')</div>
<section class="card"><table><thead><tr><th>Date</th><th>Invoice</th><th>Customer</th><th>Total</th><th>Due</th></tr></thead>
<tbody>@forelse($rows as $row)<tr><td>{{ $row->sold_at->format('d M Y') }}</td><td><a href="{{ route('sales.show', $row) }}">{{ $row->invoice_no }}</a></td><td>{{ $row->customer->name ?? 'Walk-in' }}</td><td>@money($row->grand_cents)</td><td>@money($row->dueCents())</td></tr>@empty<tr><td colspan="5" class="empty">No sales.</td></tr>@endforelse</tbody></table>{{ $rows->links() }}</section>
@endsection
