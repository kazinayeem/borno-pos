@extends('layouts.app')
@section('content')
<div class="page-title">
    <div><div class="crumbs">Sales › {{ $sale->invoice_no }}</div><h1>{{ $sale->invoice_no }}</h1><div class="muted">{{ ucfirst($sale->status) }} · {{ $sale->sold_at->format('d M Y H:i') }}</div></div>
    <div class="filters"><a class="btn" href="{{ route('sales.print', $sale) }}">Print</a></div>
</div>
<section class="card">
    <p>Customer: {{ $sale->customer->name ?? 'Walk-in Customer' }} · Biller: {{ $sale->user->name ?? '—' }} · Method: {{ $sale->payment_method }}</p>
    <table>
        <thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Cost</th><th>Tax</th><th>Subtotal</th></tr></thead>
        <tbody>
        @foreach($sale->items as $item)
            <tr>
                <td>{{ $item->product->name ?? 'Product' }}</td>
                <td>{{ $item->qty }}</td>
                <td>@money($item->price_cents)</td>
                <td>@money($item->cost_cents)</td>
                <td>@money($item->tax_cents)</td>
                <td>@money($item->subtotal_cents)</td>
            </tr>
        @endforeach
        </tbody>
    </table>
    <p>Discount @money($sale->discount_cents) · Coupon @money($sale->coupon_cents) · Tax @money($sale->tax_cents)</p>
    <p><strong>Grand @money($sale->grand_cents)</strong> · Paid @money($sale->paid_cents) · Due @money($sale->dueCents())</p>
    @if($sale->status === 'draft')
        <form method="post" action="{{ route('sales.complete', $sale) }}" data-once>@csrf
            <div class="form-grid">
                <div class="field"><label>Amount paid</label><input name="amount_paid" value="{{ number_format($sale->grand_cents/100, 2, '.', '') }}"></div>
                <div class="field"><label>Method</label><select name="payment_method"><option>Cash</option><option>Manual</option></select></div>
            </div>
            <button class="btn primary" type="submit">Complete draft</button>
        </form>
    @endif
</section>
@if($sale->status === 'completed')
<section class="card" style="margin-top:12px">
    <h2>Return items</h2>
    <form method="post" action="{{ route('sales.return', $sale) }}" data-once data-confirm="Record this return and restore stock?">@csrf
        <table>
            <thead><tr><th>Product</th><th>Sold</th><th>Return qty</th></tr></thead>
            <tbody>
            @foreach($sale->items as $item)
                <tr>
                    <td>{{ $item->product->name ?? 'Product' }}<input type="hidden" name="items[{{ $loop->index }}][sale_item_id]" value="{{ $item->id }}"></td>
                    <td>{{ $item->qty }}</td>
                    <td><input type="number" min="0" max="{{ $item->qty }}" name="items[{{ $loop->index }}][qty]" value="0"></td>
                </tr>
            @endforeach
            </tbody>
        </table>
        <div class="field"><label>Note</label><input name="note"></div>
        <button class="btn danger" type="submit">Save return</button>
    </form>
    @foreach($sale->returns as $return)
        <p>Return {{ $return->returned_on->format('d M Y') }} · @money($return->grand_cents)</p>
    @endforeach
</section>
@endif
@endsection
