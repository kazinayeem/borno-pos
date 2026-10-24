<?php

namespace Database\Seeders;

use App\Models\Batch;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Sale;
use App\Models\Store;
use App\Models\Supplier;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\CheckoutService;
use App\Services\InstallmentService;
use App\Services\InventoryService;
use App\Services\PurchaseService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Auth;

class TrackingExampleSeeder extends Seeder
{
    public function run(): void
    {
        if (app()->environment('production')) {
            return;
        }

        foreach (Store::query()->get() as $store) {
            $owner = User::query()->where('store_id', $store->id)->where('role', 'owner')->first();
            $warehouse = Warehouse::query()->where('store_id', $store->id)->first();
            $category = Category::query()->where('store_id', $store->id)->first();
            $brand = Brand::query()->where('store_id', $store->id)->first();
            $unit = Unit::query()->where('store_id', $store->id)->first();
            $supplier = Supplier::query()->where('store_id', $store->id)->first();
            if (! $owner || ! $warehouse || ! $category || ! $brand || ! $unit || ! $supplier) {
                continue;
            }
            Auth::login($owner);
            $type = $store->business_type;
            if ($type === 'pharmacy' || $type === 'all_in_one') {
                $this->pharmacy($store, $owner, $warehouse, $category, $brand, $unit, $supplier);
            }
            if ($type === 'electronics' || $type === 'all_in_one') {
                $this->electronics($store, $owner, $warehouse, $category, $brand, $unit, $supplier);
            }
            if ($type === 'grocery' || $type === 'all_in_one') {
                $this->grocery($store, $owner, $warehouse, $category, $brand, $unit, $supplier);
            }
            if ($type === 'restaurant' || $type === 'all_in_one') {
                $this->restaurant($store, $owner, $warehouse, $category, $brand, $unit, $supplier);
            }
            if ($type === 'all_in_one') {
                $this->fashion($store, $owner, $warehouse, $category, $brand, $unit);
            }
            Auth::logout();
        }
    }

    private function base(Store $store, Category $category, Brand $brand, Unit $unit, Warehouse $warehouse, Supplier $supplier): array
    {
        return [
            'store_id' => $store->id,
            'category_id' => $category->id,
            'brand_id' => $brand->id,
            'unit_id' => $unit->id,
            'warehouse_id' => $warehouse->id,
            'supplier_id' => $supplier->id,
            'cost_cents' => 500,
            'price_cents' => 900,
            'alert_qty' => 2,
            'featured_in_pos' => true,
            'is_active' => true,
        ];
    }

    private function pharmacy(Store $store, User $owner, Warehouse $warehouse, Category $category, Brand $brand, Unit $unit, Supplier $supplier): void
    {
        $product = Product::query()->firstOrCreate(['code' => 'DEMO-RX'], array_merge($this->base($store, $category, $brand, $unit, $warehouse, $supplier), [
            'name' => 'Demo Amoxicillin 500mg',
            'type' => 'standard',
            'has_batch' => true,
            'near_expiry_days' => 30,
            'details' => [
                'generic_name' => 'Amoxicillin',
                'strength' => '500mg',
                'dosage_form' => 'Capsule',
                'manufacturer' => 'Demo Labs',
                'prescription_required' => true,
            ],
        ]));
        $reference = 'DEMO-RX-'.$store->id;
        if (! Purchase::query()->where('reference', $reference)->exists()) {
            app(PurchaseService::class)->receive($owner, [
                'warehouse_id' => $warehouse->id,
                'supplier_id' => $supplier->id,
                'purchased_on' => now()->toDateString(),
                'reference' => $reference,
                'payment_method' => 'Cash',
                'amount_paid' => '20.00',
            ], [[
                'product_id' => $product->id,
                'qty' => 4,
                'cost' => '5.00',
                'batch_no' => 'RX-'.$store->id.'-A',
                'manufactured_on' => now()->subMonths(2)->toDateString(),
                'expiry_date' => now()->addDays(20)->toDateString(),
            ]]);
        }
        if (! Batch::query()->where('product_id', $product->id)->where('batch_no', 'RX-'.$store->id.'-OLD')->exists()) {
            Batch::query()->create([
                'store_id' => $store->id,
                'product_id' => $product->id,
                'batch_no' => 'RX-'.$store->id.'-OLD',
                'manufactured_on' => now()->subYear()->toDateString(),
                'expiry_date' => now()->subDays(3)->toDateString(),
                'qty' => 2,
                'cost_cents' => 500,
            ]);
            app(InventoryService::class)->move($product->fresh(), 2, 'opening', $product, $owner);
        }
    }

    private function electronics(Store $store, User $owner, Warehouse $warehouse, Category $category, Brand $brand, Unit $unit, Supplier $supplier): void
    {
        $product = Product::query()->firstOrCreate(['code' => 'DEMO-IMEI'], array_merge($this->base($store, $category, $brand, $unit, $warehouse, $supplier), [
            'name' => 'Demo Handset',
            'type' => 'standard',
            'has_serial' => true,
            'price_cents' => 25000,
            'cost_cents' => 18000,
            'details' => ['model' => 'Demo X', 'warranty_months' => 12, 'storage' => '128GB', 'ram' => '8GB'],
        ]));
        $reference = 'DEMO-IMEI-'.$store->id;
        $serial = 'DEMO-SN-'.$store->id;
        if (! Purchase::query()->where('reference', $reference)->exists()) {
            app(PurchaseService::class)->receive($owner, [
                'warehouse_id' => $warehouse->id,
                'supplier_id' => $supplier->id,
                'purchased_on' => now()->toDateString(),
                'reference' => $reference,
                'payment_method' => 'Cash',
                'amount_paid' => '180.00',
            ], [
                [
                    'product_id' => $product->id,
                    'qty' => 1,
                    'cost' => '180.00',
                    'identifier_kind' => 'serial',
                    'serial' => $serial,
                ],
                [
                    'product_id' => $product->id,
                    'qty' => 1,
                    'cost' => '180.00',
                    'identifier_kind' => 'imei',
                    'serial' => '490154203237518',
                ],
            ]);
        }
        $key = 'demo-emi-'.$store->id;
        if (! Sale::query()->where('idempotency_key', $key)->exists()) {
            $customer = Customer::query()->where('store_id', $store->id)->first();
            if (! $customer) {
                return;
            }
            $sale = app(CheckoutService::class)->checkout($owner, [
                'customer_id' => $customer->id,
                'payment_method' => 'Cash',
                'amount_paid' => '50.00',
                'status' => 'completed',
                'idempotency_key' => $key,
            ], [[
                'product_id' => $product->id,
                'qty' => 1,
                'serial' => $serial,
            ]]);
            app(InstallmentService::class)->schedule($sale, [
                'count' => 2,
                'first_due' => now()->addMonth()->toDateString(),
                'fee' => '0',
            ]);
        }
    }

    private function grocery(Store $store, User $owner, Warehouse $warehouse, Category $category, Brand $brand, Unit $unit, Supplier $supplier): void
    {
        $product = Product::query()->firstOrCreate(['code' => 'DEMO-GROC'], array_merge($this->base($store, $category, $brand, $unit, $warehouse, $supplier), [
            'name' => 'Demo Rice 5kg',
            'barcode' => 'GROC'.$store->id,
            'details' => ['pack_size' => '5kg', 'weight' => '5kg', 'wholesale' => '7.00', 'wholesale_cents' => 700],
        ]));
        $reference = 'DEMO-GROC-'.$store->id;
        if (! Purchase::query()->where('reference', $reference)->exists()) {
            app(PurchaseService::class)->receive($owner, [
                'warehouse_id' => $warehouse->id,
                'supplier_id' => $supplier->id,
                'purchased_on' => now()->toDateString(),
                'reference' => $reference,
                'payment_method' => 'Cash',
                'amount_paid' => '15.00',
            ], [[
                'product_id' => $product->id,
                'qty' => 3,
                'cost' => '5.00',
            ]]);
        }
    }

    private function restaurant(Store $store, User $owner, Warehouse $warehouse, Category $category, Brand $brand, Unit $unit, Supplier $supplier): void
    {
        $flour = Product::query()->firstOrCreate(['code' => 'DEMO-FLOUR'], array_merge($this->base($store, $category, $brand, $unit, $warehouse, $supplier), [
            'name' => 'Demo Flour',
            'type' => 'ingredient',
            'price_cents' => 200,
        ]));
        $bread = Product::query()->firstOrCreate(['code' => 'DEMO-BREAD'], array_merge($this->base($store, $category, $brand, $unit, $warehouse, $supplier), [
            'name' => 'Demo Bread',
            'type' => 'combo',
            'price_cents' => 400,
        ]));
        $bread->ingredients()->firstOrCreate(
            ['ingredient_id' => $flour->id],
            ['qty' => 2],
        );
        $reference = 'DEMO-FLOUR-'.$store->id;
        if (! Purchase::query()->where('reference', $reference)->exists()) {
            app(PurchaseService::class)->receive($owner, [
                'warehouse_id' => $warehouse->id,
                'supplier_id' => $supplier->id,
                'purchased_on' => now()->toDateString(),
                'reference' => $reference,
                'payment_method' => 'Cash',
                'amount_paid' => '10.00',
            ], [[
                'product_id' => $flour->id,
                'qty' => 10,
                'cost' => '1.00',
            ]]);
        }
        $key = 'demo-bread-'.$store->id;
        if (! Sale::query()->where('idempotency_key', $key)->exists()) {
            app(CheckoutService::class)->checkout($owner, [
                'payment_method' => 'Cash',
                'amount_paid' => '4.00',
                'status' => 'completed',
                'idempotency_key' => $key,
            ], [[
                'product_id' => $bread->id,
                'qty' => 1,
            ]]);
        }
    }

    private function fashion(Store $store, User $owner, Warehouse $warehouse, Category $category, Brand $brand, Unit $unit): void
    {
        if (Product::query()->where('code', 'DEMO-SIZE')->exists()) {
            return;
        }
        $product = Product::query()->create([
            'store_id' => $store->id,
            'category_id' => $category->id,
            'brand_id' => $brand->id,
            'unit_id' => $unit->id,
            'warehouse_id' => $warehouse->id,
            'name' => 'Demo Shirt',
            'code' => 'DEMO-SIZE',
            'type' => 'standard',
            'has_variant' => true,
            'cost_cents' => 800,
            'price_cents' => 1500,
            'alert_qty' => 1,
            'featured_in_pos' => true,
            'details' => ['style' => 'Oxford'],
        ]);
        $product->variants()->create([
            'store_id' => $store->id,
            'name' => 'Small / Blue',
            'sku' => 'DEMO-SIZE-S',
            'barcode' => 'SIZE-S-'.$store->id,
            'price_cents' => 1500,
            'stock_qty' => 2,
            'attributes' => ['size' => 'S', 'color' => 'Blue', 'style' => 'Oxford'],
        ]);
        $product->variants()->create([
            'store_id' => $store->id,
            'name' => 'Medium / Blue',
            'sku' => 'DEMO-SIZE-M',
            'barcode' => 'SIZE-M-'.$store->id,
            'price_cents' => 1600,
            'stock_qty' => 3,
            'attributes' => ['size' => 'M', 'color' => 'Blue', 'style' => 'Oxford'],
        ]);
        app(InventoryService::class)->move($product, 5, 'opening', $product, $owner);
    }
}
