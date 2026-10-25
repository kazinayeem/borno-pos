<?php

namespace Tests\Feature;

use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\ViewErrorBag;
use Tests\TestCase;

class StaffProfileAndQuickLoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_staff_blade_sidebar_only_renders_authorized_modules(): void
    {
        $store = Store::create([
            'name' => 'Demo Pharmacy',
            'business_type' => 'pharmacy',
            'slug' => 'demo-pharmacy',
        ]);

        $cashier = User::create([
            'name' => 'Cashier Demo',
            'email' => 'cashier.test@bornopos.test',
            'username' => 'cashiertest',
            'password' => 'password',
            'role' => 'staff',
            'store_id' => $store->id,
            'is_active' => true,
            'permissions' => ['pos', 'products.view', 'sales.view'],
        ]);

        // Render the blade template with the sidebar as cashier
        $rendered = $this->actingAs($cashier)->view('settings.profile', [
            'errors' => new ViewErrorBag,
        ]);

        // Cashier has products.view and sales.view -> Products and Sales are rendered
        $rendered->assertSee('Products');
        $rendered->assertSee('Sales');

        // Cashier DOES NOT have accounting, purchases, hrm permissions -> These MUST NOT be shown in sidebar
        $rendered->assertDontSee('Accounting');
        $rendered->assertDontSee('Purchases');
        $rendered->assertDontSee('Money Transfer');
        $rendered->assertDontSee('Balance Sheet');
        $rendered->assertDontSee('Payrolls');
        $rendered->assertDontSee('Attendance');
        $rendered->assertDontSee('General Settings');
        $rendered->assertDontSee('Business Modules');
    }

    public function test_staff_can_view_and_update_profile_via_json_api(): void
    {
        $store = Store::create([
            'name' => 'Demo Pharmacy',
            'business_type' => 'pharmacy',
            'slug' => 'demo-pharmacy-2',
        ]);

        $staff = User::create([
            'name' => 'Staff Original Name',
            'email' => 'staff.api@bornopos.test',
            'username' => 'staffapi',
            'phone' => '01711111111',
            'password' => 'password',
            'role' => 'staff',
            'store_id' => $store->id,
            'is_active' => true,
            'permissions' => ['pos'],
        ]);

        // GET profile JSON
        $getRes = $this->actingAs($staff)->getJson('/user/profile');
        $getRes->assertOk()
            ->assertJsonPath('user.name', 'Staff Original Name')
            ->assertJsonPath('user.email', 'staff.api@bornopos.test')
            ->assertJsonPath('user.phone', '01711111111');

        // PUT update profile JSON
        $putRes = $this->actingAs($staff)->putJson('/user/profile', [
            'name' => 'Staff Updated Name',
            'email' => 'staff.updated@bornopos.test',
            'phone' => '01899999999',
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ]);

        $putRes->assertOk()
            ->assertJsonPath('message', 'Profile updated.')
            ->assertJsonPath('user.name', 'Staff Updated Name')
            ->assertJsonPath('user.email', 'staff.updated@bornopos.test');

        $staff->refresh();
        $this->assertSame('Staff Updated Name', $staff->name);
        $this->assertSame('staff.updated@bornopos.test', $staff->email);
        $this->assertSame('01899999999', $staff->phone);
        $this->assertTrue(Hash::check('newpassword123', $staff->password));
    }

    public function test_spa_initialization_includes_staff_permissions_and_quick_login_configs(): void
    {
        $store = Store::create([
            'name' => 'Demo Pharmacy',
            'business_type' => 'pharmacy',
            'slug' => 'demo-pharmacy-3',
        ]);

        $cashier = User::create([
            'name' => 'Cashier Demo',
            'email' => 'cashier.test3@bornopos.test',
            'username' => 'cashiertest3',
            'password' => 'password',
            'role' => 'staff',
            'store_id' => $store->id,
            'is_active' => true,
            'permissions' => ['pos', 'products.view', 'sales.view'],
        ]);

        $response = $this->actingAs($cashier)->get('/user/profile');
        $response->assertOk();
        $response->assertSee('window.BornoPos =', false);
        $response->assertSee('products.view');
        $response->assertSee('sales.view');
    }
}
