@extends('layouts.app')
@section('content')
<div class="page-title"><div><h1>Summary</h1></div>@include('partials.range')</div>
<section class="card">
    <p>Total sales @money($data['total_sales'])</p>
    <p>Returns @money($data['sales_return'])</p>
    <p>Gross profit @money($data['gross_profit'])</p>
    <p>Net profit @money($data['net_profit'])</p>
    <p>Purchases @money($data['purchase']) · Due @money($data['purchase_due'])</p>
    <p>Expenses @money($data['expense']) · Salary @money($data['salary'])</p>
</section>
@endsection
