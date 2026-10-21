@extends('layouts.app')
@section('content')
<div class="page-title"><div><div class="crumbs">Product › {{ $product->name }}</div><h1>{{ $product->name }}</h1></div>
    <div class="filters"><a class="btn" href="{{ route('products.edit', $product) }}">Edit</a><a class="btn" href="{{ route('products.index') }}">Back</a></div>
</div>
<div class="grid-2">
    <section class="card">
        @if($product->image)<img src="{{ asset('storage/'.$product->image) }}" alt="" style="width:160px;border-radius:12px">@endif
        <p>Code {{ $product->code }} · {{ ucfirst($product->type) }}</p>
        <p>Brand {{ $product->brand->name ?? '—' }} · Category {{ $product->category->name ?? '—' }} · Unit {{ $product->unit->name ?? '—' }}</p>
        <p>Cost @money($product->cost_cents) · Price @money($product->sellingPriceCents())</p>
        <p>Stock <span class="badge {{ $product->isLowStock() ? 'bad' : 'ok' }}">{{ $product->stock_qty }}</span> · Alert {{ $product->alert_qty }}</p>
        <p>{{ $product->description }}</p>
        @if($product->variants->isNotEmpty())
            <h2>Variants</h2>
            <ul>@foreach($product->variants as $variant)<li>{{ $variant->name }} · {{ $variant->sku }} · @money($variant->price_cents) · stock {{ $variant->stock_qty }}</li>@endforeach</ul>
        @endif
    </section>
    <section class="card">
        <h2>Inventory history</h2>
        <table>
            <thead><tr><th>When</th><th>Reason</th><th>Change</th><th>Balance</th></tr></thead>
            <tbody>
            @forelse($product->movements as $movement)
                <tr><td>{{ $movement->created_at->format('d M Y H:i') }}</td><td>{{ $movement->reason }}</td><td>{{ $movement->qty_change }}</td><td>{{ $movement->balance_after }}</td></tr>
            @empty
                <tr><td colspan="4" class="empty">No stock movements yet.</td></tr>
            @endforelse
            </tbody>
        </table>
    </section>
</div>
@endsection
