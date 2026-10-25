<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\AccountTransaction;
use App\Models\Category;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StockCountAndTransactionsTest extends TestCase
{
    use RefreshDatabase;

    private function createShopWithData(): array
    {
        $store = Store::create([
            'name' => 'Borno Retail & Pharmacy',
            'slug' => 'borno-retail',
            'business_type' => 'pharmacy',
            'currency_symbol' => '৳',
            'currency_code' => 'BDT',
        ]);

        $owner = User::create([
            'name' => 'Owner Nayeem',
            'email' => 'owner@borno.test',
            'username' => 'owner',
            'password' => 'secret123',
            'role' => 'owner',
            'store_id' => $store->id,
        ]);
        $store->update(['owner_id' => $owner->id]);

        $warehouse = Warehouse::create([
            'store_id' => $store->id,
            'name' => 'Main Warehouse',
        ]);

        $cat1 = Category::create(['store_id' => $store->id, 'name' => 'Antibiotics', 'slug' => 'antibiotics']);
        $cat2 = Category::create(['store_id' => $store->id, 'name' => 'Vitamins', 'slug' => 'vitamins']);

        // Create 20 products to test pagination (page size = 15)
        for ($i = 1; $i <= 20; $i++) {
            Product::create([
                'store_id' => $store->id,
                'name' => 'Product '.$i.($i === 5 ? ' Amoxicillin' : ''),
                'slug' => 'product-'.$i,
                'code' => 'SKU-'.$i,
                'barcode' => '894000000'.$i,
                'generic_name' => $i === 5 ? 'Amoxicillin Trihydrate' : 'Generic '.$i,
                'cost_cents' => 100 * $i,
                'price_cents' => 150 * $i,
                'stock_qty' => 10 * $i,
                'category_id' => $i % 2 === 0 ? $cat1->id : $cat2->id,
                'warehouse_id' => $warehouse->id,
            ]);
        }

        $account = Account::create([
            'store_id' => $store->id,
            'name' => 'Brac Bank Account',
            'number' => '1501203040',
            'type' => 'bank',
            'opening_cents' => 500000,
        ]);

        // Create 20 account transactions to test pagination
        for ($i = 1; $i <= 20; $i++) {
            AccountTransaction::create([
                'store_id' => $store->id,
                'account_id' => $account->id,
                'user_id' => $owner->id,
                'source_key' => 'manual:txn:'.$i,
                'direction' => $i % 2 === 0 ? 'debit' : 'credit',
                'amount_cents' => 1000 * $i,
                'description' => 'Transaction '.$i.($i === 7 ? ' Office Rent Payment' : ''),
                'transacted_on' => now()->subDays($i)->toDateString(),
            ]);
        }

        return [$store, $owner, $warehouse, $account];
    }

    public function test_stock_count_renders_with_search_and_pagination(): void
    {
        [$store, $owner] = $this->createShopWithData();

        // 1. Initial page load (page 1) returns SPA shell
        $response = $this->actingAs($owner)->get('/stock/count');
        $response->assertOk()->assertSee('id="root"', false);

        // 2. Legacy blade view test
        $bladeRes = $this->actingAs($owner)->get('/stock/count?view=blade');
        $bladeRes->assertOk()
            ->assertSee('Physical Stock Count & Reconciliation')
            ->assertSee('Product 1')
            ->assertSee('Enter Physical Count');

        // 3. Search query by generic name
        $searchRes = $this->actingAs($owner)->get('/stock/count?view=blade&q=Amoxicillin');
        $searchRes->assertOk()
            ->assertSee('Product 5 Amoxicillin')
            ->assertDontSee('Product 2');

        // 4. Pagination page 2
        $page2Res = $this->actingAs($owner)->get('/stock/count?view=blade&page=2');
        $page2Res->assertOk();
    }

    public function test_account_transactions_renders_with_search_filters_and_pagination(): void
    {
        [$store, $owner, $warehouse, $account] = $this->createShopWithData();

        // 1. Initial page load returns SPA shell
        $response = $this->actingAs($owner)->get('/account/transactions');
        $response->assertOk()->assertSee('id="root"', false);

        // 2. Legacy blade view test
        $bladeRes = $this->actingAs($owner)->get('/account/transactions?view=blade');
        $bladeRes->assertOk()
            ->assertSee('Account Transactions & Ledger')
            ->assertSee('Total Inflow (Debit)')
            ->assertSee('Total Outflow (Credit)')
            ->assertSee('Brac Bank Account');

        // 3. Search query
        $searchRes = $this->actingAs($owner)->get('/account/transactions?view=blade&q=Office+Rent');
        $searchRes->assertOk()
            ->assertSee('Office Rent Payment')
            ->assertDontSee('Transaction 1');

        // 4. Direction filter: debit
        $debitRes = $this->actingAs($owner)->get('/account/transactions?view=blade&direction=debit');
        $debitRes->assertOk()
            ->assertSee('Inflow (Debit)');

        // 5. Direction filter: credit
        $creditRes = $this->actingAs($owner)->get('/account/transactions?view=blade&direction=credit');
        $creditRes->assertOk()
            ->assertSee('Outflow (Credit)');

        // 6. Account filter
        $accRes = $this->actingAs($owner)->get('/account/transactions?view=blade&account_id='.$account->id);
        $accRes->assertOk();
    }
}
