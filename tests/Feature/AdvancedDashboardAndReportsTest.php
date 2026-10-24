<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\ShopRole;
use App\Models\Store;
use App\Models\Supplier;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\RbacService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdvancedDashboardAndReportsTest extends TestCase
{
    use RefreshDatabase;

    private function createStoreWithStaffAndData(): array
    {
        $store = Store::create([
            'name' => 'Metro Super Pharmacy',
            'slug' => 'metro-pharmacy',
            'business_type' => 'pharmacy',
            'currency_symbol' => '৳',
            'currency_code' => 'BDT',
        ]);

        $owner = User::create([
            'name' => 'Store Owner',
            'email' => 'owner@metro.test',
            'username' => 'metro_owner',
            'password' => 'password123',
            'role' => 'owner',
            'store_id' => $store->id,
            'is_active' => true,
        ]);
        $store->update(['owner_id' => $owner->id]);

        $warehouse = Warehouse::create([
            'store_id' => $store->id,
            'name' => 'Main Warehouse',
        ]);

        $brand = Brand::create(['store_id' => $store->id, 'name' => 'Square Pharma']);
        $category = Category::create(['store_id' => $store->id, 'name' => 'Antibiotics']);
        $unit = Unit::create(['store_id' => $store->id, 'name' => 'Box', 'short_name' => 'box', 'code' => 'box']);

        app(RbacService::class)->seedDefaultRoles($store);
        $sellerRole = ShopRole::where('store_id', $store->id)->where('name', 'Seller')->first();

        // Staff 1
        $seller1 = User::create([
            'name' => 'Alice Seller',
            'email' => 'alice@metro.test',
            'username' => 'alice_seller',
            'password' => 'password123',
            'role' => 'seller',
            'role_id' => $sellerRole->id,
            'store_id' => $store->id,
            'is_active' => true,
        ]);

        // Staff 2
        $seller2 = User::create([
            'name' => 'Bob Seller',
            'email' => 'bob@metro.test',
            'username' => 'bob_seller',
            'password' => 'password123',
            'role' => 'seller',
            'role_id' => $sellerRole->id,
            'store_id' => $store->id,
            'is_active' => true,
        ]);

        $customer = Customer::create([
            'store_id' => $store->id,
            'name' => 'Kamal Hossain',
            'phone' => '01811223344',
            'email' => 'kamal@customer.test',
        ]);

        $supplier = Supplier::create([
            'store_id' => $store->id,
            'name' => 'Square Distribution',
            'phone' => '01911998877',
            'email' => 'dist@square.test',
        ]);

        $product = Product::create([
            'store_id' => $store->id,
            'brand_id' => $brand->id,
            'category_id' => $category->id,
            'unit_id' => $unit->id,
            'warehouse_id' => $warehouse->id,
            'name' => 'Moxacil 500mg Capsule',
            'code' => 'MOX500',
            'barcode' => '8941122334455',
            'sku' => 'MOX-CAP-500',
            'type' => 'standard',
            'stock_qty' => 50,
            'alert_qty' => 10,
            'price_cents' => 1500, // 15.00
            'cost_cents' => 1000,  // 10.00
        ]);

        // Sale by Alice (100.00 BDT)
        $sale1 = Sale::create([
            'store_id' => $store->id,
            'user_id' => $seller1->id,
            'customer_id' => $customer->id,
            'warehouse_id' => $warehouse->id,
            'invoice_no' => 'INV-2026-0001',
            'sold_at' => now(),
            'status' => 'completed',
            'subtotal_cents' => 10000,
            'tax_cents' => 0,
            'discount_cents' => 500,
            'grand_cents' => 9500,
            'paid_cents' => 9500,
            'payment_method' => 'cash',
            'idempotency_key' => 'tx-1',
        ]);
        SaleItem::create([
            'sale_id' => $sale1->id,
            'product_id' => $product->id,
            'qty' => 5,
            'price_cents' => 1500,
            'cost_cents' => 1000,
            'subtotal_cents' => 7500,
        ]);

        // Sale by Bob (200.00 BDT)
        $sale2 = Sale::create([
            'store_id' => $store->id,
            'user_id' => $seller2->id,
            'customer_id' => $customer->id,
            'warehouse_id' => $warehouse->id,
            'invoice_no' => 'INV-2026-0002',
            'sold_at' => now(),
            'status' => 'completed',
            'subtotal_cents' => 20000,
            'tax_cents' => 0,
            'discount_cents' => 0,
            'grand_cents' => 20000,
            'paid_cents' => 15000, // 50.00 due
            'payment_method' => 'card',
            'idempotency_key' => 'tx-2',
        ]);
        SaleItem::create([
            'sale_id' => $sale2->id,
            'product_id' => $product->id,
            'qty' => 10,
            'price_cents' => 1500,
            'cost_cents' => 1000,
            'subtotal_cents' => 15000,
        ]);

        // Purchase by Store
        $purchase = Purchase::create([
            'store_id' => $store->id,
            'user_id' => $owner->id,
            'supplier_id' => $supplier->id,
            'warehouse_id' => $warehouse->id,
            'reference' => 'PO-2026-0001',
            'purchased_on' => now()->toDateString(),
            'status' => 'received',
            'grand_cents' => 50000,
            'paid_cents' => 30000,
            'payment_method' => 'bank',
        ]);

        return [$store, $owner, $seller1, $seller2, $product, $customer, $supplier];
    }

    public function test_owner_can_view_aggregated_dashboard_and_inspect_individual_staff_sales(): void
    {
        [$store, $owner, $seller1, $seller2, $product] = $this->createStoreWithStaffAndData();

        // 1. All Staff aggregated view: Total sales = 95.00 + 200.00 = 295.00 (29500 cents)
        $resAll = $this->actingAs($owner)->getJson('/api/store-dashboard');
        $resAll->assertOk()
            ->assertJsonPath('kpis.total_sales', 29500)
            ->assertJsonPath('can_view_all_staff', true);

        // Verify staff performance list has both Alice and Bob
        $staffPerf = collect($resAll->json('staff_performance'));
        $alicePerf = $staffPerf->firstWhere('id', $seller1->id);
        $bobPerf = $staffPerf->firstWhere('id', $seller2->id);

        $this->assertEquals(9500, $alicePerf['total_sales_cents']);
        $this->assertEquals(1, $alicePerf['tx_count']);
        $this->assertEquals(20000, $bobPerf['total_sales_cents']);
        $this->assertEquals(1, $bobPerf['tx_count']);

        // 2. Filter by Alice: Only Alice's sales (9500 cents)
        $resAlice = $this->actingAs($owner)->getJson("/api/store-dashboard?staff_id={$seller1->id}");
        $resAlice->assertOk()
            ->assertJsonPath('kpis.total_sales', 9500)
            ->assertJsonPath('selected_staff_summary.user.id', $seller1->id)
            ->assertJsonPath('selected_staff_summary.total_sales_cents', 9500)
            ->assertJsonPath('selected_staff_summary.tx_count', 1);

        // 3. Filter by Bob: Only Bob's sales (20000 cents)
        $resBob = $this->actingAs($owner)->getJson("/api/store-dashboard?staff_id={$seller2->id}");
        $resBob->assertOk()
            ->assertJsonPath('kpis.total_sales', 20000)
            ->assertJsonPath('selected_staff_summary.user.id', $seller2->id)
            ->assertJsonPath('selected_staff_summary.total_sales_cents', 20000);
    }

    public function test_dashboard_filters_by_payment_method_and_date_ranges(): void
    {
        [$store, $owner, $seller1, $seller2] = $this->createStoreWithStaffAndData();

        // Filter by cash only (Alice's sale = 9500 cents)
        $cashRes = $this->actingAs($owner)->getJson('/api/store-dashboard?payment_method=cash');
        $cashRes->assertOk()
            ->assertJsonPath('kpis.total_sales', 9500);

        // Filter by card only (Bob's sale = 20000 cents)
        $cardRes = $this->actingAs($owner)->getJson('/api/store-dashboard?payment_method=card');
        $cardRes->assertOk()
            ->assertJsonPath('kpis.total_sales', 20000);

        // Filter by preset 'today'
        $todayRes = $this->actingAs($owner)->getJson('/api/store-dashboard?type=today');
        $todayRes->assertOk()
            ->assertJsonPath('kpis.total_sales', 29500);
    }

    public function test_restricted_seller_only_sees_their_own_sales_on_dashboard(): void
    {
        [$store, $owner, $seller1, $seller2] = $this->createStoreWithStaffAndData();

        // Alice logs in: she should only see her own sales (9500 cents), NOT Bob's sales
        $resAlice = $this->actingAs($seller1)->getJson('/api/store-dashboard');
        $resAlice->assertOk()
            ->assertJsonPath('can_view_all_staff', false)
            ->assertJsonPath('kpis.total_sales', 9500);

        // Even if Alice requests staff_id=Bob, backend forces it to Alice's id!
        $resAttempt = $this->actingAs($seller1)->getJson("/api/store-dashboard?staff_id={$seller2->id}");
        $resAttempt->assertOk()
            ->assertJsonPath('kpis.total_sales', 9500);
    }

    public function test_global_search_finds_products_invoices_customers_and_reports(): void
    {
        [$store, $owner, $seller1, $seller2, $product, $customer] = $this->createStoreWithStaffAndData();

        // 1. Search for product by name / SKU
        $searchProduct = $this->actingAs($owner)->getJson('/api/search?q=Moxacil');
        $searchProduct->assertOk()
            ->assertJsonPath('results.0.type', 'products')
            ->assertJsonPath('results.0.title', 'Moxacil 500mg Capsule');

        // 2. Search by barcode
        $searchBarcode = $this->actingAs($owner)->getJson('/api/search?q=8941122334455');
        $searchBarcode->assertOk()
            ->assertJsonPath('results.0.title', 'Moxacil 500mg Capsule');

        // 3. Search for invoice
        $searchInvoice = $this->actingAs($owner)->getJson('/api/search?q=INV-2026-0001');
        $searchInvoice->assertOk()
            ->assertJsonPath('results.0.type', 'sales')
            ->assertJsonPath('results.0.title', 'Invoice #INV-2026-0001');

        // 4. Search for customer
        $searchCustomer = $this->actingAs($owner)->getJson('/api/search?q=Kamal&type=customers');
        $searchCustomer->assertOk()
            ->assertJsonPath('results.0.type', 'customers')
            ->assertJsonPath('results.0.title', 'Kamal Hossain');

        // 5. Search for reports
        $searchReport = $this->actingAs($owner)->getJson('/api/search?q=Profit');
        $searchReport->assertOk()
            ->assertJsonPath('results.0.type', 'reports')
            ->assertJsonPath('results.0.title', 'Profit & Loss Statement');
    }

    public function test_reports_center_delivers_all_five_categories_and_exports_csv(): void
    {
        [$store, $owner, $seller1, $seller2] = $this->createStoreWithStaffAndData();

        // 1. Sales Report Tab
        $salesRes = $this->actingAs($owner)->getJson('/api/reports/center?tab=sales');
        $salesRes->assertOk()
            ->assertJsonPath('data.summary.total_revenue_cents', 29500);

        // 2. Inventory Report Tab
        $invRes = $this->actingAs($owner)->getJson('/api/reports/center?tab=inventory');
        $invRes->assertOk()
            ->assertJsonStructure(['data' => ['summary', 'low_stock_items', 'out_of_stock_items']]);

        // 3. Financial Report Tab (Income statement & COGS)
        $finRes = $this->actingAs($owner)->getJson('/api/reports/center?tab=financial');
        $finRes->assertOk()
            ->assertJsonPath('data.income_statement.gross_sales_cents', 29500)
            ->assertJsonStructure(['data' => ['income_statement', 'balance_summary']]);

        // 4. Staff Report Tab
        $staffRes = $this->actingAs($owner)->getJson('/api/reports/center?tab=staff');
        $staffRes->assertOk()
            ->assertJsonStructure(['data' => ['staff_members', 'recent_audits']]);

        // 5. Customer & Supplier Report Tab
        $partiesRes = $this->actingAs($owner)->getJson('/api/reports/center?tab=parties');
        $partiesRes->assertOk()
            ->assertJsonStructure(['data' => ['customers', 'suppliers']]);

        // 6. CSV Export
        $exportRes = $this->actingAs($owner)->get('/api/reports/export?tab=sales');
        $exportRes->assertOk()
            ->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
        $this->assertStringContainsString('INV-2026-0001', $exportRes->streamedContent());
    }
}
