@extends('layouts.app')
@section('content')
<div class="page-title"><div><h1>General Settings</h1></div></div>
<section class="card"><form method="post" action="{{ route('settings.general.update') }}">@csrf
    <div class="field"><label>Shop name</label><input name="shop_name" value="{{ old('shop_name', $store->name ?? '') }}" required></div>
    <div class="field"><label>Phone</label><input name="phone" value="{{ old('phone', $store->phone ?? '') }}"></div>
    <div class="field"><label>Address</label><input name="address" value="{{ old('address', $store->address ?? '') }}"></div>
    <div class="field"><label>Currency symbol</label><input name="currency_symbol" value="{{ old('currency_symbol', $store->currency_symbol ?? '$') }}" required></div>
    <div class="field"><label>Invoice footer</label><textarea name="invoice_footer">{{ old('invoice_footer', $settings['invoice_footer'] ?? '') }}</textarea></div>
    <button class="btn primary">Save</button>
</form></section>
@endsection
