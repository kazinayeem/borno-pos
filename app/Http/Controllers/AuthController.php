<?php

namespace App\Http\Controllers;

use App\Models\Store;
use App\Models\User;
use App\Models\UserNotice;
use App\Models\Warehouse;
use App\Models\Account;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function signin()
    {
        if (Auth::check()) {
            return redirect()->route(Auth::user()->homeRoute());
        }

        return view('spa');
    }

    public function login(Request $request)
    {
        $data = $request->validate([
            'login' => ['required', 'string', 'max:190'],
            'password' => ['required', 'string'],
        ]);

        $user = User::query()
            ->where('email', $data['login'])
            ->orWhere('username', $data['login'])
            ->first();

        if (! $user || ! Auth::attempt(['email' => $user->email, 'password' => $data['password']], $request->boolean('remember'))) {
            if ($request->expectsJson()) {
                throw ValidationException::withMessages([
                    'login' => 'These credentials do not match our records.',
                ]);
            }

            return back()->withErrors(['login' => 'These credentials do not match our records.'])->onlyInput('login');
        }

        $request->session()->regenerate();

        if ($request->expectsJson()) {
            return response()->json([
                'redirect' => route($user->homeRoute()),
                'user' => $user->only(['id', 'name', 'email', 'role', 'store_id']),
            ]);
        }

        return redirect()->route($user->homeRoute());
    }

    public function signupForm()
    {
        return view('auth.signup');
    }

    public function signup(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'shop_name' => ['required', 'string', 'max:160'],
            'business_type' => ['required', Rule::in(['all_in_one', 'grocery', 'pharmacy', 'electronics', 'restaurant'])],
            'email' => ['required', 'email', 'max:190', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $store = Store::create([
            'name' => $data['shop_name'],
            'slug' => Str::slug($data['shop_name']).'-'.Str::lower(Str::random(4)),
            'business_type' => $data['business_type'],
            'email' => $data['email'],
            'currency_code' => 'USD',
            'currency_symbol' => '$',
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'username' => Str::before($data['email'], '@'),
            'password' => $data['password'],
            'role' => 'owner',
            'store_id' => $store->id,
        ]);
        $store->update(['owner_id' => $user->id]);

        Warehouse::create(['store_id' => $store->id, 'name' => 'Main Warehouse']);
        Account::create([
            'store_id' => $store->id,
            'name' => 'Cash',
            'number' => 'CASH-001',
            'type' => 'cash',
            'is_default' => true,
        ]);
        UserNotice::create([
            'user_id' => $user->id,
            'title' => 'Welcome to BornoPos',
            'body' => 'Add products, record a purchase, then open POS to make your first sale.',
        ]);

        Auth::login($user);
        $request->session()->regenerate();

        return redirect()->route('store.dashboard');
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        if ($request->expectsJson()) {
            return response()->json(['ok' => true]);
        }

        return redirect()->route('signin')->with('status', 'You logged out successfully.');
    }

    public function locale(Request $request)
    {
        $locale = $request->string('ln')->toString();
        if (! in_array($locale, ['en', 'bn', 'ar'], true)) {
            $locale = 'en';
        }
        session(['locale' => $locale]);
        if ($request->user()) {
            $request->user()->update(['locale' => $locale]);
        }

        if ($request->expectsJson()) {
            return response()->json(['locale' => $locale]);
        }

        return redirect()->to($request->headers->get('referer') ?: url('/signin'));
    }

    private function demos(): array
    {
        return [
            ['label' => 'All In One', 'login' => 'allinone@bornopos.test'],
            ['label' => 'Super Shop/Grocery', 'login' => 'grocery@bornopos.test'],
            ['label' => 'Pharmacy', 'login' => 'pharmacy@bornopos.test'],
            ['label' => 'Electronics/Hardware or Mobile Shop', 'login' => 'electronics@bornopos.test'],
            ['label' => 'Restaurant', 'login' => 'restaurant@bornopos.test'],
            ['label' => 'Super Admin or SAAS', 'login' => 'superadmin@bornopos.test'],
        ];
    }
}
