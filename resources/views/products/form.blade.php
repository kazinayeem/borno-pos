@extends('layouts.app')
@section('content')
<div class="page-title">
    <div><div class="crumbs">Dashboard › Product › {{ $product->exists ? 'Edit' : 'New' }} Product</div><h1>{{ $product->exists ? 'Edit Product' : 'New Product' }}</h1></div>
    <a class="btn" href="{{ route('products.index') }}">Back to Products</a>
</div>
<form method="post" action="{{ $product->exists ? route('products.update', $product) : route('products.store') }}" enctype="multipart/form-data" data-once>
    @csrf
    @if($product->exists) @method('PUT') @endif
    <div class="grid-2">
        <section class="card">
            <h2>Basic Information</h2>
            <div class="form-grid">
                <div class="field"><label>Product Name *</label><input name="name" value="{{ old('name', $product->name) }}" required></div>
                <div class="field"><label>Product Type *</label>
                    <select name="type">@foreach(['standard','combo','digital','service'] as $type)<option value="{{ $type }}" @selected(old('type', $product->type)===$type)>{{ ucfirst($type) }}</option>@endforeach</select>
                </div>
                <div class="field"><label>Product Code *</label><input name="code" value="{{ old('code', $product->code ?: strtoupper(str()->random(8))) }}" required></div>
                <div class="field"><label>Brand *</label><select name="brand_id" required><option value="">Select a brand</option>@foreach($brands as $brand)<option value="{{ $brand->id }}" @selected(old('brand_id', $product->brand_id)==$brand->id)>{{ $brand->name }}</option>@endforeach</select></div>
                <div class="field"><label>Category *</label><select name="category_id" required><option value="">Select a category</option>@foreach($categories as $category)<option value="{{ $category->id }}" @selected(old('category_id', $product->category_id)==$category->id)>{{ $category->name }}</option>@endforeach</select></div>
                <div class="field"><label>Product Unit *</label><select name="unit_id" required><option value="">Select a unit</option>@foreach($units as $unit)<option value="{{ $unit->id }}" @selected(old('unit_id', $product->unit_id)==$unit->id)>{{ $unit->name }}</option>@endforeach</select></div>
                <div class="field"><label>Sale Unit</label><select name="sale_unit_id"><option value="">Select a sale unit</option>@foreach($units as $unit)<option value="{{ $unit->id }}" @selected(old('sale_unit_id', $product->sale_unit_id)==$unit->id)>{{ $unit->name }}</option>@endforeach</select></div>
                <div class="field"><label>Purchase Unit</label><select name="purchase_unit_id"><option value="">Select a purchase unit</option>@foreach($units as $unit)<option value="{{ $unit->id }}" @selected(old('purchase_unit_id', $product->purchase_unit_id)==$unit->id)>{{ $unit->name }}</option>@endforeach</select></div>
                <div class="field"><label>Warehouse</label><select name="warehouse_id"><option value="">Select</option>@foreach($warehouses as $warehouse)<option value="{{ $warehouse->id }}" @selected(old('warehouse_id', $product->warehouse_id)==$warehouse->id)>{{ $warehouse->name }}</option>@endforeach</select></div>
                <div class="field"><label>Purchase Cost *</label><input name="cost" value="{{ old('cost', number_format(($product->cost_cents ?? 0)/100, 2, '.', '')) }}" required></div>
                <div class="field"><label>Selling Price *</label><input name="price" value="{{ old('price', number_format(($product->price_cents ?? 0)/100, 2, '.', '')) }}" required></div>
                <div class="field"><label>Alert Quantity</label><input type="number" name="alert_qty" min="0" value="{{ old('alert_qty', $product->alert_qty ?? 0) }}"></div>
            </div>
            <div class="field"><label>Product Details</label><textarea name="description" rows="4">{{ old('description', $product->description) }}</textarea></div>
        </section>
        <div>
            <section class="card">
                <h2>Product Image</h2>
                @if($product->image)<img src="{{ asset('storage/'.$product->image) }}" alt="" style="width:120px;height:120px;object-fit:cover;border-radius:12px">@endif
                <div class="field"><label>Upload image (PNG, JPG, WEBP, max 5MB)</label><input type="file" name="image" accept="image/png,image/jpeg,image/webp"></div>
                @if($product->image)<label><input type="checkbox" name="remove_image" value="1"> Remove current image</label>@endif
            </section>
            <section class="card" style="margin-top:12px">
                <h2>Additional Information</h2>
                <div class="form-grid">
                    <div class="field"><label>Tax</label><select name="tax_id"><option value="">No tax</option>@foreach($taxes as $tax)<option value="{{ $tax->id }}" @selected(old('tax_id', $product->tax_id)==$tax->id)>{{ $tax->name }}</option>@endforeach</select></div>
                    <div class="field"><label>Tax Method</label><select name="tax_method"><option value="exclusive" @selected(old('tax_method', $product->tax_method)==='exclusive')>Exclusive</option><option value="inclusive" @selected(old('tax_method', $product->tax_method)==='inclusive')>Inclusive</option></select></div>
                </div>
                <label><input type="hidden" name="is_active" value="0"><input type="checkbox" name="is_active" value="1" @checked(old('is_active', $product->is_active ?? true))> Active</label><br>
                <label><input type="checkbox" name="featured_in_pos" value="1" @checked(old('featured_in_pos', $product->featured_in_pos))> Featured product will be displayed in POS</label><br>
                <label><input type="checkbox" name="has_serial" value="1" @checked(old('has_serial', $product->has_serial))> This product has Serial or IMEI number</label><br>
                <label><input type="checkbox" name="has_batch" value="1" @checked(old('has_batch', $product->has_batch))> This product has batch and expired date</label><br>
                <label><input type="checkbox" name="has_variant" value="1" @checked(old('has_variant', $product->has_variant))> This product has variant</label><br>
                <label><input type="checkbox" name="has_promo" value="1" @checked(old('has_promo', $product->promo_price_cents !== null))> Add Promotional Price</label>
                <div class="field"><label>Promotional price</label><input name="promo_price" value="{{ old('promo_price', $product->promo_price_cents !== null ? number_format($product->promo_price_cents/100, 2, '.', '') : '') }}"></div>
            </section>
        </div>
    </div>
    <section class="card" style="margin-top:12px">
        <h2>Variants</h2>
        @for($i=0;$i<3;$i++)
            @php $variant = $variants[$i] ?? null; @endphp
            <div class="form-grid">
                <input type="hidden" name="variants[{{ $i }}][id]" value="{{ $variant->id ?? '' }}">
                <div class="field"><label>Variant name</label><input name="variants[{{ $i }}][name]" value="{{ $variant->name ?? '' }}"></div>
                <div class="field"><label>SKU</label><input name="variants[{{ $i }}][sku]" value="{{ $variant->sku ?? '' }}"></div>
                <div class="field"><label>Price</label><input name="variants[{{ $i }}][price]" value="{{ isset($variant) ? number_format($variant->price_cents/100,2,'.','') : '' }}"></div>
                <div class="field"><label>Stock</label><input name="variants[{{ $i }}][stock_qty]" value="{{ $variant->stock_qty ?? '' }}"></div>
            </div>
        @endfor
        <button class="btn primary" type="submit">Submit Product</button>
        <a class="btn" href="{{ route('products.index') }}">Cancel</a>
    </section>
</form>
@endsection
