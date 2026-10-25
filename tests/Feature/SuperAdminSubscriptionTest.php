<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\Store;
use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use App\Models\SubscriptionPayment;
use App\Models\User;
use App\Models\UserNotice;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SuperAdminSubscriptionTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;

    private User $shopOwner1;

    private Store $shop1;

    private User $shopOwner2;

    private Store $shop2;

    private Plan $starterPlan;

    private Plan $proPlan;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Plans
        $this->starterPlan = Plan::create([
            'name' => 'Starter Trial',
            'price_cents' => 0,
            'interval' => 'month',
            'duration_days' => 14,
            'trial_days' => 14,
            'max_users' => 2,
            'max_stores' => 1,
            'max_products' => 100,
            'is_active' => true,
        ]);

        $this->proPlan = Plan::create([
            'name' => 'Pro Business',
            'price_cents' => 450000, // 4,500.00 BDT
            'interval' => 'month',
            'duration_days' => 30,
            'trial_days' => 0,
            'max_users' => 10,
            'max_stores' => 3,
            'max_products' => 5000,
            'is_active' => true,
        ]);

        // 2. Super Admin
        $this->superAdmin = User::create([
            'name' => 'SaaS Super Admin',
            'email' => 'admin@borno.test',
            'password' => bcrypt('password'),
            'role' => 'super_admin',
            'is_active' => true,
        ]);

        // 3. Shop 1 & Owner
        $this->shop1 = Store::create([
            'name' => 'Central Pharmacy',
            'slug' => 'central-pharmacy',
            'business_type' => 'pharmacy',
            'phone' => '01711111111',
            'email' => 'owner1@pharmacy.test',
            'currency_code' => 'BDT',
            'currency_symbol' => '৳',
            'is_active' => true,
            'subscription_status' => 'active',
            'subscription_expires_at' => now()->addDays(20),
            'active_plan_id' => $this->proPlan->id,
        ]);

        $this->shopOwner1 = User::create([
            'name' => 'Dr. Rahman',
            'email' => 'rahman@pharmacy.test',
            'password' => bcrypt('password'),
            'phone' => '01711111111',
            'role' => 'owner',
            'store_id' => $this->shop1->id,
            'is_active' => true,
        ]);
        $this->shop1->update(['owner_id' => $this->shopOwner1->id]);

        // 4. Shop 2 & Owner
        $this->shop2 = Store::create([
            'name' => 'Metro Grocery',
            'slug' => 'metro-grocery',
            'business_type' => 'grocery',
            'phone' => '01822222222',
            'email' => 'owner2@grocery.test',
            'currency_code' => 'BDT',
            'currency_symbol' => '৳',
            'is_active' => true,
            'subscription_status' => 'trial',
            'subscription_expires_at' => now()->addDays(5),
            'active_plan_id' => $this->starterPlan->id,
        ]);

        $this->shopOwner2 = User::create([
            'name' => 'Mr. Karim',
            'email' => 'karim@grocery.test',
            'password' => bcrypt('password'),
            'phone' => '01822222222',
            'role' => 'owner',
            'store_id' => $this->shop2->id,
            'is_active' => true,
        ]);
        $this->shop2->update(['owner_id' => $this->shopOwner2->id]);
    }

    public function test_super_admin_dashboard_metrics_and_revenue_reconciliation()
    {
        // Approved payment: 4500 BDT
        SubscriptionPayment::create([
            'store_id' => $this->shop1->id,
            'user_id' => $this->shopOwner1->id,
            'plan_id' => $this->proPlan->id,
            'payment_method' => 'bkash',
            'amount_cents' => 450000,
            'transaction_id' => 'TRX_APPROVED_1',
            'status' => 'approved',
            'verified_by' => $this->superAdmin->id,
            'verified_at' => now(),
        ]);

        // Pending payment: 4500 BDT (Must NOT be counted in collected revenue)
        SubscriptionPayment::create([
            'store_id' => $this->shop2->id,
            'user_id' => $this->shopOwner2->id,
            'plan_id' => $this->proPlan->id,
            'payment_method' => 'nagad',
            'amount_cents' => 450000,
            'transaction_id' => 'TRX_PENDING_1',
            'status' => 'pending',
        ]);

        // Rejected payment: 4500 BDT (Must NOT be counted in collected revenue)
        SubscriptionPayment::create([
            'store_id' => $this->shop2->id,
            'user_id' => $this->shopOwner2->id,
            'plan_id' => $this->proPlan->id,
            'payment_method' => 'bkash',
            'amount_cents' => 450000,
            'transaction_id' => 'TRX_REJECTED_1',
            'status' => 'rejected',
            'rejection_reason' => 'Invalid transaction reference.',
        ]);

        $response = $this->actingAs($this->superAdmin)->getJson('/api/dashboard');
        $response->assertOk();
        $response->assertJsonStructure([
            'kpis' => [
                'total_shops',
                'active_shops',
                'trial_shops',
                'expired_subscriptions',
                'suspended_shops',
                'total_subscribers',
                'active_subscriptions',
                'expiring_soon',
                'total_revenue',
                'payments_pending',
                'payments_approved',
                'payments_rejected',
            ],
            'chart' => ['labels', 'revenue', 'registrations'],
            'plan_distribution',
            'payment_method_distribution',
            'status_distribution',
            'pending_queue',
        ]);

        $kpis = $response->json('kpis');
        // Collected revenue must be EXACTLY 450,000 cents (4500 BDT), strictly excluding pending and rejected payments
        $this->assertEquals(450000, $kpis['total_revenue']);
        $this->assertEquals(1, $kpis['payments_pending']);
        $this->assertEquals(1, $kpis['payments_approved']);
        $this->assertEquals(1, $kpis['payments_rejected']);
        $this->assertEquals(2, $kpis['total_shops']);
    }

    public function test_super_admin_can_manage_shops_and_view_details()
    {
        $response = $this->actingAs($this->superAdmin)->getJson('/api/admin/shops?search=Central');
        $response->assertOk();
        $response->assertJsonCount(1, 'shops');
        $this->assertEquals('Central Pharmacy', $response->json('shops.0.name'));

        // View single shop
        $detailRes = $this->actingAs($this->superAdmin)->getJson("/api/admin/shops/{$this->shop1->id}");
        $detailRes->assertOk();
        $this->assertEquals('Central Pharmacy', $detailRes->json('shop.name'));
        $this->assertEquals('Dr. Rahman', $detailRes->json('shop.owner.name'));
        $this->assertArrayHasKey('usage', $detailRes->json('shop'));
    }

    public function test_super_admin_can_suspend_and_restore_shop()
    {
        // Suspend
        $suspendRes = $this->actingAs($this->superAdmin)->postJson("/api/admin/shops/{$this->shop1->id}/toggle-status", [
            'action' => 'suspend',
            'reason' => 'Overdue subscription and terms violation.',
        ]);
        $suspendRes->assertOk();
        $this->shop1->refresh();
        $this->assertTrue($this->shop1->isSuspended());
        $this->assertFalse((bool) $this->shop1->is_active);

        // Check owner notification was dispatched
        $notice = UserNotice::where('user_id', $this->shopOwner1->id)->latest()->first();
        $this->assertNotNull($notice);
        $this->assertStringContainsString('Suspended', $notice->title);

        // Audit log created
        $this->assertDatabaseHas('audit_logs', [
            'store_id' => $this->shop1->id,
            'action' => 'shop.suspended',
        ]);

        // Restore
        $restoreRes = $this->actingAs($this->superAdmin)->postJson("/api/admin/shops/{$this->shop1->id}/toggle-status", [
            'action' => 'activate',
        ]);
        $restoreRes->assertOk();
        $this->shop1->refresh();
        $this->assertFalse($this->shop1->isSuspended());
        $this->assertTrue((bool) $this->shop1->is_active);
    }

    public function test_super_admin_can_extend_subscription_validity()
    {
        $oldExpiry = $this->shop1->subscription_expires_at->copy();

        $response = $this->actingAs($this->superAdmin)->postJson("/api/admin/shops/{$this->shop1->id}/extend-subscription", [
            'days' => 30,
            'reason' => 'Complimentary customer satisfaction extension',
        ]);
        $response->assertOk();

        $this->shop1->refresh();
        $this->assertTrue($this->shop1->subscription_expires_at->gt($oldExpiry));

        $this->assertDatabaseHas('audit_logs', [
            'store_id' => $this->shop1->id,
            'action' => 'subscription.extended',
        ]);
    }

    public function test_super_admin_can_change_shop_plan()
    {
        $response = $this->actingAs($this->superAdmin)->postJson("/api/admin/shops/{$this->shop2->id}/change-plan", [
            'plan_id' => $this->proPlan->id,
            'extend_days' => 30,
        ]);
        $response->assertOk();

        $this->shop2->refresh();
        $this->assertEquals($this->proPlan->id, $this->shop2->active_plan_id);
    }

    public function test_super_admin_can_crud_subscription_plans()
    {
        // 1. List
        $listRes = $this->actingAs($this->superAdmin)->getJson('/api/admin/plans');
        $listRes->assertOk();
        $this->assertCount(2, $listRes->json('plans'));

        // 2. Create
        $createRes = $this->actingAs($this->superAdmin)->postJson('/api/admin/plans', [
            'name' => 'Enterprise Tier',
            'price_cents' => 990000,
            'interval' => 'year',
            'duration_days' => 365,
            'trial_days' => 0,
            'max_users' => 50,
            'max_stores' => 10,
            'max_products' => 50000,
            'features' => 'Multi-branch, Priority SLA, API Access',
            'is_active' => true,
        ]);
        $createRes->assertOk();
        $planId = $createRes->json('plan.id');
        $this->assertDatabaseHas('plans', ['id' => $planId, 'name' => 'Enterprise Tier']);

        // 3. Update
        $updateRes = $this->actingAs($this->superAdmin)->putJson("/api/admin/plans/{$planId}", [
            'name' => 'Enterprise Plus',
            'price_cents' => 1200000,
            'interval' => 'year',
            'duration_days' => 365,
            'max_users' => 100,
            'max_stores' => 20,
            'max_products' => 100000,
            'is_active' => true,
        ]);
        $updateRes->assertOk();
        $this->assertDatabaseHas('plans', ['id' => $planId, 'name' => 'Enterprise Plus']);

        // 4. Toggle
        $toggleRes = $this->actingAs($this->superAdmin)->postJson("/api/admin/plans/{$planId}/toggle");
        $toggleRes->assertOk();
        $this->assertFalse((bool) Plan::find($planId)->is_active);
    }

    public function test_super_admin_can_configure_bkash_and_nagad_manual_gateways()
    {
        $response = $this->actingAs($this->superAdmin)->postJson('/api/admin/payment-settings', [
            'bkash' => [
                'enabled' => true,
                'account_number' => '01799887766',
                'account_type' => 'Merchant',
                'instructions' => 'Pay to bKash merchant 01799887766 and provide TrxID.',
            ],
            'nagad' => [
                'enabled' => true,
                'account_number' => '01899887766',
                'account_type' => 'Personal',
                'instructions' => 'Send money to Nagad 01899887766 and provide TrxID.',
            ],
        ]);
        $response->assertOk();

        // Validate retrieved settings
        $getRes = $this->actingAs($this->superAdmin)->getJson('/api/admin/payment-settings');
        $getRes->assertOk();
        $this->assertEquals('01799887766', $getRes->json('gateways.bkash.account_number'));
        $this->assertEquals('Merchant', $getRes->json('gateways.bkash.account_type'));
    }

    public function test_shop_owner_payment_submission_workflow_and_duplicate_prevention()
    {
        // 1. Shop owner retrieves checkout info
        $checkoutRes = $this->actingAs($this->shopOwner1)->getJson('/api/subscription/checkout-info');
        $checkoutRes->assertOk();
        $checkoutRes->assertJsonStructure(['plans', 'gateways', 'shop']);

        // 2. Shop owner submits manual payment with TrxID
        $submitRes = $this->actingAs($this->shopOwner1)->postJson('/api/subscription/submit-payment', [
            'plan_id' => $this->proPlan->id,
            'payment_method' => 'bkash',
            'amount_cents' => 450000,
            'transaction_id' => 'BKASH_TRX_9999',
            'sender_phone' => '01711111111',
            'payment_date' => now()->toDateString(),
            'notes' => 'Paid via bKash App',
        ]);
        $submitRes->assertOk();

        $this->assertDatabaseHas('subscription_payments', [
            'store_id' => $this->shop1->id,
            'transaction_id' => 'BKASH_TRX_9999',
            'status' => 'pending',
        ]);

        // Shop status becomes payment_pending, NOT activated immediately!
        $this->shop1->refresh();
        $this->assertEquals('payment_pending', $this->shop1->subscription_status);

        // 3. Duplicate transaction ID must be rejected!
        $dupRes = $this->actingAs($this->shopOwner2)->postJson('/api/subscription/submit-payment', [
            'plan_id' => $this->proPlan->id,
            'payment_method' => 'bkash',
            'amount_cents' => 450000,
            'transaction_id' => 'BKASH_TRX_9999',
        ]);
        $dupRes->assertStatus(422);
    }

    public function test_super_admin_approves_payment_with_atomic_db_transaction()
    {
        $invoice = SubscriptionInvoice::create([
            'invoice_no' => 'INV-TEST-001',
            'store_id' => $this->shop1->id,
            'plan_id' => $this->proPlan->id,
            'total_cents' => 450000,
            'due_cents' => 450000,
            'paid_cents' => 0,
            'status' => 'unpaid',
        ]);

        $payment = SubscriptionPayment::create([
            'store_id' => $this->shop1->id,
            'user_id' => $this->shopOwner1->id,
            'invoice_id' => $invoice->id,
            'plan_id' => $this->proPlan->id,
            'payment_method' => 'bkash',
            'amount_cents' => 450000,
            'transaction_id' => 'TRX_APPROVE_TEST',
            'status' => 'pending',
        ]);

        $oldExpiry = $this->shop1->subscription_expires_at->copy();

        $response = $this->actingAs($this->superAdmin)->postJson("/api/admin/subscription-payments/{$payment->id}/approve");
        $response->assertOk();

        // 1. Payment marked approved
        $payment->refresh();
        $this->assertEquals('approved', $payment->status);
        $this->assertEquals($this->superAdmin->id, $payment->verified_by);

        // 2. Invoice marked paid
        $invoice->refresh();
        $this->assertEquals('paid', $invoice->status);
        $this->assertEquals(450000, $invoice->paid_cents);
        $this->assertEquals(0, $invoice->due_cents);

        // 3. Shop subscription extended
        $this->shop1->refresh();
        $this->assertEquals('active', $this->shop1->subscription_status);
        $this->assertTrue($this->shop1->subscription_expires_at->gt($oldExpiry));

        // 4. Owner notified
        $notice = UserNotice::where('user_id', $this->shopOwner1->id)->latest()->first();
        $this->assertNotNull($notice);
        $this->assertStringContainsString('Payment Approved', $notice->title);

        // 5. Approving again must be rejected!
        $secondApprove = $this->actingAs($this->superAdmin)->postJson("/api/admin/subscription-payments/{$payment->id}/approve");
        $secondApprove->assertStatus(422);
    }

    public function test_super_admin_rejects_payment_with_reason()
    {
        $payment = SubscriptionPayment::create([
            'store_id' => $this->shop2->id,
            'user_id' => $this->shopOwner2->id,
            'plan_id' => $this->proPlan->id,
            'payment_method' => 'nagad',
            'amount_cents' => 450000,
            'transaction_id' => 'TRX_REJECT_TEST',
            'status' => 'pending',
        ]);

        $response = $this->actingAs($this->superAdmin)->postJson("/api/admin/subscription-payments/{$payment->id}/reject", [
            'reason' => 'Transaction ID not found in Nagad merchant statement.',
        ]);
        $response->assertOk();

        $payment->refresh();
        $this->assertEquals('rejected', $payment->status);
        $this->assertEquals('Transaction ID not found in Nagad merchant statement.', $payment->rejection_reason);

        // Owner notified
        $notice = UserNotice::where('user_id', $this->shopOwner2->id)->latest()->first();
        $this->assertNotNull($notice);
        $this->assertStringContainsString('Rejected', $notice->title);
    }

    public function test_tenant_isolation_shop_a_cannot_access_shop_b_data()
    {
        // Non-admin cannot access super admin routes
        $unauthRes = $this->actingAs($this->shopOwner1)->getJson('/api/admin/shops');
        $unauthRes->assertForbidden();

        $unauthPaymentRes = $this->actingAs($this->shopOwner1)->getJson('/api/admin/subscription-payments');
        $unauthPaymentRes->assertForbidden();

        // Shop 1 owner accesses history, must only see Shop 1 records
        SubscriptionInvoice::create([
            'invoice_no' => 'INV-SHOP-2',
            'store_id' => $this->shop2->id,
            'plan_id' => $this->starterPlan->id,
            'total_cents' => 0,
            'status' => 'paid',
        ]);

        $historyRes = $this->actingAs($this->shopOwner1)->getJson('/api/subscription/my-history');
        $historyRes->assertOk();
        $invoices = $historyRes->json('invoices');
        foreach ($invoices as $inv) {
            $this->assertEquals($this->shop1->id, $inv['store_id']);
        }
    }

    public function test_global_search_finds_tenants_and_subscription_records_for_super_admin()
    {
        SubscriptionPayment::create([
            'store_id' => $this->shop1->id,
            'user_id' => $this->shopOwner1->id,
            'plan_id' => $this->proPlan->id,
            'payment_method' => 'bkash',
            'amount_cents' => 450000,
            'transaction_id' => 'SEARCH_TRX_XYZ',
            'status' => 'approved',
        ]);

        $searchRes = $this->actingAs($this->superAdmin)->getJson('/api/search?q=SEARCH_TRX_XYZ');
        $searchRes->assertOk();
        $results = $searchRes->json('results');
        $this->assertNotEmpty($results);
        $this->assertStringContainsString('SEARCH_TRX_XYZ', $results[0]['title']);
    }
}
