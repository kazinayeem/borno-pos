<!DOCTYPE html>
<html lang="{{ app()->getLocale() }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>BornoPos — Sign in</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="{{ asset('css/app.css') }}">
</head>
<body class="guest-body">
<div class="auth-top">
    <a class="brand-lock" href="{{ route('home') }}">
        @include('partials.logo')
        <div>BornoPos<small>Powering Your Business</small></div>
    </a>
    <div class="auth-tools">
        <span>Version {{ config('bornopos.version') }}</span>
        <div class="menu">
            <button class="lang" type="button" data-menu><span class="flag">🇬🇧</span> {{ ['en' => 'English', 'bn' => 'Bangla', 'ar' => 'Arabic'][app()->getLocale()] ?? 'English' }}</button>
            <div class="menu-pop">
                <a href="{{ route('locale', ['ln' => 'en']) }}">English</a>
                <a href="{{ route('locale', ['ln' => 'bn']) }}">Bangla</a>
                <a href="{{ route('locale', ['ln' => 'ar']) }}">Arabic</a>
            </div>
        </div>
    </div>
</div>
<div class="login-wrap">
    <section class="login-copy">
        <h1>Smart POS<br>for a Smarter Business</h1>
        <p class="muted" style="font-size:16px;max-width:460px">Manage sales, inventory, customers and more — all in one place.</p>
        <div class="features">
            <div class="feature"><div class="bubble" style="background:#e8f1ff">🛒</div><b>Easy Sales</b><span>Fast &amp; Simple</span></div>
            <div class="feature"><div class="bubble" style="background:#e7f8ee">▣</div><b>Inventory</b><span>Real-time Stock</span></div>
            <div class="feature"><div class="bubble" style="background:#f3e8ff">📊</div><b>Reports</b><span>Insightful Analytics</span></div>
            <div class="feature"><div class="bubble" style="background:#fff1e6">☺</div><b>Multi-User</b><span>Role Based Access</span></div>
        </div>
        <p class="script">Sell Faster,<br>Grow Bigger!<i></i></p>
        @include('partials.terminal')
    </section>
    <section class="login-card">
        <div style="text-align:center">
            @include('partials.logo')
            <div style="font-weight:800;margin-top:6px">BornoPos</div>
            <h1>Welcome Back 👋</h1>
            <p class="muted">Sign in to your account to continue</p>
        </div>
        @if(session('status'))<div class="flash">{{ session('status') }}</div>@endif
        @if($errors->any())<div class="errors">{{ $errors->first() }}</div>@endif
        <form id="login-form" method="post" action="{{ route('login') }}">
            @csrf
            <div class="field"><label for="login">Email or Username</label>
                <div class="input-ico"><span>👤</span><input id="login" name="login" value="{{ old('login') }}" placeholder="Enter your email or username" required autofocus></div>
            </div>
            <div class="field"><label for="password">Password</label>
                <div class="input-ico"><span>🔒</span><input id="password" name="password" type="password" placeholder="Enter your password" required>
                <button type="button" data-toggle-password style="position:absolute;right:10px;top:10px;border:0;background:transparent;cursor:pointer">👁</button></div>
            </div>
            <label style="display:flex;gap:8px;align-items:center;margin:2px 0 14px;font-weight:600"><input type="checkbox" name="remember" value="1" checked> Remember me</label>
            <button class="signin-btn" type="submit">→ Sign In</button>
        </form>
        <div class="or"><span>or</span></div>
        <div class="demo">
            <div class="demo-head">
                <strong style="color:#2563eb">ⓘ Demo Access</strong>
                <span class="muted">In the above button demo and local purpose</span>
            </div>
            <div class="demo-grid">
                @foreach($demos as $demo)
                    <button type="button" data-demo data-login="{{ $demo['login'] }}" data-password="{{ config('bornopos.demo_password') }}">{{ $demo['label'] }}</button>
                @endforeach
            </div>
        </div>
        <div class="demo" style="margin-top: 14px;">
            <div class="demo-head">
                <strong style="color:#10b981">👥 Quick Staff Demo Login</strong>
                <span class="muted">Click 1, 2, or 3 to test staff restricted permissions</span>
            </div>
            <div class="demo-grid">
                <button type="button" data-demo data-login="manager@bornopos.test" data-password="{{ config('bornopos.demo_password') }}">1. Manager</button>
                <button type="button" data-demo data-login="cashier@bornopos.test" data-password="{{ config('bornopos.demo_password') }}">2. Cashier</button>
                <button type="button" data-demo data-login="inventory@bornopos.test" data-password="{{ config('bornopos.demo_password') }}">3. Inventory Staff</button>
            </div>
        </div>
        <p style="text-align:center;margin-top:16px">Register yourself as a shop owner <a href="{{ route('signup') }}" style="color:#2563eb;font-weight:800">Sign Up</a></p>
        <p class="muted" style="text-align:center;font-size:12px">© {{ date('Y') }} BornoPos. All rights reserved.</p>
    </section>
</div>
<script src="{{ asset('js/app.js') }}"></script>
</body>
</html>
