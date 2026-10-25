<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\AuditLog;
use App\Models\Customer;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Sale;
use App\Models\Setting;
use App\Models\Store;
use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use App\Models\SubscriptionPayment;
use App\Models\Warehouse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
        $plans = Plan::where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('price_cents')
            ->get();

        $user = $request->user();
        $storeId = $user->store_id;
        if (! $storeId && $user->isSuperAdmin() && $request->filled('store_id')) {
            $storeId = (int) $request->input('store_id');
        }
        $store = $storeId ? Store::withoutGlobalScopes()->find($storeId) : null;

        $invoices = $store ? SubscriptionInvoice::withoutGlobalScopes()
            ->where('store_id', $store->id)
            ->with('plan')
            ->latest()
            ->limit(10)
            ->get() : collect();

        $payments = $store ? SubscriptionPayment::withoutGlobalScopes()
            ->where('store_id', $store->id)
            ->with('plan')
            ->latest()
            ->limit(10)
            ->get() : collect();

        $configuredGateways = Setting::getPlatform('manual_payment_gateways', [
            'bkash' => [
                'enabled' => true,
                'account_number' => '01712345678',
                'account_type' => 'Merchant',
                'instructions' => "1. Go to your bKash app or dial *247#.\n2. Choose 'Make Payment'.\n3. Enter our bKash Number: 01712345678.\n4. Enter the exact bill amount.\n5. Use your Shop Name as Reference.\n6. Confirm with PIN.\n7. Copy the TrxID and submit it below.",
            ],
            'nagad' => [
                'enabled' => true,
                'account_number' => '01812345678',
                'account_type' => 'Merchant',
                'instructions' => "1. Open Nagad app or dial *167#.\n2. Select 'Payment'.\n3. Enter Nagad Number: 01812345678.\n4. Enter bill amount and reference.\n5. Complete payment and copy TrxID to submit below.",
            ],
        ]);

        $publicGateways = [];
        foreach ($configuredGateways as $key => $conf) {
            if (! empty($conf['enabled'])) {
                $publicGateways[$key] = [
                    'account_number' => $conf['account_number'] ?? '',
                    'account_type' => $conf['account_type'] ?? 'Merchant',
                    'instructions' => $conf['instructions'] ?? '',
                ];
            }
        }

        if ($request->expectsJson() || $request->is('api/*')) {
            return response()->json([
                'plans' => $plans->map(fn ($p) => [
                    'id' => $p->id,
                    'name' => $p->name,
                    'slug' => $p->slug ?: Str::slug($p->name),
                    'description' => $p->description,
                    'price_cents' => (int) $p->price_cents,
                    'currency' => $p->currency ?: 'BDT',
                    'interval' => $p->interval,
                    'billing_interval' => $p->interval,
                    'duration_days' => $p->duration_days ?: 30,
                    'trial_days' => $p->trial_days ?: 0,
                    'max_users' => $p->max_users ?: 5,
                    'max_stores' => $p->max_stores ?: 1,
                    'max_products' => $p->max_products ?: 500,
                    'allowed_modules' => $p->allowed_modules ?? [],
                    'features' => is_array($p->features) ? $p->features : (is_string($p->features) ? array_values(array_filter(array_map('trim', explode(',', $p->features)))) : []),
                    'is_featured' => (bool) $p->is_featured,
                    'sort_order' => (int) $p->sort_order,
                ]),
                'gateways' => $publicGateways,
                'shop' => $store ? [
                    'id' => $store->id,
                    'name' => $store->name,
                    'subscription_status' => $store->subscription_status,
                    'subscription_expires_at' => optional($store->subscription_expires_at)->format('Y-m-d H:i'),
                    'is_expired' => $store->isExpired(),
                    'is_suspended' => $store->isSuspended(),
                    'active_plan_id' => $store->active_plan_id,
                ] : null,
                'invoices' => $invoices->map(fn ($inv) => [
                    'id' => $inv->id,
                    'invoice_no' => $inv->invoice_no,
                    'plan_name' => $inv->plan?->name,
                    'total_cents' => $inv->total_cents,
                    'paid_cents' => $inv->paid_cents,
                    'status' => $inv->status,
                    'due_date' => optional($inv->due_date)->format('Y-m-d'),
                    'created_at' => $inv->created_at->format('Y-m-d'),
                ]),
                'payments' => $payments->map(fn ($pmt) => [
                    'id' => $pmt->id,
                    'payment_method' => $pmt->payment_method,
                    'account_type' => $pmt->account_type,
                    'amount_cents' => $pmt->amount_cents,
                    'transaction_id' => $pmt->transaction_id,
                    'sender_phone' => $pmt->sender_phone,
                    'status' => $pmt->status,
                    'rejection_reason' => $pmt->rejection_reason,
                    'created_at' => $pmt->created_at->format('Y-m-d H:i'),
                ]),
                'current' => $payments->map(fn ($c) => [
                    'id' => $c->id,
                    'plan_name' => $c->plan?->name,
                    'status' => $c->status,
                    'payment_status' => $c->status === 'approved' ? 'paid' : 'unpaid',
                    'starts_on' => optional($c->payment_date)->format('Y-m-d'),
                    'ends_on' => null,
                    'amount_cents' => (int) $c->amount_cents,
                ]),
            ]);
        }

        return view('spa');
    }

    public function calculateSummary(Request $request)
    {
        $validated = $request->validate([
            'plan_id' => ['required', 'integer', 'exists:plans,id'],
        ]);

        $plan = Plan::where('is_active', true)->findOrFail($validated['plan_id']);

        $subtotal = (int) $plan->price_cents;
        $tax = 0; // Tax is inclusive in BDT pricing
        $total = $subtotal + $tax;

        return response()->json([
            'plan' => [
                'id' => $plan->id,
                'name' => $plan->name,
                'slug' => $plan->slug ?: Str::slug($plan->name),
                'description' => $plan->description,
                'price_cents' => $subtotal,
                'currency' => $plan->currency ?: 'BDT',
                'duration_days' => $plan->duration_days ?: 30,
                'interval' => $plan->interval,
                'max_stores' => $plan->max_stores,
                'max_users' => $plan->max_users,
                'max_products' => $plan->max_products,
            ],
            'subtotal_cents' => $subtotal,
            'tax_cents' => $tax,
            'total_cents' => $total,
            'currency' => $plan->currency ?: 'BDT',
        ]);
    }

    public function buy(Request $request)
    {
        $data = $request->validate([
            'plan_id' => ['required', 'integer', 'exists:plans,id'],
            'store_id' => ['nullable', 'integer', 'exists:stores,id'],
        ]);
        $plan = Plan::where('is_active', true)->findOrFail($data['plan_id']);
        $user = $request->user();
        $storeId = $user->store_id;

        if (! $storeId && $user->isSuperAdmin() && ! empty($data['store_id'])) {
            $storeId = (int) $data['store_id'];
        }

        if (! $storeId) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'No active shop associated with your account.'], 422);
            }

            return back()->with('error', 'No active shop associated with your account.');
        }

        $store = Store::withoutGlobalScopes()->findOrFail($storeId);

        // Immediate activation for free tiers (e.g. Starter 0 BDT)
        if ($plan->price_cents === 0) {
            $invoice = SubscriptionInvoice::create([
                'invoice_no' => SubscriptionInvoice::generateInvoiceNo(),
                'store_id' => $store->id,
                'plan_id' => $plan->id,
                'billing_period' => $plan->interval,
                'subtotal_cents' => 0,
                'total_cents' => 0,
                'due_cents' => 0,
                'paid_cents' => 0,
                'status' => 'paid',
                'due_date' => now()->toDateString(),
            ]);

            Subscription::create([
                'store_id' => $store->id,
                'plan_id' => $plan->id,
                'status' => 'active',
                'gateway' => 'free',
                'payment_status' => 'paid',
                'starts_on' => now()->toDateString(),
                'ends_on' => now()->addDays($plan->duration_days ?: 30)->toDateString(),
                'amount_cents' => 0,
            ]);

            $store->update([
                'active_plan_id' => $plan->id,
                'subscription_status' => 'active',
                'subscription_expires_at' => now()->addDays($plan->duration_days ?: 30)->endOfDay(),
                'is_active' => true,
            ]);

            if ($request->expectsJson()) {
                return response()->json([
                    'message' => 'Free plan activated successfully!',
                    'invoice' => $invoice,
                    'shop' => $store->fresh(),
                ]);
            }

            return back()->with('status', 'Free plan activated successfully!');
        }

        $invoice = SubscriptionInvoice::create([
            'invoice_no' => SubscriptionInvoice::generateInvoiceNo(),
            'store_id' => $store->id,
            'plan_id' => $plan->id,
            'billing_period' => $plan->interval,
            'subtotal_cents' => $plan->price_cents,
            'total_cents' => $plan->price_cents,
            'due_cents' => $plan->price_cents,
            'paid_cents' => 0,
            'status' => 'unpaid',
            'due_date' => now()->addDays(7)->toDateString(),
        ]);

        Subscription::create([
            'store_id' => $store->id,
            'plan_id' => $plan->id,
            'status' => 'pending',
            'gateway' => 'manual',
            'payment_status' => 'unpaid',
            'amount_cents' => $plan->price_cents,
        ]);

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'Subscription request recorded. Please submit manual payment details (bKash/Nagad) to activate.',
                'invoice' => $invoice,
            ]);
        }

        return back()->with('status', 'Subscription request recorded. Please complete payment.');
    }

    public function submitPayment(Request $request)
    {
        $user = $request->user();
        $storeId = $user->store_id;
        if (! $storeId && $user->isSuperAdmin() && $request->filled('store_id')) {
            $storeId = (int) $request->input('store_id');
        }

        if (! $storeId) {
            return response()->json(['message' => 'No active shop associated with your account.'], 422);
        }

        $validated = $request->validate([
            'plan_id' => ['required', 'integer', 'exists:plans,id'],
            'payment_method' => ['required', 'string', Rule::in(['bkash', 'nagad', 'bank', 'manual', 'free'])],
            'amount_cents' => ['required', 'integer', 'min:0'],
            'transaction_id' => ['required', 'string', 'max:100'],
            'sender_phone' => ['nullable', 'string', 'max:40'],
            'payment_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:500'],
            'screenshot' => ['nullable', 'image', 'max:5120'],
        ]);

        $trx = trim($validated['transaction_id']);

        $duplicate = SubscriptionPayment::withoutGlobalScopes()
            ->where('transaction_id', $trx)
            ->whereIn('status', ['pending', 'approved'])
            ->exists();

        if ($duplicate) {
            return response()->json([
                'message' => 'A payment request with this Transaction ID has already been submitted and is currently being processed or approved.',
                'errors' => ['transaction_id' => ['Duplicate Transaction ID detected.']],
            ], 422);
        }

        $store = Store::withoutGlobalScopes()->findOrFail($storeId);
        $plan = Plan::where('is_active', true)->findOrFail($validated['plan_id']);

        if ((int) $validated['amount_cents'] !== (int) $plan->price_cents) {
            return response()->json([
                'message' => 'The payment amount must match the published plan price exactly.',
                'errors' => ['amount_cents' => ['Amount mismatch against plan price.']],
            ], 422);
        }

        $screenshotPath = null;
        if ($request->hasFile('screenshot') && $request->file('screenshot')->isValid()) {
            $file = $request->file('screenshot');
            $uploadDir = public_path('uploads/subscription_receipts');
            if (! is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }
            $filename = 'sub_pay_'.Str::random(16).'.'.$file->getClientOriginalExtension();
            $file->move($uploadDir, $filename);
            $screenshotPath = 'uploads/subscription_receipts/'.$filename;
        }

        $payment = DB::transaction(function () use ($store, $user, $plan, $validated, $trx, $screenshotPath) {
            $invoice = SubscriptionInvoice::withoutGlobalScopes()
                ->where('store_id', $store->id)
                ->where('plan_id', $plan->id)
                ->whereIn('status', ['unpaid', 'partially_paid'])
                ->latest()
                ->first();

            if (! $invoice) {
                $invoice = SubscriptionInvoice::create([
                    'invoice_no' => SubscriptionInvoice::generateInvoiceNo(),
                    'store_id' => $store->id,
                    'plan_id' => $plan->id,
                    'billing_period' => $plan->interval,
                    'subtotal_cents' => $plan->price_cents,
                    'total_cents' => $plan->price_cents,
                    'due_cents' => $plan->price_cents,
                    'paid_cents' => 0,
                    'status' => 'unpaid',
                    'due_date' => now()->addDays(7)->toDateString(),
                ]);
            }

            $payment = SubscriptionPayment::create([
                'store_id' => $store->id,
                'user_id' => $user->id,
                'invoice_id' => $invoice->id,
                'plan_id' => $plan->id,
                'payment_method' => $validated['payment_method'],
                'amount_cents' => (int) $validated['amount_cents'],
                'transaction_id' => $trx,
                'sender_phone' => $validated['sender_phone'] ?? null,
                'payment_date' => ! empty($validated['payment_date']) ? $validated['payment_date'] : now()->toDateString(),
                'screenshot_path' => $screenshotPath,
                'notes' => $validated['notes'] ?? null,
                'status' => 'pending',
            ]);

            if ($store->subscription_status !== 'suspended') {
                $store->update(['subscription_status' => 'payment_pending']);
            }

            AuditLog::record(
                $store->id,
                $user->id,
                'payment.submitted',
                SubscriptionPayment::class,
                $payment->id,
                [
                    'transaction_id' => $trx,
                    'amount_cents' => $payment->amount_cents,
                    'payment_method' => $validated['payment_method'],
                ]
            );

            return $payment;
        });

        return response()->json([
            'message' => 'Payment request submitted successfully! Your payment is now pending verification by our team.',
            'payment' => $payment,
        ]);
    }

    public function myHistory(Request $request)
    {
        $user = $request->user();
        if (! $user->store_id) {
            return response()->json(['invoices' => [], 'payments' => []]);
        }

        $invoices = SubscriptionInvoice::withoutGlobalScopes()
            ->where('store_id', $user->store_id)
            ->with('plan')
            ->latest()
            ->get();

        $payments = SubscriptionPayment::withoutGlobalScopes()
            ->where('store_id', $user->store_id)
            ->with(['plan', 'verifier'])
            ->latest()
            ->get();

        return response()->json([
            'invoices' => $invoices,
            'payments' => $payments,
        ]);
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
