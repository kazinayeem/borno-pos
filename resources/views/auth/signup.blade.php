<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Create a BornoPos shop</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="{{ asset('css/app.css') }}">
</head>
<body class="guest-body">
<div class="login-wrap" style="grid-template-columns:1fr;max-width:560px;margin:0 auto">
    <section class="login-card">
        <a href="{{ route('home') }}" style="display:flex;gap:8px;align-items:center;font-weight:800">@include('partials.logo') BornoPos</a>
        <h1>Create your shop</h1>
        @if($errors->any())<div class="errors">@foreach($errors->all() as $error)<div>{{ $error }}</div>@endforeach</div>@endif
        <form method="post" action="{{ route('signup.store') }}">@csrf
            <div class="field"><label>Your name</label><input name="name" value="{{ old('name') }}" required></div>
            <div class="field"><label>Shop name</label><input name="shop_name" value="{{ old('shop_name') }}" required></div>
            <div class="field"><label>Business type</label>
                <select name="business_type">
                    @foreach(['all_in_one'=>'All in one','grocery'=>'Super shop / grocery','pharmacy'=>'Pharmacy','electronics'=>'Electronics or mobile shop','restaurant'=>'Restaurant'] as $value=>$label)
                        <option value="{{ $value }}" @selected(old('business_type')===$value)>{{ $label }}</option>
                    @endforeach
                </select>
            </div>
            <div class="field"><label>Email</label><input type="email" name="email" value="{{ old('email') }}" required></div>
            <div class="field"><label>Password</label><input type="password" name="password" required></div>
            <div class="field"><label>Confirm password</label><input type="password" name="password_confirmation" required></div>
            <button class="btn primary" type="submit" style="width:100%">Create shop</button>
        </form>
        <p>Already registered? <a href="{{ route('signin') }}">Sign in</a></p>
    </section>
</div>
</body>
</html>
