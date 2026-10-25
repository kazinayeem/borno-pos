<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\Store;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MedicineProductImagesTest extends TestCase
{
    use RefreshDatabase;

    private function setupPharmacyStore(): array
    {
        $store = Store::create([
            'name' => 'City Pharmacy',
            'slug' => 'city-pharmacy',
            'business_type' => 'pharmacy',
            'currency_symbol' => '৳',
            'currency_code' => 'BDT',
        ]);

        $user = User::create([
            'name' => 'Pharmacy Admin',
            'email' => 'pharmacy@bornopos.test',
            'username' => 'pharmacy',
            'password' => 'password',
            'role' => 'owner',
            'store_id' => $store->id,
        ]);

        $store->update(['owner_id' => $user->id]);

        Warehouse::create([
            'store_id' => $store->id,
            'name' => 'Central Dispensary',
        ]);

        $category = Category::create([
            'store_id' => $store->id,
            'name' => 'Analgesics & Antipyretics',
        ]);

        $brand = Brand::create([
            'store_id' => $store->id,
            'name' => 'Beximco Pharmaceuticals Ltd.',
        ]);

        $unit = Unit::create([
            'store_id' => $store->id,
            'name' => 'Strip',
            'short_name' => 'str',
        ]);

        return [$store, $user, $category, $brand, $unit];
    }

    public function test_medicine_can_be_created_without_image(): void
    {
        [$store, $user, $category, $brand, $unit] = $this->setupPharmacyStore();

        $response = $this->actingAs($user)->postJson('/products', [
            'name' => 'Napa 500mg',
            'code' => 'BDM-NAPA-500',
            'type' => 'standard',
            'category_id' => $category->id,
            'brand_id' => $brand->id,
            'unit_id' => $unit->id,
            'cost' => '1.20',
            'price' => '1.50',
            'details' => [
                'generic_name' => 'Paracetamol',
                'strength' => '500 mg',
                'dosage_form' => 'Tablet',
            ],
        ]);

        $response->assertOk();

        $product = Product::where('code', 'BDM-NAPA-500')->first();
        $this->assertNotNull($product);
        $this->assertNull($product->image, 'Product should have null image when not uploaded.');
    }

    public function test_medicine_supports_valid_image_upload_and_storage(): void
    {
        Storage::fake('public');
        [$store, $user, $category, $brand, $unit] = $this->setupPharmacyStore();

        $file = UploadedFile::fake()->image('napa_box.png', 300, 300);

        $response = $this->actingAs($user)->postJson('/products', [
            'name' => 'Napa Extra',
            'code' => 'BDM-NAPA-EX',
            'type' => 'standard',
            'category_id' => $category->id,
            'brand_id' => $brand->id,
            'unit_id' => $unit->id,
            'cost' => '2.00',
            'price' => '2.50',
            'image' => $file,
            'details' => [
                'generic_name' => 'Paracetamol + Caffeine',
                'strength' => '500 mg + 65 mg',
                'dosage_form' => 'Tablet',
            ],
        ]);

        $response->assertOk();

        $product = Product::where('code', 'BDM-NAPA-EX')->first();
        $this->assertNotNull($product);
        $this->assertNotNull($product->image);
        Storage::disk('public')->assertExists($product->image);
    }

    public function test_replacing_and_removing_product_image(): void
    {
        Storage::fake('public');
        [$store, $user, $category, $brand, $unit] = $this->setupPharmacyStore();

        // 1. Create with original image
        $file1 = UploadedFile::fake()->image('old_photo.jpg', 200, 200);
        $createRes = $this->actingAs($user)->postJson('/products', [
            'name' => 'Ace Plus',
            'code' => 'BDM-ACE-PLUS',
            'type' => 'standard',
            'category_id' => $category->id,
            'brand_id' => $brand->id,
            'unit_id' => $unit->id,
            'cost' => '2.00',
            'price' => '2.50',
            'image' => $file1,
        ]);
        $createRes->assertOk();
        $product = Product::where('code', 'BDM-ACE-PLUS')->first();
        $oldImagePath = $product->image;
        Storage::disk('public')->assertExists($oldImagePath);

        // 2. Replace with new image
        $file2 = UploadedFile::fake()->image('new_photo.webp', 400, 400);
        $updateRes = $this->actingAs($user)->putJson("/products/{$product->id}", [
            'name' => 'Ace Plus (Updated)',
            'code' => 'BDM-ACE-PLUS',
            'type' => 'standard',
            'category_id' => $category->id,
            'brand_id' => $brand->id,
            'unit_id' => $unit->id,
            'cost' => '2.00',
            'price' => '2.50',
            'image' => $file2,
        ]);
        $updateRes->assertOk();
        $product->refresh();
        $newImagePath = $product->image;

        $this->assertNotSame($oldImagePath, $newImagePath);
        Storage::disk('public')->assertMissing($oldImagePath);
        Storage::disk('public')->assertExists($newImagePath);

        // 3. Remove image using remove_image=true
        $removeRes = $this->actingAs($user)->putJson("/products/{$product->id}", [
            'name' => 'Ace Plus (Updated)',
            'code' => 'BDM-ACE-PLUS',
            'type' => 'standard',
            'category_id' => $category->id,
            'brand_id' => $brand->id,
            'unit_id' => $unit->id,
            'cost' => '2.00',
            'price' => '2.50',
            'remove_image' => true,
        ]);
        $removeRes->assertOk();
        $product->refresh();

        $this->assertNull($product->image, 'Product image must be null after removal.');
        Storage::disk('public')->assertMissing($newImagePath);
    }

    public function test_invalid_image_file_type_is_rejected(): void
    {
        Storage::fake('public');
        [$store, $user, $category, $brand, $unit] = $this->setupPharmacyStore();

        $invalidFile = UploadedFile::fake()->create('malicious.pdf', 100, 'application/pdf');

        $response = $this->actingAs($user)->postJson('/products', [
            'name' => 'Invalid Image Test',
            'code' => 'BDM-INV-IMG',
            'type' => 'standard',
            'category_id' => $category->id,
            'brand_id' => $brand->id,
            'unit_id' => $unit->id,
            'cost' => '1.00',
            'price' => '1.50',
            'image' => $invalidFile,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['image']);
    }

    public function test_pos_and_product_apis_return_dosage_form_for_fallback_illustrations(): void
    {
        [$store, $user, $category, $brand, $unit] = $this->setupPharmacyStore();

        $tablet = Product::create([
            'store_id' => $store->id,
            'category_id' => $category->id,
            'brand_id' => $brand->id,
            'unit_id' => $unit->id,
            'name' => 'Ciprocin 500mg',
            'code' => 'BDM-CIPRO-500',
            'price_cents' => 1500,
            'cost_cents' => 1200,
            'generic_name' => 'Ciprofloxacin',
            'dosage_form' => 'Tablet',
            'is_active' => true,
            'featured_in_pos' => true,
        ]);

        $syrup = Product::create([
            'store_id' => $store->id,
            'category_id' => $category->id,
            'brand_id' => $brand->id,
            'unit_id' => $unit->id,
            'name' => 'Tofen 100ml',
            'code' => 'BDM-TOFEN-100',
            'price_cents' => 8500,
            'cost_cents' => 7000,
            'generic_name' => 'Ketotifen',
            'dosage_form' => 'Syrup',
            'is_active' => true,
            'featured_in_pos' => true,
        ]);

        // 1. Check POS API
        $posRes = $this->actingAs($user)->getJson('/pos?q=Ciprocin');
        $posRes->assertOk();
        $posProducts = $posRes->json('products');
        $this->assertNotEmpty($posProducts);
        $this->assertSame('Tablet', $posProducts[0]['dosage_form']);
        $this->assertNull($posProducts[0]['image']);

        // 2. Check Products listing API
        $prodRes = $this->actingAs($user)->getJson('/products?q=Tofen');
        $prodRes->assertOk();
        $prodList = $prodRes->json('data');
        $this->assertNotEmpty($prodList);
        $this->assertNull($prodList[0]['image']);
    }
}
