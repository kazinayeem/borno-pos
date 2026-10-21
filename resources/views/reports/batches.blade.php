@extends('layouts.app')
@section('content')
<div class="page-title"><div><h1>Batches</h1></div></div>
<section class="card"><table><thead><tr><th>Product</th><th>Batch</th><th>Expiry</th><th>Qty</th></tr></thead>
<tbody>@forelse($rows as $row)<tr><td>{{ $row->product->name ?? '—' }}</td><td>{{ $row->batch_no }}</td><td>{{ optional($row->expiry_date)->format('d M Y') ?: '—' }}</td><td>{{ $row->qty }}</td></tr>@empty<tr><td colspan="4" class="empty">No batches yet. Add a batch number on a purchase.</td></tr>@endforelse</tbody></table>{{ $rows->links() }}</section>
@endsection
