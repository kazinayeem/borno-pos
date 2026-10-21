@extends('layouts.app')
@section('content')
<div class="page-title"><div><div class="crumbs">Purchase › Add Purchase</div><h1>New Purchase</h1></div><a class="btn" href="{{ route('purchases.index') }}">Back to Purchases</a></div>
<form method="post" action="{{ route('purchases.store') }}" enctype="multipart/form-data" data-once>
    @csrf
    <section class="card">
        <h2>Purchase Information</h2>
        <div class="form-grid">
            <div class="field"><label>Warehouse *</label><select name="warehouse_id" required>@foreach($warehouses as $warehouse)<option value="{{ $warehouse->id }}">{{ $warehouse->name }}</option>@endforeach</select></div>
            <div class="field"><label>Supplier *</label><select name="supplier_id" required>@foreach($suppliers as $supplier)<option value="{{ $supplier->id }}">{{ $supplier->name }}</option>@endforeach</select><a href="{{ route('suppliers.create') }}">Add new</a></div>
            <div class="field"><label>Purchase Date *</label><input type="date" name="purchased_on" value="{{ now()->toDateString() }}" required></div>
            <div class="field"><label>Attach Document</label><input type="file" name="document" accept="image/*,.pdf"></div>
        </div>
    </section>
    <section class="card" style="margin-top:12px">
        <h2>Add Products</h2>
        <div id="lines">
            <div class="form-grid line">
                <div class="field"><label>Product</label><select name="items[0][product_id]" required><option value="">Select</option>@foreach($products as $product)<option value="{{ $product->id }}" data-cost="{{ number_format($product->cost_cents/100,2,'.','') }}">{{ $product->name }} ({{ $product->code }})</option>@endforeach</select></div>
                <div class="field"><label>Quantity</label><input type="number" min="1" name="items[0][qty]" value="1" required></div>
                <div class="field"><label>Purchase Cost</label><input name="items[0][cost]" value="0.00"></div>
                <div class="field"><label>Batch</label><input name="items[0][batch_no]"></div>
                <div class="field"><label>Expiry</label><input type="date" name="items[0][expiry_date]"></div>
                <div class="field"><label>Serial / IMEI</label><input name="items[0][serial]"></div>
            </div>
        </div>
        <button class="btn" type="button" id="add-line">+ Add row</button>
    </section>
    <div class="grid-2">
        <section class="card">
            <h2>Additional Charges</h2>
            <div class="form-grid">
                <div class="field"><label>Tax</label><input name="tax" value="0.00"></div>
                <div class="field"><label>Shipping Cost</label><input name="shipping" value="0.00"></div>
                <div class="field"><label>Order Discount</label><input name="discount" value="0.00"></div>
                <div class="field"><label>Payment Method</label><select name="payment_method"><option>Cash</option><option>Bank</option><option>Manual</option></select></div>
                <div class="field"><label>Amount Paid</label><input name="amount_paid" value="0.00"></div>
            </div>
            <div class="field"><label>Note</label><textarea name="note"></textarea></div>
        </section>
        <section class="card">
            <p class="muted">Stock increases only after this purchase is saved. Unpaid amounts stay as purchase due and are not counted as an expense.</p>
            <button class="btn primary" type="submit">Save Purchase</button>
        </section>
    </div>
</form>
@endsection
@push('scripts')
<script>
document.getElementById('add-line').addEventListener('click', () => {
  const holder = document.getElementById('lines');
  const index = holder.querySelectorAll('.line').length;
  const first = holder.querySelector('.line');
  const clone = first.cloneNode(true);
  clone.querySelectorAll('input, select').forEach((input) => {
    input.name = input.name.replace(/items\[\d+\]/, `items[${index}]`);
    if (input.tagName === 'INPUT' && input.type !== 'date') input.value = input.type === 'number' ? 1 : '';
  });
  holder.appendChild(clone);
});
</script>
@endpush
