<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReactNavigationAndApiStandardizationTest extends TestCase
{
    use RefreshDatabase;

    protected Store $store;

    protected User $owner;

    protected User $cashier;

    protected function setUp(): void
    {
        parent::setUp();

        $this->store = Store::create([
            'name' => 'Borno Test Shop',
            'business_type' => 'pharmacy',
            'slug' => 'borno-test-shop',
            'currency_symbol' => '৳',
            'currency_code' => 'BDT',
        ]);

        $this->owner = User::create([
            'name' => 'Shop Owner',
            'email' => 'owner@bornopos.test',
            'username' => 'owner',
            'password' => 'password',
            'role' => 'owner',
            'store_id' => $this->store->id,
            'is_active' => true,
        ]);

        $this->cashier = User::create([
            'name' => 'Cashier Staff',
            'email' => 'cashier@bornopos.test',
            'username' => 'cashier',
            'password' => 'password',
            'role' => 'staff',
            'store_id' => $this->store->id,
            'is_active' => true,
            'permissions' => ['pos.view', 'sales.view'],
        ]);
    }

    public function test_spa_view_returned_for_direct_browser_navigation_on_all_modules(): void
    {
        Plan::create([
            'name' => 'Pro Plan',
            'price_cents' => 1900,
            'billing_interval' => 'month',
            'is_active' => true,
        ]);

        $routes = [
            '/accounts',
            '/money-transfers',
            '/account/balancesheet',
            '/account/transactions',
            '/expense',
            '/stock/count',
            '/sale-returns',
            '/attendance',
            '/payrolls',
            '/report/summary',
            '/report/profit-loss',
            '/report/purchases',
            '/report/sales',
            '/report/product',
            '/report/expense',
            '/settings/general-settings',
            '/settings/business-modules',
            '/shop-payment-gateway',
            '/stores',
            '/stores/create',
            '/subscription-purchase',
            '/subscription/report',
        ];

        foreach ($routes as $route) {
            $response = $this->actingAs($this->owner)->get($route);
            $response->assertStatus(200);
            $response->assertSee('id="root"', false);
        }
    }

    public function test_json_api_returned_for_client_side_react_data_fetching(): void
    {
        Plan::create([
            'name' => 'Starter Plan',
            'price_cents' => 999,
            'billing_interval' => 'month',
            'is_active' => true,
        ]);

        // Accounting
        $accRes = $this->actingAs($this->owner)->getJson('/accounts');
        $accRes->assertStatus(200)->assertJsonStructure(['accounts']);

        // Stock count
        $stockRes = $this->actingAs($this->owner)->getJson('/stock/count');
        $stockRes->assertStatus(200)->assertJsonStructure(['counts', 'warehouses', 'categories']);

        // Sale returns
        $retRes = $this->actingAs($this->owner)->getJson('/sale-returns');
        $retRes->assertStatus(200)->assertJsonStructure(['returns', 'meta']);

        // Attendance & Payroll
        $attRes = $this->actingAs($this->owner)->getJson('/attendance');
        $attRes->assertStatus(200)->assertJsonStructure(['attendance', 'employees', 'summary']);

        $payRes = $this->actingAs($this->owner)->getJson('/payrolls');
        $payRes->assertStatus(200)->assertJsonStructure(['payrolls', 'employees']);

        // Reports
        $sumRes = $this->actingAs($this->owner)->getJson('/report/summary');
        $sumRes->assertStatus(200)->assertJsonStructure(['data', 'from', 'to']);

        $profitRes = $this->actingAs($this->owner)->getJson('/report/profit-loss');
        $profitRes->assertStatus(200)->assertJsonStructure(['data', 'from', 'to']);

        // Settings
        $genRes = $this->actingAs($this->owner)->getJson('/settings/general-settings');
        $genRes->assertStatus(200)->assertJsonStructure(['store', 'currencies']);

        $modRes = $this->actingAs($this->owner)->getJson('/settings/business-modules');
        $modRes->assertStatus(200)->assertJsonStructure(['modules']);

        $gwRes = $this->actingAs($this->owner)->getJson('/shop-payment-gateway');
        $gwRes->assertStatus(200)->assertJsonStructure(['gateways', 'names']);

        // Stores & Subscriptions
        $storesRes = $this->actingAs($this->owner)->getJson('/stores');
        $storesRes->assertStatus(200)->assertJsonStructure(['stores', 'meta']);

        $subRes = $this->actingAs($this->owner)->getJson('/subscription-purchase');
        $subRes->assertStatus(200)->assertJsonStructure(['plans', 'current']);
    }

    public function test_staff_without_permissions_is_forbidden_from_restricted_accounting_and_settings(): void
    {
        // Cashier has only pos.view and sales.view
        // Attempting to access accounts JSON API
        $accRes = $this->actingAs($this->cashier)->getJson('/accounts');
        $accRes->assertStatus(403);

        // Attempting to access settings JSON API
        $setRes = $this->actingAs($this->cashier)->getJson('/settings/general-settings');
        $setRes->assertStatus(403);

        // Attempting to access HRM attendance JSON API
        $attRes = $this->actingAs($this->cashier)->getJson('/attendance');
        $attRes->assertStatus(403);
    }

    public function test_react_crud_actions_persist_via_json_api(): void
    {
        // 1. Create account via JSON
        $createAccount = $this->actingAs($this->owner)->postJson('/accounts', [
            'name' => 'Islami Bank Checking',
            'number' => 'IBBL-987654',
            'type' => 'bank',
            'opening_balance' => 15000,
        ]);
        $createAccount->assertStatus(200)->assertJson(['message' => 'Account saved successfully.']);
        $this->assertDatabaseHas('accounts', [
            'name' => 'Islami Bank Checking',
            'number' => 'IBBL-987654',
            'store_id' => $this->store->id,
        ]);

        // 2. Update general settings via JSON
        $updateGen = $this->actingAs($this->owner)->postJson('/settings/general-settings', [
            'shop_name' => 'Borno Health Care',
            'phone' => '+8801700000000',
            'address' => 'Dhaka, Bangladesh',
            'invoice_footer' => 'Wish you speedy recovery!',
            'currency_symbol' => '৳',
            'currency_code' => 'BDT',
        ]);
        $updateGen->assertStatus(200)->assertJson(['message' => 'General settings saved.']);
        $this->assertDatabaseHas('stores', [
            'id' => $this->store->id,
            'name' => 'Borno Health Care',
        ]);

        // 3. Update business modules via JSON
        $updateMod = $this->actingAs($this->owner)->postJson('/settings/business-modules', [
            'pos' => true,
            'sales' => true,
            'purchases' => true,
            'accounting' => true,
            'hrm' => false,
        ]);
        $updateMod->assertStatus(200)->assertJson(['message' => 'Business modules updated.']);

        // 4. Create new store via JSON
        $createStore = $this->actingAs($this->owner)->postJson('/stores', [
            'name' => 'Mirpur Branch',
            'business_type' => 'pharmacy',
            'phone' => '+8801900000000',
            'address' => 'Mirpur-10, Dhaka',
        ]);
        $createStore->assertStatus(200)->assertJson(['message' => 'Store saved successfully.']);
        $this->assertDatabaseHas('stores', [
            'name' => 'Mirpur Branch',
            'parent_id' => $this->store->id,
        ]);
    }
}
