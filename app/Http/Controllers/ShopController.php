<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\Customer;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Sale;
use App\Models\Store;
use App\Models\Subscription;
use App\Models\Warehouse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ShopController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = $user->isSuperAdmin()
            ? Store::with('owner')
            : Store::withoutGlobalScopes()->where(function ($q) use ($user) {
                $q->where('id', $user->store_id)->orWhere('parent_id', $user->store_id);
            });

        if ($search = trim((string) ($request->input('search') ?? $request->input('q')))) {
            $query->where(function ($sub) use ($search) {
                $sub->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $perPage = max(1, min(100, $request->integer('per_page', 12)));
        $stores = $query->latest()->paginate($perPage)->withQueryString();

        if ($request->expectsJson()) {
            return response()->json([
                'stores' => $stores->getCollection()->map(fn ($s) => [
                    'id' => $s->id,
                    'name' => $s->name,
                    'business_type' => $s->business_type,
                    'phone' => $s->phone,
                    'email' => $s->email,
                    'address' => $s->address,
                    'currency_code' => $s->currency_code,
                    'currency_symbol' => $s->currency_symbol,
                    'is_current' => $s->id === $user->store_id,
                ]),
                'meta' => [
                    'current_page' => $stores->currentPage(),
                    'last_page' => $stores->lastPage(),
                    'from' => $stores->firstItem(),
                    'to' => $stores->lastItem(),
                    'total' => $stores->total(),
                    'per_page' => $stores->perPage(),
                ],
            ]);
        }

        return view('spa');
    }

    public function create(Request $request)
    {
        if ($request->expectsJson()) {
            return response()->json([
                'business_types' => ['all_in_one', 'grocery', 'pharmacy', 'electronics', 'restaurant'],
            ]);
        }

        return view('spa');
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'business_type' => ['required', Rule::in(['all_in_one', 'grocery', 'pharmacy', 'electronics', 'restaurant'])],
            'email' => ['nullable', 'email'],
            'phone' => ['nullable', 'string', 'max:40'],
            'address' => ['nullable', 'string', 'max:255'],
        ]);
        $parent = $request->user()->isSuperAdmin() ? null : $request->user()->store_id;
        $store = Store::create([
            ...$data,
            'parent_id' => $parent,
            'slug' => Str::slug($data['name']).'-'.Str::lower(Str::random(4)),
            'owner_id' => $request->user()->isSuperAdmin() ? null : $request->user()->id,
        ]);
        Warehouse::create(['store_id' => $store->id, 'name' => 'Main Warehouse']);
        Account::withoutGlobalScopes()->create([
            'store_id' => $store->id,
            'name' => 'Cash',
            'number' => 'CASH-001',
            'type' => 'cash',
            'is_default' => true,
        ]);

        if ($request->expectsJson()) {
            return response()->json(['message' => 'Store saved successfully.', 'store' => $store]);
        }

        return redirect()->route('stores.index')->with('status', 'Store saved.');
    }

    public function categories()
    {
        return view('shops.categories', [
            'types' => Store::query()->selectRaw('business_type, count(*) as total')->groupBy('business_type')->get(),
        ]);
    }

    public function plans(Request $request)
    {
        $plans = Plan::where('is_active', true)->get();
        $current = Subscription::with('plan')->latest()->limit(5)->get();

        if ($request->expectsJson()) {
            return response()->json([
                'plans' => $plans->map(fn ($p) => [
                    'id' => $p->id,
                    'name' => $p->name,
                    'price_cents' => (int) $p->price_cents,
                    'billing_interval' => $p->billing_interval,
                    'features' => $p->features ?? [],
                ]),
                'current' => $current->map(fn ($c) => [
                    'id' => $c->id,
                    'plan_name' => $c->plan?->name,
                    'status' => $c->status,
                    'payment_status' => $c->payment_status,
                    'starts_on' => optional($c->starts_on)->format('Y-m-d'),
                    'ends_on' => optional($c->ends_on)->format('Y-m-d'),
                    'amount_cents' => (int) $c->amount_cents,
                ]),
            ]);
        }

        return view('spa');
    }

    public function buy(Request $request)
    {
        $data = $request->validate([
            'plan_id' => ['required', 'integer', 'exists:plans,id'],
        ]);
        $plan = Plan::findOrFail($data['plan_id']);
        Subscription::create([
            'store_id' => $request->user()->store_id,
            'plan_id' => $plan->id,
            'status' => 'pending',
            'gateway' => 'manual',
            'payment_status' => 'unpaid',
            'amount_cents' => $plan->price_cents,
        ]);

        if ($request->expectsJson()) {
            return response()->json(['message' => 'Subscription request recorded as unpaid. No external payment was charged.']);
        }

        return back()->with('status', 'Subscription request recorded as unpaid. No external payment was charged.');
    }

    public function report(Request $request)
    {
        $query = $request->user()->isSuperAdmin()
            ? Subscription::withoutGlobalScopes()->with(['plan', 'store'])
            : Subscription::with('plan');

        if ($search = trim((string) ($request->input('search') ?? $request->input('q')))) {
            $query->where(function ($sub) use ($search) {
                $sub->whereHas('plan', fn ($pq) => $pq->where('name', 'like', "%{$search}%"))
                    ->orWhereHas('store', fn ($sq) => $sq->where('name', 'like', "%{$search}%"))
                    ->orWhere('payment_status', 'like', "%{$search}%")
                    ->orWhere('status', 'like', "%{$search}%");
            });
        }

        $perPage = max(1, min(100, $request->integer('per_page', 15)));
        $rows = $query->latest()->paginate($perPage)->withQueryString();

        if ($request->expectsJson()) {
            return response()->json([
                'rows' => $rows->getCollection()->map(fn ($s) => [
                    'id' => $s->id,
                    'store_name' => $s->store?->name,
                    'plan_name' => $s->plan?->name,
                    'status' => $s->status,
                    'payment_status' => $s->payment_status,
                    'amount_cents' => (int) $s->amount_cents,
                    'starts_on' => optional($s->starts_on)->format('Y-m-d'),
                    'ends_on' => optional($s->ends_on)->format('Y-m-d'),
                ]),
                'meta' => [
                    'current_page' => $rows->currentPage(),
                    'last_page' => $rows->lastPage(),
                    'from' => $rows->firstItem(),
                    'to' => $rows->lastItem(),
                    'total' => $rows->total(),
                    'per_page' => $rows->perPage(),
                ],
            ]);
        }

        return view('spa');
    }

    public function activate(Subscription $subscription)
    {
        $subscription->update([
            'status' => 'active',
            'payment_status' => 'paid',
            'starts_on' => now()->toDateString(),
            'ends_on' => now()->addMonth()->toDateString(),
        ]);

        return back()->with('status', 'Subscription marked active from a manual billing record.');
    }

    public function search(Request $request)
    {
        $term = trim($request->string('q'));
        $products = $customers = $sales = collect();
        if ($term !== '') {
            $products = Product::query()->where(function ($q) use ($term) {
                $q->where('name', 'like', "%{$term}%")->orWhere('code', 'like', "%{$term}%");
            })->limit(8)->get();
            $customers = Customer::query()->where(function ($q) use ($term) {
                $q->where('name', 'like', "%{$term}%")->orWhere('phone', 'like', "%{$term}%");
            })->limit(8)->get();
            $sales = Sale::query()->where('invoice_no', 'like', "%{$term}%")->limit(8)->get();
        }

        return view('search.index', compact('term', 'products', 'customers', 'sales'));
    }

    public function tour(Request $request)
    {
        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'title' => 'System Guided Tour & Onboarding',
                'message' => 'Guided tour center',
                'route' => '/tour',
            ]);
        }

        return view('spa');
    }

    public function readNotices(Request $request)
    {
        $request->user()->notices()->whereNull('read_at')->update(['read_at' => now()]);

        return back();
    }
}
