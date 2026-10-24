<!DOCTYPE html>
<html lang="{{ app()->getLocale() }}" dir="{{ app()->getLocale() === 'ar' ? 'rtl' : 'ltr' }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>BornoPos</title>
    <script>
        try {
            if (localStorage.getItem('bornopos-theme') === 'dark') {
                document.documentElement.classList.add('dark');
            }
        } catch (e) {}
    </script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    @vite(['resources/js/main.jsx'])
</head>
<body>
<div id="root"></div>
@php
    $store = auth()->user()?->store;
    $boot = [
        'version' => config('bornopos.version'),
        'demoPassword' => config('bornopos.demo_password'),
        'status' => session('status'),
        'phone' => config('bornopos.support_phone'),
        'email' => config('bornopos.support_email'),
        'locale' => app()->getLocale(),
        'user' => auth()->user() ? [
            'id' => auth()->user()->id,
            'name' => auth()->user()->name,
            'email' => auth()->user()->email,
            'username' => auth()->user()->username,
            'role' => auth()->user()->role,
            'role_id' => auth()->user()->role_id,
            'role_title' => auth()->user()->roleTitle(),
            'store_id' => auth()->user()->store_id,
            'is_active' => (bool) auth()->user()->is_active,
            'permissions' => auth()->user()->allPermissions(),
        ] : null,
        'currency_symbol' => $store?->symbol() ?? '$',
        'currency_code' => $store?->currency_code ?? 'USD',
        'store' => $store ? [
            'id' => $store->id,
            'name' => $store->name,
            'currency_symbol' => $store->symbol(),
            'currency_code' => $store->currency_code,
        ] : null,
    ];
@endphp
<script>window.BornoPos = @json($boot);</script>
</body>
</html>
