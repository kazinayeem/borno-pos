@extends('layouts.app')
@section('content')
<div class="page-title"><div><h1>Create store</h1></div></div>
<section class="card"><form method="post" action="{{ auth()->user()->isSuperAdmin() ? route('shops.store') : route('stores.store') }}">@csrf
    <div class="field"><label>Name</label><input name="name" required></div>
    <div class="field"><label>Business type</label><select name="business_type"><option value="all_in_one">All in one</option><option value="grocery">Grocery</option><option value="pharmacy">Pharmacy</option><option value="electronics">Electronics</option><option value="restaurant">Restaurant</option></select></div>
    <div class="field"><label>Email</label><input name="email"></div>
    <div class="field"><label>Phone</label><input name="phone"></div>
    <div class="field"><label>Address</label><input name="address"></div>
    <button class="btn primary">Save store</button>
</form></section>
@endsection
