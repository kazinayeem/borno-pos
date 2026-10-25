<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Category;
use App\Models\ExpenseCategory;
use App\Models\LedgerAccount;
use App\Models\Product;
use App\Models\ShopRole;
use App\Models\Store;
use App\Models\Supplier;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ComprehensiveSystemCrudAuditTest extends TestCase
{
    use RefreshDatabase;

    protected Store $store;

    protected User $user;

    protected Category $category;

    protected Brand $brand;

    protected Unit $unit;

    protected Warehouse $warehouse;

    protected Supplier $supplier;

    protected function setUp(): void
    {
        parent::setUp();

        $this->store = Store::create([
            'name' => 'Borno Master Pharmacy',
            'slug' => 'borno-master-pharmacy',
            'business_type' => 'pharmacy',
            'currency_code' => 'BDT',
            'currency_symbol' => '৳',
        ]);

        $this->user = User::create([
            'name' => 'Master Owner',
            'email' => 'owner@bornopos.test',
            'username' => 'master_owner',
            'password' => 'secret123',
            'role' => 'owner',
            'store_id' => $this->store->id,
            'is_active' => true,
        ]);

        $this->category = Category::create([
            'store_id' => $this->store->id,
            'name' => 'Antibiotics',
        ]);

        $this->brand = Brand::create([
            'store_id' => $this->store->id,
            'name' => 'Square Pharmaceuticals',
        ]);

        $this->unit = Unit::create([
            'store_id' => $this->store->id,
            'name' => 'Box',
        ]);

        $this->warehouse = Warehouse::create([
            'store_id' => $this->store->id,
            'name' => 'Central Depot',
        ]);

        $this->supplier = Supplier::create([
            'store_id' => $this->store->id,
            'name' => 'Apex Pharma Distributor',
            'phone' => '+8801700000000',
        ]);
    }

    public function test_product_crud_lifecycle_persists_and_modifies_data(): void
    {
        // 1. Create Product
        $createRes = $this->actingAs($this->user)->postJson('/products', [
            'name' => 'Amoxicillin 500mg',
            'code' => 'AMX-500',
            'barcode' => '8941234567890',
            'category_id' => $this->category->id,
            'brand_id' => $this->brand->id,
            'unit_id' => $this->unit->id,
            'cost' => '12.50',
            'price' => '18.00',
            'opening_stock' => 50,
            'has_batch' => '1',
            'type' => 'standard',
        ]);

        $createRes->assertStatus(201)
            ->assertJsonPath('product.name', 'Amoxicillin 500mg');

        $productId = $createRes->json('product.id');
        $this->assertDatabaseHas('products', [
            'id' => $productId,
            'name' => 'Amoxicillin 500mg',
            'cost_cents' => 1250,
            'price_cents' => 1800,
        ]);

        // 2. View / Read Product
        $readRes = $this->actingAs($this->user)->getJson('/products/'.$productId);
        $readRes->assertStatus(200)
            ->assertJsonPath('product.code', 'AMX-500');

        // 3. Edit / Update Product
        $updateRes = $this->actingAs($this->user)->putJson('/products/'.$productId, [
            'name' => 'Amoxicillin 500mg Trihydrate',
            'code' => 'AMX-500-TRI',
            'category_id' => $this->category->id,
            'brand_id' => $this->brand->id,
            'unit_id' => $this->unit->id,
            'cost' => '13.00',
            'price' => '20.00',
            'type' => 'standard',
        ]);

        $updateRes->assertStatus(200)
            ->assertJsonPath('product.name', 'Amoxicillin 500mg Trihydrate');

        $this->assertDatabaseHas('products', [
            'id' => $productId,
            'name' => 'Amoxicillin 500mg Trihydrate',
            'price_cents' => 2000,
        ]);

        // 4. Delete Product
        $deleteRes = $this->actingAs($this->user)->deleteJson('/products/'.$productId);
        $deleteRes->assertStatus(200);

        $this->assertDatabaseMissing('products', [
            'id' => $productId,
        ]);
    }

    public function test_purchase_creation_records_inventory_and_batch(): void
    {
        $product = Product::create([
            'store_id' => $this->store->id,
            'name' => 'Cefixime 200mg',
            'code' => 'CFX-200',
            'category_id' => $this->category->id,
            'brand_id' => $this->brand->id,
            'unit_id' => $this->unit->id,
            'cost_cents' => 2500,
            'price_cents' => 3500,
            'stock_qty' => 0,
            'has_batch' => true,
        ]);

        $purchaseRes = $this->actingAs($this->user)->postJson('/purchase', [
            'warehouse_id' => $this->warehouse->id,
            'supplier_id' => $this->supplier->id,
            'purchased_on' => '2026-10-25',
            'payment_method' => 'Cash',
            'amount_paid' => 250.00,
            'items' => [
                [
                    'product_id' => $product->id,
                    'qty' => 10,
                    'cost' => '25.00',
                    'batch_no' => 'BATCH-2026-A',
                    'expiry_date' => '2028-10-25',
                ],
            ],
        ]);

        $purchaseRes->assertStatus(201);
        $purchaseId = $purchaseRes->json('purchase.id');

        $this->assertDatabaseHas('purchases', [
            'id' => $purchaseId,
            'store_id' => $this->store->id,
            'supplier_id' => $this->supplier->id,
            'grand_cents' => 25000,
            'paid_cents' => 25000,
        ]);

        $this->assertDatabaseHas('product_batches', [
            'store_id' => $this->store->id,
            'product_id' => $product->id,
            'batch_no' => 'BATCH-2026-A',
            'qty' => 10,
        ]);

        $this->assertEquals(10, $product->fresh()->stock_qty);
    }

    public function test_role_and_staff_crud_workflows(): void
    {
        // 1. Create Custom Role
        $roleRes = $this->actingAs($this->user)->postJson('/api/roles', [
            'name' => 'Floor Pharmacist',
            'description' => 'Handles POS and Medicine batches',
            'permissions' => ['pos', 'products.view', 'batches.view'],
        ]);

        $roleRes->assertStatus(201)
            ->assertJsonPath('role.name', 'Floor Pharmacist');

        $roleId = $roleRes->json('role.id');
        $this->assertDatabaseHas('shop_roles', [
            'id' => $roleId,
            'name' => 'Floor Pharmacist',
        ]);

        // 2. Create Staff User
        $staffRes = $this->actingAs($this->user)->postJson('/api/staff', [
            'name' => 'Dr. Rahman',
            'email' => 'rahman@bornopos.test',
            'username' => 'dr_rahman',
            'password' => 'pass1234',
            'role_id' => $roleId,
            'is_active' => true,
        ]);

        $staffRes->assertStatus(201);
        $staffId = $staffRes->json('staff.id');

        $this->assertDatabaseHas('users', [
            'id' => $staffId,
            'username' => 'dr_rahman',
            'role_id' => $roleId,
        ]);

        // 3. Toggle Staff Status
        $toggleRes = $this->actingAs($this->user)->postJson('/api/staff/'.$staffId.'/toggle-status');
        $toggleRes->assertStatus(200);

        $this->assertDatabaseHas('users', [
            'id' => $staffId,
            'is_active' => false,
        ]);

        // 4. Delete Staff
        $deleteStaffRes = $this->actingAs($this->user)->deleteJson('/api/staff/'.$staffId);
        $deleteStaffRes->assertStatus(200);

        $this->assertDatabaseMissing('users', ['id' => $staffId]);

        // 5. Delete Role
        $deleteRoleRes = $this->actingAs($this->user)->deleteJson('/api/roles/'.$roleId);
        $deleteRoleRes->assertStatus(200);

        $this->assertDatabaseMissing('shop_roles', ['id' => $roleId]);
    }

    public function test_general_settings_and_store_branch_creation(): void
    {
        // 1. Update General Settings
        $settingsRes = $this->actingAs($this->user)->postJson('/settings/general-settings', [
            'shop_name' => 'Borno Premium Meds',
            'phone' => '+8801999999999',
            'address' => 'Gulshan Avenue, Dhaka',
            'currency_symbol' => '৳',
            'currency_code' => 'BDT',
            'invoice_footer' => 'Thank you for choosing Borno!',
        ]);

        $settingsRes->assertStatus(200);
        $this->assertDatabaseHas('stores', [
            'id' => $this->store->id,
            'name' => 'Borno Premium Meds',
            'phone' => '+8801999999999',
        ]);

        // 2. Create New Store Branch
        $newBranchRes = $this->actingAs($this->user)->postJson('/stores', [
            'name' => 'Banani Branch Outlet',
            'business_type' => 'pharmacy',
            'phone' => '+8801888888888',
            'email' => 'banani@bornopos.test',
            'address' => 'Road 11, Banani',
        ]);

        $newBranchRes->assertStatus(201);
        $this->assertDatabaseHas('stores', [
            'name' => 'Banani Branch Outlet',
            'business_type' => 'pharmacy',
        ]);
    }

    public function test_accounting_expense_recording_and_ledger_integration(): void
    {
        $account = LedgerAccount::create([
            'store_id' => $this->store->id,
            'name' => 'Daily Petty Cash',
            'type' => 'cash',
            'opening_balance_cents' => 50000,
            'current_balance_cents' => 50000,
            'is_default' => true,
        ]);

        $expCat = ExpenseCategory::create([
            'store_id' => $this->store->id,
            'name' => 'Utility Bills',
        ]);

        $expRes = $this->actingAs($this->user)->postJson('/expense', [
            'expense_category_id' => $expCat->id,
            'account_id' => $account->id,
            'amount' => 150.00,
            'spent_on' => '2026-10-25',
            'note' => 'Internet connectivity fee',
        ]);

        $expRes->assertStatus(201);

        $this->assertDatabaseHas('expenses', [
            'store_id' => $this->store->id,
            'account_id' => $account->id,
            'amount_cents' => 15000,
            'note' => 'Internet connectivity fee',
        ]);

        // Check account balance reduced by 150.00 (15000 cents)
        $this->assertEquals(35000, $account->fresh()->current_balance_cents);
    }
}
