@extends('layouts.app')
@section('content')
<div class="page-title"><div><h1>Business Modules</h1></div></div>
<section class="card"><form method="post" action="{{ route('settings.modules.update') }}">@csrf
    <p>Turn on the tools this shop uses. An all-in-one shop can enable every module, and each product still chooses its own tracking. Installments record a payment schedule for a sale. They are not a loan, credit check, or bank transfer.</p>
    @php
        $labels = [
            'product' => 'Products', 'purchase' => 'Purchases', 'accounting' => 'Accounting', 'sales' => 'Sales',
            'expense' => 'Expenses', 'hrm' => 'HRM', 'people' => 'People', 'reports' => 'Reports',
            'subscriptions' => 'Subscriptions', 'store' => 'Stores',
            'batch' => 'Batch and expiry tracking', 'serial' => 'Serial numbers and IMEI',
            'variants' => 'Size, color, and other variants', 'recipe' => 'Recipes and ingredients',
            'warranty' => 'Warranty dates', 'emi' => 'Installment sales',
        ];
    @endphp
    @foreach($modules as $key => $enabled)
        <label style="display:block;margin:8px 0"><input type="checkbox" name="{{ $key }}" value="1" @checked($enabled)> {{ $labels[$key] ?? ucfirst($key) }}</label>
    @endforeach
    <button class="btn primary">Save modules</button>
</form></section>
@endsection
