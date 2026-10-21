@extends('layouts.app')
@section('content')
<div class="page-title"><div><h1>Purchase Report</h1></div>@include('partials.range')</div>
<section class="card"><table><thead><tr><th>Date</th><th>Reference</th><th>Supplier</th><th>Total</th><th>Due</th></tr></thead>
<tbody>@forelse($rows as $row)<tr><td>{{ $row->purchased_on->format('d M Y') }}</td><td>{{ $row->reference }}</td><td>{{ $row->supplier->name ?? '—' }}</td><td>@money($row->grand_cents)</td><td>@money($row->dueCents())</td></tr>@empty<tr><td colspan="5" class="empty">No purchases.</td></tr>@endforelse</tbody></table>{{ $rows->links() }}</section>
@endsection
