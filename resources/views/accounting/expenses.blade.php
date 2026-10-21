@extends('layouts.app')
@section('content')
<div class="page-title"><div><h1>Expense</h1></div>@include('partials.range')</div>
<div class="grid-2">
<section class="card">
    <form method="post" action="{{ route('expenses.store') }}" enctype="multipart/form-data" data-once>@csrf
        <div class="field"><label>Category</label><select name="expense_category_id" required>@foreach($categories as $category)<option value="{{ $category->id }}">{{ $category->name }}</option>@endforeach</select></div>
        <div class="field"><label>Account</label><select name="account_id"><option value="">Default cash</option>@foreach($accounts as $account)<option value="{{ $account->id }}">{{ $account->name }}</option>@endforeach</select></div>
        <div class="field"><label>Date</label><input type="date" name="spent_on" value="{{ now()->toDateString() }}" required></div>
        <div class="field"><label>Amount</label><input name="amount" required></div>
        <div class="field"><label>Note</label><input name="note"></div>
        <div class="field"><label>Attachment</label><input type="file" name="attachment"></div>
        <button class="btn primary">Save expense</button>
    </form>
</section>
<section class="card">
    <table><thead><tr><th>Date</th><th>Category</th><th>Note</th><th>Amount</th></tr></thead>
    <tbody>@forelse($expenses as $expense)<tr><td>{{ $expense->spent_on->format('d M Y') }}</td><td>{{ $expense->category->name ?? '—' }}</td><td>{{ $expense->note }}</td><td>@money($expense->amount_cents)</td></tr>@empty<tr><td colspan="4" class="empty">No expenses in this period.</td></tr>@endforelse</tbody></table>
    {{ $expenses->links() }}
</section>
</div>
@endsection
