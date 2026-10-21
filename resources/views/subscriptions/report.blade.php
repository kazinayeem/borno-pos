@extends('layouts.app')
@section('content')
<div class="page-title"><div><h1>Subscription Report</h1></div></div>
<section class="card"><table><thead><tr><th>Shop</th><th>Plan</th><th>Status</th><th>Payment</th><th>Amount</th><th></th></tr></thead>
<tbody>@forelse($rows as $row)
<tr><td>{{ $row->store->name ?? '—' }}</td><td>{{ $row->plan->name ?? '—' }}</td><td>{{ $row->status }}</td><td>{{ $row->payment_status }}</td><td>@money($row->amount_cents)</td>
<td>@if(auth()->user()->isSuperAdmin() && $row->payment_status !== 'paid')<form method="post" action="{{ route('subscriptions.activate', $row) }}">@csrf<button class="btn">Mark paid manually</button></form>@endif</td></tr>
@empty<tr><td colspan="6" class="empty">No subscriptions.</td></tr>@endforelse</tbody></table>{{ $rows->links() }}</section>
@endsection
