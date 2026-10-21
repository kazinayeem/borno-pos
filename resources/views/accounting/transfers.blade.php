@extends('layouts.app')
@section('content')
<div class="page-title"><div><h1>Money Transfer</h1></div></div>
<div class="grid-2">
<section class="card">
    <form method="post" action="{{ route('transfers.store') }}" data-once>@csrf
        <div class="field"><label>From</label><select name="from_account_id">@foreach($accounts as $account)<option value="{{ $account->id }}">{{ $account->name }}</option>@endforeach</select></div>
        <div class="field"><label>To</label><select name="to_account_id">@foreach($accounts as $account)<option value="{{ $account->id }}">{{ $account->name }}</option>@endforeach</select></div>
        <div class="field"><label>Amount</label><input name="amount" required></div>
        <div class="field"><label>Date</label><input type="date" name="transferred_on" value="{{ now()->toDateString() }}" required></div>
        <div class="field"><label>Note</label><input name="note"></div>
        <button class="btn primary">Transfer</button>
    </form>
</section>
<section class="card">
    <table><thead><tr><th>Date</th><th>From</th><th>To</th><th>Amount</th></tr></thead>
    <tbody>@forelse($transfers as $transfer)<tr><td>{{ $transfer->transferred_on->format('d M Y') }}</td><td>{{ $transfer->fromAccount->name }}</td><td>{{ $transfer->toAccount->name }}</td><td>@money($transfer->amount_cents)</td></tr>@empty<tr><td colspan="4" class="empty">No transfers yet.</td></tr>@endforelse</tbody></table>
    {{ $transfers->links() }}
</section>
</div>
@endsection
