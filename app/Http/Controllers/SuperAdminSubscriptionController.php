<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Plan;
use App\Models\Setting;
use App\Models\Store;
use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use App\Models\SubscriptionPayment;
use App\Models\User;
use App\Models\UserNotice;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class SuperAdminSubscriptionController extends Controller
{
    /**
     * 1. SHOP / TENANT MANAGEMENT
     */
    public function shops(Request $request)
    {
        $query = Store::withoutGlobalScopes()
            ->with(['owner', 'plan', 'branches'])
            ->withCount(['users', 'products', 'branches']);

        if ($request->boolean('main_only', true)) {
            $query->whereNull('parent_id');
        }

        if ($search = trim((string) ($request->input('search') ?? $request->input('q')))) {
            $query->where(function ($sub) use ($search) {
                $sub->where('name', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhereHas('owner', function ($oq) use ($search) {
                        $oq->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%")
                            ->orWhere('phone', 'like', "%{$search}%");
                    });
            });
        }

        if ($status = $request->input('status')) {
            if ($status === 'active') {
                $query->where('is_active', true)->where('subscription_status', 'active');
            } elseif ($status === 'trial') {
                $query->where('subscription_status', 'trial');
            } elseif ($status === 'expired') {
                $query->where(function ($q) {
                    $q->where('subscription_status', 'expired')
                        ->orWhere(fn ($sq) => $sq->whereNotNull('subscription_expires_at')->where('subscription_expires_at', '<', now()));
                });
            } elseif ($status === 'suspended') {
                $query->where(function ($q) {
                    $q->where('subscription_status', 'suspended')
                        ->orWhereNotNull('suspended_at')
                        ->orWhere('is_active', false);
                });
            } elseif ($status === 'payment_pending') {
                $query->where('subscription_status', 'payment_pending');
            }
        }

        if ($planId = $request->integer('plan_id')) {
            $query->where('active_plan_id', $planId);
        }

        $perPage = max(1, min(100, $request->integer('per_page', 15)));
        $paginated = $query->latest()->paginate($perPage)->withQueryString();

        return response()->json([
            'shops' => $paginated->getCollection()->map(fn ($store) => [
                'id' => $store->id,
                'name' => $store->name,
                'slug' => $store->slug,
                'business_type' => $store->business_type,
                'email' => $store->email,
                'phone' => $store->phone,
                'address' => $store->address,
                'currency_code' => $store->currency_code,
                'currency_symbol' => $store->currency_symbol,
                'is_active' => (bool) $store->is_active,
                'subscription_status' => $store->isSuspended() ? 'suspended' : ($store->isExpired() ? 'expired' : $store->subscription_status),
                'subscription_expires_at' => optional($store->subscription_expires_at)->format('Y-m-d H:i'),
                'is_expired' => $store->isExpired(),
                'is_suspended' => $store->isSuspended(),
                'suspended_at' => optional($store->suspended_at)->format('Y-m-d H:i'),
                'suspension_reason' => $store->suspension_reason,
                'owner' => $store->owner ? [
                    'id' => $store->owner->id,
                    'name' => $store->owner->name,
                    'email' => $store->owner->email,
                    'phone' => $store->owner->phone,
                ] : null,
                'plan' => $store->plan ? [
                    'id' => $store->plan->id,
                    'name' => $store->plan->name,
                    'price_cents' => $store->plan->price_cents,
                ] : null,
                'branches_count' => $store->branches_count,
                'users_count' => $store->users_count,
                'products_count' => $store->products_count,
                'created_at' => $store->created_at->format('Y-m-d H:i'),
            ]),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'from' => $paginated->firstItem(),
                'to' => $paginated->lastItem(),
                'total' => $paginated->total(),
                'per_page' => $paginated->perPage(),
            ],
        ]);
    }

    public function showShop(Store $shop)
    {
        $shop->load(['owner', 'plan', 'branches', 'invoices' => fn ($q) => $q->latest()->limit(10), 'payments' => fn ($q) => $q->latest()->limit(10)]);
        $shop->loadCount(['users', 'products', 'branches']);

        return response()->json([
            'shop' => [
                'id' => $shop->id,
                'name' => $shop->name,
                'slug' => $shop->slug,
                'business_type' => $shop->business_type,
                'email' => $shop->email,
                'phone' => $shop->phone,
                'address' => $shop->address,
                'currency_code' => $shop->currency_code,
                'currency_symbol' => $shop->currency_symbol,
                'is_active' => (bool) $shop->is_active,
                'subscription_status' => $shop->isSuspended() ? 'suspended' : ($shop->isExpired() ? 'expired' : $shop->subscription_status),
                'subscription_expires_at' => optional($shop->subscription_expires_at)->format('Y-m-d H:i:s'),
                'is_expired' => $shop->isExpired(),
                'is_suspended' => $shop->isSuspended(),
                'suspended_at' => optional($shop->suspended_at)->format('Y-m-d H:i:s'),
                'suspension_reason' => $shop->suspension_reason,
                'module_overrides' => $shop->module_overrides ?? [],
                'owner' => $shop->owner ? [
                    'id' => $shop->owner->id,
                    'name' => $shop->owner->name,
                    'email' => $shop->owner->email,
                    'phone' => $shop->owner->phone,
                    'last_login_at' => optional($shop->owner->last_login_at)->format('Y-m-d H:i'),
                ] : null,
                'plan' => $shop->plan ? [
                    'id' => $shop->plan->id,
                    'name' => $shop->plan->name,
                    'price_cents' => $shop->plan->price_cents,
                    'interval' => $shop->plan->interval,
                    'max_users' => $shop->plan->max_users,
                    'max_stores' => $shop->plan->max_stores,
                    'max_products' => $shop->plan->max_products,
                ] : null,
                'usage' => [
                    'users_count' => $shop->users_count,
                    'products_count' => $shop->products_count,
                    'branches_count' => $shop->branches_count,
                ],
                'invoices' => $shop->invoices->map(fn ($inv) => [
                    'id' => $inv->id,
                    'invoice_no' => $inv->invoice_no,
                    'total_cents' => $inv->total_cents,
                    'paid_cents' => $inv->paid_cents,
                    'status' => $inv->status,
                    'created_at' => $inv->created_at->format('Y-m-d'),
                ]),
                'payments' => $shop->payments->map(fn ($pmt) => [
                    'id' => $pmt->id,
                    'payment_method' => $pmt->payment_method,
                    'amount_cents' => $pmt->amount_cents,
                    'transaction_id' => $pmt->transaction_id,
                    'status' => $pmt->status,
                    'created_at' => $pmt->created_at->format('Y-m-d H:i'),
                ]),
                'created_at' => $shop->created_at->format('Y-m-d H:i'),
            ],
        ]);
    }

    public function toggleShopStatus(Request $request, Store $shop)
    {
        $validated = $request->validate([
            'action' => ['required', Rule::in(['activate', 'suspend'])],
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $actor = $request->user();
        $isSuspending = $validated['action'] === 'suspend';

        DB::transaction(function () use ($shop, $isSuspending, $validated, $actor) {
            $oldStatus = $shop->subscription_status;
            if ($isSuspending) {
                $shop->update([
                    'is_active' => false,
                    'subscription_status' => 'suspended',
                    'suspended_at' => now(),
                    'suspension_reason' => $validated['reason'] ?? 'Suspended by platform administrator.',
                ]);

                if ($shop->owner_id) {
                    UserNotice::create([
                        'user_id' => $shop->owner_id,
                        'title' => 'Shop Access Suspended',
                        'body' => 'Your shop has been suspended by the platform administrator. Reason: '.($validated['reason'] ?? 'Administrative policy violation.'),
                    ]);
                }
            } else {
                $shop->update([
                    'is_active' => true,
                    'subscription_status' => ($shop->subscription_expires_at && $shop->subscription_expires_at->isPast()) ? 'expired' : 'active',
                    'suspended_at' => null,
                    'suspension_reason' => null,
                ]);

                if ($shop->owner_id) {
                    UserNotice::create([
                        'user_id' => $shop->owner_id,
                        'title' => 'Shop Access Restored',
                        'body' => 'Your shop access has been restored. You may now continue using your BornoPos account.',
                    ]);
                }
            }

            AuditLog::record(
                $shop->id,
                $actor->id,
                $isSuspending ? 'shop.suspended' : 'shop.activated',
                Store::class,
                $shop->id,
                [
                    'previous_status' => $oldStatus,
                    'reason' => $validated['reason'] ?? null,
                ]
            );
        });

        return response()->json([
            'message' => $isSuspending ? 'Shop has been suspended.' : 'Shop has been activated.',
            'shop' => $shop->fresh(),
        ]);
    }

    public function extendSubscription(Request $request, Store $shop)
    {
        $validated = $request->validate([
            'days' => ['nullable', 'integer', 'min:1', 'max:3650'],
            'expires_at' => ['nullable', 'date'],
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        if (empty($validated['days']) && empty($validated['expires_at'])) {
            return response()->json(['message' => 'Please provide either days to extend or a target expiration date.'], 422);
        }

        $actor = $request->user();

        DB::transaction(function () use ($shop, $validated, $actor) {
            $previousExpiry = $shop->subscription_expires_at ? Carbon::parse($shop->subscription_expires_at) : now();

            if (! empty($validated['expires_at'])) {
                $newExpiry = Carbon::parse($validated['expires_at'])->endOfDay();
            } else {
                $base = ($previousExpiry->isPast()) ? now() : $previousExpiry;
                $newExpiry = $base->copy()->addDays((int) $validated['days'])->endOfDay();
            }

            // Do not unintentionally shorten an active subscription unless explicitly chosen
            if ($previousExpiry->isFuture() && $newExpiry->lt($previousExpiry) && empty($validated['expires_at'])) {
                $newExpiry = $previousExpiry->copy()->addDays((int) $validated['days'])->endOfDay();
            }

            $shop->update([
                'subscription_status' => 'active',
                'subscription_expires_at' => $newExpiry,
                'suspended_at' => null,
                'suspension_reason' => null,
                'is_active' => true,
            ]);

            // Sync with Subscription model
            Subscription::updateOrCreate(
                ['store_id' => $shop->id, 'status' => 'active'],
                [
                    'plan_id' => $shop->active_plan_id ?: 1,
                    'payment_status' => 'paid',
                    'starts_on' => now()->toDateString(),
                    'ends_on' => $newExpiry->toDateString(),
                    'amount_cents' => 0,
                    'gateway' => 'admin_extension',
                ]
            );

            AuditLog::record(
                $shop->id,
                $actor->id,
                'subscription.extended',
                Store::class,
                $shop->id,
                [
                    'previous_expiry' => $previousExpiry->toIso8601String(),
                    'new_expiry' => $newExpiry->toIso8601String(),
                    'days_added' => $validated['days'] ?? null,
                    'reason' => $validated['reason'] ?? 'Admin manual extension',
                ]
            );

            if ($shop->owner_id) {
                UserNotice::create([
                    'user_id' => $shop->owner_id,
                    'title' => 'Subscription Validity Extended',
                    'body' => 'Your BornoPos subscription validity has been extended until '.$newExpiry->format('d M Y').'. Reason: '.($validated['reason'] ?? 'Administrative grant.'),
                ]);
            }
        });

        return response()->json([
            'message' => 'Subscription extended successfully.',
            'shop' => $shop->fresh(),
        ]);
    }

    public function changePlan(Request $request, Store $shop)
    {
        $validated = $request->validate([
            'plan_id' => ['required', 'integer', 'exists:plans,id'],
            'extend_days' => ['nullable', 'integer', 'min:0', 'max:3650'],
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $plan = Plan::findOrFail($validated['plan_id']);
        $actor = $request->user();

        DB::transaction(function () use ($shop, $plan, $validated, $actor) {
            $previousPlanId = $shop->active_plan_id;
            $newExpiry = $shop->subscription_expires_at;

            if (! empty($validated['extend_days'])) {
                $base = ($shop->subscription_expires_at && Carbon::parse($shop->subscription_expires_at)->isFuture())
                    ? Carbon::parse($shop->subscription_expires_at)
                    : now();
                $newExpiry = $base->copy()->addDays((int) $validated['extend_days'])->endOfDay();
            }

            $shop->update([
                'active_plan_id' => $plan->id,
                'subscription_status' => 'active',
                'subscription_expires_at' => $newExpiry ?: now()->addDays($plan->duration_days ?: 30)->endOfDay(),
                'is_active' => true,
            ]);

            Subscription::create([
                'store_id' => $shop->id,
                'plan_id' => $plan->id,
                'status' => 'active',
                'gateway' => 'admin_assigned',
                'payment_status' => 'paid',
                'starts_on' => now()->toDateString(),
                'ends_on' => optional($shop->fresh()->subscription_expires_at)->toDateString(),
                'amount_cents' => $plan->price_cents,
            ]);

            AuditLog::record(
                $shop->id,
                $actor->id,
                'subscription.plan_changed',
                Store::class,
                $shop->id,
                [
                    'previous_plan_id' => $previousPlanId,
                    'new_plan_id' => $plan->id,
                    'plan_name' => $plan->name,
                    'reason' => $validated['reason'] ?? 'Admin plan reassignment',
                ]
            );

            if ($shop->owner_id) {
                UserNotice::create([
                    'user_id' => $shop->owner_id,
                    'title' => 'Subscription Plan Updated',
                    'body' => 'Your subscription has been updated to the '.$plan->name.' plan. Enjoy enhanced features and limits!',
                ]);
            }
        });

        return response()->json([
            'message' => 'Subscription plan changed to '.$plan->name.'.',
            'shop' => $shop->fresh()->load('plan'),
        ]);
    }

    public function updateModules(Request $request, Store $shop)
    {
        $validated = $request->validate([
            'modules' => ['required', 'array'],
        ]);

        $shop->update([
            'module_overrides' => $validated['modules'],
        ]);

        AuditLog::record(
            $shop->id,
            $request->user()->id,
            'shop.modules_updated',
            Store::class,
            $shop->id,
            ['modules' => $validated['modules']]
        );

        return response()->json([
            'message' => 'Shop module permissions updated.',
            'modules' => $shop->module_overrides,
        ]);
    }

    public function notifyOwner(Request $request, Store $shop)
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'message' => ['required', 'string', 'max:2000'],
        ]);

        if (! $shop->owner_id) {
            return response()->json(['message' => 'This shop does not have an associated owner account.'], 422);
        }

        UserNotice::create([
            'user_id' => $shop->owner_id,
            'title' => $validated['title'],
            'body' => $validated['message'],
        ]);

        return response()->json(['message' => 'Notification dispatched to the shop owner.']);
    }

    public function storeShop(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'business_type' => ['required', Rule::in(['all_in_one', 'grocery', 'pharmacy', 'electronics', 'restaurant'])],
            'owner_name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6'],
            'phone' => ['nullable', 'string', 'max:40'],
            'address' => ['nullable', 'string', 'max:255'],
            'plan_id' => ['required', 'integer', 'exists:plans,id'],
            'trial_days' => ['nullable', 'integer', 'min:0', 'max:365'],
        ]);

        $plan = Plan::findOrFail($validated['plan_id']);

        $store = DB::transaction(function () use ($validated, $plan, $request) {
            $trialDays = $validated['trial_days'] ?? $plan->trial_days ?: 14;
            $expiresAt = now()->addDays($trialDays)->endOfDay();

            $store = Store::create([
                'name' => $validated['name'],
                'slug' => Str::slug($validated['name']).'-'.Str::lower(Str::random(4)),
                'business_type' => $validated['business_type'],
                'email' => $validated['email'],
                'phone' => $validated['phone'] ?? null,
                'address' => $validated['address'] ?? null,
                'is_active' => true,
                'subscription_status' => $trialDays > 0 ? 'trial' : 'active',
                'subscription_expires_at' => $expiresAt,
                'active_plan_id' => $plan->id,
            ]);

            $owner = User::create([
                'name' => $validated['owner_name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'phone' => $validated['phone'] ?? null,
                'role' => 'owner',
                'store_id' => $store->id,
                'is_active' => true,
            ]);

            $store->update(['owner_id' => $owner->id]);

            Subscription::create([
                'store_id' => $store->id,
                'plan_id' => $plan->id,
                'status' => $trialDays > 0 ? 'trial' : 'active',
                'gateway' => 'manual',
                'payment_status' => 'paid',
                'starts_on' => now()->toDateString(),
                'ends_on' => $expiresAt->toDateString(),
                'amount_cents' => $plan->price_cents,
            ]);

            AuditLog::record(
                $store->id,
                $request->user()->id,
                'shop.created',
                Store::class,
                $store->id,
                ['owner_id' => $owner->id, 'plan_id' => $plan->id]
            );

            return $store;
        });

        return response()->json([
            'message' => 'Shop and owner account created successfully.',
            'shop' => $store->load(['owner', 'plan']),
        ]);
    }

    /**
     * 2. SUBSCRIPTION PLAN MANAGEMENT
     */
    public function plans(Request $request)
    {
        $plans = Plan::withCount(['stores as subscribers_count'])
            ->orderBy('price_cents')
            ->get();

        return response()->json([
            'plans' => $plans->map(fn ($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'price_cents' => $p->price_cents,
                'interval' => $p->interval,
                'duration_days' => $p->duration_days ?: 30,
                'trial_days' => $p->trial_days ?: 0,
                'max_users' => $p->max_users ?: 5,
                'max_stores' => $p->max_stores ?: 1,
                'max_products' => $p->max_products ?: 500,
                'allowed_modules' => $p->allowed_modules ?? [],
                'features' => $p->features,
                'is_active' => (bool) $p->is_active,
                'subscribers_count' => $p->subscribers_count,
            ]),
        ]);
    }

    public function storePlan(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'price_cents' => ['required', 'integer', 'min:0'],
            'interval' => ['required', 'string', Rule::in(['month', 'quarter', 'year', 'custom'])],
            'duration_days' => ['required', 'integer', 'min:1', 'max:3650'],
            'trial_days' => ['nullable', 'integer', 'min:0', 'max:365'],
            'max_users' => ['required', 'integer', 'min:1'],
            'max_stores' => ['required', 'integer', 'min:1'],
            'max_products' => ['required', 'integer', 'min:1'],
            'allowed_modules' => ['nullable', 'array'],
            'features' => ['nullable', 'string', 'max:2000'],
            'is_active' => ['boolean'],
        ]);

        $plan = Plan::create($validated);

        return response()->json([
            'message' => 'Subscription plan created successfully.',
            'plan' => $plan,
        ]);
    }

    public function updatePlan(Request $request, Plan $plan)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'price_cents' => ['required', 'integer', 'min:0'],
            'interval' => ['required', 'string', Rule::in(['month', 'quarter', 'year', 'custom'])],
            'duration_days' => ['required', 'integer', 'min:1', 'max:3650'],
            'trial_days' => ['nullable', 'integer', 'min:0', 'max:365'],
            'max_users' => ['required', 'integer', 'min:1'],
            'max_stores' => ['required', 'integer', 'min:1'],
            'max_products' => ['required', 'integer', 'min:1'],
            'allowed_modules' => ['nullable', 'array'],
            'features' => ['nullable', 'string', 'max:2000'],
            'is_active' => ['boolean'],
        ]);

        $plan->update($validated);

        return response()->json([
            'message' => 'Subscription plan updated successfully.',
            'plan' => $plan,
        ]);
    }

    public function togglePlan(Plan $plan)
    {
        $plan->update(['is_active' => ! $plan->is_active]);

        return response()->json([
            'message' => $plan->is_active ? 'Plan activated.' : 'Plan deactivated.',
            'plan' => $plan,
        ]);
    }

    /**
     * 3. MANUAL bKASH & NAGAD PAYMENT GATEWAY SETTINGS
     */
    public function getPaymentSettings()
    {
        $gateways = Setting::getPlatform('manual_payment_gateways', [
            'bkash' => [
                'enabled' => true,
                'account_number' => '01712345678',
                'account_type' => 'Merchant',
                'instructions' => "1. Go to your bKash app or dial *247#.\n2. Choose 'Make Payment'.\n3. Enter our bKash Number: 01712345678.\n4. Enter the bill amount.\n5. Use your Shop Name as Reference.\n6. Confirm with PIN.\n7. Copy the TrxID and submit it below.",
            ],
            'nagad' => [
                'enabled' => true,
                'account_number' => '01812345678',
                'account_type' => 'Merchant',
                'instructions' => "1. Open Nagad app or dial *167#.\n2. Select 'Payment'.\n3. Enter Nagad Number: 01812345678.\n4. Enter bill amount and reference.\n5. Complete payment and copy TrxID to submit below.",
            ],
        ]);

        return response()->json(['gateways' => $gateways]);
    }

    public function updatePaymentSettings(Request $request)
    {
        $validated = $request->validate([
            'bkash' => ['required', 'array'],
            'bkash.enabled' => ['required', 'boolean'],
            'bkash.account_number' => ['required', 'string', 'regex:/^(\+8801|01)[3-9]\d{8}$/'],
            'bkash.account_type' => ['required', 'string', Rule::in(['Personal', 'Merchant', 'Agent'])],
            'bkash.instructions' => ['nullable', 'string', 'max:2000'],

            'nagad' => ['required', 'array'],
            'nagad.enabled' => ['required', 'boolean'],
            'nagad.account_number' => ['required', 'string', 'regex:/^(\+8801|01)[3-9]\d{8}$/'],
            'nagad.account_type' => ['required', 'string', Rule::in(['Personal', 'Merchant', 'Agent'])],
            'nagad.instructions' => ['nullable', 'string', 'max:2000'],
        ]);

        Setting::setPlatform('manual_payment_gateways', $validated);

        AuditLog::record(
            1,
            $request->user()->id,
            'payment_settings.updated',
            Setting::class,
            null,
            ['gateways' => array_keys($validated)]
        );

        return response()->json([
            'message' => 'Manual payment gateway configurations updated successfully.',
            'gateways' => $validated,
        ]);
    }

    /**
     * 4. SAAS OWNER PAYMENT VERIFICATION QUEUE
     */
    public function payments(Request $request)
    {
        $query = SubscriptionPayment::withoutGlobalScopes()
            ->with(['store', 'user', 'plan', 'invoice', 'verifier']);

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($method = $request->input('payment_method')) {
            $query->where('payment_method', $method);
        }

        if ($search = trim((string) ($request->input('search') ?? $request->input('q')))) {
            $query->where(function ($sub) use ($search) {
                $sub->where('transaction_id', 'like', "%{$search}%")
                    ->orWhere('sender_phone', 'like', "%{$search}%")
                    ->orWhereHas('store', fn ($sq) => $sq->where('name', 'like', "%{$search}%"))
                    ->orWhereHas('user', fn ($uq) => $uq->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%"));
            });
        }

        $perPage = max(1, min(100, $request->integer('per_page', 15)));
        $paginated = $query->latest()->paginate($perPage)->withQueryString();

        return response()->json([
            'payments' => $paginated->getCollection()->map(fn ($p) => [
                'id' => $p->id,
                'store_id' => $p->store_id,
                'store_name' => $p->store?->name,
                'user_name' => $p->user?->name,
                'user_email' => $p->user?->email,
                'plan_name' => $p->plan?->name,
                'payment_method' => $p->payment_method,
                'account_type' => $p->account_type,
                'amount_cents' => $p->amount_cents,
                'transaction_id' => $p->transaction_id,
                'sender_phone' => $p->sender_phone,
                'payment_date' => optional($p->payment_date)->format('Y-m-d'),
                'screenshot_url' => $p->screenshot_path ? asset($p->screenshot_path) : null,
                'notes' => $p->notes,
                'status' => $p->status,
                'rejection_reason' => $p->rejection_reason,
                'verifier_name' => $p->verifier?->name,
                'verified_at' => optional($p->verified_at)->format('Y-m-d H:i'),
                'created_at' => $p->created_at->format('Y-m-d H:i'),
                'invoice_no' => $p->invoice?->invoice_no,
            ]),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'from' => $paginated->firstItem(),
                'to' => $paginated->lastItem(),
                'total' => $paginated->total(),
                'per_page' => $paginated->perPage(),
            ],
        ]);
    }

    public function showPayment(SubscriptionPayment $payment)
    {
        $payment->load(['store', 'user', 'plan', 'invoice', 'verifier']);

        return response()->json([
            'payment' => [
                'id' => $payment->id,
                'store' => $payment->store ? [
                    'id' => $payment->store->id,
                    'name' => $payment->store->name,
                    'phone' => $payment->store->phone,
                    'email' => $payment->store->email,
                    'subscription_status' => $payment->store->subscription_status,
                    'subscription_expires_at' => optional($payment->store->subscription_expires_at)->format('Y-m-d'),
                ] : null,
                'user' => $payment->user ? [
                    'id' => $payment->user->id,
                    'name' => $payment->user->name,
                    'email' => $payment->user->email,
                    'phone' => $payment->user->phone,
                ] : null,
                'plan' => $payment->plan ? [
                    'id' => $payment->plan->id,
                    'name' => $payment->plan->name,
                    'price_cents' => $payment->plan->price_cents,
                    'duration_days' => $payment->plan->duration_days,
                ] : null,
                'invoice' => $payment->invoice ? [
                    'id' => $payment->invoice->id,
                    'invoice_no' => $payment->invoice->invoice_no,
                    'total_cents' => $payment->invoice->total_cents,
                    'status' => $payment->invoice->status,
                ] : null,
                'payment_method' => $payment->payment_method,
                'account_type' => $payment->account_type,
                'amount_cents' => $payment->amount_cents,
                'transaction_id' => $payment->transaction_id,
                'sender_phone' => $payment->sender_phone,
                'payment_date' => optional($payment->payment_date)->format('Y-m-d'),
                'screenshot_url' => $payment->screenshot_path ? asset($payment->screenshot_path) : null,
                'notes' => $payment->notes,
                'status' => $payment->status,
                'rejection_reason' => $payment->rejection_reason,
                'verifier_name' => $payment->verifier?->name,
                'verified_at' => optional($payment->verified_at)->format('Y-m-d H:i'),
                'created_at' => $payment->created_at->format('Y-m-d H:i'),
            ],
        ]);
    }

    public function approvePayment(Request $request, SubscriptionPayment $payment)
    {
        if ($payment->status !== 'pending') {
            return response()->json([
                'message' => 'This payment request is not pending (currently '.$payment->status.').',
            ], 422);
        }

        $actor = $request->user();

        DB::transaction(function () use ($payment, $actor) {
            // Lock payment record to avoid race conditions
            $payment->refresh();
            if ($payment->status !== 'pending') {
                throw new \Exception('Payment is already processed.');
            }

            $store = Store::withoutGlobalScopes()->findOrFail($payment->store_id);
            $plan = $payment->plan ?: Plan::findOrFail($store->active_plan_id ?: 1);

            // 1. Mark payment as approved
            $payment->update([
                'status' => 'approved',
                'verified_by' => $actor->id,
                'verified_at' => now(),
            ]);

            // 2. Mark invoice as paid if linked
            if ($payment->invoice_id) {
                $invoice = SubscriptionInvoice::withoutGlobalScopes()->find($payment->invoice_id);
                if ($invoice) {
                    $invoice->update([
                        'status' => 'paid',
                        'paid_cents' => $payment->amount_cents,
                        'due_cents' => max(0, $invoice->total_cents - $payment->amount_cents),
                    ]);
                }
            }

            // 3. Extend/Activate Store Subscription
            $durationDays = $plan->duration_days ?: 30;
            $currentExpiry = $store->subscription_expires_at ? Carbon::parse($store->subscription_expires_at) : null;

            if ($currentExpiry && $currentExpiry->isFuture()) {
                $newExpiry = $currentExpiry->copy()->addDays($durationDays)->endOfDay();
            } else {
                $newExpiry = now()->addDays($durationDays)->endOfDay();
            }

            $store->update([
                'subscription_status' => 'active',
                'subscription_expires_at' => $newExpiry,
                'active_plan_id' => $plan->id,
                'suspended_at' => null,
                'suspension_reason' => null,
                'is_active' => true,
            ]);

            // 4. Update or create subscription record
            Subscription::create([
                'store_id' => $store->id,
                'plan_id' => $plan->id,
                'status' => 'active',
                'gateway' => $payment->payment_method,
                'payment_status' => 'paid',
                'starts_on' => now()->toDateString(),
                'ends_on' => $newExpiry->toDateString(),
                'amount_cents' => $payment->amount_cents,
            ]);

            // 5. Record Audit Log
            AuditLog::record(
                $store->id,
                $actor->id,
                'payment.approved',
                SubscriptionPayment::class,
                $payment->id,
                [
                    'amount_cents' => $payment->amount_cents,
                    'transaction_id' => $payment->transaction_id,
                    'plan_id' => $plan->id,
                    'new_expires_at' => $newExpiry->toIso8601String(),
                ]
            );

            // 6. Notify shop owner
            if ($store->owner_id) {
                UserNotice::create([
                    'user_id' => $store->owner_id,
                    'title' => 'Payment Approved — Subscription Active',
                    'body' => sprintf(
                        'Your payment of ৳%.2f (TrxID: %s) for the %s plan has been approved. Your subscription is now active until %s.',
                        $payment->amount_cents / 100,
                        $payment->transaction_id,
                        $plan->name,
                        $newExpiry->format('d M Y')
                    ),
                ]);
            }
        });

        return response()->json([
            'message' => 'Payment approved successfully. Subscription has been activated/extended.',
            'payment' => $payment->fresh(),
        ]);
    }

    public function rejectPayment(Request $request, SubscriptionPayment $payment)
    {
        if ($payment->status !== 'pending') {
            return response()->json([
                'message' => 'This payment request is not pending (currently '.$payment->status.').',
            ], 422);
        }

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        $actor = $request->user();

        DB::transaction(function () use ($payment, $validated, $actor) {
            $payment->update([
                'status' => 'rejected',
                'rejection_reason' => $validated['reason'],
                'verified_by' => $actor->id,
                'verified_at' => now(),
            ]);

            $store = Store::withoutGlobalScopes()->find($payment->store_id);
            if ($store && $store->subscription_status === 'payment_pending') {
                $store->update([
                    'subscription_status' => ($store->subscription_expires_at && Carbon::parse($store->subscription_expires_at)->isPast())
                        ? 'expired'
                        : 'trial',
                ]);
            }

            AuditLog::record(
                $payment->store_id,
                $actor->id,
                'payment.rejected',
                SubscriptionPayment::class,
                $payment->id,
                [
                    'amount_cents' => $payment->amount_cents,
                    'transaction_id' => $payment->transaction_id,
                    'reason' => $validated['reason'],
                ]
            );

            if ($store && $store->owner_id) {
                UserNotice::create([
                    'user_id' => $store->owner_id,
                    'title' => 'Payment Request Rejected',
                    'body' => sprintf(
                        'Your submitted payment of ৳%.2f (TrxID: %s) could not be verified. Reason: %s. Please review and submit a new request if needed.',
                        $payment->amount_cents / 100,
                        $payment->transaction_id,
                        $validated['reason']
                    ),
                ]);
            }
        });

        return response()->json([
            'message' => 'Payment request has been rejected.',
            'payment' => $payment->fresh(),
        ]);
    }

    /**
     * 5. SUBSCRIPTION INVOICES
     */
    public function invoices(Request $request)
    {
        $query = SubscriptionInvoice::withoutGlobalScopes()
            ->with(['store', 'plan']);

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($search = trim((string) ($request->input('search') ?? $request->input('q')))) {
            $query->where(function ($sub) use ($search) {
                $sub->where('invoice_no', 'like', "%{$search}%")
                    ->orWhereHas('store', fn ($sq) => $sq->where('name', 'like', "%{$search}%"));
            });
        }

        $perPage = max(1, min(100, $request->integer('per_page', 15)));
        $paginated = $query->latest()->paginate($perPage)->withQueryString();

        return response()->json([
            'invoices' => $paginated->getCollection()->map(fn ($inv) => [
                'id' => $inv->id,
                'invoice_no' => $inv->invoice_no,
                'store_id' => $inv->store_id,
                'store_name' => $inv->store?->name,
                'plan_name' => $inv->plan?->name,
                'billing_period' => $inv->billing_period,
                'starts_on' => optional($inv->starts_on)->format('Y-m-d'),
                'ends_on' => optional($inv->ends_on)->format('Y-m-d'),
                'subtotal_cents' => $inv->subtotal_cents,
                'discount_cents' => $inv->discount_cents,
                'tax_cents' => $inv->tax_cents,
                'total_cents' => $inv->total_cents,
                'paid_cents' => $inv->paid_cents,
                'due_cents' => $inv->due_cents,
                'status' => $inv->status,
                'due_date' => optional($inv->due_date)->format('Y-m-d'),
                'created_at' => $inv->created_at->format('Y-m-d H:i'),
            ]),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'from' => $paginated->firstItem(),
                'to' => $paginated->lastItem(),
                'total' => $paginated->total(),
                'per_page' => $paginated->perPage(),
            ],
        ]);
    }

    public function showInvoice(SubscriptionInvoice $invoice)
    {
        $invoice->load(['store.owner', 'plan', 'payments']);

        return response()->json([
            'invoice' => [
                'id' => $invoice->id,
                'invoice_no' => $invoice->invoice_no,
                'created_at' => $invoice->created_at->format('d M Y'),
                'due_date' => optional($invoice->due_date)->format('d M Y'),
                'billing_period' => $invoice->billing_period,
                'starts_on' => optional($invoice->starts_on)->format('d M Y'),
                'ends_on' => optional($invoice->ends_on)->format('d M Y'),
                'subtotal_cents' => $invoice->subtotal_cents,
                'discount_cents' => $invoice->discount_cents,
                'tax_cents' => $invoice->tax_cents,
                'total_cents' => $invoice->total_cents,
                'paid_cents' => $invoice->paid_cents,
                'due_cents' => $invoice->due_cents,
                'status' => $invoice->status,
                'notes' => $invoice->notes,
                'store' => [
                    'id' => $invoice->store?->id,
                    'name' => $invoice->store?->name,
                    'phone' => $invoice->store?->phone,
                    'email' => $invoice->store?->email,
                    'address' => $invoice->store?->address,
                    'owner_name' => $invoice->store?->owner?->name,
                ],
                'plan' => [
                    'id' => $invoice->plan?->id,
                    'name' => $invoice->plan?->name,
                    'price_cents' => $invoice->plan?->price_cents,
                ],
                'payments' => $invoice->payments->map(fn ($pmt) => [
                    'id' => $pmt->id,
                    'payment_method' => $pmt->payment_method,
                    'amount_cents' => $pmt->amount_cents,
                    'transaction_id' => $pmt->transaction_id,
                    'status' => $pmt->status,
                    'created_at' => $pmt->created_at->format('d M Y, H:i'),
                ]),
            ],
        ]);
    }
}
