@extends('layouts.app')
@section('content')
<div class="page-title">
    <div>
        <h1>Payroll Management</h1>
        <p class="muted">Disburse staff salaries, track monthly payments, and maintain ledger auditability</p>
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
    <form method="get" action="{{ route('payrolls') }}" style="display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-end;">
        <div style="flex: 1; min-width: 180px;">
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
        <div style="width: 160px;">
            <label style="font-size: 0.85rem; font-weight: 600;">Month</label>
            <input type="text" name="month" value="{{ request('month') }}" placeholder="YYYY-MM (e.g. 2026-10)" style="width: 100%;">
        </div>
        <div style="display: flex; gap: 6px;">
            <button type="submit" class="btn primary">Filter</button>
            <a href="{{ route('payrolls') }}" class="btn">Reset</a>
        </div>
    </form>
</section>

<div class="grid-2">
    <section class="card">
        <h2 style="margin-top: 0;">Disburse Salary</h2>
        <form method="post" action="{{ route('payrolls.store') }}" data-once>@csrf
            <div class="field">
                <label>Employee</label>
                <select name="employee_id" required>
                    @foreach($employees as $employee)
                        <option value="{{ $employee->id }}">{{ $employee->name }}</option>
                    @endforeach
                </select>
            </div>
            <div class="field">
                <label>Month</label>
                <input name="month" placeholder="2026-10" value="{{ now()->format('Y-m') }}" required>
            </div>
            <div class="field">
                <label>Amount</label>
                <input name="amount" placeholder="0.00" required>
            </div>
            <div class="field">
                <label>Paid on</label>
                <input type="date" name="paid_on" value="{{ now()->toDateString() }}" required>
            </div>
            <div class="field">
                <label>Note</label>
                <input name="note" placeholder="Monthly salary disbursement">
            </div>
            <button class="btn primary">Disburse Salary</button>
        </form>
    </section>

    <section class="card table-card">
        <h2 style="margin-top: 0; padding: 16px 16px 0;">Payroll Records</h2>
        <table>
            <thead>
                <tr>
                    <th>Month</th>
                    <th>Employee</th>
                    <th>Paid On</th>
                    <th>Amount</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                @forelse($rows as $row)
                    <tr>
                        <td><strong>{{ $row->month }}</strong></td>
                        <td>{{ $row->employee->name }}</td>
                        <td>{{ $row->paid_on->format('d M Y') }}</td>
                        <td style="font-weight: 600; color: #047857;">@money($row->amount_cents)</td>
                        <td>
                            <form method="post" action="{{ route('payrolls.destroy', $row) }}" onsubmit="return confirm('Reverse this payroll payment? Associated ledger entries will be reversed.');" style="display: inline;">
                                @csrf
                                @method('DELETE')
                                <button type="submit" class="btn" style="color: #ef4444; padding: 2px 8px; font-size: 0.8rem;">Reverse</button>
                            </form>
                        </td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="5" class="empty">No payroll records found.</td>
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

