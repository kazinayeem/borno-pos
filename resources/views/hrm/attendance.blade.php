@extends('layouts.app')
@section('content')
<div class="page-title">
    <div>
        <h1>Attendance Management</h1>
        <p class="muted">Record and audit staff daily attendance, working hours, and absences</p>
    </div>
</div>

@if(session('status'))
    <div class="card" style="margin-bottom: 16px; background: #ecfdf5; color: #065f46; border-left: 4px solid #10b981; padding: 12px 16px;">
        {{ session('status') }}
    </div>
@endif

@if($errors->any())
    <div class="card" style="margin-bottom: 16px; background: #fef2f2; color: #991b1b; border-left: 4px solid #ef4444; padding: 12px 16px;">
        <ul style="margin: 0; padding-left: 20px;">
            @foreach($errors->all() as $err)
                <li>{{ $err }}</li>
            @endforeach
        </ul>
    </div>
@endif

<!-- Filter Bar -->
<section class="card" style="margin-bottom: 16px; padding: 16px;">
    <form method="get" action="{{ route('attendance') }}" style="display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-end;">
        <div style="flex: 1; min-width: 160px;">
            <label style="font-size: 0.85rem; font-weight: 600;">Employee</label>
            <select name="employee_id" style="width: 100%;">
                <option value="">All Employees</option>
                @foreach($employees as $employee)
                    <option value="{{ $employee->id }}" {{ request('employee_id') == $employee->id ? 'selected' : '' }}>
                        {{ $employee->name }}
                    </option>
                @endforeach
            </select>
        </div>
        <div style="width: 140px;">
            <label style="font-size: 0.85rem; font-weight: 600;">Status</label>
            <select name="status" style="width: 100%;">
                <option value="">All Statuses</option>
                <option value="present" {{ request('status') == 'present' ? 'selected' : '' }}>Present</option>
                <option value="absent" {{ request('status') == 'absent' ? 'selected' : '' }}>Absent</option>
                <option value="leave" {{ request('status') == 'leave' ? 'selected' : '' }}>Leave</option>
            </select>
        </div>
        <div style="width: 140px;">
            <label style="font-size: 0.85rem; font-weight: 600;">From</label>
            <input type="date" name="from" value="{{ request('from') }}" style="width: 100%;">
        </div>
        <div style="width: 140px;">
            <label style="font-size: 0.85rem; font-weight: 600;">To</label>
            <input type="date" name="to" value="{{ request('to') }}" style="width: 100%;">
        </div>
        <div style="display: flex; gap: 6px;">
            <button type="submit" class="btn primary">Filter</button>
            <a href="{{ route('attendance') }}" class="btn">Reset</a>
        </div>
    </form>
</section>

<div class="grid-2">
    <section class="card">
        <h2 style="margin-top: 0;">Log Daily Attendance</h2>
        <form method="post" action="{{ route('attendance.store') }}">@csrf
            <div class="field">
                <label>Employee</label>
                <select name="employee_id" required>
                    @foreach($employees as $employee)
                        <option value="{{ $employee->id }}">{{ $employee->name }}</option>
                    @endforeach
                </select>
            </div>
            <div class="field">
                <label>Date</label>
                <input type="date" name="attended_on" value="{{ now()->toDateString() }}" required>
            </div>
            <div class="field">
                <label>Status</label>
                <select name="status">
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="leave">Leave</option>
                </select>
            </div>
            <div class="field">
                <label>Check in</label>
                <input name="check_in" placeholder="09:00">
            </div>
            <div class="field">
                <label>Check out</label>
                <input name="check_out" placeholder="18:00">
            </div>
            <button class="btn primary">Save Attendance</button>
        </form>
    </section>

    <section class="card table-card">
        <h2 style="margin-top: 0; padding: 16px 16px 0;">Attendance History</h2>
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Employee</th>
                    <th>Status</th>
                    <th>In</th>
                    <th>Out</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                @forelse($rows as $row)
                    <tr>
                        <td>{{ $row->attended_on->format('d M Y') }}</td>
                        <td><strong>{{ $row->employee->name }}</strong></td>
                        <td>
                            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 600;
                                background: {{ $row->status === 'present' ? '#dcfce7' : ($row->status === 'absent' ? '#fee2e2' : '#fef3c7') }};
                                color: {{ $row->status === 'present' ? '#15803d' : ($row->status === 'absent' ? '#b91c1c' : '#92400e') }};">
                                {{ ucfirst($row->status) }}
                            </span>
                        </td>
                        <td>{{ $row->check_in ?: '—' }}</td>
                        <td>{{ $row->check_out ?: '—' }}</td>
                        <td>
                            <form method="post" action="{{ route('attendance.destroy', $row) }}" onsubmit="return confirm('Delete this attendance entry?');" style="display: inline;">
                                @csrf
                                @method('DELETE')
                                <button type="submit" class="btn" style="color: #ef4444; padding: 2px 8px; font-size: 0.8rem;">Delete</button>
                            </form>
                        </td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="6" class="empty">No attendance records found matching criteria.</td>
                    </tr>
                @endforelse
            </tbody>
        </table>
        <div style="padding: 12px 16px;">
            {{ $rows->links() }}
        </div>
    </section>
</div>
@endsection

