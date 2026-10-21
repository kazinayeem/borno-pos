@extends('layouts.app')
@section('content')
<div class="page-title"><div><h1>Expense Report</h1></div>@include('partials.range')</div>
<section class="card"><table><thead><tr><th>Date</th><th>Category</th><th>Amount</th></tr></thead>
<tbody>@forelse($rows as $row)<tr><td>{{ $row->spent_on->format('d M Y') }}</td><td>{{ $row->category->name ?? '—' }}</td><td>@money($row->amount_cents)</td></tr>@empty<tr><td colspan="3" class="empty">No expenses.</td></tr>@endforelse</tbody></table>{{ $rows->links() }}</section>
@endsection
