<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\AuditLog;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Supplier;
use App\Models\Warehouse;
use App\Services\PurchaseService;
use App\Support\Money;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PurchaseController extends Controller
{
    public function index(Request $request)
    {
        $query = $this->buildPurchasesQuery($request);

        // Calculate payables summary before pagination
        $summary = $this->calculateSummary(clone $query);

        // Sorting
        $sortBy = $request->input('sort_by', 'purchased_on');
        $sortDirection = strtolower($request->input('sort_direction', 'desc')) === 'asc' ? 'asc' : 'desc';

        if ($sortBy === 'supplier') {
            $query->leftJoin('suppliers', 'purchases.supplier_id', '=', 'suppliers.id')
                ->orderBy('suppliers.name', $sortDirection)
                ->select('purchases.*');
        } elseif ($sortBy === 'due_cents' || $sortBy === 'due') {
            $query->orderByRaw('(purchases.grand_cents - purchases.paid_cents) '.$sortDirection);
        } elseif (in_array($sortBy, ['reference', 'grand_cents', 'paid_cents', 'purchased_on', 'status', 'created_at'])) {
            $query->orderBy('purchases.'.$sortBy, $sortDirection);
        } else {
            $query->latest('purchases.purchased_on')->latest('purchases.id');
        }

        $perPage = (int) $request->input('per_page', 10);
        if (! in_array($perPage, [10, 25, 50, 100], true)) {
            $perPage = 10;
        }

        $purchases = $query->paginate($perPage)->withQueryString();

        if ($request->expectsJson()) {
            $storeId = $request->user()->store_id;

            return response()->json([
                'data' => $purchases->getCollection()->map(fn (Purchase $purchase) => [
                    'id' => $purchase->id,
                    'reference' => $purchase->reference,
                    'supplier_id' => $purchase->supplier_id,
                    'supplier' => $purchase->supplier?->name,
                    'supplier_phone' => $purchase->supplier?->phone,
                    'supplier_company' => $purchase->supplier?->company,
                    'warehouse' => $purchase->warehouse?->name,
                    'status' => $purchase->status,
                    'payment_status' => $this->resolvePaymentStatus($purchase),
                    'grand_cents' => (int) $purchase->grand_cents,
                    'paid_cents' => (int) $purchase->paid_cents,
                    'due_cents' => $purchase->dueCents(),
                    'purchased_on' => optional($purchase->purchased_on)->toDateString(),
                    'created_by' => $purchase->user?->name,
                    'items_count' => $purchase->items->count(),
                    'payment_method' => $purchase->payment_method,
                    'note' => $purchase->note,
                ])->values(),
                'meta' => [
                    'current_page' => $purchases->currentPage(),
                    'last_page' => $purchases->lastPage(),
                    'from' => $purchases->firstItem(),
                    'to' => $purchases->lastItem(),
                    'total' => $purchases->total(),
                    'per_page' => $purchases->perPage(),
                ],
                'summary' => $summary,
                'filters' => [
                    'suppliers' => Supplier::where('store_id', $storeId)->orderBy('name')->get(['id', 'name', 'company', 'phone']),
                    'warehouses' => Warehouse::where('store_id', $storeId)->orderBy('name')->get(['id', 'name']),
                    'accounts' => Account::where('store_id', $storeId)->orderBy('name')->get(['id', 'name', 'account_number', 'type']),
                ],
            ]);
        }

        return view('spa');
    }

    public function create(Request $request)
    {
        if ($request->expectsJson()) {
            $productQuery = Product::where('is_active', true);
            if ($request->filled('q')) {
                $term = $request->string('q');
                $productQuery->where(function ($q) use ($term) {
                    $q->where('name', 'like', "%{$term}%")
                        ->orWhere('code', 'like', "%{$term}%")
                        ->orWhere('barcode', 'like', "%{$term}%")
                        ->orWhere('generic_name', 'like', "%{$term}%");
                });
            }

            return response()->json([
                'warehouses' => Warehouse::orderBy('name')->get(['id', 'name']),
                'suppliers' => Supplier::orderBy('name')->get(['id', 'name', 'company', 'phone']),
                'products' => $productQuery->orderBy('name')->limit(500)->get([
                    'id', 'name', 'code', 'barcode', 'cost_cents', 'price_cents', 'stock_qty',
                    'has_batch', 'has_serial', 'generic_name', 'strength', 'dosage_form',
                ]),
                'payment_methods' => ['Cash', 'Bank Transfer', 'bKash', 'Nagad', 'Rocket', 'Card', 'Cheque'],
                'suggested_reference' => 'PO-'.now()->format('Ymd-His'),
            ]);
        }

        return view('spa');
    }

    public function store(Request $request, PurchaseService $purchases)
    {
        $data = $request->validate([
            'reference' => ['nullable', 'string', 'max:100'],
            'warehouse_id' => ['required', 'integer'],
            'supplier_id' => ['required', 'integer'],
            'purchased_on' => ['required', 'date'],
            'payment_method' => ['required', 'string', 'max:40'],
            'tax' => ['nullable'],
            'discount' => ['nullable'],
            'shipping' => ['nullable'],
            'amount_paid' => ['nullable'],
            'note' => ['nullable', 'string', 'max:5000'],
            'document' => ['nullable', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer'],
            'items.*.qty' => ['required', 'integer', 'min:1'],
            'items.*.cost' => ['nullable'],
            'items.*.batch_no' => ['nullable', 'string', 'max:60'],
            'items.*.expiry_date' => ['nullable', 'date'],
            'items.*.manufactured_on' => ['nullable', 'date'],
            'items.*.serial' => ['nullable', 'string', 'max:500'],
            'items.*.serials' => ['nullable', 'array'],
            'items.*.serials.*' => ['nullable', 'string', 'max:80'],
            'items.*.identifier_kind' => ['nullable', 'in:serial,imei'],
        ]);

        if ($request->hasFile('document')) {
            $data['document'] = $request->file('document')->store('purchases', 'public');
        }

        $purchase = $purchases->receive($request->user(), $data, $data['items']);

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'Purchase saved and stock updated.',
                'purchase' => ['id' => $purchase->id, 'reference' => $purchase->reference, 'grand_cents' => $purchase->grand_cents],
            ]);
        }

        return redirect()->route('purchases.show', $purchase)->with('status', 'Purchase saved and stock updated.');
    }

    public function show(Request $request, Purchase $purchase)
    {
        $purchase->load([
            'items.product',
            'supplier',
            'warehouse',
            'user',
            'payments.account',
            'payments.user',
        ]);

        if ($request->expectsJson()) {
            return response()->json([
                'purchase' => [
                    'id' => $purchase->id,
                    'reference' => $purchase->reference,
                    'supplier_id' => $purchase->supplier_id,
                    'supplier' => $purchase->supplier,
                    'warehouse' => $purchase->warehouse,
                    'user' => $purchase->user,
                    'purchased_on' => optional($purchase->purchased_on)->toDateString(),
                    'status' => $purchase->status,
                    'payment_status' => $this->resolvePaymentStatus($purchase),
                    'payment_method' => $purchase->payment_method,
                    'subtotal_cents' => (int) $purchase->subtotal_cents,
                    'tax_cents' => (int) $purchase->tax_cents,
                    'discount_cents' => (int) $purchase->discount_cents,
                    'shipping_cents' => (int) $purchase->shipping_cents,
                    'grand_cents' => (int) $purchase->grand_cents,
                    'paid_cents' => (int) $purchase->paid_cents,
                    'due_cents' => $purchase->dueCents(),
                    'note' => $purchase->note,
                    'document' => $purchase->document,
                    'created_at' => $purchase->created_at->toDateTimeString(),
                    'items' => $purchase->items->map(fn ($item) => [
                        'id' => $item->id,
                        'product_id' => $item->product_id,
                        'product_name' => $item->product?->name ?? 'Unknown',
                        'product_code' => $item->product?->code,
                        'product_barcode' => $item->product?->barcode,
                        'qty' => $item->qty,
                        'cost_cents' => (int) $item->cost_cents,
                        'subtotal_cents' => (int) $item->subtotal_cents,
                        'batch_no' => $item->batch_no,
                        'expiry_date' => optional($item->expiry_date)->toDateString(),
                        'serial' => $item->serial,
                    ]),
                    'payments' => $purchase->payments->map(fn ($payment) => [
                        'id' => $payment->id,
                        'amount_cents' => (int) $payment->amount_cents,
                        'method' => $payment->method,
                        'account' => $payment->account?->name,
                        'paid_at' => optional($payment->paid_at)->toDateTimeString() ?? $payment->created_at->toDateTimeString(),
                        'user' => $payment->user?->name,
                        'source_key' => $payment->source_key,
                    ]),
                ],
            ]);
        }

        return view('spa');
    }

    public function recordPayment(Request $request, Purchase $purchase, PurchaseService $purchases)
    {
        $validated = $request->validate([
            'amount' => ['required'],
            'payment_method' => ['nullable', 'string', 'max:50'],
            'account_id' => ['nullable', 'integer'],
            'paid_at' => ['nullable', 'date'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $payment = $purchases->recordPayment($purchase, $request->user(), $validated);

        return response()->json([
            'message' => 'Supplier payment recorded successfully.',
            'payment' => [
                'id' => $payment->id,
                'amount_cents' => (int) $payment->amount_cents,
                'method' => $payment->method,
                'account' => $payment->account?->name,
                'paid_at' => optional($payment->paid_at)->toDateTimeString(),
                'user' => $payment->user?->name,
            ],
            'purchase' => [
                'id' => $purchase->id,
                'paid_cents' => (int) $purchase->fresh()->paid_cents,
                'due_cents' => $purchase->fresh()->dueCents(),
                'payment_status' => $this->resolvePaymentStatus($purchase->fresh()),
            ],
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $query = $this->buildPurchasesQuery($request)
            ->with(['supplier', 'warehouse', 'user', 'items.product'])
            ->latest('purchased_on')
            ->latest('id');

        $filename = 'purchases_export_'.now()->format('Y-m-d_His').'.csv';

        $headers = [
            'Content-Type' => 'text/csv; charset=utf-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        return response()->stream(function () use ($query) {
            $handle = fopen('php://output', 'w');
            // Write UTF-8 BOM for Excel compatibility
            fprintf($handle, chr(0xEF).chr(0xBB).chr(0xBF));

            fputcsv($handle, [
                'SL',
                'Reference',
                'Purchase Date',
                'Supplier',
                'Supplier Phone',
                'Warehouse',
                'Status',
                'Total (BDT)',
                'Paid (BDT)',
                'Due (BDT)',
                'Payment Status',
                'Items Count',
                'Created By',
                'Notes',
            ]);

            $sl = 1;
            $query->chunk(200, function ($purchases) use ($handle, &$sl) {
                foreach ($purchases as $purchase) {
                    $paymentStatus = $this->resolvePaymentStatus($purchase);
                    fputcsv($handle, [
                        $sl++,
                        $purchase->reference,
                        optional($purchase->purchased_on)->toDateString(),
                        $purchase->supplier?->name ?? 'N/A',
                        $purchase->supplier?->phone ?? '',
                        $purchase->warehouse?->name ?? 'N/A',
                        strtoupper($purchase->status),
                        number_format($purchase->grand_cents / 100, 2, '.', ''),
                        number_format($purchase->paid_cents / 100, 2, '.', ''),
                        number_format($purchase->dueCents() / 100, 2, '.', ''),
                        strtoupper($paymentStatus),
                        $purchase->items->count(),
                        $purchase->user?->name ?? 'N/A',
                        $purchase->note ?? '',
                    ]);
                }
            });

            fclose($handle);
        }, 200, $headers);
    }

    public function supplierPayables(Request $request)
    {
        $storeId = $request->user()->store_id;
        $query = Supplier::where('store_id', $storeId);

        if ($request->filled('q')) {
            $term = $request->string('q');
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', "%{$term}%")
                    ->orWhere('company', 'like', "%{$term}%")
                    ->orWhere('phone', 'like', "%{$term}%");
            });
        }

        $suppliers = $query->orderBy('name')->get()->map(function (Supplier $supplier) use ($request) {
            $purchasesQuery = Purchase::where('supplier_id', $supplier->id);

            if ($request->filled('from')) {
                $purchasesQuery->whereDate('purchased_on', '>=', $request->from);
            }
            if ($request->filled('to')) {
                $purchasesQuery->whereDate('purchased_on', '<=', $request->to);
            }

            $purchases = $purchasesQuery->get();
            $validPurchases = $purchases->where('status', '!=', 'cancelled');

            $totalPurchases = $validPurchases->count();
            $totalGrand = $validPurchases->sum('grand_cents');
            $totalPaid = $validPurchases->sum('paid_cents');
            $totalDue = max(0, $totalGrand - $totalPaid);
            $duePurchases = $validPurchases->filter(fn ($p) => $p->dueCents() > 0);
            $oldestDuePurchase = $duePurchases->sortBy('purchased_on')->first();

            return [
                'id' => $supplier->id,
                'name' => $supplier->name,
                'company' => $supplier->company,
                'phone' => $supplier->phone,
                'email' => $supplier->email,
                'purchases_count' => $totalPurchases,
                'total_grand_cents' => (int) $totalGrand,
                'total_paid_cents' => (int) $totalPaid,
                'total_due_cents' => (int) $totalDue,
                'due_purchases_count' => $duePurchases->count(),
                'oldest_due_date' => $oldestDuePurchase ? optional($oldestDuePurchase->purchased_on)->toDateString() : null,
            ];
        });

        if ($request->boolean('due_only')) {
            $suppliers = $suppliers->filter(fn ($s) => $s['total_due_cents'] > 0)->values();
        }

        return response()->json([
            'data' => $suppliers->values(),
            'summary' => [
                'total_suppliers' => $suppliers->count(),
                'total_grand_cents' => $suppliers->sum('total_grand_cents'),
                'total_paid_cents' => $suppliers->sum('total_paid_cents'),
                'total_due_cents' => $suppliers->sum('total_due_cents'),
            ],
        ]);
    }

    public function history(Request $request, Purchase $purchase)
    {
        $events = AuditLog::where('store_id', $purchase->store_id)
            ->where('target_type', Purchase::class)
            ->where('target_id', $purchase->id)
            ->with('user')
            ->latest()
            ->get()
            ->map(fn (AuditLog $log) => [
                'id' => $log->id,
                'action' => $log->action,
                'user' => $log->user?->name ?? 'System',
                'created_at' => $log->created_at->format('d M Y, h:i A'),
                'details' => $log->details,
                'ip_address' => $log->ip_address,
            ]);

        return response()->json(['history' => $events]);
    }

    public function printInvoice(Request $request, Purchase $purchase)
    {
        $purchase->load(['items.product', 'supplier', 'warehouse', 'user', 'payments.account', 'payments.user']);
        $store = $request->user()?->store ?? $purchase->store;
        $format = $request->input('format', 'a4');

        return view('purchases.print', [
            'purchase' => $purchase,
            'store' => $store,
            'format' => $format,
            'auto' => $request->boolean('auto', false),
        ]);
    }

    public function cancel(Request $request, Purchase $purchase, PurchaseService $purchases)
    {
        if (! $request->user()->canDo('purchases.manage')) {
            abort(403, 'You do not have permission to cancel purchases.');
        }

        $reason = $request->input('reason');
        $cancelled = $purchases->cancel($purchase, $request->user(), $reason);

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'Purchase cancelled, stock deducted, and payment reversed.',
                'purchase' => $cancelled,
            ]);
        }

        return redirect()->route('purchases.show', $purchase)->with('status', 'Purchase cancelled and stock reversed.');
    }

    /**
     * Build the purchases query with full search, date presets, and filters applied.
     */
    private function buildPurchasesQuery(Request $request): Builder
    {
        $query = Purchase::with(['supplier', 'user', 'warehouse', 'items']);

        // Universal search box
        if ($request->filled('q')) {
            $term = trim((string) $request->input('q'));
            $lowerTerm = strtolower($term);

            $query->where(function (Builder $builder) use ($term, $lowerTerm) {
                $builder->where('reference', 'like', "%{$term}%")
                    ->orWhere('note', 'like', "%{$term}%")
                    ->orWhere('payment_method', 'like', "%{$term}%")
                    ->orWhereHas('supplier', function (Builder $supplier) use ($term) {
                        $supplier->where('name', 'like', "%{$term}%")
                            ->orWhere('company', 'like', "%{$term}%")
                            ->orWhere('phone', 'like', "%{$term}%")
                            ->orWhere('email', 'like', "%{$term}%");
                    })
                    ->orWhereHas('warehouse', fn (Builder $w) => $w->where('name', 'like', "%{$term}%"))
                    ->orWhereHas('items', function (Builder $item) use ($term) {
                        $item->where('batch_no', 'like', "%{$term}%")
                            ->orWhere('serial', 'like', "%{$term}%")
                            ->orWhereHas('product', function (Builder $prod) use ($term) {
                                $prod->where('name', 'like', "%{$term}%")
                                    ->orWhere('code', 'like', "%{$term}%")
                                    ->orWhere('barcode', 'like', "%{$term}%");
                            });
                    });

                // Status match
                if (in_array($lowerTerm, ['received', 'cancelled'], true)) {
                    $builder->orWhere('status', $lowerTerm);
                }

                // Payment status match
                if ($lowerTerm === 'paid') {
                    $builder->orWhere(fn ($q) => $q->where('status', '!=', 'cancelled')->whereColumn('paid_cents', '>=', 'grand_cents'));
                } elseif ($lowerTerm === 'due' || $lowerTerm === 'unpaid') {
                    $builder->orWhere(fn ($q) => $q->where('status', '!=', 'cancelled')->where('paid_cents', '<=', 0));
                } elseif ($lowerTerm === 'partial' || $lowerTerm === 'partially paid') {
                    $builder->orWhere(fn ($q) => $q->where('status', '!=', 'cancelled')->where('paid_cents', '>', 0)->whereColumn('paid_cents', '<', 'grand_cents'));
                }

                // Numeric match for total or paid
                if (is_numeric($term)) {
                    $cents = (int) (round((float) $term, 2) * 100);
                    $builder->orWhere('grand_cents', $cents)
                        ->orWhere('paid_cents', $cents);
                }
            });
        }

        // Supplier filter
        if ($request->filled('supplier_id')) {
            $query->where('supplier_id', $request->input('supplier_id'));
        }

        // Warehouse filter
        if ($request->filled('warehouse_id')) {
            $query->where('warehouse_id', $request->input('warehouse_id'));
        }

        // Status filter
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        // Payment status filter
        if ($request->filled('payment_status')) {
            $ps = $request->input('payment_status');
            if ($ps === 'paid') {
                $query->where('status', '!=', 'cancelled')->whereColumn('paid_cents', '>=', 'grand_cents');
            } elseif ($ps === 'partial') {
                $query->where('status', '!=', 'cancelled')->where('paid_cents', '>', 0)->whereColumn('paid_cents', '<', 'grand_cents');
            } elseif ($ps === 'due') {
                $query->where('status', '!=', 'cancelled')->where('paid_cents', '<=', 0);
            } elseif ($ps === 'overpaid') {
                $query->where('status', '!=', 'cancelled')->whereColumn('paid_cents', '>', 'grand_cents');
            } elseif ($ps === 'cancelled') {
                $query->where('status', 'cancelled');
            }
        }

        // Due only shortcut
        if ($request->boolean('due_only')) {
            $query->where('status', '!=', 'cancelled')->whereColumn('paid_cents', '<', 'grand_cents');
        }

        // Date Presets & Custom Date Range
        $preset = $request->input('date_preset');
        if ($preset === 'today') {
            $query->whereDate('purchased_on', now()->toDateString());
        } elseif ($preset === 'yesterday') {
            $query->whereDate('purchased_on', now()->subDay()->toDateString());
        } elseif ($preset === 'this_week') {
            $query->whereBetween('purchased_on', [now()->startOfWeek()->toDateString(), now()->endOfWeek()->toDateString()]);
        } elseif ($preset === 'this_month') {
            $query->whereBetween('purchased_on', [now()->startOfMonth()->toDateString(), now()->endOfMonth()->toDateString()]);
        } else {
            if ($request->filled('from')) {
                $query->whereDate('purchased_on', '>=', $request->input('from'));
            }
            if ($request->filled('to')) {
                $query->whereDate('purchased_on', '<=', $request->input('to'));
            }
        }

        // Monetary amount filters
        if ($request->filled('min_amount')) {
            $minCents = Money::parse($request->input('min_amount'));
            $query->where('grand_cents', '>=', $minCents);
        }
        if ($request->filled('max_amount')) {
            $maxCents = Money::parse($request->input('max_amount'));
            $query->where('grand_cents', '<=', $maxCents);
        }

        // Outstanding due filters
        if ($request->filled('min_due')) {
            $minDueCents = Money::parse($request->input('min_due'));
            $query->whereRaw('(grand_cents - paid_cents) >= ?', [$minDueCents]);
        }
        if ($request->filled('max_due')) {
            $maxDueCents = Money::parse($request->input('max_due'));
            $query->whereRaw('(grand_cents - paid_cents) <= ?', [$maxDueCents]);
        }

        return $query;
    }

    /**
     * Calculate summary metrics across the filtered query.
     *
     * @return array<string, int>
     */
    private function calculateSummary(Builder $query): array
    {
        $base = clone $query;
        $activeBase = (clone $query)->where('purchases.status', '!=', 'cancelled');

        $totalPurchases = (int) (clone $base)->count();
        $totalAmount = (int) (clone $base)->sum('grand_cents');
        $totalPaid = (int) (clone $base)->sum('paid_cents');

        $totalDue = (int) (clone $activeBase)->selectRaw('COALESCE(SUM(CASE WHEN (grand_cents - paid_cents) > 0 THEN (grand_cents - paid_cents) ELSE 0 END), 0) as total_due')->value('total_due');

        $unpaidCount = (int) (clone $activeBase)->where('paid_cents', '<=', 0)->count();
        $partialCount = (int) (clone $activeBase)->where('paid_cents', '>', 0)->whereColumn('paid_cents', '<', 'grand_cents')->count();
        $paidCount = (int) (clone $activeBase)->whereColumn('paid_cents', '>=', 'grand_cents')->count();

        // Overdue count: active purchases with outstanding due purchased more than 30 days ago
        $overdueCount = (int) (clone $activeBase)
            ->whereColumn('paid_cents', '<', 'grand_cents')
            ->whereDate('purchased_on', '<', now()->subDays(30)->toDateString())
            ->count();

        return [
            'total_purchases_count' => $totalPurchases,
            'total_amount_cents' => $totalAmount,
            'total_paid_cents' => $totalPaid,
            'total_due_cents' => $totalDue,
            'unpaid_count' => $unpaidCount,
            'partial_count' => $partialCount,
            'paid_count' => $paidCount,
            'overdue_count' => $overdueCount,
        ];
    }

    private function resolvePaymentStatus(Purchase $purchase): string
    {
        if ($purchase->status === 'cancelled') {
            return 'cancelled';
        }

        if ($purchase->paid_cents >= $purchase->grand_cents) {
            return 'paid';
        }

        if ($purchase->paid_cents > 0) {
            return 'partial';
        }

        return 'due';
    }
}
