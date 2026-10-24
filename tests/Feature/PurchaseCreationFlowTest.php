<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\Store;
use App\Models\Supplier;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PurchaseCreationFlowTest extends TestCase
{
    use RefreshDatabase;

    private function createShopWithData(): array
    {
        $store = Store::create([
            'name' => 'Borno Health Pharmacy',
            'slug' => 'borno-health',
            'business_type' => 'pharmacy',
            'currency_symbol' => '৳',
            'currency_code' => 'BDT',
        ]);

        $owner = User::create([
            'name' => 'Owner Nayeem',
            'email' => 'nayeem@borno.test',
            'username' => 'nayeem',
            'password' => 'secret123',
            'role' => 'owner',
            'store_id' => $store->id,
        ]);
        $store->update(['owner_id' => $owner->id]);

        $warehouse = Warehouse::create([
            'store_id' => $store->id,
            'name' => 'Central Medicine Depot',
        ]);

        $supplier = Supplier::create([
            'store_id' => $store->id,
            'name' => 'Square Pharmaceuticals Ltd',
            'company' => 'Square Group',
            'phone' => '01711223344',
            'email' => 'supply@square.test',
        ]);

        Account::create([
            'store_id' => $store->id,
            'name' => 'Cash in Hand',
            'number' => 'ACC-001',
            'balance_cents' => 1000000,
        ]);

        $cat = Category::create(['store_id' => $store->id, 'name' => 'Antibiotics', 'slug' => 'antibiotics']);
        $brand = Brand::create(['store_id' => $store->id, 'name' => 'Square', 'slug' => 'square']);
        $unit = Unit::create(['store_id' => $store->id, 'name' => 'Strip', 'short_name' => 'strip']);

        $product1 = Product::create([
            'store_id' => $store->id,
            'name' => 'Napa Extra 500mg+65mg',
            'slug' => 'napa-extra',
            'code' => 'MED-NAPA',
            'barcode' => '89411002233',
            'generic_name' => 'Paracetamol + Caffeine',
            'strength' => '500mg+65mg',
            'dosage_form' => 'Tablet',
            'cost_cents' => 250,
            'price_cents' => 350,
            'stock_qty' => 50,
            'category_id' => $cat->id,
            'brand_id' => $brand->id,
            'unit_id' => $unit->id,
            'warehouse_id' => $warehouse->id,
            'has_batch' => true,
            'is_active' => true,
        ]);

        $product2 = Product::create([
            'store_id' => $store->id,
            'name' => 'Seclo 20mg Capsule',
            'slug' => 'seclo-20',
            'code' => 'MED-SECLO',
            'barcode' => '89411998877',
            'generic_name' => 'Omeprazole',
            'strength' => '20mg',
            'dosage_form' => 'Capsule',
            'cost_cents' => 450,
            'price_cents' => 600,
            'stock_qty' => 100,
            'category_id' => $cat->id,
            'brand_id' => $brand->id,
            'unit_id' => $unit->id,
            'warehouse_id' => $warehouse->id,
            'has_batch' => true,
            'is_active' => true,
        ]);

        return [$store, $owner, $warehouse, $supplier, $product1, $product2];
    }

    public function test_purchase_create_endpoint_delivers_enriched_form_data(): void
    {
        [$store, $owner, $warehouse, $supplier, $product1] = $this->createShopWithData();

        $response = $this->actingAs($owner)->getJson('/purchase/create');

        $response->assertOk()
            ->assertJsonStructure([
                'warehouses',
                'suppliers',
                'products',
                'payment_methods',
                'suggested_reference',
            ])
            ->assertJsonPath('warehouses.0.name', 'Central Medicine Depot')
            ->assertJsonPath('suppliers.0.name', 'Square Pharmaceuticals Ltd')
            ->assertJsonPath('products.0.name', 'Napa Extra 500mg+65mg')
            ->assertJsonPath('products.0.generic_name', 'Paracetamol + Caffeine')
            ->assertJsonPath('products.0.barcode', '89411002233');
    }

    public function test_purchase_create_supports_live_search_query(): void
    {
        [$store, $owner, $warehouse, $supplier, $product1, $product2] = $this->createShopWithData();

        // Search by generic name
        $searchGeneric = $this->actingAs($owner)->getJson('/purchase/create?q=Omeprazole');
        $searchGeneric->assertOk();
        $this->assertCount(1, $searchGeneric->json('products'));
        $this->assertSame('Seclo 20mg Capsule', $searchGeneric->json('products.0.name'));

        // Search by barcode
        $searchBarcode = $this->actingAs($owner)->getJson('/purchase/create?q=89411002233');
        $searchBarcode->assertOk();
        $this->assertCount(1, $searchBarcode->json('products'));
        $this->assertSame('Napa Extra 500mg+65mg', $searchBarcode->json('products.0.name'));
    }

    public function test_purchase_store_records_purchase_with_batch_and_stock_inflow(): void
    {
        [$store, $owner, $warehouse, $supplier, $product1, $product2] = $this->createShopWithData();

        $initialStock = $product1->fresh()->stock_qty;

        $response = $this->actingAs($owner)->postJson('/purchase', [
            'reference' => 'PO-INV-SQUARE-9021',
            'warehouse_id' => $warehouse->id,
            'supplier_id' => $supplier->id,
            'purchased_on' => now()->toDateString(),
            'payment_method' => 'Bank Transfer',
            'tax' => '20',
            'discount' => '10',
            'shipping' => '15',
            'amount_paid' => '100',
            'note' => 'Delivery via chilled truck',
            'items' => [
                [
                    'product_id' => $product1->id,
                    'qty' => 50,
                    'cost' => '2.50',
                    'batch_no' => 'BAT-NAPA-2026',
                    'expiry_date' => now()->addYear()->toDateString(),
                ],
            ],
        ]);

        $response->assertOk()
            ->assertJsonPath('message', 'Purchase saved and stock updated.');

        $this->assertDatabaseHas('purchases', [
            'store_id' => $store->id,
            'reference' => 'PO-INV-SQUARE-9021',
            'warehouse_id' => $warehouse->id,
            'supplier_id' => $supplier->id,
            'payment_method' => 'Bank Transfer',
        ]);

        $this->assertSame($initialStock + 50, $product1->fresh()->stock_qty);
    }

    public function test_quick_supplier_creation_can_be_used_in_purchase(): void
    {
        [$store, $owner, $warehouse, $supplier, $product1] = $this->createShopWithData();

        $supplierRes = $this->actingAs($owner)->postJson('/supplier', [
            'name' => 'Beximco Pharma Ltd',
            'company' => 'Beximco Group',
            'phone' => '01899887766',
            'email' => 'contact@beximco.test',
            'address' => 'Tejgaon, Dhaka',
        ]);

        $supplierRes->assertOk();
        $newSupplierId = $supplierRes->json('row.id');
        $this->assertNotNull($newSupplierId);

        $purchaseRes = $this->actingAs($owner)->postJson('/purchase', [
            'warehouse_id' => $warehouse->id,
            'supplier_id' => $newSupplierId,
            'purchased_on' => now()->toDateString(),
            'payment_method' => 'Cash',
            'amount_paid' => '50',
            'items' => [
                [
                    'product_id' => $product1->id,
                    'qty' => 20,
                    'cost' => '2.50',
                    'batch_no' => 'BEX-BAT-1',
                    'expiry_date' => now()->addMonths(6)->toDateString(),
                ],
            ],
        ]);

        $purchaseRes->assertOk();
        $this->assertDatabaseHas('purchases', [
            'store_id' => $store->id,
            'supplier_id' => $newSupplierId,
        ]);
    }
}
