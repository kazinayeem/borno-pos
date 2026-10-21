@extends('layouts.app')
@section('content')
<div class="page-title"><div><h1>Print Barcode</h1></div></div>
<section class="card">
    <form method="get">
        @foreach($products as $product)
            <label style="display:inline-flex;gap:6px;margin:6px 12px 6px 0"><input type="checkbox" name="ids[]" value="{{ $product->id }}" @checked(in_array($product->id, request('ids', [])))> {{ $product->name }} ({{ $product->code }})</label>
        @endforeach
        <div><button class="btn primary" type="submit">Preview</button></div>
    </form>
    <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:16px">
        @foreach($selected as $product)
            <div style="border:1px dashed #cbd5e1;padding:12px;border-radius:12px;text-align:center">
                <strong>{{ $product->name }}</strong>
                <div style="font-family:monospace;letter-spacing:4px;font-size:20px;margin:8px 0">{{ $product->code }}</div>
                <div>@money($product->price_cents)</div>
            </div>
        @endforeach
    </div>
</section>
@endsection
