<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Purchase;
use App\Models\Supplier;
use App\Models\Warehouse;
use App\Services\PurchaseService;
use Illuminate\Http\Request;

class PurchaseController extends Controller
{
    public function index(Request $request)
    {
        $purchases = Purchase::with(['supplier', 'user'])
            ->when($request->filled('q'), function ($query) use ($request) {
                $term = $request->string('q');
                $query->where(function ($inner) use ($term) {
                    $inner->where('reference', 'like', "%{$term}%")
                        ->orWhereHas('supplier', fn ($supplier) => $supplier->where('name', 'like', "%{$term}%"));
                });
            })
            ->latest()
            ->paginate(10)
            ->withQueryString();

        if ($request->expectsJson()) {
            return response()->json([
                'data' => $purchases->getCollection()->map(fn (Purchase $purchase) => [
                    'id' => $purchase->id,
                    'reference' => $purchase->reference,
                    'supplier' => $purchase->supplier?->name,
                    'status' => $purchase->status,
                    'grand_cents' => $purchase->grand_cents,
                    'paid_cents' => $purchase->paid_cents,
                    'purchased_on' => optional($purchase->purchased_on)->toDateString(),
                ])->values(),
                'meta' => [
                    'current_page' => $purchases->currentPage(),
                    'last_page' => $purchases->lastPage(),
                    'from' => $purchases->firstItem(),
                    'to' => $purchases->lastItem(),
                    'total' => $purchases->total(),
                ],
            ]);
        }

        return view('spa');
    }

    public function create(Request $request)
    {
        if ($request->expectsJson()) {
            return response()->json([
                'warehouses' => Warehouse::orderBy('name')->get(['id', 'name']),
                'suppliers' => Supplier::orderBy('name')->get(['id', 'name']),
                'products' => Product::where('is_active', true)->orderBy('name')->get(['id', 'name', 'code', 'cost_cents', 'has_batch', 'has_serial']),
            ]);
        }

        return view('spa');
    }

    public function store(Request $request, PurchaseService $purchases)
    {
        $data = $request->validate([
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
        $purchase->load(['items.product', 'supplier', 'warehouse', 'user', 'payments']);

        if ($request->expectsJson()) {
            return response()->json(['purchase' => $purchase]);
        }

        return view('spa');
    }
}
