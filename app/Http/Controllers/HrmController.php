<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\Employee;
use App\Models\Payroll;
use App\Services\LedgerService;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class HrmController extends Controller
{
    public function attendance()
    {
        return view('hrm.attendance', [
            'rows' => Attendance::with('employee')->latest('attended_on')->paginate(15),
            'employees' => Employee::orderBy('name')->get(),
        ]);
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

        return back()->with('status', 'Attendance saved.');
    }

    public function payrolls()
    {
        return view('hrm.payrolls', [
            'rows' => Payroll::with('employee')->latest()->paginate(15),
            'employees' => Employee::orderBy('name')->get(),
        ]);
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

        return back()->with('status', 'Payroll recorded. It is included in salary cost, not in expenses.');
    }
}
