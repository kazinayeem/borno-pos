@extends('layouts.app')
@section('content')
<div class="page-title"><div><h1>Product Report</h1></div></div>
<section class="card"><table><thead><tr><th>Product</th><th>Category</th><th>Stock</th><th>Cost</th><th>Inventory value</th></tr></thead>
<tbody>@foreach($rows as $row)<tr><td>{{ $row->name }}</td><td>{{ $row->category->name ?? '—' }}</td><td><span class="badge {{ $row->isLowStock() ? 'bad' : 'ok' }}">{{ $row->stock_qty }}</span></td><td>@money($row->cost_cents)</td><td>@money($row->stock_qty * $row->cost_cents)</td></tr>@endforeach</tbody></table>{{ $rows->links() }}</section>
@endsection
