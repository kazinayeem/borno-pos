@extends('layouts.app')
@section('content')
<div class="page-title"><div><h1>Accounts</h1></div></div>
<div class="grid-2">
<section class="card">
    <table><thead><tr><th>Name</th><th>Number</th><th>Type</th><th>Balance</th></tr></thead>
    <tbody>@forelse($accounts as $account)<tr><td>{{ $account->name }}</td><td>{{ $account->number }}</td><td>{{ $account->type }}</td><td>@money($account->balance)</td></tr>@empty<tr><td colspan="4" class="empty">No accounts yet.</td></tr>@endforelse</tbody></table>
</section>
<section class="card">
    <h2>New account</h2>
    <form method="post" action="{{ route('accounts.store') }}">@csrf
        <div class="field"><label>Name</label><input name="name" required></div>
        <div class="field"><label>Number</label><input name="number"></div>
        <div class="field"><label>Type</label><select name="type"><option value="cash">Cash</option><option value="bank">Bank</option><option value="mobile">Mobile</option></select></div>
        <div class="field"><label>Opening balance</label><input name="opening" value="0.00"></div>
        <button class="btn primary">Save</button>
    </form>
</section>
</div>
@endsection
