<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Batch;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Installment;
use App\Models\Product;
use App\Models\ProductSerial;
use App\Models\Store;
use App\Models\Supplier;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use App\Support\Imei;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductTrackingTest extends TestCase
{
    use RefreshDatabase;

    public function test_tracking_rules_batches_serials_and_installments(): void
    {
        [$owner, $product] = $this->shop();
        $this->assertTrue(Imei::valid('490154203237518'));
        $this->assertFalse(Imei::valid('490154203237519'));

        $this->actingAs($owner)->postJson('/products', [
            'name' => 'Consult',
            'type' => 'service',
            'code' => 'SVC1',
            'brand_id' => $product->brand_id,
            'category_id' => $product->category_id,
            'unit_id' => $product->unit_id,
            'cost' => '0',
            'price' => '15',
            'has_batch' => 1,
        ])->assertStatus(422);
        $this->assertDatabaseMissing('products', ['code' => 'SVC1']);

        $medicine = $this->actingAs($owner)->postJson('/products', [
            'name' => 'Cough Syrup',
            'type' => 'standard',
            'code' => 'SYRUP',
            'barcode' => '111222333',
            'brand_id' => $product->brand_id,
            'category_id' => $product->category_id,
            'unit_id' => $product->unit_id,
            'warehouse_id' => $product->warehouse_id,
            'cost' => '2',
            'price' => '5',
            'has_batch' => 1,
            'near_expiry_days' => 15,
            'details' => ['generic_name' => 'Dextromethorphan', 'strength' => '100ml'],
        ])->assertOk()->json('product');
        $this->assertSame('cough-syrup', $medicine['slug']);
        $this->assertSame('Dextromethorphan', $medicine['details']['generic_name']);

        $this->actingAs($owner)->putJson('/products/'.$medicine['id'], [
            'name' => 'Cough Syrup',
            'type' => 'service',
            'code' => 'SYRUP',
            'brand_id' => $product->brand_id,
            'category_id' => $product->category_id,
            'unit_id' => $product->unit_id,
            'cost' => '2',
            'price' => '5',
            'has_batch' => 1,
        ])->assertStatus(422);
        $this->assertSame('standard', Product::find($medicine['id'])->type);

        $supplier = Supplier::first();
        $this->actingAs($owner)->postJson('/purchase', [
            'warehouse_id' => $product->warehouse_id,
            'supplier_id' => $supplier->id,
            'purchased_on' => now()->toDateString(),
            'payment_method' => 'Cash',
            'amount_paid' => '4',
            'items' => [[
                'product_id' => $medicine['id'],
                'qty' => 2,
                'cost' => '2',
                'batch_no' => 'SOON',
                'expiry_date' => now()->addDays(10)->toDateString(),
            ]],
        ])->assertOk();
        $this->actingAs($owner)->postJson('/purchase', [
            'warehouse_id' => $product->warehouse_id,
            'supplier_id' => $supplier->id,
            'purchased_on' => now()->toDateString(),
            'payment_method' => 'Cash',
            'amount_paid' => '6',
            'items' => [[
                'product_id' => $medicine['id'],
                'qty' => 3,
                'cost' => '2',
                'batch_no' => 'LATER',
                'expiry_date' => now()->addMonths(8)->toDateString(),
            ]],
        ])->assertOk();
        Batch::where('batch_no', 'OLD')->delete();
        Batch::create([
            'store_id' => $product->store_id,
            'product_id' => $medicine['id'],
            'batch_no' => 'OLD',
            'expiry_date' => now()->subDay()->toDateString(),
            'qty' => 4,
            'cost_cents' => 200,
        ]);

        $sale = $this->actingAs($owner)->postJson('/pos', [
            'items' => [['product_id' => $medicine['id'], 'qty' => 2]],
            'payment_method' => 'Cash',
            'amount_paid' => '10',
            'status' => 'completed',
            'idempotency_key' => 'batch-sale-1',
        ])->assertOk()->json('sale');
        $this->assertSame(0, (int) Batch::where('batch_no', 'SOON')->value('qty'));
        $this->assertSame(3, (int) Batch::where('batch_no', 'LATER')->value('qty'));
        $this->assertSame(4, (int) Batch::where('batch_no', 'OLD')->value('qty'));

        $this->actingAs($owner)->postJson('/pos', [
            'items' => [['product_id' => $medicine['id'], 'qty' => 4]],
            'payment_method' => 'Cash',
            'amount_paid' => '20',
            'status' => 'completed',
            'idempotency_key' => 'batch-sale-too-many',
        ])->assertStatus(422);
        $this->assertSame(3, (int) Product::find($medicine['id'])->stock_qty);

        $phone = $this->actingAs($owner)->postJson('/products', [
            'name' => 'Phone',
            'type' => 'standard',
            'code' => 'PHONE',
            'brand_id' => $product->brand_id,
            'category_id' => $product->category_id,
            'unit_id' => $product->unit_id,
            'cost' => '100',
            'price' => '150',
            'has_serial' => 1,
            'details' => ['warranty_months' => 6],
        ])->assertOk()->json('product');
        $this->actingAs($owner)->postJson('/purchase', [
            'warehouse_id' => $product->warehouse_id,
            'supplier_id' => $supplier->id,
            'purchased_on' => now()->toDateString(),
            'payment_method' => 'Cash',
            'amount_paid' => '100',
            'items' => [[
                'product_id' => $phone['id'],
                'qty' => 1,
                'cost' => '100',
                'identifier_kind' => 'imei',
                'serial' => '490154203237519',
            ]],
        ])->assertStatus(422);
        $this->actingAs($owner)->postJson('/purchase', [
            'warehouse_id' => $product->warehouse_id,
            'supplier_id' => $supplier->id,
            'purchased_on' => now()->toDateString(),
            'payment_method' => 'Cash',
            'amount_paid' => '200',
            'items' => [[
                'product_id' => $phone['id'],
                'qty' => 2,
                'cost' => '100',
                'identifier_kind' => 'imei',
                'serials' => ['490154203237518', '490154203237518'],
            ]],
        ])->assertStatus(422);
        $this->actingAs($owner)->postJson('/purchase', [
            'warehouse_id' => $product->warehouse_id,
            'supplier_id' => $supplier->id,
            'purchased_on' => now()->toDateString(),
            'payment_method' => 'Cash',
            'amount_paid' => '100',
            'items' => [[
                'product_id' => $phone['id'],
                'qty' => 1,
                'cost' => '100',
                'identifier_kind' => 'imei',
                'serial' => '490154203237518',
            ]],
        ])->assertOk();
        $this->actingAs($owner)->postJson('/purchase', [
            'warehouse_id' => $product->warehouse_id,
            'supplier_id' => $supplier->id,
            'purchased_on' => now()->toDateString(),
            'payment_method' => 'Cash',
            'amount_paid' => '100',
            'items' => [[
                'product_id' => $phone['id'],
                'qty' => 1,
                'cost' => '100',
                'identifier_kind' => 'serial',
                'serial' => 'SN-100',
            ]],
        ])->assertOk();
        $customer = Customer::create(['store_id' => $product->store_id, 'name' => 'Rina']);
        $phoneSale = $this->actingAs($owner)->postJson('/pos', [
            'items' => [['product_id' => $phone['id'], 'qty' => 1, 'serial' => '490154203237518']],
            'customer_id' => $customer->id,
            'payment_method' => 'Cash',
            'amount_paid' => '50',
            'status' => 'completed',
            'idempotency_key' => 'phone-sale',
        ])->assertOk()->json('sale');
        $unit = ProductSerial::where('identifier', '490154203237518')->first();
        $this->assertSame('sold', $unit->status);
        $this->assertSame(now()->addMonths(6)->toDateString(), $unit->warranty_ends_on->toDateString());
        $this->actingAs($owner)->postJson('/product-serials/'.$unit->id.'/service', ['note' => 'Screen check'])->assertOk();
        $this->assertDatabaseHas('product_serial_events', ['product_serial_id' => $unit->id, 'kind' => 'service']);

        $plan = $this->actingAs($owner)->postJson('/sales/'.$phoneSale['id'].'/installments', [
            'count' => 2,
            'first_due' => now()->addWeek()->toDateString(),
        ])->assertOk()->json('plan');
        $first = Installment::where('installment_plan_id', $plan['id'])->orderBy('sequence')->first();
        $this->actingAs($owner)->postJson('/installments/'.$first->id.'/pay', ['amount' => number_format($first->amount_cents / 100, 2, '.', '')])->assertOk();
        $this->actingAs($owner)->postJson('/installments/'.$first->id.'/pay', ['amount' => number_format($first->amount_cents / 100, 2, '.', '')])->assertStatus(422);
        $this->actingAs($owner)->getJson('/purchase/batch?status=expired')->assertOk()->assertJsonFragment(['batch_no' => 'OLD', 'status' => 'expired']);
        $this->actingAs($owner)->getJson('/purchase/batch?status=soon')->assertOk()->assertJsonFragment(['batch_no' => 'SOON']);
        $this->assertNotEmpty($sale['id']);
    }

    public function test_a_bundle_deducts_ingredients_once(): void
    {
        [$owner, $product] = $this->shop();
        $flour = Product::factory()->create([
            'store_id' => $product->store_id,
            'name' => 'Flour',
            'code' => 'FLOUR',
            'type' => 'ingredient',
            'category_id' => $product->category_id,
            'brand_id' => $product->brand_id,
            'unit_id' => $product->unit_id,
            'stock_qty' => 5,
        ]);
        $bread = $this->actingAs($owner)->postJson('/products', [
            'name' => 'Bread',
            'type' => 'combo',
            'code' => 'BREAD',
            'brand_id' => $product->brand_id,
            'category_id' => $product->category_id,
            'unit_id' => $product->unit_id,
            'cost' => '1',
            'price' => '3',
            'ingredients_present' => 1,
            'ingredients' => [['ingredient_id' => $flour->id, 'qty' => 2]],
        ])->assertOk()->json('product');

        $this->actingAs($owner)->postJson('/pos', [
            'items' => [['product_id' => $bread['id'], 'qty' => 2]],
            'payment_method' => 'Cash',
            'amount_paid' => '6',
            'status' => 'completed',
            'idempotency_key' => 'bread-sale',
        ])->assertOk();
        $this->assertSame(1, (int) $flour->fresh()->stock_qty);
        $this->assertSame(0, (int) Product::find($bread['id'])->stock_qty);
    }

    private function shop(): array
    {
        $store = Store::create([
            'name' => 'Track Shop',
            'slug' => 'track-'.fake()->unique()->numerify('###'),
            'business_type' => 'all_in_one',
            'currency_symbol' => '$',
        ]);
        $owner = User::create([
            'name' => 'Owner',
            'email' => fake()->unique()->safeEmail(),
            'password' => 'password',
            'role' => 'owner',
            'store_id' => $store->id,
        ]);
        $store->update(['owner_id' => $owner->id]);
        Warehouse::create(['store_id' => $store->id, 'name' => 'Main']);
        Account::create(['store_id' => $store->id, 'name' => 'Cash', 'type' => 'cash', 'is_default' => true]);
        $category = Category::create(['store_id' => $store->id, 'name' => 'General']);
        $brand = Brand::create(['store_id' => $store->id, 'name' => 'House']);
        $unit = Unit::create(['store_id' => $store->id, 'name' => 'Piece', 'short_name' => 'pc']);
        Supplier::create(['store_id' => $store->id, 'name' => 'Supplier']);
        $product = Product::factory()->create([
            'store_id' => $store->id,
            'category_id' => $category->id,
            'brand_id' => $brand->id,
            'unit_id' => $unit->id,
            'warehouse_id' => Warehouse::first()->id,
            'name' => 'Rice',
            'code' => 'RICE',
        ]);

        return [$owner, $product];
    }
}
