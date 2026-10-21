<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use App\Services\CheckoutService;
use App\Services\ReturnService;
use App\Support\DateRange;
use App\Support\Money;
use Illuminate\Http\Request;

class SaleController extends Controller
{
    public function index(Request $request)
    {
        return view('sales.index', [
            'title' => 'Sales',
            'sales' => $this->query($request, 'completed')->paginate(10)->withQueryString(),
        ]);
    }

    public function drafts(Request $request)
    {
        return view('sales.index', [
            'title' => 'Drafts',
            'sales' => $this->query($request, 'draft')->paginate(10)->withQueryString(),
        ]);
    }

    public function show(Sale $sale)
    {
        $sale->load(['items.product', 'customer', 'user', 'payments', 'returns.items']);

        return view('sales.show', compact('sale'));
    }

    public function print(Sale $sale)
    {
        $sale->load(['items.product', 'customer', 'user', 'store']);

        return view('sales.print', compact('sale'));
    }

    public function complete(Request $request, Sale $sale, CheckoutService $checkout)
    {
        $data = $request->validate([
            'amount_paid' => ['required'],
            'payment_method' => ['required', 'string', 'max:40'],
        ]);
        $checkout->completeDraft($sale, $request->user(), Money::parse($data['amount_paid']), $data['payment_method']);

        return redirect()->route('sales.show', $sale)->with('status', 'Draft completed and stock updated.');
    }

    public function returns(Request $request)
    {
        [$from, $to] = DateRange::fromRequest($request);
        $returns = \App\Models\SaleReturn::with('sale')
            ->whereBetween('returned_on', [$from->toDateString(), $to->toDateString()])
            ->latest()
            ->paginate(10);

        return view('sales.returns', compact('returns', 'from', 'to'));
    }

    public function returnStore(Request $request, Sale $sale, ReturnService $returns)
    {
        $data = $request->validate([
            'items' => ['required', 'array'],
            'items.*.sale_item_id' => ['required', 'integer'],
            'items.*.qty' => ['nullable', 'integer', 'min:0'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);
        $returns->refund($sale, $request->user(), $data['items'], $data['note'] ?? null);

        return redirect()->route('sales.show', $sale)->with('status', 'Return saved, stock restored, and the refund recorded.');
    }

    private function query(Request $request, string $status)
    {
        [$from, $to] = DateRange::fromRequest($request);

        return Sale::with(['customer', 'user'])
            ->where('status', $status)
            ->whereBetween('sold_at', [$from, $to])
            ->when($request->filled('q'), function ($query) use ($request) {
                $term = $request->string('q');
                $query->where(function ($inner) use ($term) {
                    $inner->where('invoice_no', 'like', "%{$term}%")
                        ->orWhereHas('customer', fn ($customer) => $customer->where('name', 'like', "%{$term}%"));
                });
            })
            ->latest('sold_at');
    }
}
