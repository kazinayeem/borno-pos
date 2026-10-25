<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CategoryCatalogManagementTest extends TestCase
{
    use RefreshDatabase;

    protected Store $store;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->store = Store::create([
            'name' => 'Borno Test Pharmacy',
            'slug' => 'borno-test-pharmacy',
            'business_type' => 'pharmacy',
        ]);

        $this->user = User::create([
            'name' => 'Owner Admin',
            'email' => 'admin@bornopos.test',
            'username' => 'owner',
            'password' => 'password',
            'role' => 'owner',
            'store_id' => $this->store->id,
            'is_active' => true,
        ]);
    }

    public function test_category_list_endpoint_returns_catalog_payload_and_spa_view(): void
    {
        Category::create(['store_id' => $this->store->id, 'name' => 'Antibiotics']);
        Category::create(['store_id' => $this->store->id, 'name' => 'Syrups']);

        // 1. Direct browser request returns SPA shell
        $spaRes = $this->actingAs($this->user)->get('/categories');
        $spaRes->assertStatus(200);
        $spaRes->assertSee('id="root"', false);

        // 2. React API data request returns JSON with fields and data
        $apiRes = $this->actingAs($this->user)->getJson('/categories');
        $apiRes->assertStatus(200)
            ->assertJsonStructure([
                'title',
                'singular',
                'fields',
                'data',
                'meta',
            ])
            ->assertJsonFragment(['name' => 'Antibiotics'])
            ->assertJsonFragment(['name' => 'Syrups']);
    }

    public function test_category_add_edit_delete_lifecycle(): void
    {
        // 1. ADD / Create Category
        $addRes = $this->actingAs($this->user)->postJson('/categories', [
            'name' => 'Cardiovascular',
        ]);
        $addRes->assertStatus(200)
            ->assertJson(['message' => 'Category saved.']);
        $this->assertDatabaseHas('categories', [
            'store_id' => $this->store->id,
            'name' => 'Cardiovascular',
        ]);

        $category = Category::where('name', 'Cardiovascular')->firstOrFail();

        // 2. EDIT / Update Category
        $editRes = $this->actingAs($this->user)->putJson("/categories/{$category->id}", [
            'name' => 'Cardiology & Heart Care',
        ]);
        $editRes->assertStatus(200)
            ->assertJson(['message' => 'Category updated.']);
        $this->assertDatabaseHas('categories', [
            'id' => $category->id,
            'name' => 'Cardiology & Heart Care',
        ]);

        // 3. DELETE with Product protection
        $product = Product::create([
            'store_id' => $this->store->id,
            'category_id' => $category->id,
            'name' => 'Atorvastatin 10mg',
            'code' => 'PRD-CAT-01',
            'price_cents' => 1200,
            'cost_cents' => 800,
            'stock_qty' => 50,
        ]);

        $blockedDelete = $this->actingAs($this->user)->deleteJson("/categories/{$category->id}");
        $blockedDelete->assertStatus(422)
            ->assertJsonFragment(['message' => 'Cannot delete Category: Products are currently assigned to it. Reassign or remove the products first.']);
        $this->assertDatabaseHas('categories', ['id' => $category->id]);

        // 4. DELETE after product removed
        $product->delete();
        $successfulDelete = $this->actingAs($this->user)->deleteJson("/categories/{$category->id}");
        $successfulDelete->assertStatus(200)
            ->assertJson(['message' => 'Category deleted.']);
        $this->assertDatabaseMissing('categories', ['id' => $category->id]);
    }

    public function test_warehouse_add_edit_delete_lifecycle(): void
    {
        // 1. GET /warehouse
        $spaRes = $this->actingAs($this->user)->get('/warehouse');
        $spaRes->assertStatus(200)->assertSee('id="root"', false);

        $apiRes = $this->actingAs($this->user)->getJson('/warehouse');
        $apiRes->assertStatus(200)->assertJsonStructure(['title', 'singular', 'fields', 'data']);

        // 2. POST /warehouse (Add)
        $addRes = $this->actingAs($this->user)->postJson('/warehouse', [
            'name' => 'Central Warehouse Tejgaon',
            'phone' => '+8801711111111',
            'address' => 'Plot 4, Tejgaon I/A',
        ]);
        $addRes->assertStatus(200)->assertJson(['message' => 'Warehouse saved.']);
        $this->assertDatabaseHas('warehouses', ['name' => 'Central Warehouse Tejgaon', 'store_id' => $this->store->id]);

        $warehouse = \App\Models\Warehouse::where('name', 'Central Warehouse Tejgaon')->firstOrFail();

        // 3. PUT /warehouse/{id} (Edit)
        $editRes = $this->actingAs($this->user)->putJson("/warehouse/{$warehouse->id}", [
            'name' => 'Central Cold Storage & Warehouse',
            'phone' => '+8801722222222',
            'address' => 'Tejgaon Industrial Area, Dhaka',
        ]);
        $editRes->assertStatus(200)->assertJson(['message' => 'Warehouse updated.']);
        $this->assertDatabaseHas('warehouses', ['name' => 'Central Cold Storage & Warehouse', 'id' => $warehouse->id]);

        // 4. DELETE /warehouse/{id}
        $delRes = $this->actingAs($this->user)->deleteJson("/warehouse/{$warehouse->id}");
        $delRes->assertStatus(200)->assertJson(['message' => 'Warehouse deleted.']);
        $this->assertDatabaseMissing('warehouses', ['id' => $warehouse->id]);
    }

    public function test_brand_add_edit_delete_lifecycle(): void
    {
        // 1. GET /brand
        $spaRes = $this->actingAs($this->user)->get('/brand');
        $spaRes->assertStatus(200)->assertSee('id="root"', false);

        $apiRes = $this->actingAs($this->user)->getJson('/brand');
        $apiRes->assertStatus(200)->assertJsonStructure(['title', 'singular', 'fields', 'data']);

        // 2. POST /brand (Add)
        $addRes = $this->actingAs($this->user)->postJson('/brand', [
            'name' => 'Square Pharma',
        ]);
        $addRes->assertStatus(200)->assertJson(['message' => 'Brand saved.']);
        $this->assertDatabaseHas('brands', ['name' => 'Square Pharma', 'store_id' => $this->store->id]);

        $brand = \App\Models\Brand::where('name', 'Square Pharma')->firstOrFail();

        // 3. PUT /brand/{id} (Edit)
        $editRes = $this->actingAs($this->user)->putJson("/brand/{$brand->id}", [
            'name' => 'Square Pharmaceuticals Ltd',
        ]);
        $editRes->assertStatus(200)->assertJson(['message' => 'Brand updated.']);
        $this->assertDatabaseHas('brands', ['name' => 'Square Pharmaceuticals Ltd', 'id' => $brand->id]);

        // 4. DELETE /brand/{id}
        $delRes = $this->actingAs($this->user)->deleteJson("/brand/{$brand->id}");
        $delRes->assertStatus(200)->assertJson(['message' => 'Brand deleted.']);
        $this->assertDatabaseMissing('brands', ['id' => $brand->id]);
    }
}
