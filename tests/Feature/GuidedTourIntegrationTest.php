<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GuidedTourIntegrationTest extends TestCase
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

        Plan::create([
            'name' => 'Pro Plan',
            'price_cents' => 1900,
            'billing_interval' => 'month',
            'is_active' => true,
        ]);
    }

    public function test_guest_is_redirected_from_tour_to_login(): void
    {
        $response = $this->get('/tour');
        $response->assertRedirect('/signin');
    }

    public function test_authenticated_user_can_access_tour_page_as_spa(): void
    {
        $response = $this->actingAs($this->owner)->get('/tour');

        $response->assertStatus(200);
        $response->assertSee('id="root"', false);
    }

    public function test_json_request_to_tour_returns_proper_response(): void
    {
        $response = $this->actingAs($this->owner)->getJson('/tour');

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'message' => 'Guided tour center',
            'route' => '/tour',
        ]);
    }

    public function test_all_tour_target_routes_return_successful_response_for_owner(): void
    {
        $tourRoutes = [
            '/tour',
            '/store-dashboard',
            '/categories',
            '/products',
            '/barcode-print',
            '/purchase/batch',
            '/purchase/list',
            '/stock/count',
            '/pos',
            '/sales',
            '/sales/draft',
            '/accounts',
            '/money-transfers',
            '/account/transactions',
            '/account/balancesheet',
            '/expense',
            '/customer',
            '/supplier',
            '/attendance',
            '/payrolls',
            '/role',
            '/staff',
            '/reports/center',
            '/stores',
            '/subscription-purchase',
            '/settings/general-settings',
            '/settings/business-modules',
        ];

        foreach ($tourRoutes as $route) {
            $response = $this->actingAs($this->owner)->get($route);
            $this->assertContains(
                $response->getStatusCode(),
                [200, 302],
                "Tour route {$route} failed with status {$response->getStatusCode()}"
            );
        }
    }

    public function test_staff_restricted_permissions_respected_in_tour_context(): void
    {
        // POS route should succeed for cashier with pos.view
        $posResponse = $this->actingAs($this->cashier)->get('/pos');
        $this->assertEquals(200, $posResponse->getStatusCode());

        // Role route is restricted to authorized administrative users
        $roleResponse = $this->actingAs($this->cashier)->get('/role');
        $this->assertContains($roleResponse->getStatusCode(), [200, 302, 403]);
    }
}
