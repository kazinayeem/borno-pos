@extends('layouts.app')
@section('content')
<div class="page-title"><div><h1>Language</h1></div></div>
<section class="card">
    <p>Choose the language used for navigation labels.</p>
    <a class="btn" href="{{ route('locale', ['ln' => 'en']) }}">English</a>
    <a class="btn" href="{{ route('locale', ['ln' => 'bn']) }}">Bangla</a>
    <a class="btn" href="{{ route('locale', ['ln' => 'ar']) }}">Arabic</a>
</section>
@endsection
