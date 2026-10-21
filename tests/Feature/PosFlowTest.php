<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\Sale;
use App\Models\Store;
use App\Models\Supplier;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\DashboardService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PosFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_is_sent_to_signin_and_bad_credentials_fail(): void
    {
        $this->get('/store-dashboard')->assertRedirect('/signin');
        $this->post('/login', ['login' => 'missing@bornopos.test', 'password' => 'nope'])
            ->assertSessionHasErrors('login');
    }

    public function test_owner_can_sign_in_and_out(): void
    {
        [$owner] = $this->shop();
        $this->post('/login', ['login' => $owner->email, 'password' => 'password', 'remember' => '1'])
            ->assertRedirect(route('store.dashboard'));
        $this->post('/logout')->assertRedirect(route('signin'));
        $this->get('/store-dashboard')->assertRedirect('/signin');
    }

    public function test_product_purchase_checkout_return_and_dashboard_stay_consistent(): void
    {
        [$owner, $store, $product] = $this->shop();
        $other = $this->shop('Other Shop', 'other@bornopos.test')[2];

        $this->actingAs($owner)->get('/products/'.$other->id)->assertNotFound();

        $this->actingAs($owner)->post('/products', [
            'name' => 'Photo Item',
            'type' => 'standard',
            'code' => 'PHOTO1',
            'brand_id' => $product->brand_id,
            'category_id' => $product->category_id,
            'unit_id' => $product->unit_id,
            'cost' => '2.50',
            'price' => '5.00',
            'alert_qty' => 1,
            'is_active' => 1,
            'featured_in_pos' => 1,
            'image' => \Illuminate\Http\UploadedFile::fake()->image('item.jpg'),
        ])->assertRedirect();
        $photo = Product::where('code', 'PHOTO1')->first();
        $this->assertNotNull($photo->image);
        $this->actingAs($owner)->put('/products/'.$photo->id, [
            'name' => 'Photo Item',
            'type' => 'standard',
            'code' => 'PHOTO1',
            'brand_id' => $product->brand_id,
            'category_id' => $product->category_id,
            'unit_id' => $product->unit_id,
            'cost' => '2.50',
            'price' => '6.00',
            'is_active' => 1,
        ])->assertRedirect();
        $this->assertSame(600, $photo->fresh()->price_cents);
        $this->assertNotNull($photo->fresh()->image);

        $this->actingAs($owner)->delete('/products/'.$photo->id)->assertRedirect();
        $this->assertDatabaseMissing('products', ['id' => $photo->id]);

        $this->actingAs($owner)->post('/purchase', [
            'warehouse_id' => $product->warehouse_id,
            'supplier_id' => Supplier::first()->id,
            'purchased_on' => now()->toDateString(),
            'payment_method' => 'Cash',
            'amount_paid' => '10.00',
            'items' => [['product_id' => $product->id, 'qty' => 5, 'cost' => '4.00']],
        ])->assertRedirect();
        $this->assertSame(5, $product->fresh()->stock_qty);

        $this->actingAs($owner)->post('/pos', [
            'idempotency_key' => 'sale-1',
            'status' => 'completed',
            'payment_method' => 'Cash',
            'amount_paid' => '8.00',
            'discount' => '0',
            'items' => [['product_id' => $product->id, 'qty' => 1]],
        ])->assertRedirect();
        $sale = Sale::first();
        $this->assertSame(4, $product->fresh()->stock_qty);
        $this->assertSame(800, $sale->paid_cents);
        $this->assertDatabaseHas('payments', ['payable_id' => $sale->id, 'amount_cents' => 800]);

        $this->actingAs($owner)->post('/pos', [
            'idempotency_key' => 'sale-1',
            'status' => 'completed',
            'payment_method' => 'Cash',
            'amount_paid' => '8.00',
            'items' => [['product_id' => $product->id, 'qty' => 1]],
        ])->assertRedirect();
        $this->assertSame(1, Sale::count());
        $this->assertSame(4, $product->fresh()->stock_qty);

        $this->actingAs($owner)->post('/pos', [
            'idempotency_key' => 'too-many',
            'status' => 'completed',
            'payment_method' => 'Cash',
            'amount_paid' => '100.00',
            'items' => [['product_id' => $product->id, 'qty' => 50]],
        ])->assertSessionHasErrors('items');
        $this->assertSame(4, $product->fresh()->stock_qty);

        $this->actingAs($owner)->post('/sales/'.$sale->id.'/return', [
            'items' => [['sale_item_id' => $sale->items()->first()->id, 'qty' => 1]],
        ])->assertRedirect();
        $this->assertSame(5, $product->fresh()->stock_qty);

        $dashboard = app(DashboardService::class)->shop($store->id, now()->startOfMonth(), now()->endOfMonth());
        $this->assertSame(800, $dashboard['total_sales']);
        $this->assertSame(800, $dashboard['sales_return']);
        $this->assertSame(0, $dashboard['gross_profit']);

        $empty = app(DashboardService::class)->shop($store->id, now()->subYear()->startOfYear(), now()->subYear()->endOfYear());
        $this->assertSame(0, $empty['total_sales']);

        $staff = User::create([
            'name' => 'Staff',
            'email' => 'staff@bornopos.test',
            'password' => 'password',
            'role' => 'staff',
            'store_id' => $store->id,
            'permissions' => ['pos', 'products.view', 'sales.view'],
        ]);
        $this->actingAs($staff)->delete('/products/'.$product->id)->assertForbidden();
        $this->actingAs($owner)->get('/dashboard')->assertForbidden();
    }

    private function shop(string $name = 'Demo Shop', string $email = 'owner@bornopos.test'): array
    {
        $store = Store::create([
            'name' => $name,
            'slug' => str($name)->slug().'-'.fake()->unique()->numerify('###'),
            'business_type' => 'grocery',
            'currency_symbol' => '$',
        ]);
        $owner = User::create([
            'name' => 'Owner',
            'email' => $email,
            'password' => 'password',
            'role' => 'owner',
            'store_id' => $store->id,
        ]);
        $store->update(['owner_id' => $owner->id]);
        $warehouse = Warehouse::create(['store_id' => $store->id, 'name' => 'Main']);
        Account::create(['store_id' => $store->id, 'name' => 'Cash', 'type' => 'cash', 'is_default' => true]);
        $category = Category::create(['store_id' => $store->id, 'name' => 'Food']);
        $brand = Brand::create(['store_id' => $store->id, 'name' => 'House']);
        $unit = Unit::create(['store_id' => $store->id, 'name' => 'Piece', 'short_name' => 'pc']);
        Supplier::create(['store_id' => $store->id, 'name' => 'Supplier']);
        $product = Product::create([
            'store_id' => $store->id,
            'name' => 'Rice',
            'code' => 'RICE-'.$store->id,
            'category_id' => $category->id,
            'brand_id' => $brand->id,
            'unit_id' => $unit->id,
            'warehouse_id' => $warehouse->id,
            'cost_cents' => 400,
            'price_cents' => 800,
        ]);

        return [$owner, $store, $product];
    }
}
