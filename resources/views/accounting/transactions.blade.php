@extends('layouts.app')
@section('content')
<div class="page-title"><div><h1>Transactions</h1></div></div>
<section class="card">
    <table><thead><tr><th>Date</th><th>Account</th><th>Description</th><th>Direction</th><th>Amount</th></tr></thead>
    <tbody>@foreach($transactions as $row)<tr><td>{{ $row->transacted_on->format('d M Y') }}</td><td>{{ $row->account->name ?? '' }}</td><td>{{ $row->description }}</td><td>{{ $row->direction }}</td><td>@money($row->amount_cents)</td></tr>@endforeach</tbody></table>
    {{ $transactions->links() }}
</section>
@endsection
