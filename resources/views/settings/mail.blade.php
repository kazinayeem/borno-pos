@extends('layouts.app')
@section('content')
<div class="page-title"><div><h1>Mail Settings</h1></div></div>
<section class="card"><form method="post" action="{{ route('mail.update') }}">@csrf
    <div class="field"><label>Host</label><input name="host" value="{{ $mail['host'] ?? '' }}"></div>
    <div class="field"><label>Port</label><input name="port" value="{{ $mail['port'] ?? '' }}"></div>
    <div class="field"><label>Username</label><input name="username" value="{{ $mail['username'] ?? '' }}"></div>
    <div class="field"><label>From address</label><input name="from" value="{{ $mail['from'] ?? '' }}"></div>
    <button class="btn primary">Store mail settings</button>
</form></section>
@endsection
