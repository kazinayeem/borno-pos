<?php

namespace App\Http\Controllers;

use App\Models\Installment;
use App\Models\Sale;
use App\Services\InstallmentService;
use App\Support\Money;
use Illuminate\Http\Request;

class InstallmentController extends Controller
{
    public function index(Request $request)
    {
        $rows = Installment::with(['plan.customer', 'plan.sale'])
            ->where('status', '!=', 'paid')
            ->orderBy('due_on')
            ->paginate(15)
            ->withQueryString();

        if ($request->expectsJson()) {
            return response()->json([
                'data' => $rows->getCollection()->map(fn (Installment $row) => [
                    'id' => $row->id,
                    'sequence' => $row->sequence,
                    'due_on' => optional($row->due_on)->toDateString(),
                    'amount_cents' => $row->amount_cents,
                    'paid_cents' => $row->paid_cents,
                    'due_cents' => $row->dueCents(),
                    'status' => $row->status,
                    'customer' => $row->plan?->customer?->name,
                    'invoice_no' => $row->plan?->sale?->invoice_no,
                    'sale_id' => $row->plan?->sale_id,
                    'fee_cents' => $row->plan?->fee_cents,
                ])->values(),
                'meta' => [
                    'current_page' => $rows->currentPage(),
                    'last_page' => $rows->lastPage(),
                    'total' => $rows->total(),
                ],
            ]);
        }

        return view('spa');
    }

    public function store(Request $request, Sale $sale, InstallmentService $installments)
    {
        $data = $request->validate([
            'count' => ['required', 'integer', 'min:1', 'max:24'],
            'first_due' => ['required', 'date'],
            'fee' => ['nullable'],
        ]);
        $plan = $installments->schedule($sale, $data);

        return response()->json([
            'message' => 'Installment schedule saved. This is a payment plan for the sale, not a loan or credit approval.',
            'plan' => $plan,
        ]);
    }

    public function pay(Request $request, Installment $installment, InstallmentService $installments)
    {
        $data = $request->validate([
            'amount' => ['required'],
            'payment_method' => ['nullable', 'string', 'max:40'],
        ]);
        $row = $installments->pay($installment, $request->user(), Money::parse($data['amount']), $data['payment_method'] ?? 'Cash');

        return response()->json([
            'message' => 'Installment payment recorded.',
            'installment' => $row,
        ]);
    }
}
