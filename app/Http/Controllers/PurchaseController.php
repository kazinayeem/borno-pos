<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Purchase;
use App\Models\Supplier;
use App\Models\Warehouse;
use App\Services\PurchaseService;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

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

        return view('purchases.index', compact('purchases'));
    }

    public function create()
    {
        return view('purchases.form', [
            'warehouses' => Warehouse::orderBy('name')->get(),
            'suppliers' => Supplier::orderBy('name')->get(),
            'products' => Product::where('is_active', true)->orderBy('name')->get(['id', 'name', 'code', 'cost_cents']),
        ]);
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
            'items.*.serial' => ['nullable', 'string', 'max:80'],
        ]);

        if ($request->hasFile('document')) {
            $data['document'] = $request->file('document')->store('purchases', 'public');
        }

        $purchase = $purchases->receive($request->user(), $data, $data['items']);

        return redirect()->route('purchases.show', $purchase)->with('status', 'Purchase saved and stock updated.');
    }

    public function show(Purchase $purchase)
    {
        $purchase->load(['items.product', 'supplier', 'warehouse', 'user', 'payments']);

        return view('purchases.show', compact('purchase'));
    }
}
