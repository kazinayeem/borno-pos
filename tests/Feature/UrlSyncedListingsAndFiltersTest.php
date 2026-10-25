<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Sale;
use App\Models\Store;
use App\Models\Supplier;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UrlSyncedListingsAndFiltersTest extends TestCase
{
    use RefreshDatabase;

    protected Store $store;

    protected User $owner;

    protected Warehouse $warehouse;

    protected Supplier $supplier;

    protected Customer $customer;

    protected Category $category;

    protected Brand $brand;

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

        $this->warehouse = Warehouse::create([
            'store_id' => $this->store->id,
            'name' => 'Main Warehouse',
        ]);

        $this->supplier = Supplier::create([
            'store_id' => $this->store->id,
            'name' => 'Square Pharmaceuticals',
            'phone' => '01700000001',
        ]);

        $this->customer = Customer::create([
            'store_id' => $this->store->id,
            'name' => 'Dr. Rahman',
            'phone' => '01800000002',
        ]);

        $this->category = Category::create([
            'store_id' => $this->store->id,
            'name' => 'Antibiotics',
        ]);

        $this->brand = Brand::create([
            'store_id' => $this->store->id,
            'name' => 'Square',
        ]);
    }

    public function test_purchases_endpoint_supports_url_search_sorting_and_pagination(): void
    {
        $today = now()->toDateString();

        Purchase::create([
            'store_id' => $this->store->id,
            'supplier_id' => $this->supplier->id,
            'warehouse_id' => $this->warehouse->id,
            'reference' => 'PO-ALPHA-001',
            'purchased_on' => $today,
            'grand_cents' => 15000,
            'paid_cents' => 15000,
            'status' => 'received',
            'payment_status' => 'paid',
        ]);

        Purchase::create([
            'store_id' => $this->store->id,
            'supplier_id' => $this->supplier->id,
            'warehouse_id' => $this->warehouse->id,
            'reference' => 'PO-BETA-002',
            'purchased_on' => $today,
            'grand_cents' => 25000,
            'paid_cents' => 10000,
            'status' => 'pending',
            'payment_status' => 'partial',
        ]);

        // Search test
        $response = $this->actingAs($this->owner)
            ->getJson('/purchase/list?search=ALPHA&per_page=10');

        $response->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.reference', 'PO-ALPHA-001');

        // Status filter test
        $responseStatus = $this->actingAs($this->owner)
            ->getJson('/purchase/list?status=pending');

        $responseStatus->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.reference', 'PO-BETA-002');

        // Payment status filter test
        $responsePayment = $this->actingAs($this->owner)
            ->getJson('/purchase/list?payment_status=partial');

        $responsePayment->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.reference', 'PO-BETA-002');

        // Sorting test
        $responseSort = $this->actingAs($this->owner)
            ->getJson('/purchase/list?sort_by=grand_cents&sort_dir=asc');

        $responseSort->assertOk()
            ->assertJsonPath('data.0.reference', 'PO-ALPHA-001')
            ->assertJsonPath('data.1.reference', 'PO-BETA-002');
    }

    public function test_products_endpoint_supports_search_sorting_and_pagination(): void
    {
        Product::create([
            'store_id' => $this->store->id,
            'name' => 'Napa Extra 500mg',
            'code' => 'NAPA-EX',
            'barcode' => '8940001',
            'cost_cents' => 200,
            'price_cents' => 250,
            'stock_qty' => 50,
            'category_id' => $this->category->id,
            'brand_id' => $this->brand->id,
            'is_active' => true,
        ]);

        Product::create([
            'store_id' => $this->store->id,
            'name' => 'Ace Plus 500mg',
            'code' => 'ACE-PL',
            'barcode' => '8940002',
            'cost_cents' => 180,
            'price_cents' => 240,
            'stock_qty' => 10,
            'category_id' => $this->category->id,
            'brand_id' => $this->brand->id,
            'is_active' => true,
        ]);

        // Search by keyword
        $response = $this->actingAs($this->owner)
            ->getJson('/products?search=Napa&per_page=10');

        $response->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.name', 'Napa Extra 500mg');

        // Sorting by price
        $responseSort = $this->actingAs($this->owner)
            ->getJson('/products?sort_by=price_cents&sort_dir=asc');

        $responseSort->assertOk()
            ->assertJsonPath('data.0.name', 'Ace Plus 500mg')
            ->assertJsonPath('data.1.name', 'Napa Extra 500mg');
    }

    public function test_catalog_categories_supports_search_and_pagination(): void
    {
        Category::create(['store_id' => $this->store->id, 'name' => 'Cardiology']);
        Category::create(['store_id' => $this->store->id, 'name' => 'Dermatology']);

        $response = $this->actingAs($this->owner)
            ->getJson('/categories?search=Cardio&per_page=5');

        $response->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.name', 'Cardiology')
            ->assertJsonPath('meta.per_page', 5);
    }

    public function test_sales_listing_supports_search_and_pagination(): void
    {
        Sale::create([
            'store_id' => $this->store->id,
            'user_id' => $this->owner->id,
            'customer_id' => $this->customer->id,
            'warehouse_id' => $this->warehouse->id,
            'invoice_no' => 'INV-2026-9001',
            'sold_at' => now(),
            'grand_cents' => 5000,
            'paid_cents' => 5000,
            'status' => 'completed',
            'payment_status' => 'paid',
        ]);

        $response = $this->actingAs($this->owner)
            ->getJson('/sales?search=9001&per_page=10');

        $response->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.invoice_no', 'INV-2026-9001');
    }

    public function test_reports_endpoints_support_url_sync_and_meta(): void
    {
        $response = $this->actingAs($this->owner)
            ->getJson('/report/product?search=Ace&per_page=10');

        $response->assertOk()
            ->assertJsonStructure([
                'products',
                'meta' => ['current_page', 'last_page', 'total', 'per_page'],
                'total_valuation_cents',
            ]);
    }

    public function test_expenses_endpoint_with_account_and_category_relationships(): void
    {
        $account = Account::create([
            'store_id' => $this->store->id,
            'name' => 'Petty Cash',
            'opening_cents' => 100000,
        ]);

        $expCat = ExpenseCategory::create([
            'store_id' => $this->store->id,
            'name' => 'Utility Bills',
        ]);

        Expense::create([
            'store_id' => $this->store->id,
            'expense_category_id' => $expCat->id,
            'account_id' => $account->id,
            'spent_on' => now()->toDateString(),
            'amount_cents' => 4500,
            'note' => 'Electricity bill',
        ]);

        $response = $this->actingAs($this->owner)
            ->getJson('/expense?search=Electricity&per_page=10');

        $response->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('expenses.0.note', 'Electricity bill')
            ->assertJsonPath('expenses.0.category', 'Utility Bills')
            ->assertJsonPath('expenses.0.account', 'Petty Cash');
    }
}
