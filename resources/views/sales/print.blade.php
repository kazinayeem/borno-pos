<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{ $sale->invoice_no }}</title>
    <link rel="stylesheet" href="{{ asset('css/app.css') }}">
    <style>body{background:white;padding:24px} @media print {.no-print{display:none}}</style>
</head>
<body>
    <h1>BornoPos</h1>
    <p>{{ $sale->store->name ?? '' }} · {{ $sale->store->address ?? '' }}</p>
    <h2>Invoice {{ $sale->invoice_no }}</h2>
    <p>{{ $sale->sold_at->format('d M Y H:i') }} · {{ $sale->customer->name ?? 'Walk-in Customer' }}</p>
    <table>
        <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
        <tbody>
        @foreach($sale->items as $item)
            <tr><td>{{ $item->product->name ?? 'Item' }}</td><td>{{ $item->qty }}</td><td>@money($item->price_cents)</td><td>@money($item->subtotal_cents)</td></tr>
        @endforeach
        </tbody>
    </table>
    <p>Discount @money($sale->discount_cents) · Tax @money($sale->tax_cents)</p>
    <h3>Total @money($sale->grand_cents)</h3>
    <p>Paid @money($sale->paid_cents) by {{ $sale->payment_method }} · Due @money($sale->dueCents())</p>
    <p>{{ \App\Models\Setting::withoutGlobalScopes()->where('store_id', $sale->store_id)->where('key','invoice_footer')->value('value') }}</p>
    <button class="btn no-print" onclick="window.print()">Print</button>
</body>
</html>
