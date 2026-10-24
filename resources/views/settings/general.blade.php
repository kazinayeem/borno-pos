@extends('layouts.app')
@section('content')
<div class="page-title"><div><h1>General Settings</h1></div></div>
<section class="card"><form method="post" action="{{ route('settings.general.update') }}">@csrf
    <div class="field"><label>Shop name</label><input name="shop_name" value="{{ old('shop_name', $store->name ?? '') }}" required></div>
    <div class="field"><label>Phone</label><input name="phone" value="{{ old('phone', $store->phone ?? '') }}"></div>
    <div class="field"><label>Address</label><input name="address" value="{{ old('address', $store->address ?? '') }}"></div>
    <div class="field">
        <label>Select Currency</label>
        <select id="currency_preset" onchange="const opt = this.options[this.selectedIndex]; if(opt.value){ document.getElementById('currency_code').value = opt.value; document.getElementById('currency_symbol').value = opt.dataset.symbol || '$'; }">
            <option value="">-- Choose Currency or Enter Below --</option>
            @foreach($currencies as $c)
                <option value="{{ $c->code }}" data-symbol="{{ $c->symbol }}" {{ old('currency_code', $store->currency_code ?? '') === $c->code ? 'selected' : '' }}>
                    {{ $c->name }} ({{ $c->code }} - {{ $c->symbol }})
                </option>
            @endforeach
        </select>
    </div>
    <div class="field-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div class="field">
            <label>Currency code</label>
            <input id="currency_code" name="currency_code" value="{{ old('currency_code', $store->currency_code ?? 'USD') }}" placeholder="e.g. BDT, USD" required>
        </div>
        <div class="field">
            <label>Currency symbol / icon</label>
            <input id="currency_symbol" name="currency_symbol" value="{{ old('currency_symbol', $store->currency_symbol ?? '$') }}" placeholder="e.g. ৳, $" required>
        </div>
    </div>
    <div class="field"><label>Invoice footer</label><textarea name="invoice_footer">{{ old('invoice_footer', $settings['invoice_footer'] ?? '') }}</textarea></div>
    <button class="btn primary">Save</button>
</form></section>
@endsection
