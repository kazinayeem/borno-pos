<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\Payroll;
use App\Services\LedgerService;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class HrmController extends Controller
{
    public function attendance(Request $request)
    {
        $query = Attendance::with('employee');

        if ($request->filled('q') || $request->filled('search')) {
            $term = trim((string) ($request->input('search') ?? $request->input('q')));
            $query->whereHas('employee', fn ($eq) => $eq->where('name', 'like', "%{$term}%"));
        }

        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->integer('employee_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        if ($request->filled('from')) {
            $query->whereDate('attended_on', '>=', $request->string('from')->toString());
        }

        if ($request->filled('to')) {
            $query->whereDate('attended_on', '<=', $request->string('to')->toString());
        }

        $perPage = max(1, min(100, $request->integer('per_page', 15)));
        $rows = $query->latest('attended_on')->paginate($perPage)->withQueryString();
        $employees = Employee::orderBy('name')->get();

        if ($request->expectsJson()) {
            $attendanceRows = $rows->getCollection()->map(fn ($r) => [
                'id' => $r->id,
                'employee_id' => $r->employee_id,
                'employee_name' => $r->employee?->name,
                'attended_on' => optional($r->attended_on)->format('Y-m-d'),
                'status' => $r->status,
                'check_in' => $r->check_in,
                'check_out' => $r->check_out,
            ]);

            return response()->json([
                'rows' => $attendanceRows,
                'data' => $attendanceRows,
                'attendance' => $attendanceRows,
                'summary' => [
                    'total' => $rows->total(),
                ],
                'meta' => [
                    'current_page' => $rows->currentPage(),
                    'last_page' => $rows->lastPage(),
                    'from' => $rows->firstItem(),
                    'to' => $rows->lastItem(),
                    'total' => $rows->total(),
                    'per_page' => $rows->perPage(),
                ],
                'employees' => $employees->map(fn ($e) => ['id' => $e->id, 'name' => $e->name]),
            ]);
        }

        return view('spa');
    }

    public function storeAttendance(Request $request)
    {
        $request->merge([
            'check_in' => $request->input('check_in') ?: null,
            'check_out' => $request->input('check_out') ?: null,
        ]);
        $data = $request->validate([
            'employee_id' => ['required', 'integer'],
            'attended_on' => ['required', 'date'],
            'status' => ['required', Rule::in(['present', 'absent', 'leave'])],
            'check_in' => ['nullable', 'date_format:H:i'],
            'check_out' => ['nullable', 'date_format:H:i'],
        ]);
        Attendance::updateOrCreate(
            ['employee_id' => $data['employee_id'], 'attended_on' => $data['attended_on']],
            $data,
        );

        if ($request->expectsJson()) {
            return response()->json(['message' => 'Attendance saved.']);
        }

        return back()->with('status', 'Attendance saved.');
    }

    public function destroyAttendance(Request $request, Attendance $attendance)
    {
        $attendance->delete();

        if ($request->expectsJson()) {
            return response()->json(['message' => 'Attendance record deleted.']);
        }

        return back()->with('status', 'Attendance record deleted.');
    }

    public function payrolls(Request $request)
    {
        $query = Payroll::with('employee');

        if ($request->filled('q') || $request->filled('search')) {
            $term = trim((string) ($request->input('search') ?? $request->input('q')));
            $query->whereHas('employee', fn ($eq) => $eq->where('name', 'like', "%{$term}%"));
        }

        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->integer('employee_id'));
        }

        if ($request->filled('month')) {
            $query->where('month', $request->string('month')->toString());
        }

        $perPage = max(1, min(100, $request->integer('per_page', 15)));
        $rows = $query->latest('paid_on')->paginate($perPage)->withQueryString();
        $employees = Employee::orderBy('name')->get();

        if ($request->expectsJson()) {
            $payrollRows = $rows->getCollection()->map(fn ($p) => [
                'id' => $p->id,
                'employee_id' => $p->employee_id,
                'employee_name' => $p->employee?->name,
                'month' => $p->month,
                'amount_cents' => (int) $p->amount_cents,
                'paid_on' => optional($p->paid_on)->format('Y-m-d'),
                'note' => $p->note,
            ]);

            return response()->json([
                'rows' => $payrollRows,
                'data' => $payrollRows,
                'payrolls' => $payrollRows,
                'meta' => [
                    'current_page' => $rows->currentPage(),
                    'last_page' => $rows->lastPage(),
                    'from' => $rows->firstItem(),
                    'to' => $rows->lastItem(),
                    'total' => $rows->total(),
                    'per_page' => $rows->perPage(),
                ],
                'employees' => $employees->map(fn ($e) => [
                    'id' => $e->id,
                    'name' => $e->name,
                    'salary_cents' => (int) $e->salary_cents,
                ]),
            ]);
        }

        return view('spa');
    }

    public function storePayroll(Request $request, LedgerService $ledger)
    {
        $data = $request->validate([
            'employee_id' => ['required', 'integer'],
            'month' => ['required', 'date_format:Y-m'],
            'amount' => ['required'],
            'paid_on' => ['required', 'date'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);
        $amount = Money::parse($data['amount']);
        if (Payroll::where('employee_id', $data['employee_id'])->where('month', $data['month'])->exists()) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Payroll for that month already exists.', 'errors' => ['month' => ['Payroll for that month already exists.']]], 422);
            }

            return back()->withErrors(['month' => 'Payroll for that month already exists.'])->withInput();
        }
        $account = $ledger->defaultAccount((int) $request->user()->store_id);
        $payroll = Payroll::create([
            'employee_id' => $data['employee_id'],
            'account_id' => $account->id,
            'user_id' => $request->user()->id,
            'month' => $data['month'],
            'amount_cents' => $amount,
            'paid_on' => $data['paid_on'],
            'note' => $data['note'] ?? null,
        ]);
        $ledger->post($account, 'credit', $amount, 'payroll:'.$payroll->id, 'Salary '.$payroll->month, $payroll, $payroll->paid_on, $request->user());

        if ($request->expectsJson()) {
            return response()->json(['message' => 'Payroll recorded. It is included in salary cost, not in expenses.']);
        }

        return back()->with('status', 'Payroll recorded. It is included in salary cost, not in expenses.');
    }

    public function destroyPayroll(Request $request, Payroll $payroll, LedgerService $ledger)
    {
        DB::transaction(function () use ($payroll, $request, $ledger) {
            $account = Account::find($payroll->account_id) ?? $ledger->defaultAccount((int) $request->user()->store_id);
            $ledger->post($account, 'debit', $payroll->amount_cents, 'payroll:'.$payroll->id.':reversal', 'Reversal of Salary '.$payroll->month, $payroll, now()->toDateString(), $request->user());
            $payroll->delete();
        });

        if ($request->expectsJson()) {
            return response()->json(['message' => 'Payroll deleted and ledger reversed.']);
        }

        return back()->with('status', 'Payroll deleted and ledger reversed.');
    }
}
