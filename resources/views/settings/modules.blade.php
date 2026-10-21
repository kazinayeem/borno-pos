@extends('layouts.app')
@section('content')
<div class="page-title"><div><h1>Business Modules</h1></div></div>
<section class="card"><form method="post" action="{{ route('settings.modules.update') }}">@csrf
    @foreach($modules as $key => $enabled)
        <label style="display:block;margin:8px 0"><input type="checkbox" name="{{ $key }}" value="1" @checked($enabled)> {{ ucfirst($key) }}</label>
    @endforeach
    <button class="btn primary">Save modules</button>
</form></section>
@endsection
