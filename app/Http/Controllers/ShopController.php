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
    public function index()
    {
        $user = auth()->user();
        $stores = $user->isSuperAdmin()
            ? Store::with('owner')->latest()->paginate(12)
            : Store::withoutGlobalScopes()->where('id', $user->store_id)->orWhere('parent_id', $user->store_id)->paginate(12);

        return view('shops.index', compact('stores'));
    }

    public function create()
    {
        return view('shops.form', ['store' => new Store]);
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

        return redirect()->route('stores.index')->with('status', 'Store saved.');
    }

    public function categories()
    {
        return view('shops.categories', [
            'types' => Store::query()->selectRaw('business_type, count(*) as total')->groupBy('business_type')->get(),
        ]);
    }

    public function plans()
    {
        return view('subscriptions.purchase', [
            'plans' => Plan::where('is_active', true)->get(),
            'current' => Subscription::with('plan')->latest()->limit(5)->get(),
        ]);
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

        return back()->with('status', 'Subscription request recorded as unpaid. No external payment was charged.');
    }

    public function report()
    {
        $rows = auth()->user()->isSuperAdmin()
            ? Subscription::withoutGlobalScopes()->with(['plan', 'store'])->latest()->paginate(15)
            : Subscription::with('plan')->latest()->paginate(15);

        return view('subscriptions.report', compact('rows'));
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

    public function tour()
    {
        return view('tour');
    }

    public function readNotices(Request $request)
    {
        $request->user()->notices()->whereNull('read_at')->update(['read_at' => now()]);

        return back();
    }
}
