@extends('layouts.app')
@section('content')
<div class="page-title"><div><h1>Profile</h1></div></div>
<section class="card"><form method="post" action="{{ route('profile.update') }}">@csrf @method('PUT')
    <div class="field"><label>Name</label><input name="name" value="{{ old('name', auth()->user()->name) }}" required></div>
    <div class="field"><label>Email</label><input name="email" value="{{ old('email', auth()->user()->email) }}" required></div>
    <div class="field"><label>Phone</label><input name="phone" value="{{ old('phone', auth()->user()->phone) }}"></div>
    <div class="field"><label>New password</label><input type="password" name="password"></div>
    <div class="field"><label>Confirm password</label><input type="password" name="password_confirmation"></div>
    <button class="btn primary">Save profile</button>
</form></section>
@endsection
