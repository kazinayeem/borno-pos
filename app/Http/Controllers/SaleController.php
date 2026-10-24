<?php

namespace App\Http\Controllers;

use App\Models\ProductSerial;
use App\Models\Sale;
use App\Models\SaleReturn;
use App\Models\Setting;
use App\Services\CheckoutService;
use App\Services\ReturnService;
use App\Support\DateRange;
use App\Support\Money;
use Illuminate\Http\Request;

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
        $sale->load(['items.product', 'customer', 'user', 'payments', 'returns.items', 'installmentPlan.installments', 'installmentPlan.customer']);

        if ($request->expectsJson()) {
            $sale->items->each(function ($item) {
                if ($item->product?->image) {
                    $item->product->image = '/storage/'.$item->product->image;
                }
                $serial = $item->serial
                    ? ProductSerial::where('product_id', $item->product_id)->where('identifier', $item->serial)->first()
                    : null;
                $item->setAttribute('serial_unit', $serial ? [
                    'id' => $serial->id,
                    'kind' => $serial->kind,
                    'status' => $serial->status,
                    'warranty_starts_on' => optional($serial->warranty_starts_on)->toDateString(),
                    'warranty_ends_on' => optional($serial->warranty_ends_on)->toDateString(),
                    'events' => $serial->events()->latest('id')->limit(5)->get(['id', 'kind', 'note', 'happened_on']),
                ] : null);
            });

            return response()->json(['sale' => $sale]);
        }

        return view('spa');
    }

    public function destroy(Request $request, Sale $sale)
    {
        if ($sale->status === 'draft') {
            $sale->items()->delete();
            $sale->delete();

            if ($request->expectsJson()) {
                return response()->json(['message' => 'Draft deleted.']);
            }

            return redirect()->route('sales.drafts')->with('status', 'Draft deleted.');
        }

        if ($request->expectsJson()) {
            return response()->json(['message' => 'Completed sales cannot be deleted directly. Please use Sale Return to refund or cancel items.'], 422);
        }

        return back()->withErrors(['sale' => 'Completed sales cannot be deleted directly. Please use Sale Return to refund or cancel items.']);
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

    public function print(Request $request, Sale $sale)
    {
        $sale->load(['items.product', 'customer', 'user', 'store', 'installmentPlan.installments']);
        $format = $request->query('format', 'pos');
        $auto = $request->boolean('auto');
        $footer = Setting::withoutGlobalScopes()->where('store_id', $sale->store_id)->where('key', 'invoice_footer')->value('value');

        return view('sales.print', compact('sale', 'format', 'auto', 'footer'));
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
        $returns = SaleReturn::with('sale')
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
