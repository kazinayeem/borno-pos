@extends('layouts.app')
@section('content')
<div class="page-title">
    <div>
        <h1>My Profile</h1>
        <p class="muted">Manage your personal account details and security credentials</p>
    </div>
</div>

@if(session('status'))
    <div class="card" style="margin-bottom: 16px; background: #ecfdf5; color: #065f46; border-left: 4px solid #10b981; padding: 12px 16px;">
        {{ session('status') }}
    </div>
@endif

@if($errors->any())
    <div class="card" style="margin-bottom: 16px; background: #fef2f2; color: #991b1b; border-left: 4px solid #ef4444; padding: 12px 16px;">
        <ul style="margin: 0; padding-left: 20px;">
            @foreach($errors->all() as $err)
                <li>{{ $err }}</li>
            @endforeach
        </ul>
    </div>
@endif

<section class="card" style="max-width: 600px;">
    <form method="post" action="{{ route('profile.update') }}">
        @csrf
        @method('PUT')
        <div class="field">
            <label>Full Name</label>
            <input name="name" value="{{ old('name', auth()->user()->name) }}" required>
        </div>
        <div class="field">
            <label>Email Address</label>
            <input type="email" name="email" value="{{ old('email', auth()->user()->email) }}" required>
        </div>
        <div class="field">
            <label>Phone Number</label>
            <input name="phone" value="{{ old('phone', auth()->user()->phone) }}" placeholder="e.g. 01700000000">
        </div>
        <div class="field">
            <label>New Password (leave blank to keep current)</label>
            <input type="password" name="password" placeholder="Minimum 8 characters">
        </div>
        <div class="field">
            <label>Confirm New Password</label>
            <input type="password" name="password_confirmation" placeholder="Repeat new password">
        </div>
        <button class="btn primary" style="margin-top: 8px;">Save Profile Changes</button>
    </form>
</section>
@endsection

