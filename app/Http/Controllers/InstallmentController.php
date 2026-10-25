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
        $perPage = max(5, min(100, (int) $request->query('per_page', 15)));
        $query = Installment::with(['plan.customer', 'plan.sale']);

        $status = $request->query('status', '');
        if ($status && $status !== 'all') {
            $query->where('status', $status);
        } else {
            $query->where('status', '!=', 'paid');
        }

        if ($request->filled('q') || $request->filled('search')) {
            $term = trim((string) ($request->input('search') ?? $request->input('q')));
            $query->where(function ($q) use ($term) {
                $q->whereHas('plan.customer', fn ($cq) => $cq->where('name', 'like', "%{$term}%"))
                    ->orWhereHas('plan.sale', fn ($sq) => $sq->where('invoice_no', 'like', "%{$term}%"));
            });
        }

        $rows = $query->orderBy('due_on')
            ->paginate($perPage)
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
                    'from' => $rows->firstItem(),
                    'to' => $rows->lastItem(),
                    'total' => $rows->total(),
                    'per_page' => $rows->perPage(),
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
