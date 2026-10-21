@extends('layouts.app')
@section('content')
<div class="page-title">
    <div><div class="crumbs">Dashboard › Product › Products</div><h1>Products</h1></div>
    @if(auth()->user()->canDo('products.manage'))<a class="btn primary" href="{{ route('products.create') }}">+ Add Product</a>@endif
</div>
<section class="card">
    <form method="get" class="filters" style="margin-bottom:12px">
        <input name="q" value="{{ request('q') }}" placeholder="Search products by name or code" style="min-width:240px;border:1px solid #dbe3ee;border-radius:12px;padding:10px">
        <select name="category_id"><option value="">All Categories</option>@foreach($categories as $category)<option value="{{ $category->id }}" @selected(request('category_id')==$category->id)>{{ $category->name }}</option>@endforeach</select>
        <select name="brand_id"><option value="">All Brands</option>@foreach($brands as $brand)<option value="{{ $brand->id }}" @selected(request('brand_id')==$brand->id)>{{ $brand->name }}</option>@endforeach</select>
        <select name="status"><option value="">All Status</option><option value="active" @selected(request('status')==='active')>Active</option><option value="inactive" @selected(request('status')==='inactive')>Inactive</option></select>
        <button class="btn" type="submit">Filter</button>
        <a class="btn" href="{{ route('products.index') }}">Reset</a>
    </form>
    <table>
        <thead><tr><th>SL</th><th>Image</th><th>Name</th><th>Code</th><th>Brand</th><th>Category</th><th>Type</th><th>Cost</th><th>Price</th><th>Stock</th><th></th></tr></thead>
        <tbody>
        @forelse($products as $product)
            <tr>
                <td>{{ $loop->iteration + ($products->currentPage()-1)*$products->perPage() }}</td>
                <td>@if($product->image)<img src="{{ asset('storage/'.$product->image) }}" alt="" width="42" height="42" style="object-fit:cover;border-radius:8px">@else<span class="badge">—</span>@endif</td>
                <td><a href="{{ route('products.show', $product) }}">{{ $product->name }}</a></td>
                <td>{{ $product->code }}</td>
                <td>{{ $product->brand->name ?? '—' }}</td>
                <td>{{ $product->category->name ?? '—' }}</td>
                <td>{{ ucfirst($product->type) }}</td>
                <td>@money($product->cost_cents)</td>
                <td>@money($product->price_cents)</td>
                <td><span class="badge {{ $product->isLowStock() ? 'bad' : 'ok' }}">{{ $product->stock_qty }} {{ $product->unit->short_name ?? '' }}</span></td>
                <td>
                    @if(auth()->user()->canDo('products.manage'))
                        <a href="{{ route('products.edit', $product) }}">Edit</a>
                        <form method="post" action="{{ route('products.destroy', $product) }}" data-confirm="Delete this product?" style="display:inline">@csrf @method('DELETE')<button class="btn danger">Delete</button></form>
                    @endif
                </td>
            </tr>
        @empty
            <tr><td colspan="11" class="empty">No products yet.</td></tr>
        @endforelse
        </tbody>
    </table>
    <div class="pager">Showing {{ $products->firstItem() ?? 0 }} to {{ $products->lastItem() ?? 0 }} of {{ $products->total() }} {{ $products->links() }}</div>
</section>
@endsection
