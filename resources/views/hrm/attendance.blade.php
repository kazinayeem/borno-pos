@extends('layouts.app')
@section('content')
<div class="page-title"><div><h1>Attendance</h1></div></div>
<div class="grid-2">
<section class="card"><form method="post" action="{{ route('attendance.store') }}">@csrf
    <div class="field"><label>Employee</label><select name="employee_id">@foreach($employees as $employee)<option value="{{ $employee->id }}">{{ $employee->name }}</option>@endforeach</select></div>
    <div class="field"><label>Date</label><input type="date" name="attended_on" value="{{ now()->toDateString() }}"></div>
    <div class="field"><label>Status</label><select name="status"><option>present</option><option>absent</option><option>leave</option></select></div>
    <div class="field"><label>Check in</label><input name="check_in" placeholder="09:00"></div>
    <div class="field"><label>Check out</label><input name="check_out" placeholder="18:00"></div>
    <button class="btn primary">Save</button>
</form></section>
<section class="card"><table><thead><tr><th>Date</th><th>Employee</th><th>Status</th><th>In</th><th>Out</th></tr></thead>
<tbody>@forelse($rows as $row)<tr><td>{{ $row->attended_on->format('d M Y') }}</td><td>{{ $row->employee->name }}</td><td>{{ $row->status }}</td><td>{{ $row->check_in }}</td><td>{{ $row->check_out }}</td></tr>@empty<tr><td colspan="5" class="empty">No attendance yet.</td></tr>@endforelse</tbody></table>{{ $rows->links() }}</section>
</div>
@endsection
