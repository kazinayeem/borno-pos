@extends('layouts.app')
@section('content')
<div class="page-title"><div><h1>Stock Count</h1></div></div>
<section class="card">
    <form method="post" action="{{ route('stock.store') }}" data-once>@csrf
        <div class="form-grid">
            <div class="field"><label>Warehouse</label><select name="warehouse_id">@foreach($warehouses as $warehouse)<option value="{{ $warehouse->id }}">{{ $warehouse->name }}</option>@endforeach</select></div>
            <div class="field"><label>Date</label><input type="date" name="counted_on" value="{{ now()->toDateString() }}"></div>
        </div>
        <table><thead><tr><th>Product</th><th>Expected</th><th>Counted</th></tr></thead>
        <tbody>@foreach($products as $product)<tr><td>{{ $product->name }}</td><td>{{ $product->stock_qty }}</td><td><input type="number" min="0" name="counted[{{ $product->id }}]" value="{{ $product->stock_qty }}"></td></tr>@endforeach</tbody></table>
        <button class="btn primary">Apply count</button>
    </form>
</section>
<section class="card" style="margin-top:12px"><table><thead><tr><th>Date</th><th>Status</th></tr></thead><tbody>@foreach($counts as $count)<tr><td>{{ $count->counted_on->format('d M Y') }}</td><td>{{ $count->status }}</td></tr>@endforeach</tbody></table></section>
@endsection
