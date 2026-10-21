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
    $boot = [
        'version' => config('bornopos.version'),
        'demoPassword' => config('bornopos.demo_password'),
        'status' => session('status'),
        'phone' => config('bornopos.support_phone'),
        'email' => config('bornopos.support_email'),
        'locale' => app()->getLocale(),
        'user' => auth()->user()?->only(['id', 'name', 'email', 'role', 'store_id']),
    ];
@endphp
<script>window.BornoPos = @json($boot);</script>
</body>
</html>
