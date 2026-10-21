@extends('layouts.app')
@section('content')
<div class="page-title"><div><h1>Payrolls</h1></div></div>
<div class="grid-2">
<section class="card"><form method="post" action="{{ route('payrolls.store') }}" data-once>@csrf
    <div class="field"><label>Employee</label><select name="employee_id">@foreach($employees as $employee)<option value="{{ $employee->id }}">{{ $employee->name }}</option>@endforeach</select></div>
    <div class="field"><label>Month</label><input name="month" placeholder="2026-10" required></div>
    <div class="field"><label>Amount</label><input name="amount" required></div>
    <div class="field"><label>Paid on</label><input type="date" name="paid_on" value="{{ now()->toDateString() }}"></div>
    <div class="field"><label>Note</label><input name="note"></div>
    <button class="btn primary">Pay salary</button>
</form></section>
<section class="card"><table><thead><tr><th>Month</th><th>Employee</th><th>Paid</th><th>Amount</th></tr></thead>
<tbody>@forelse($rows as $row)<tr><td>{{ $row->month }}</td><td>{{ $row->employee->name }}</td><td>{{ $row->paid_on->format('d M Y') }}</td><td>@money($row->amount_cents)</td></tr>@empty<tr><td colspan="4" class="empty">No payroll yet.</td></tr>@endforelse</tbody></table>{{ $rows->links() }}</section>
</div>
@endsection
