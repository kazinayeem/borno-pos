<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use App\Services\CheckoutService;
use App\Services\ReturnService;
use App\Support\DateRange;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SaleController extends Controller
{
    public function index(Request $request)
    {
        return $this->listing($request, 'completed', 'Sales');
    }

    public function drafts(Request $request)
    {
        return $this->listing($request, 'draft', 'Drafts');
    }

    public function show(Request $request, Sale $sale)
    {
        $sale->load(['items.product', 'customer', 'user', 'payments', 'returns.items']);

        if ($request->expectsJson()) {
            $sale->items->each(function ($item) {
                if ($item->product?->image) {
                    $item->product->image = Storage::disk('public')->url($item->product->image);
                }
            });

            return response()->json(['sale' => $sale]);
        }

        return view('spa');
    }

    private function listing(Request $request, string $status, string $title)
    {
        $sales = $this->query($request, $status)->paginate(15)->withQueryString();

        if ($request->expectsJson()) {
            return response()->json([
                'title' => $title,
                'data' => $sales->getCollection()->map(fn (Sale $sale) => [
                    'id' => $sale->id,
                    'invoice_no' => $sale->invoice_no,
                    'customer' => $sale->customer?->name ?? 'Walk-in',
                    'status' => $sale->status,
                    'grand_cents' => $sale->grand_cents,
                    'paid_cents' => $sale->paid_cents,
                    'sold_at' => optional($sale->sold_at)->toDateTimeString(),
                ])->values(),
                'meta' => [
                    'current_page' => $sales->currentPage(),
                    'last_page' => $sales->lastPage(),
                    'from' => $sales->firstItem(),
                    'to' => $sales->lastItem(),
                    'total' => $sales->total(),
                ],
            ]);
        }

        return view('spa');
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

        if ($request->expectsJson()) {
            return response()->json(['message' => 'Return saved, stock restored, and the refund recorded.']);
        }

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
