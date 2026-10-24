<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\MedicineImportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BangladeshMedicineImportTest extends TestCase
{
    use RefreshDatabase;

    private function createPharmacyShop(): array
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
            'name' => 'Main Pharmacy Dispensary',
        ]);

        Account::create([
            'store_id' => $store->id,
            'name' => 'Cash Register',
            'type' => 'cash',
            'is_default' => true,
        ]);

        return [$store, $user];
    }

    public function test_pharmacy_login_authenticates_authorized_user_and_rejects_invalid_credentials(): void
    {
        [$store, $user] = $this->createPharmacyShop();

        // 1. Valid login via JSON API
        $response = $this->postJson('/login', [
            'login' => 'pharmacy@bornopos.test',
            'password' => 'password',
            'remember' => true,
        ]);

        $response->assertOk()
            ->assertJsonPath('user.email', 'pharmacy@bornopos.test')
            ->assertJsonPath('user.role', 'owner')
            ->assertJsonPath('store.business_type', 'pharmacy')
            ->assertJsonStructure(['redirect', 'user', 'store', 'currency_symbol', 'currency_code']);

        $this->assertAuthenticatedAs($user);

        // 2. Logout
        $this->postJson('/logout')->assertOk();
        $this->assertGuest();

        // 3. Invalid password rejected with 422
        $invalidPassword = $this->postJson('/login', [
            'login' => 'pharmacy@bornopos.test',
            'password' => 'wrong-password',
        ]);

        $invalidPassword->assertStatus(422)
            ->assertJsonValidationErrors(['login']);

        // 4. Non-existent user rejected with 422
        $invalidUser = $this->postJson('/login', [
            'login' => 'ghost@bornopos.test',
            'password' => 'password',
        ]);

        $invalidUser->assertStatus(422)
            ->assertJsonValidationErrors(['login']);
    }

    public function test_medicine_import_service_populates_verified_fields_and_preserves_inventory(): void
    {
        [$store] = $this->createPharmacyShop();

        $service = app(MedicineImportService::class);
        $stats = $service->import(
            filePath: database_path('data/bangladesh_medicines.csv'),
            storeId: $store->id,
            limit: 50,
            chunkSize: 50,
            dryRun: false
        );

        $this->assertGreaterThan(0, $stats['inserted']);
        $this->assertSame(0, $stats['rejected']);

        $sample = Product::where('store_id', $store->id)
            ->whereNotNull('generic_name')
            ->first();

        $this->assertNotNull($sample, 'Imported medicine record should exist.');
        $this->assertNotEmpty($sample->name);
        $this->assertNotEmpty($sample->generic_name);
        $this->assertNotEmpty($sample->dosage_form);
        $this->assertNotEmpty($sample->route);
        $this->assertNotEmpty($sample->dar_no);
        $this->assertNotNull($sample->brand_id);
        $this->assertNotNull($sample->category_id);
        $this->assertNotNull($sample->unit_id);

        // Catalog master records should have stock_qty 0 and has_batch enabled for pharmacy
        $this->assertEquals(0, $sample->stock_qty);
        $this->assertTrue($sample->has_batch);
        $this->assertTrue($sample->is_active);
    }

    public function test_medicine_import_is_strictly_idempotent(): void
    {
        [$store] = $this->createPharmacyShop();

        $service = app(MedicineImportService::class);

        // First import
        $firstRun = $service->import(
            filePath: database_path('data/bangladesh_medicines.csv'),
            storeId: $store->id,
            limit: 60,
            chunkSize: 30,
            dryRun: false
        );

        $firstCount = Product::where('store_id', $store->id)->count();
        $this->assertGreaterThan(0, $firstCount);
        $this->assertSame($firstCount, $firstRun['inserted']);

        // Second import of the exact same data
        $secondRun = $service->import(
            filePath: database_path('data/bangladesh_medicines.csv'),
            storeId: $store->id,
            limit: 60,
            chunkSize: 30,
            dryRun: false
        );

        $secondCount = Product::where('store_id', $store->id)->count();

        $this->assertSame(0, $secondRun['inserted'], 'Second import must insert 0 new records.');
        $this->assertSame($firstCount, $secondRun['updated'], 'All previous records must be updated/preserved.');
        $this->assertSame($firstCount, $secondCount, 'Total product count must not increase.');
    }

    public function test_pos_medicine_search_by_name_and_generic_name(): void
    {
        [$store, $user] = $this->createPharmacyShop();

        $service = app(MedicineImportService::class);
        $service->import(
            filePath: database_path('data/bangladesh_medicines.csv'),
            storeId: $store->id,
            limit: 80,
            chunkSize: 80,
            dryRun: false
        );

        $sample = Product::where('store_id', $store->id)->whereNotNull('generic_name')->first();
        $this->assertNotNull($sample);

        // 1. Search by brand name fragment
        $searchFragment = substr($sample->name, 0, 4);
        $response = $this->actingAs($user)->getJson('/pos?q='.urlencode($searchFragment));

        $response->assertOk()
            ->assertJsonStructure(['products', 'categories', 'brands']);

        $products = $response->json('products');
        $this->assertNotEmpty($products);

        // 2. Search by generic name fragment
        $genericFragment = substr($sample->generic_name, 0, 5);
        $genericResponse = $this->actingAs($user)->getJson('/pos?q='.urlencode($genericFragment));

        $genericResponse->assertOk();
        $genericProducts = $genericResponse->json('products');
        $this->assertNotEmpty($genericProducts);

        $firstMatch = $genericProducts[0];
        $this->assertArrayHasKey('generic_name', $firstMatch);
        $this->assertArrayHasKey('dosage_form', $firstMatch);
        $this->assertArrayHasKey('strength', $firstMatch);
        $this->assertArrayHasKey('dar_no', $firstMatch);
        $this->assertArrayHasKey('prescription_required', $firstMatch);
    }
}
