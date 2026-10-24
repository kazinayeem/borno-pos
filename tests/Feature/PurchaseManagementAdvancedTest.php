<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\AuditLog;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\Store;
use App\Models\Supplier;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PurchaseManagementAdvancedTest extends TestCase
{
    use RefreshDatabase;

    private function setupShop(): array
    {
        $store = Store::create([
            'name' => 'Borno Pharma Ltd',
            'slug' => 'borno-pharma',
            'business_type' => 'pharmacy',
            'currency_symbol' => '৳',
            'currency_code' => 'BDT',
        ]);

        $owner = User::create([
            'name' => 'Dr. Nayeem',
            'email' => 'nayeem@pharma.test',
            'username' => 'drnayeem',
            'password' => 'secret123',
            'role' => 'owner',
            'store_id' => $store->id,
        ]);
        $store->update(['owner_id' => $owner->id]);

        $warehouse = Warehouse::create([
            'store_id' => $store->id,
            'name' => 'Dhaka Central Warehouse',
        ]);

        $supplierSquare = Supplier::create([
            'store_id' => $store->id,
            'name' => 'Square Pharmaceuticals',
            'company' => 'Square Group',
            'phone' => '01711000111',
            'email' => 'sales@square.test',
        ]);

        $supplierBeximco = Supplier::create([
            'store_id' => $store->id,
            'name' => 'Beximco Pharma',
            'company' => 'Beximco Group',
            'phone' => '01822000222',
            'email' => 'order@beximco.test',
        ]);

        $account = Account::create([
            'store_id' => $store->id,
            'name' => 'Prime Bank Main',
            'account_number' => '123456789',
            'is_default' => true,
        ]);

        $category = Category::create(['store_id' => $store->id, 'name' => 'Antibiotics']);
        $brand = Brand::create(['store_id' => $store->id, 'name' => 'Square']);
        $unit = Unit::create(['store_id' => $store->id, 'name' => 'Box', 'short_name' => 'bx']);

        $productNapa = Product::create([
            'store_id' => $store->id,
            'warehouse_id' => $warehouse->id,
            'category_id' => $category->id,
            'brand_id' => $brand->id,
            'unit_id' => $unit->id,
            'name' => 'Napa Extra 500mg',
            'code' => 'NAP-EXT-500',
            'barcode' => '8901234567890',
            'cost_cents' => 200,
            'price_cents' => 300,
            'stock_qty' => 50,
        ]);

        $productAce = Product::create([
            'store_id' => $store->id,
            'warehouse_id' => $warehouse->id,
            'category_id' => $category->id,
            'brand_id' => $brand->id,
            'unit_id' => $unit->id,
            'name' => 'Ace Plus',
            'code' => 'ACE-PLS-100',
            'barcode' => '8909876543210',
            'cost_cents' => 180,
            'price_cents' => 250,
            'stock_qty' => 40,
        ]);

        return compact('store', 'owner', 'warehouse', 'supplierSquare', 'supplierBeximco', 'account', 'productNapa', 'productAce');
    }

    public function test_can_search_purchases_by_reference_supplier_and_product(): void
    {
        $ctx = $this->setupShop();

        // Purchase 1: Square with Napa
        $p1 = Purchase::create([
            'store_id' => $ctx['store']->id,
            'warehouse_id' => $ctx['warehouse']->id,
            'supplier_id' => $ctx['supplierSquare']->id,
            'user_id' => $ctx['owner']->id,
            'reference' => 'PO-SQUARE-2026-001',
            'purchased_on' => '2026-10-15',
            'status' => 'received',
            'payment_method' => 'Cash',
            'subtotal_cents' => 10000,
            'grand_cents' => 10000,
            'paid_cents' => 10000,
        ]);
        PurchaseItem::create([
            'purchase_id' => $p1->id,
            'product_id' => $ctx['productNapa']->id,
            'qty' => 50,
            'cost_cents' => 200,
            'subtotal_cents' => 10000,
            'batch_no' => 'BAT-NAPA-99',
        ]);

        // Purchase 2: Beximco with Ace
        $p2 = Purchase::create([
            'store_id' => $ctx['store']->id,
            'warehouse_id' => $ctx['warehouse']->id,
            'supplier_id' => $ctx['supplierBeximco']->id,
            'user_id' => $ctx['owner']->id,
            'reference' => 'PO-BEXIMCO-2026-002',
            'purchased_on' => '2026-10-20',
            'status' => 'received',
            'payment_method' => 'Bank Transfer',
            'subtotal_cents' => 9000,
            'grand_cents' => 9000,
            'paid_cents' => 3000,
        ]);
        PurchaseItem::create([
            'purchase_id' => $p2->id,
            'product_id' => $ctx['productAce']->id,
            'qty' => 50,
            'cost_cents' => 180,
            'subtotal_cents' => 9000,
            'batch_no' => 'BAT-ACE-77',
        ]);

        // 1. Search by reference
        $response = $this->actingAs($ctx['owner'])->getJson('/purchase/list?q=PO-SQUARE');
        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $this->assertEquals('PO-SQUARE-2026-001', $response->json('data.0.reference'));

        // 2. Search by supplier name
        $response = $this->actingAs($ctx['owner'])->getJson('/purchase/list?q=Beximco');
        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $this->assertEquals('PO-BEXIMCO-2026-002', $response->json('data.0.reference'));

        // 3. Search by product name
        $response = $this->actingAs($ctx['owner'])->getJson('/purchase/list?q=Napa');
        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $this->assertEquals('PO-SQUARE-2026-001', $response->json('data.0.reference'));

        // 4. Search by batch number
        $response = $this->actingAs($ctx['owner'])->getJson('/purchase/list?q=BAT-ACE-77');
        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $this->assertEquals('PO-BEXIMCO-2026-002', $response->json('data.0.reference'));
    }

    public function test_can_filter_purchases_by_date_status_and_payment_status(): void
    {
        $ctx = $this->setupShop();

        // Fully paid
        Purchase::create([
            'store_id' => $ctx['store']->id,
            'warehouse_id' => $ctx['warehouse']->id,
            'supplier_id' => $ctx['supplierSquare']->id,
            'user_id' => $ctx['owner']->id,
            'reference' => 'PO-PAID-01',
            'purchased_on' => now()->toDateString(),
            'status' => 'received',
            'payment_method' => 'Cash',
            'grand_cents' => 5000,
            'paid_cents' => 5000,
        ]);

        // Partially paid
        Purchase::create([
            'store_id' => $ctx['store']->id,
            'warehouse_id' => $ctx['warehouse']->id,
            'supplier_id' => $ctx['supplierSquare']->id,
            'user_id' => $ctx['owner']->id,
            'reference' => 'PO-PARTIAL-02',
            'purchased_on' => now()->toDateString(),
            'status' => 'received',
            'payment_method' => 'Cash',
            'grand_cents' => 8000,
            'paid_cents' => 3000,
        ]);

        // Fully due
        Purchase::create([
            'store_id' => $ctx['store']->id,
            'warehouse_id' => $ctx['warehouse']->id,
            'supplier_id' => $ctx['supplierBeximco']->id,
            'user_id' => $ctx['owner']->id,
            'reference' => 'PO-DUE-03',
            'purchased_on' => now()->subDays(5)->toDateString(),
            'status' => 'received',
            'payment_method' => 'Cash',
            'grand_cents' => 12000,
            'paid_cents' => 0,
        ]);

        // Cancelled
        Purchase::create([
            'store_id' => $ctx['store']->id,
            'warehouse_id' => $ctx['warehouse']->id,
            'supplier_id' => $ctx['supplierBeximco']->id,
            'user_id' => $ctx['owner']->id,
            'reference' => 'PO-CANCELLED-04',
            'purchased_on' => now()->toDateString(),
            'status' => 'cancelled',
            'payment_method' => 'Cash',
            'grand_cents' => 4000,
            'paid_cents' => 0,
        ]);

        // Filter paid
        $resPaid = $this->actingAs($ctx['owner'])->getJson('/purchase/list?payment_status=paid');
        $resPaid->assertOk();
        $this->assertEquals(1, $resPaid->json('meta.total'));
        $this->assertEquals('PO-PAID-01', $resPaid->json('data.0.reference'));

        // Filter partial
        $resPartial = $this->actingAs($ctx['owner'])->getJson('/purchase/list?payment_status=partial');
        $resPartial->assertOk();
        $this->assertEquals(1, $resPartial->json('meta.total'));
        $this->assertEquals('PO-PARTIAL-02', $resPartial->json('data.0.reference'));

        // Filter due only
        $resDueOnly = $this->actingAs($ctx['owner'])->getJson('/purchase/list?due_only=1');
        $resDueOnly->assertOk();
        $this->assertEquals(2, $resDueOnly->json('meta.total'));

        // Filter cancelled
        $resCancelled = $this->actingAs($ctx['owner'])->getJson('/purchase/list?status=cancelled');
        $resCancelled->assertOk();
        $this->assertEquals(1, $resCancelled->json('meta.total'));
        $this->assertEquals('PO-CANCELLED-04', $resCancelled->json('data.0.reference'));
    }

    public function test_purchase_summary_kpis_and_due_cents_calculation(): void
    {
        $ctx = $this->setupShop();

        // 1. Grand 10000, Paid 4000 -> Due 6000
        Purchase::create([
            'store_id' => $ctx['store']->id,
            'warehouse_id' => $ctx['warehouse']->id,
            'supplier_id' => $ctx['supplierSquare']->id,
            'user_id' => $ctx['owner']->id,
            'reference' => 'PO-CALC-01',
            'purchased_on' => now()->toDateString(),
            'status' => 'received',
            'payment_method' => 'Cash',
            'grand_cents' => 10000,
            'paid_cents' => 4000,
        ]);

        // 2. Grand 5000, Paid 5000 -> Due 0
        Purchase::create([
            'store_id' => $ctx['store']->id,
            'warehouse_id' => $ctx['warehouse']->id,
            'supplier_id' => $ctx['supplierSquare']->id,
            'user_id' => $ctx['owner']->id,
            'reference' => 'PO-CALC-02',
            'purchased_on' => now()->toDateString(),
            'status' => 'received',
            'payment_method' => 'Cash',
            'grand_cents' => 5000,
            'paid_cents' => 5000,
        ]);

        $res = $this->actingAs($ctx['owner'])->getJson('/purchase/list');
        $res->assertOk();

        $summary = $res->json('summary');
        $this->assertEquals(2, $summary['total_purchases_count']);
        $this->assertEquals(15000, $summary['total_amount_cents']);
        $this->assertEquals(9000, $summary['total_paid_cents']);
        $this->assertEquals(6000, $summary['total_due_cents']);
        $this->assertEquals(1, $summary['paid_count']);
        $this->assertEquals(1, $summary['partial_count']);
        $this->assertEquals(0, $summary['unpaid_count']);
    }

    public function test_can_record_supplier_payment_full_and_partial(): void
    {
        $ctx = $this->setupShop();

        $purchase = Purchase::create([
            'store_id' => $ctx['store']->id,
            'warehouse_id' => $ctx['warehouse']->id,
            'supplier_id' => $ctx['supplierSquare']->id,
            'user_id' => $ctx['owner']->id,
            'reference' => 'PO-PAYMENT-TEST',
            'purchased_on' => now()->toDateString(),
            'status' => 'received',
            'payment_method' => 'Cash',
            'grand_cents' => 10000, // 100.00 BDT
            'paid_cents' => 2000,  // 20.00 BDT -> Remaining 80.00 BDT
        ]);

        // Record partial payment of 30.00 BDT (3000 cents)
        $resPartial = $this->actingAs($ctx['owner'])->postJson("/purchase/{$purchase->id}/payments", [
            'amount' => '30.00',
            'payment_method' => 'Bank Transfer',
            'account_id' => $ctx['account']->id,
            'note' => 'Partial payment via Bank',
        ]);

        $resPartial->assertOk();
        $purchase->refresh();
        $this->assertEquals(5000, $purchase->paid_cents);
        $this->assertEquals(5000, $purchase->dueCents());
        $this->assertEquals('partial', $resPartial->json('purchase.payment_status'));

        // Record remaining full payment of 50.00 BDT (5000 cents)
        $resFull = $this->actingAs($ctx['owner'])->postJson("/purchase/{$purchase->id}/payments", [
            'amount' => '50.00',
            'payment_method' => 'Cash',
            'account_id' => $ctx['account']->id,
            'note' => 'Final settlement',
        ]);

        $resFull->assertOk();
        $purchase->refresh();
        $this->assertEquals(10000, $purchase->paid_cents);
        $this->assertEquals(0, $purchase->dueCents());
        $this->assertEquals('paid', $resFull->json('purchase.payment_status'));
    }

    public function test_cannot_record_payment_exceeding_remaining_due_or_for_cancelled_purchase(): void
    {
        $ctx = $this->setupShop();

        $purchase = Purchase::create([
            'store_id' => $ctx['store']->id,
            'warehouse_id' => $ctx['warehouse']->id,
            'supplier_id' => $ctx['supplierSquare']->id,
            'user_id' => $ctx['owner']->id,
            'reference' => 'PO-EXCEED-TEST',
            'purchased_on' => now()->toDateString(),
            'status' => 'received',
            'payment_method' => 'Cash',
            'grand_cents' => 5000, // 50.00 BDT
            'paid_cents' => 4000,  // 40.00 BDT -> Remaining 10.00 BDT
        ]);

        // 1. Try to pay 20.00 BDT (exceeds 10.00 BDT)
        $resOver = $this->actingAs($ctx['owner'])->postJson("/purchase/{$purchase->id}/payments", [
            'amount' => '20.00',
            'payment_method' => 'Cash',
        ]);
        $resOver->assertUnprocessable();
        $resOver->assertJsonValidationErrors(['amount']);

        // 2. Try to pay 0 or negative
        $resZero = $this->actingAs($ctx['owner'])->postJson("/purchase/{$purchase->id}/payments", [
            'amount' => '0.00',
        ]);
        $resZero->assertUnprocessable();

        // 3. Cancelled purchase
        $cancelledPurchase = Purchase::create([
            'store_id' => $ctx['store']->id,
            'warehouse_id' => $ctx['warehouse']->id,
            'supplier_id' => $ctx['supplierSquare']->id,
            'user_id' => $ctx['owner']->id,
            'reference' => 'PO-CANCELLED-PAY',
            'purchased_on' => now()->toDateString(),
            'status' => 'cancelled',
            'payment_method' => 'Cash',
            'grand_cents' => 5000,
            'paid_cents' => 0,
        ]);

        $resCancelled = $this->actingAs($ctx['owner'])->postJson("/purchase/{$cancelledPurchase->id}/payments", [
            'amount' => '10.00',
        ]);
        $resCancelled->assertUnprocessable();
        $resCancelled->assertJsonValidationErrors(['payment']);
    }

    public function test_recording_supplier_payment_updates_ledger_and_audit_log(): void
    {
        $ctx = $this->setupShop();

        $purchase = Purchase::create([
            'store_id' => $ctx['store']->id,
            'warehouse_id' => $ctx['warehouse']->id,
            'supplier_id' => $ctx['supplierSquare']->id,
            'user_id' => $ctx['owner']->id,
            'reference' => 'PO-AUDIT-TEST',
            'purchased_on' => now()->toDateString(),
            'status' => 'received',
            'payment_method' => 'Cash',
            'grand_cents' => 10000,
            'paid_cents' => 0,
        ]);

        $res = $this->actingAs($ctx['owner'])->postJson("/purchase/{$purchase->id}/payments", [
            'amount' => '50.00',
            'payment_method' => 'Bank Transfer',
            'account_id' => $ctx['account']->id,
            'note' => 'Payment testing ledger & audit',
        ]);

        $res->assertOk();

        // Verify Payment record was created
        $payment = Payment::where('payable_type', Purchase::class)
            ->where('payable_id', $purchase->id)
            ->first();
        $this->assertNotNull($payment);
        $this->assertEquals(5000, $payment->amount_cents);
        $this->assertEquals($ctx['account']->id, $payment->account_id);

        // Verify AuditLog was recorded
        $log = AuditLog::where('store_id', $ctx['store']->id)
            ->where('action', 'purchase.payment_recorded')
            ->where('target_id', $purchase->id)
            ->first();
        $this->assertNotNull($log);
        $this->assertEquals(5000, $log->details['amount_cents']);
    }

    public function test_export_streams_csv_with_all_matching_records(): void
    {
        $ctx = $this->setupShop();

        for ($i = 1; $i <= 15; $i++) {
            Purchase::create([
                'store_id' => $ctx['store']->id,
                'warehouse_id' => $ctx['warehouse']->id,
                'supplier_id' => $ctx['supplierSquare']->id,
                'user_id' => $ctx['owner']->id,
                'reference' => sprintf('PO-EXPORT-%02d', $i),
                'purchased_on' => now()->toDateString(),
                'status' => 'received',
                'payment_method' => 'Cash',
                'grand_cents' => 1000 * $i,
                'paid_cents' => 500 * $i,
            ]);
        }

        $response = $this->actingAs($ctx['owner'])->get('/purchase/export');
        $response->assertOk();
        $this->assertEquals('text/csv; charset=utf-8', $response->headers->get('Content-Type'));

        // Check content
        $content = $response->streamedContent();
        $this->assertStringContainsString('Reference', $content);
        $this->assertStringContainsString('PO-EXPORT-01', $content);
        $this->assertStringContainsString('PO-EXPORT-15', $content);
    }

    public function test_supplier_payables_summary_endpoint(): void
    {
        $ctx = $this->setupShop();

        // Supplier 1 has 2 purchases: Total 150.00, Paid 50.00 -> Due 100.00
        Purchase::create([
            'store_id' => $ctx['store']->id,
            'warehouse_id' => $ctx['warehouse']->id,
            'supplier_id' => $ctx['supplierSquare']->id,
            'user_id' => $ctx['owner']->id,
            'reference' => 'PO-SUP1-A',
            'purchased_on' => '2026-09-01',
            'status' => 'received',
            'grand_cents' => 10000,
            'paid_cents' => 5000,
        ]);
        Purchase::create([
            'store_id' => $ctx['store']->id,
            'warehouse_id' => $ctx['warehouse']->id,
            'supplier_id' => $ctx['supplierSquare']->id,
            'user_id' => $ctx['owner']->id,
            'reference' => 'PO-SUP1-B',
            'purchased_on' => '2026-09-15',
            'status' => 'received',
            'grand_cents' => 5000,
            'paid_cents' => 0,
        ]);

        $res = $this->actingAs($ctx['owner'])->getJson('/purchase/suppliers/payables');
        $res->assertOk();

        $squareRow = collect($res->json('data'))->firstWhere('name', 'Square Pharmaceuticals');
        $this->assertNotNull($squareRow);
        $this->assertEquals(2, $squareRow['purchases_count']);
        $this->assertEquals(15000, $squareRow['total_grand_cents']);
        $this->assertEquals(5000, $squareRow['total_paid_cents']);
        $this->assertEquals(10000, $squareRow['total_due_cents']);
        $this->assertEquals('2026-09-01', $squareRow['oldest_due_date']);
    }

    public function test_print_invoice_view_renders_for_a4_and_pos(): void
    {
        $ctx = $this->setupShop();

        $purchase = Purchase::create([
            'store_id' => $ctx['store']->id,
            'warehouse_id' => $ctx['warehouse']->id,
            'supplier_id' => $ctx['supplierSquare']->id,
            'user_id' => $ctx['owner']->id,
            'reference' => 'PO-PRINT-VIEW-01',
            'purchased_on' => '2026-10-20',
            'status' => 'received',
            'grand_cents' => 10000,
            'paid_cents' => 4000,
            'payment_method' => 'Cash',
        ]);
        PurchaseItem::create([
            'purchase_id' => $purchase->id,
            'product_id' => $ctx['productNapa']->id,
            'qty' => 50,
            'cost_cents' => 200,
            'subtotal_cents' => 10000,
        ]);

        // A4 format
        $resA4 = $this->actingAs($ctx['owner'])->get("/purchase/{$purchase->id}/print?format=a4");
        $resA4->assertOk();
        $resA4->assertSee('PURCHASE INVOICE');
        $resA4->assertSee('PO-PRINT-VIEW-01');
        $resA4->assertSee('Square Pharmaceuticals');

        // POS format
        $resPos = $this->actingAs($ctx['owner'])->get("/purchase/{$purchase->id}/print?format=pos");
        $resPos->assertOk();
        $resPos->assertSee('PURCHASE RECEIPT');
        $resPos->assertSee('PO-PRINT-VIEW-01');
    }

    public function test_purchase_history_returns_audit_log_events(): void
    {
        $ctx = $this->setupShop();

        $purchase = Purchase::create([
            'store_id' => $ctx['store']->id,
            'warehouse_id' => $ctx['warehouse']->id,
            'supplier_id' => $ctx['supplierSquare']->id,
            'user_id' => $ctx['owner']->id,
            'reference' => 'PO-HISTORY-01',
            'purchased_on' => now()->toDateString(),
            'status' => 'received',
            'grand_cents' => 10000,
            'paid_cents' => 0,
            'payment_method' => 'Cash',
        ]);

        AuditLog::record(
            $ctx['store']->id,
            $ctx['owner']->id,
            'purchase.created',
            Purchase::class,
            $purchase->id,
            ['reference' => $purchase->reference]
        );

        $res = $this->actingAs($ctx['owner'])->getJson("/purchase/{$purchase->id}/history");
        $res->assertOk();
        $res->assertJsonCount(1, 'history');
        $this->assertEquals('purchase.created', $res->json('history.0.action'));
    }

    public function test_store_isolation_for_purchases_and_payments(): void
    {
        $ctx1 = $this->setupShop();

        // Shop 2
        $store2 = Store::create([
            'name' => 'Other Pharma',
            'slug' => 'other-pharma',
        ]);
        $owner2 = User::create([
            'name' => 'Other Owner',
            'email' => 'other@test.com',
            'username' => 'otherowner',
            'password' => 'secret123',
            'role' => 'owner',
            'store_id' => $store2->id,
        ]);
        $wh2 = Warehouse::create(['store_id' => $store2->id, 'name' => 'Other WH']);
        $pOther = Purchase::create([
            'store_id' => $store2->id,
            'warehouse_id' => $wh2->id,
            'user_id' => $owner2->id,
            'reference' => 'PO-OTHER-STORE',
            'purchased_on' => now()->toDateString(),
            'status' => 'received',
            'grand_cents' => 5000,
            'paid_cents' => 0,
        ]);

        // Shop 1 user cannot see Shop 2's purchase in list
        $res = $this->actingAs($ctx1['owner'])->getJson('/purchase/list');
        $res->assertOk();
        $references = collect($res->json('data'))->pluck('reference');
        $this->assertFalse($references->contains('PO-OTHER-STORE'));

        // Shop 1 user cannot record payment against Shop 2's purchase
        $resPay = $this->actingAs($ctx1['owner'])->postJson("/purchase/{$pOther->id}/payments", [
            'amount' => '10.00',
        ]);
        $resPay->assertNotFound();
    }
}
