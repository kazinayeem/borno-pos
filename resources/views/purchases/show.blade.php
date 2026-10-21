@extends('layouts.app')
@section('content')
<div class="page-title"><div><h1>{{ $purchase->reference }}</h1><div class="muted">{{ $purchase->purchased_on->format('d M Y') }} · {{ $purchase->supplier->name ?? 'No supplier' }}</div></div></div>
<section class="card">
    <table>
        <thead><tr><th>Product</th><th>Qty</th><th>Cost</th><th>Batch</th><th>Expiry</th><th>Subtotal</th></tr></thead>
        <tbody>
        @foreach($purchase->items as $item)
            <tr>
                <td>{{ $item->product->name ?? 'Product' }}</td>
                <td>{{ $item->qty }}</td>
                <td>@money($item->cost_cents)</td>
                <td>{{ $item->batch_no ?: '—' }}</td>
                <td>{{ optional($item->expiry_date)->format('d M Y') ?: '—' }}</td>
                <td>@money($item->subtotal_cents)</td>
            </tr>
        @endforeach
        </tbody>
    </table>
    <p>Subtotal @money($purchase->subtotal_cents) · Tax @money($purchase->tax_cents) · Shipping @money($purchase->shipping_cents) · Discount @money($purchase->discount_cents)</p>
    <p><strong>Grand total @money($purchase->grand_cents)</strong> · Paid @money($purchase->paid_cents) · Due @money($purchase->dueCents())</p>
    <p>{{ $purchase->note }}</p>
</section>
@endsection
