<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ShopRole;
use App\Models\Store;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\RbacService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StaffAndRoleManagementTest extends TestCase
{
    use RefreshDatabase;

    private function createStoreWithRoles(): array
    {
        $store = Store::create([
            'name' => 'Apex Pharmacy & Superstore',
            'slug' => 'apex-pharmacy',
            'business_type' => 'pharmacy',
            'currency_symbol' => '৳',
            'currency_code' => 'BDT',
        ]);

        $owner = User::create([
            'name' => 'Store Owner',
            'email' => 'owner@apex.test',
            'username' => 'apex_owner',
            'password' => 'password123',
            'role' => 'owner',
            'store_id' => $store->id,
            'is_active' => true,
        ]);

        $store->update(['owner_id' => $owner->id]);

        Warehouse::create([
            'store_id' => $store->id,
            'name' => 'Main Warehouse',
        ]);

        app(RbacService::class)->seedDefaultRoles($store);

        return [$store, $owner];
    }

    public function test_owner_can_view_create_edit_and_delete_staff_accounts(): void
    {
        [$store, $owner] = $this->createStoreWithRoles();

        $sellerRole = ShopRole::where('store_id', $store->id)->where('name', 'Seller')->first();

        // 1. View staff list
        $response = $this->actingAs($owner)->getJson('/api/staff');
        $response->assertOk()
            ->assertJsonPath('staff.0.email', $owner->email);

        // 2. Create staff account
        $createResponse = $this->actingAs($owner)->postJson('/api/staff', [
            'name' => 'John Seller',
            'email' => 'john.seller@apex.test',
            'username' => 'john_seller',
            'password' => 'sellerPass123!',
            'role_id' => $sellerRole->id,
            'phone' => '01711000000',
        ]);

        $createResponse->assertCreated()
            ->assertJsonPath('user.name', 'John Seller')
            ->assertJsonPath('user.role', 'seller')
            ->assertJsonPath('user.role_id', $sellerRole->id);

        $staffUser = User::where('email', 'john.seller@apex.test')->first();
        $this->assertNotNull($staffUser);
        $this->assertEquals($store->id, $staffUser->store_id);

        // Verify audit log created
        $this->assertDatabaseHas('audit_logs', [
            'store_id' => $store->id,
            'user_id' => $owner->id,
            'action' => 'staff.create',
        ]);

        // 3. Edit staff account
        $updateResponse = $this->actingAs($owner)->putJson("/api/staff/{$staffUser->id}", [
            'name' => 'John Senior Seller',
            'email' => 'john.senior@apex.test',
            'role_id' => $sellerRole->id,
            'is_active' => true,
        ]);

        $updateResponse->assertOk()
            ->assertJsonPath('user.name', 'John Senior Seller');

        // 4. Toggle status to inactive
        $toggleResponse = $this->actingAs($owner)->postJson("/api/staff/{$staffUser->id}/toggle-status");
        $toggleResponse->assertOk()
            ->assertJsonPath('is_active', false);
        $this->assertFalse($staffUser->fresh()->is_active);

        // 5. Reset password
        $resetResponse = $this->actingAs($owner)->postJson("/api/staff/{$staffUser->id}/reset-password", [
            'password' => 'NewSecretPassword123!',
            'password_confirmation' => 'NewSecretPassword123!',
        ]);
        $resetResponse->assertOk();

        // 6. Safeguard: Owner cannot delete themselves
        $deleteSelfResponse = $this->actingAs($owner)->deleteJson("/api/staff/{$owner->id}");
        $deleteSelfResponse->assertStatus(422);

        // 7. Delete staff account
        $deleteResponse = $this->actingAs($owner)->deleteJson("/api/staff/{$staffUser->id}");
        $deleteResponse->assertOk();
        $this->assertNull(User::find($staffUser->id));
    }

    public function test_owner_can_create_view_edit_and_delete_custom_roles_with_granular_permissions(): void
    {
        [$store, $owner] = $this->createStoreWithRoles();

        // 1. Get role schema and roles list
        $schemaResponse = $this->actingAs($owner)->getJson('/api/role/schema');
        $schemaResponse->assertOk()
            ->assertJsonStructure(['modules', 'default_roles']);

        $listResponse = $this->actingAs($owner)->getJson('/api/role');
        $listResponse->assertOk();

        // 2. Create custom role with specific permissions
        $createResponse = $this->actingAs($owner)->postJson('/api/role', [
            'name' => 'Pharmacy Assistant',
            'description' => 'Dispatches medicines and checks inventory',
            'permissions' => [
                'dashboard.view',
                'products.view',
                'products.create',
                'pos.view',
            ],
        ]);

        $createResponse->assertCreated()
            ->assertJsonPath('role.name', 'Pharmacy Assistant');

        $customRole = ShopRole::where('store_id', $store->id)->where('name', 'Pharmacy Assistant')->first();
        $this->assertNotNull($customRole);
        $this->assertContains('products.view', $customRole->permissions);
        $this->assertFalse(in_array('products.delete', $customRole->permissions));

        // 3. Edit custom role
        $updateResponse = $this->actingAs($owner)->putJson("/api/role/{$customRole->id}", [
            'name' => 'Senior Pharmacy Assistant',
            'description' => 'Updated assistant description',
            'permissions' => [
                'dashboard.view',
                'products.view',
                'products.create',
                'products.edit',
            ],
        ]);

        $updateResponse->assertOk()
            ->assertJsonPath('role.name', 'Senior Pharmacy Assistant');

        // 4. Safeguard: Cannot delete system roles (e.g. Admin, Manager, Seller)
        $systemRole = ShopRole::where('store_id', $store->id)->where('name', 'Admin')->first();
        $deleteSystemResponse = $this->actingAs($owner)->deleteJson("/api/role/{$systemRole->id}");
        $deleteSystemResponse->assertStatus(422)
            ->assertJsonPath('message', "System role 'Admin' is protected and cannot be deleted.");

        // 5. Delete custom role
        $deleteResponse = $this->actingAs($owner)->deleteJson("/api/role/{$customRole->id}");
        $deleteResponse->assertOk();
        $this->assertNull(ShopRole::find($customRole->id));
    }

    public function test_staff_with_no_delete_permission_cannot_delete_products_via_api(): void
    {
        [$store, $owner] = $this->createStoreWithRoles();

        $brand = Brand::create(['store_id' => $store->id, 'name' => 'Square Pharmaceuticals']);
        $category = Category::create(['store_id' => $store->id, 'name' => 'Tablet']);
        $unit = Unit::create(['store_id' => $store->id, 'name' => 'Pcs', 'short_name' => 'pcs', 'code' => 'pcs']);

        // Create a custom role with only view & create, but NO delete
        $noDeleteRole = ShopRole::create([
            'store_id' => $store->id,
            'name' => 'Junior Cashier',
            'permissions' => ['products.view', 'products.create'],
            'is_system' => false,
        ]);

        $staff = User::create([
            'name' => 'Junior Staff',
            'email' => 'cashier@apex.test',
            'username' => 'junior_cashier',
            'password' => 'password123',
            'role' => 'staff',
            'role_id' => $noDeleteRole->id,
            'store_id' => $store->id,
            'is_active' => true,
        ]);

        // Create a product
        $product = Product::create([
            'store_id' => $store->id,
            'brand_id' => $brand->id,
            'category_id' => $category->id,
            'unit_id' => $unit->id,
            'name' => 'Napa 500mg Paracetamol',
            'code' => 'NAPA500',
            'type' => 'standard',
            'price_cents' => 2000,
            'cost_cents' => 1500,
        ]);

        // Staff can view products
        $viewResponse = $this->actingAs($staff)->getJson('/api/products');
        $viewResponse->assertOk();

        // Staff can create products
        $createResponse = $this->actingAs($staff)->postJson('/api/products', [
            'name' => 'Ace Plus Tablet',
            'code' => 'ACEPLUS01',
            'brand_id' => $brand->id,
            'category_id' => $category->id,
            'unit_id' => $unit->id,
            'price' => '30.00',
            'cost' => '22.00',
            'type' => 'standard',
        ]);
        $createResponse->assertOk();

        // Staff CANNOT delete products -> 403 Forbidden!
        $deleteResponse = $this->actingAs($staff)->deleteJson("/api/products/{$product->id}");
        $deleteResponse->assertStatus(403)
            ->assertJsonPath('message', 'You do not have permission to delete products.');

        // Product still exists in DB
        $this->assertNotNull(Product::find($product->id));
    }

    public function test_staff_without_accounting_permission_cannot_access_accounting_endpoints(): void
    {
        [$store, $owner] = $this->createStoreWithRoles();

        $sellerRole = ShopRole::where('store_id', $store->id)->where('name', 'Seller')->first();

        $staff = User::create([
            'name' => 'Seller Only',
            'email' => 'selleronly@apex.test',
            'username' => 'seller_only',
            'password' => 'password123',
            'role' => 'staff',
            'role_id' => $sellerRole->id,
            'store_id' => $store->id,
            'is_active' => true,
        ]);

        // Attempting to access accounting /accounts endpoint
        $response = $this->actingAs($staff)->getJson('/accounts');
        $response->assertStatus(403)
            ->assertJsonPath('message', 'You do not have permission to perform this action.');
    }

    public function test_staff_login_authenticates_active_staff_and_updates_login_meta(): void
    {
        [$store, $owner] = $this->createStoreWithRoles();

        $managerRole = ShopRole::where('store_id', $store->id)->where('name', 'Manager')->first();

        $staff = User::create([
            'name' => 'Floor Manager',
            'email' => 'manager@apex.test',
            'username' => 'floor_manager',
            'password' => 'managerPass123!',
            'role' => 'staff',
            'role_id' => $managerRole->id,
            'store_id' => $store->id,
            'is_active' => true,
        ]);

        // 1. Staff login with email
        $loginResponse = $this->postJson('/login', [
            'login' => 'manager@apex.test',
            'password' => 'managerPass123!',
        ]);

        $loginResponse->assertOk()
            ->assertJsonPath('user.name', 'Floor Manager')
            ->assertJsonPath('user.role', 'staff')
            ->assertJsonPath('user.role_title', 'Manager')
            ->assertJsonPath('user.is_active', true);

        // Verify last_login_at was updated
        $this->assertNotNull($staff->fresh()->last_login_at);

        // 2. Invalid credentials rejected
        $badResponse = $this->postJson('/login', [
            'login' => 'manager@apex.test',
            'password' => 'wrongPassword',
        ]);
        $badResponse->assertStatus(422);
    }

    public function test_inactive_staff_accounts_cannot_authenticate(): void
    {
        [$store, $owner] = $this->createStoreWithRoles();

        $sellerRole = ShopRole::where('store_id', $store->id)->where('name', 'Seller')->first();

        User::create([
            'name' => 'Suspended Staff',
            'email' => 'suspended@apex.test',
            'username' => 'suspended_staff',
            'password' => 'staffPass123!',
            'role' => 'staff',
            'role_id' => $sellerRole->id,
            'store_id' => $store->id,
            'is_active' => false, // Deactivated
        ]);

        $response = $this->postJson('/login', [
            'login' => 'suspended@apex.test',
            'password' => 'staffPass123!',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['login']);
    }

    public function test_existing_owner_login_continues_to_work(): void
    {
        [$store, $owner] = $this->createStoreWithRoles();

        $response = $this->postJson('/login', [
            'login' => 'owner@apex.test',
            'password' => 'password123',
        ]);

        $response->assertOk()
            ->assertJsonPath('user.role', 'owner')
            ->assertJsonPath('user.home_route', '/store-dashboard');
    }

    public function test_unauthorized_staff_cannot_manage_staff_or_roles(): void
    {
        [$store, $owner] = $this->createStoreWithRoles();

        $sellerRole = ShopRole::where('store_id', $store->id)->where('name', 'Seller')->first();

        $staff = User::create([
            'name' => 'Basic Seller',
            'email' => 'basicseller@apex.test',
            'username' => 'basic_seller',
            'password' => 'password123',
            'role' => 'staff',
            'role_id' => $sellerRole->id,
            'store_id' => $store->id,
            'is_active' => true,
        ]);

        // Attempting to access staff API
        $staffResponse = $this->actingAs($staff)->getJson('/api/staff');
        $staffResponse->assertStatus(403);

        // Attempting to create a role
        $roleResponse = $this->actingAs($staff)->postJson('/api/role', [
            'name' => 'Hacker Admin Role',
            'permissions' => ['staff.view', 'staff.create'],
        ]);
        $roleResponse->assertStatus(403);
    }
}
