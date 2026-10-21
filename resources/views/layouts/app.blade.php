<!DOCTYPE html>
<html lang="{{ app()->getLocale() }}" dir="{{ app()->getLocale() === 'ar' ? 'rtl' : 'ltr' }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $title ?? 'BornoPos' }}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="{{ asset('css/app.css') }}">
    @stack('head')
</head>
<body>
<div class="app">
    @include('partials.sidebar')
    <div class="main">
        <header class="topbar">
            <button class="icon-btn hamburger" type="button" data-sidebar aria-label="Menu">☰</button>
            <form class="search" action="{{ route('search') }}" method="get">
                @include('partials.icon', ['name' => 'search'])
                <input name="q" value="{{ request('q') }}" placeholder="{{ __('Search product, invoice, customer...') }}">
                <kbd>⌘K</kbd>
            </form>
            @unless(auth()->user()->isSuperAdmin())
                <a class="pos-btn" href="{{ route('pos') }}">@include('partials.icon', ['name' => 'cart']) POS</a>
            @endunless
            <button class="icon-btn round" type="button" data-theme title="Theme">☾</button>
            <div class="menu">
                <button class="icon-btn round" type="button" data-menu aria-label="Notifications">
                    🔔
                    @if(auth()->user()->notices()->whereNull('read_at')->count())
                        <span class="dot">{{ auth()->user()->notices()->whereNull('read_at')->count() }}</span>
                    @endif
                </button>
                <div class="menu-pop">
                    @forelse(auth()->user()->notices()->latest()->limit(5)->get() as $notice)
                        <div style="padding:8px 10px"><strong>{{ $notice->title }}</strong><div class="muted">{{ $notice->body }}</div></div>
                    @empty
                        <div class="muted" style="padding:8px 10px">No notifications</div>
                    @endforelse
                    <form method="post" action="{{ route('notices.read') }}">@csrf<button type="submit">Mark read</button></form>
                </div>
            </div>
            <div class="menu">
                <button class="lang" type="button" data-menu><span class="flag">🇬🇧</span> {{ ['en' => 'English', 'bn' => 'Bangla', 'ar' => 'Arabic'][app()->getLocale()] ?? 'English' }}</button>
                <div class="menu-pop">
                    <a href="{{ route('locale', ['ln' => 'en']) }}">English</a>
                    <a href="{{ route('locale', ['ln' => 'bn']) }}">Bangla</a>
                    <a href="{{ route('locale', ['ln' => 'ar']) }}">Arabic</a>
                </div>
            </div>
            <div class="menu">
                <button class="user-chip" type="button" data-menu>
                    <span class="avatar">{{ strtoupper(substr(auth()->user()->name,0,1)) }}</span>
                    <span class="who"><b>{{ auth()->user()->name }}</b><small>{{ ucfirst(str_replace('_', ' ', auth()->user()->role)) }}</small></span>
                </button>
                <div class="menu-pop">
                    <a href="{{ route('profile') }}">Profile</a>
                    @unless(auth()->user()->isSuperAdmin())
                        <a href="{{ route('settings.general') }}">Settings</a>
                    @endunless
                    <form method="post" action="{{ route('logout') }}">@csrf<button type="submit">Logout</button></form>
                </div>
            </div>
        </header>
        <div class="content">
            @if(session('status'))<div class="flash">{{ session('status') }}</div>@endif
            @if($errors->any())
                <div class="errors">
                    @foreach($errors->all() as $error)<div>{{ $error }}</div>@endforeach
                </div>
            @endif
            @yield('content')
        </div>
        <footer class="app-foot">
            <span>© {{ date('Y') }} BornoPos</span>
            <span>{{ config('bornopos.support_phone') }} · {{ config('bornopos.support_email') }}</span>
            <span>v{{ config('bornopos.version') }}</span>
        </footer>
    </div>
</div>
<script src="{{ asset('js/app.js') }}"></script>
@stack('scripts')
</body>
</html>
