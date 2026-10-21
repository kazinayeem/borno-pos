@extends('layouts.app')
@section('content')
<div class="page-title"><div><h1>Payment Gateway</h1></div></div>
<section class="card">
    <p class="muted">These switches record which methods your shop offers. BornoPos does not send charges to an external provider.</p>
    <form method="post" action="{{ auth()->user()->isSuperAdmin() ? route('gateway.admin.update') : route('settings.gateway.update') }}">@csrf
        @foreach($names as $key => $label)
            <label style="display:block;margin:8px 0"><input type="checkbox" name="{{ $key }}_enabled" value="1" @checked($gateways[$key]['enabled'] ?? $key==='cash')> {{ $label }}</label>
        @endforeach
        <button class="btn primary">Save methods</button>
    </form>
</section>
@endsection
