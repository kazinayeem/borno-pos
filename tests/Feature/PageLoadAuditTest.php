<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Payroll;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Sale;
use App\Models\Store;
use App\Models\Supplier;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PageLoadAuditTest extends TestCase
{
    use RefreshDatabase;

    protected Store $store;

    protected User $owner;

    protected User $superAdmin;

    protected Product $product;

    protected Sale $sale;

    protected Purchase $purchase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->store = Store::create([
            'name' => 'Borno Audit Store',
            'business_type' => 'pharmacy',
            'slug' => 'borno-audit-store',
            'currency_symbol' => '৳',
            'currency_code' => 'BDT',
            'is_active' => true,
        ]);

        $this->owner = User::create([
            'name' => 'Audit Owner',
            'email' => 'owner@bornoaudit.test',
            'username' => 'auditowner',
            'password' => 'password',
            'role' => 'owner',
            'store_id' => $this->store->id,
            'is_active' => true,
        ]);

        $this->superAdmin = User::create([
            'name' => 'SaaS Admin',
            'email' => 'admin@bornoaudit.test',
            'username' => 'saasadmin',
            'password' => 'password',
            'role' => 'super_admin',
            'is_active' => true,
        ]);

        $cat = Category::create(['store_id' => $this->store->id, 'name' => 'General Medicine']);
        $brand = Brand::create(['store_id' => $this->store->id, 'name' => 'Square']);
        $unit = Unit::create(['store_id' => $this->store->id, 'name' => 'Pcs', 'short_name' => 'pc']);
        $warehouse = Warehouse::create(['store_id' => $this->store->id, 'name' => 'Central Depot']);
        $supplier = Supplier::create(['store_id' => $this->store->id, 'name' => 'Pharma Supplier', 'phone' => '01711112222']);
        $customer = Customer::create(['store_id' => $this->store->id, 'name' => 'Walk-in Patient', 'phone' => '01811112222']);

        $this->product = Product::create([
            'store_id' => $this->store->id,
            'name' => 'Paracetamol 500mg',
            'code' => 'PARA-500',
            'barcode' => '894000100',
            'cost_cents' => 120,
            'price_cents' => 150,
            'stock_qty' => 500,
            'category_id' => $cat->id,
            'brand_id' => $brand->id,
            'unit_id' => $unit->id,
            'warehouse_id' => $warehouse->id,
            'is_active' => true,
        ]);

        $this->sale = Sale::create([
            'store_id' => $this->store->id,
            'user_id' => $this->owner->id,
            'customer_id' => $customer->id,
            'warehouse_id' => $warehouse->id,
            'invoice_no' => 'INV-AUDIT-001',
            'sold_at' => now(),
            'grand_cents' => 1500,
            'paid_cents' => 1500,
            'status' => 'completed',
            'payment_status' => 'paid',
        ]);

        $this->purchase = Purchase::create([
            'store_id' => $this->store->id,
            'supplier_id' => $supplier->id,
            'warehouse_id' => $warehouse->id,
            'reference' => 'PO-AUDIT-001',
            'purchased_on' => now()->toDateString(),
            'grand_cents' => 12000,
            'paid_cents' => 12000,
            'status' => 'received',
            'payment_status' => 'paid',
        ]);
    }

    /**
     * Audit 1: Public & Guest Pages
     */
    public function test_public_pages_load_successfully(): void
    {
        $this->get('/')->assertOk();
        $this->get('/signin')->assertOk();
    }

    /**
     * Audit 2: Core Dashboard & Analytics Pages
     */
    public function test_dashboard_pages_load_successfully(): void
    {
        // Store dashboard (Owner)
        $this->actingAs($this->owner)->get('/store-dashboard')->assertOk();
        $this->actingAs($this->owner)->getJson('/api/store-dashboard')->assertOk();

        // Platform dashboard (Super Admin)
        $this->actingAs($this->superAdmin)->get('/dashboard')->assertOk();
        $this->actingAs($this->superAdmin)->getJson('/api/dashboard')->assertOk();
    }

    /**
     * Audit 3: Products & Catalog CRUD Pages
     */
    public function test_products_and_catalog_pages_load_successfully(): void
    {
        $this->actingAs($this->owner)->get('/products')->assertOk();
        $this->actingAs($this->owner)->getJson('/products')->assertOk();

        $this->actingAs($this->owner)->get('/products/create')->assertOk();
        $this->actingAs($this->owner)->getJson('/products/create')->assertOk();

        $this->actingAs($this->owner)->get("/products/{$this->product->id}")->assertOk();
        $this->actingAs($this->owner)->getJson("/products/{$this->product->id}")->assertOk();

        $this->actingAs($this->owner)->get("/products/{$this->product->id}/edit")->assertOk();
        $this->actingAs($this->owner)->getJson("/products/{$this->product->id}/edit")->assertOk();

        $this->actingAs($this->owner)->get('/barcode-print')->assertOk();
        $this->actingAs($this->owner)->getJson('/barcode-print')->assertOk();

        // Standard catalog items
        $catalogRoutes = [
            '/categories',
            '/unit',
            '/brand',
            '/warehouse',
            '/tax',
            '/coupons',
            '/departments',
            '/employees',
            '/holidays',
            '/customer',
            '/customer-group',
            '/supplier',
            '/expense-categories',
            '/currency',
        ];

        foreach ($catalogRoutes as $route) {
            $this->actingAs($this->owner)->get($route)->assertOk();
            $this->actingAs($this->owner)->getJson($route)->assertOk();
        }
    }

    /**
     * Audit 4: Sales, POS, Drafts, Detail & Returns Pages
     */
    public function test_sales_pos_and_returns_pages_load_successfully(): void
    {
        $this->actingAs($this->owner)->get('/pos')->assertOk();
        $this->actingAs($this->owner)->getJson('/pos')->assertOk();

        $this->actingAs($this->owner)->get('/sales')->assertOk();
        $this->actingAs($this->owner)->getJson('/sales')->assertOk();

        $this->actingAs($this->owner)->get('/sales/draft')->assertOk();
        $this->actingAs($this->owner)->getJson('/sales/draft')->assertOk();

        $this->actingAs($this->owner)->get("/sales/{$this->sale->id}")->assertOk();
        $this->actingAs($this->owner)->getJson("/sales/{$this->sale->id}")->assertOk();

        $this->actingAs($this->owner)->get('/sale-returns')->assertOk();
        $this->actingAs($this->owner)->getJson('/sale-returns')->assertOk();

        $this->actingAs($this->owner)->get('/report/installments')->assertOk();
        $this->actingAs($this->owner)->getJson('/report/installments')->assertOk();
    }

    /**
     * Audit 5: Purchases, Batches & Detail Pages
     */
    public function test_purchases_and_batches_pages_load_successfully(): void
    {
        $this->actingAs($this->owner)->get('/purchase/list')->assertOk();
        $this->actingAs($this->owner)->getJson('/purchase/list')->assertOk();

        $this->actingAs($this->owner)->get('/purchase/create')->assertOk();
        $this->actingAs($this->owner)->getJson('/purchase/create')->assertOk();

        $this->actingAs($this->owner)->get('/purchase/batch')->assertOk();
        $this->actingAs($this->owner)->getJson('/purchase/batch')->assertOk();

        $this->actingAs($this->owner)->get("/purchase/{$this->purchase->id}")->assertOk();
        $this->actingAs($this->owner)->getJson("/purchase/{$this->purchase->id}")->assertOk();
    }

    /**
     * Audit 6: Inventory & Stock Count Pages
     */
    public function test_inventory_and_stock_count_pages_load_successfully(): void
    {
        $this->actingAs($this->owner)->get('/stock/count')->assertOk();
        $this->actingAs($this->owner)->getJson('/stock/count')->assertOk();
    }

    /**
     * Audit 7: Staff & Role Management Pages
     */
    public function test_staff_and_role_management_pages_load_successfully(): void
    {
        $this->actingAs($this->owner)->get('/staff')->assertOk();
        $this->actingAs($this->owner)->getJson('/api/staff')->assertOk();

        $this->actingAs($this->owner)->get('/role')->assertOk();
        $this->actingAs($this->owner)->getJson('/api/roles')->assertOk();
    }

    /**
     * Audit 8: HRM Attendance & Payroll Pages
     */
    public function test_hrm_pages_load_successfully(): void
    {
        $this->actingAs($this->owner)->get('/attendance')->assertOk();
        $this->actingAs($this->owner)->getJson('/attendance')->assertOk();

        $this->actingAs($this->owner)->get('/payrolls')->assertOk();
        $this->actingAs($this->owner)->getJson('/payrolls')->assertOk();
    }

    /**
     * Audit 9: Accounting Pages (Accounts, Transfers, Balance Sheet, Ledger, Expenses)
     */
    public function test_accounting_pages_load_successfully(): void
    {
        $this->actingAs($this->owner)->get('/accounts')->assertOk();
        $this->actingAs($this->owner)->getJson('/accounts')->assertOk();

        $this->actingAs($this->owner)->get('/money-transfers')->assertOk();
        $this->actingAs($this->owner)->getJson('/money-transfers')->assertOk();

        $this->actingAs($this->owner)->get('/account/balancesheet')->assertOk();
        $this->actingAs($this->owner)->getJson('/account/balancesheet')->assertOk();

        $this->actingAs($this->owner)->get('/account/transactions')->assertOk();
        $this->actingAs($this->owner)->getJson('/account/transactions')->assertOk();

        $this->actingAs($this->owner)->get('/expense')->assertOk();
        $this->actingAs($this->owner)->getJson('/expense')->assertOk();
    }

    /**
     * Audit 10: Reports Center & Specialized Reports
     */
    public function test_reports_pages_load_successfully(): void
    {
        $this->actingAs($this->owner)->get('/reports/center')->assertOk();
        $this->actingAs($this->owner)->getJson('/api/reports/center')->assertOk();

        $this->actingAs($this->owner)->get('/report/summary')->assertOk();
        $this->actingAs($this->owner)->getJson('/report/summary')->assertOk();

        $this->actingAs($this->owner)->get('/report/profit-loss')->assertOk();
        $this->actingAs($this->owner)->getJson('/report/profit-loss')->assertOk();

        $this->actingAs($this->owner)->get('/report/purchases')->assertOk();
        $this->actingAs($this->owner)->getJson('/report/purchases')->assertOk();

        $this->actingAs($this->owner)->get('/report/sales')->assertOk();
        $this->actingAs($this->owner)->getJson('/report/sales')->assertOk();

        $this->actingAs($this->owner)->get('/report/product')->assertOk();
        $this->actingAs($this->owner)->getJson('/report/product')->assertOk();

        $this->actingAs($this->owner)->get('/report/expense')->assertOk();
        $this->actingAs($this->owner)->getJson('/report/expense')->assertOk();
    }

    /**
     * Audit 11: Settings, Stores & Subscription Pages
     */
    public function test_settings_stores_and_subscription_pages_load_successfully(): void
    {
        $this->actingAs($this->owner)->get('/settings/general-settings')->assertOk();
        $this->actingAs($this->owner)->getJson('/settings/general-settings')->assertOk();

        $this->actingAs($this->owner)->get('/settings/business-modules')->assertOk();
        $this->actingAs($this->owner)->getJson('/settings/business-modules')->assertOk();

        $this->actingAs($this->owner)->get('/shop-payment-gateway')->assertOk();
        $this->actingAs($this->owner)->getJson('/shop-payment-gateway')->assertOk();

        $this->actingAs($this->owner)->get('/stores')->assertOk();
        $this->actingAs($this->owner)->getJson('/stores')->assertOk();

        $this->actingAs($this->owner)->get('/stores/create')->assertOk();

        $this->actingAs($this->owner)->get('/subscription-purchase')->assertOk();
        $this->actingAs($this->owner)->getJson('/api/subscription/checkout-info')->assertOk();

        $this->actingAs($this->owner)->get('/subscription/report')->assertOk();
        $this->actingAs($this->owner)->getJson('/subscription/report')->assertOk();
    }

    /**
     * Audit 12: Super Admin SaaS Management Pages
     */
    public function test_super_admin_saas_pages_load_successfully(): void
    {
        $this->actingAs($this->superAdmin)->get('/subscription-plans')->assertOk();
        $this->actingAs($this->superAdmin)->getJson('/api/admin/plans')->assertOk();

        $this->actingAs($this->superAdmin)->get('/payment-verifications')->assertOk();
        $this->actingAs($this->superAdmin)->getJson('/api/admin/subscription-payments')->assertOk();

        $this->actingAs($this->superAdmin)->get('/subscription-invoices')->assertOk();
        $this->actingAs($this->superAdmin)->getJson('/api/admin/subscription-invoices')->assertOk();

        $this->actingAs($this->superAdmin)->getJson('/api/admin/shops')->assertOk();
        $this->actingAs($this->superAdmin)->getJson('/api/admin/payment-settings')->assertOk();
    }

    /**
     * Audit 13: Profile, Tour Center & Global Search
     */
    public function test_profile_tour_and_global_search_load_successfully(): void
    {
        $this->actingAs($this->owner)->get('/user/profile')->assertOk();
        $this->actingAs($this->owner)->get('/tour')->assertOk();

        $this->actingAs($this->owner)->getJson('/api/search?q=Paracetamol')->assertOk();
        $this->actingAs($this->superAdmin)->getJson('/api/search?q=Audit')->assertOk();
    }
}
