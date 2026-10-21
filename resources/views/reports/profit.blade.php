@extends('layouts.app')
@section('content')
<div class="page-title"><div><h1>Profit & Loss</h1><div class="muted">{{ $label }}</div></div>@include('partials.range')</div>
<section class="card">
    <table>
        <tr><td>Sales including tax</td><td>@money($data['total_sales'])</td></tr>
        <tr><td>Sales returns including tax</td><td>@money($data['sales_return'])</td></tr>
        <tr><td>Gross profit (sales ex tax, minus unit cost, minus returns)</td><td>@money($data['gross_profit'])</td></tr>
        <tr><td>Expenses</td><td>@money($data['expense'])</td></tr>
        <tr><td>Salary</td><td>@money($data['salary'])</td></tr>
        <tr><th>Net profit</th><th>@money($data['net_profit'])</th></tr>
    </table>
    <p class="muted">Purchase invoices are not subtracted here. Their cost is recognized when the unit is sold.</p>
</section>
@endsection
