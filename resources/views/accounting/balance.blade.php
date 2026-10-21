@extends('layouts.app')
@section('content')
<div class="page-title"><div><h1>Balance Sheet</h1></div></div>
<section class="card">
    <table>
        <tbody>
            <tr><td>Cash and bank</td><td>@money($cash)</td></tr>
            <tr><td>Inventory at cost</td><td>@money($inventory)</td></tr>
            <tr><td>Customer due (asset)</td><td>@money($salesDue)</td></tr>
            <tr><td>Purchase due (liability)</td><td>@money($purchaseDue)</td></tr>
            <tr><th>Equity</th><th>@money($cash + $inventory + $salesDue - $purchaseDue)</th></tr>
        </tbody>
    </table>
    <p class="muted">Inventory uses current stock times product cost. Purchase totals are not deducted a second time.</p>
</section>
@endsection
