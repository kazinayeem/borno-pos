<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>BornoPos — Manage your business with less friction</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="{{ asset('css/app.css') }}">
</head>
<body>
<header class="hero">
    <div class="nav-landing">
        <a href="{{ route('home') }}" style="display:flex;gap:8px;align-items:center;font-weight:800">@include('partials.logo') <span>BornoPos<br><small style="font-weight:600;color:#64748b">Powering Your Business</small></span></a>
        <nav>
            <a href="#features">Features</a>
            <a href="#solutions">Solutions</a>
            <a href="#reviews">Reviews</a>
            <a class="btn" href="{{ route('signin') }}">Login</a>
            <a class="btn primary" href="{{ route('signup') }}">Start free</a>
        </nav>
    </div>
    <div class="hero-grid">
        <div>
            <div class="btn" style="border-radius:999px">Smart POS solution</div>
            <h1>Manage your business <span>easier & smarter</span></h1>
            <p class="muted" style="font-size:18px;max-width:560px">BornoPos keeps sales, inventory, people, and accounts in one shop workspace. Run one counter or several branches without losing the stock count.</p>
            <div class="filters">
                <a class="btn primary" href="{{ route('signin') }}">Start free demo →</a>
                <a class="btn" href="#features">See what is included</a>
            </div>
        </div>
        <div>@include('partials.terminal')</div>
    </div>
</header>
<section class="section" id="features">
    <h2>Everything you need in one place</h2>
    <p class="muted">From the counter to payroll, the same records feed the dashboard.</p>
    <div class="cards-6">
        @foreach ([
            ['Sales', 'Fast billing, drafts, partial payments, and printable invoices.'],
            ['Inventory', 'Purchases raise stock. Sales and returns move it back.'],
            ['HR', 'Departments, attendance, holidays, and payroll that hits salary cost once.'],
            ['Accounting', 'Cash accounts, transfers, and a balance sheet from the same ledger.'],
            ['Stores', 'Separate demo shops for grocery, pharmacy, electronics, and restaurants.'],
            ['Reports', 'Profit uses unit cost at the time of sale, not a second copy of purchases.'],
        ] as [$title, $text])
            <article class="card"><h3>{{ $title }}</h3><p class="muted">{{ $text }}</p></article>
        @endforeach
    </div>
</section>
<section class="section" id="solutions">
    <h2>Built for different kinds of shops</h2>
    <div class="cards-6">
        @foreach (['Retail stores' => 'Fashion, electronics, and everyday counters', 'Restaurants' => 'Menu items, drafts, and same-day sales', 'Grocery' => 'Fast stock and supplier purchases', 'Pharmacy' => 'Batches and expiry on purchase lines', 'Services' => 'Staff, attendance, and payroll', 'Multi-branch' => 'A shop record for each location'] as $title => $text)
            <article class="card"><h3>{{ $title }}</h3><p class="muted">{{ $text }}</p></article>
        @endforeach
    </div>
</section>
<section class="section" id="reviews">
    <h2>What shop teams keep track of</h2>
    <div class="cards-3">
        <article class="card"><p>“The counter and the stock screen finally agree at the end of the day.”</p><strong>Amina, grocery lead</strong></article>
        <article class="card"><p>“Returns put the item back on the shelf and the cash account.”</p><strong>Rahim, pharmacy owner</strong></article>
        <article class="card"><p>“Payroll stays out of the expense list, so profit is easier to explain.”</p><strong>Nusrat, restaurant manager</strong></article>
    </div>
</section>
<section class="section" style="text-align:center">
    <h2>Open a BornoPos shop today</h2>
    <a class="btn primary" href="{{ route('signup') }}">Create a shop</a>
</section>
<footer class="footer">
    <div><strong>BornoPos</strong><p>A point-of-sale and shop workspace. Version {{ config('bornopos.version') }}.</p></div>
    <div><strong>Quick links</strong><a href="{{ route('home') }}">Home</a><a href="#features">Features</a><a href="#solutions">Solutions</a><a href="{{ route('signin') }}">Login</a></div>
    <div><strong>Resources</strong><a href="{{ route('signup') }}">Create a shop</a><a href="{{ route('signin') }}">Demo access</a></div>
    <div><strong>Contact</strong><p>{{ config('bornopos.support_phone') }}</p><p>{{ config('bornopos.support_email') }}</p></div>
</footer>
</body>
</html>
