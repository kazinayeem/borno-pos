<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\AccountTransaction;
use App\Models\Attendance;
use App\Models\Category;
use App\Models\Employee;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\MoneyTransfer;
use App\Models\Payroll;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\Sale;
use App\Models\Store;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FullCrudAndSafetyAuditTest extends TestCase
{
    use RefreshDatabase;

    protected Store $store;

    protected User $user;

    protected Account $account;

    protected Warehouse $warehouse;

    protected Unit $unit;

    protected Category $category;

    protected function setUp(): void
    {
        parent::setUp();

        $this->store = Store::create([
            'name' => 'BornoPos Central Pharmacy',
            'slug' => 'central-pharmacy',
            'business_type' => 'pharmacy',
        ]);

        $this->user = User::factory()->create([
            'role' => 'admin',
            'store_id' => $this->store->id,
            'name' => 'Super Admin',
            'email' => 'admin@bornopos.test',
        ]);

        $this->account = Account::create([
            'store_id' => $this->store->id,
            'name' => 'Main Cash Drawer',
            'type' => 'cash',
            'opening_cents' => 100000,
            'is_default' => true,
        ]);

        $this->warehouse = Warehouse::create([
            'store_id' => $this->store->id,
            'name' => 'Central Storage',
        ]);

        $this->unit = Unit::create([
            'store_id' => $this->store->id,
            'name' => 'Box',
            'short_name' => 'box',
            'code' => 'box',
        ]);

        $this->category = Category::create([
            'store_id' => $this->store->id,
            'name' => 'Antibiotics',
        ]);
    }

    public function test_profile_update_route_works_correctly(): void
    {
        $response = $this->actingAs($this->user)->put(route('profile.update'), [
            'name' => 'Updated Admin Name',
            'email' => 'updated.admin@bornopos.test',
            'phone' => '01700000000',
        ]);

        $response->assertSessionHas('status', 'Profile updated.');
        $this->assertDatabaseHas('users', [
            'id' => $this->user->id,
            'name' => 'Updated Admin Name',
            'email' => 'updated.admin@bornopos.test',
        ]);
    }

    public function test_draft_sale_can_be_deleted_but_completed_sale_cannot(): void
    {
        $product = Product::create([
            'store_id' => $this->store->id,
            'name' => 'Paracetamol 500mg',
            'code' => 'PARA500',
            'category_id' => $this->category->id,
            'unit_id' => $this->unit->id,
            'cost_cents' => 200,
            'price_cents' => 350,
            'stock_qty' => 100,
        ]);

        // 1. Create a draft sale
        $draft = Sale::create([
            'store_id' => $this->store->id,
            'user_id' => $this->user->id,
            'invoice_no' => 'DFT-001',
            'subtotal_cents' => 350,
            'grand_cents' => 350,
            'paid_cents' => 0,
            'status' => 'draft',
            'sold_at' => now(),
        ]);

        $response = $this->actingAs($this->user)->deleteJson("/sales/{$draft->id}");
        $response->assertOk();
        $this->assertDatabaseMissing('sales', ['id' => $draft->id]);

        // 2. Create a completed sale
        $completed = Sale::create([
            'store_id' => $this->store->id,
            'user_id' => $this->user->id,
            'invoice_no' => 'INV-001',
            'subtotal_cents' => 350,
            'grand_cents' => 350,
            'paid_cents' => 350,
            'status' => 'completed',
            'sold_at' => now(),
        ]);

        $response2 = $this->actingAs($this->user)->deleteJson("/sales/{$completed->id}");
        $response2->assertStatus(422);
        $this->assertDatabaseHas('sales', ['id' => $completed->id]);
    }

    public function test_catalog_deletion_safely_protects_dependencies(): void
    {
        $product = Product::create([
            'store_id' => $this->store->id,
            'name' => 'Amoxicillin 500mg',
            'code' => 'AMOX500',
            'category_id' => $this->category->id,
            'unit_id' => $this->unit->id,
            'cost_cents' => 500,
            'price_cents' => 800,
            'stock_qty' => 50,
        ]);

        // Trying to delete category when product is attached should fail with 422
        $response = $this->actingAs($this->user)->deleteJson("/categories/{$this->category->id}");
        $response->assertStatus(422);
        $this->assertDatabaseHas('categories', ['id' => $this->category->id]);

        // Delete product first, now category can be deleted
        $product->delete();
        $response2 = $this->actingAs($this->user)->deleteJson("/categories/{$this->category->id}");
        $response2->assertOk();
        $this->assertDatabaseMissing('categories', ['id' => $this->category->id]);
    }

    public function test_purchase_cancellation_reverses_stock_and_ledger(): void
    {
        $product = Product::create([
            'store_id' => $this->store->id,
            'name' => 'Ciprofloxacin 500mg',
            'code' => 'CIPRO500',
            'category_id' => $this->category->id,
            'unit_id' => $this->unit->id,
            'cost_cents' => 1000,
            'price_cents' => 1500,
            'stock_qty' => 20,
        ]);

        $purchase = Purchase::create([
            'store_id' => $this->store->id,
            'user_id' => $this->user->id,
            'warehouse_id' => $this->warehouse->id,
            'reference' => 'PO-AUDIT-001',
            'grand_cents' => 10000,
            'paid_cents' => 10000,
            'status' => 'received',
            'purchased_on' => now()->toDateString(),
        ]);

        PurchaseItem::create([
            'purchase_id' => $purchase->id,
            'product_id' => $product->id,
            'qty' => 10,
            'cost_cents' => 1000,
            'subtotal_cents' => 10000,
        ]);

        // Ledger debit when purchase was paid
        AccountTransaction::create([
            'store_id' => $this->store->id,
            'account_id' => $this->account->id,
            'user_id' => $this->user->id,
            'direction' => 'out',
            'amount_cents' => 10000,
            'description' => 'Purchase payment',
            'source_key' => "purchase:{$purchase->id}",
            'transacted_on' => now()->toDateString(),
        ]);

        $initialStock = $product->fresh()->stock_qty;

        $response = $this->actingAs($this->user)->postJson("/purchase/{$purchase->id}/cancel", [
            'reason' => 'Audit reversal test',
        ]);

        $response->assertOk();
        $purchase->refresh();
        $this->assertEquals('cancelled', $purchase->status);
        $this->assertEquals($initialStock - 10, $product->fresh()->stock_qty);

        // Account should have a reversal transaction
        $this->assertDatabaseHas('account_transactions', [
            'account_id' => $this->account->id,
            'source_key' => "purchase:{$purchase->id}:cancelled",
        ]);
    }

    public function test_money_transfer_reversal_restores_balances(): void
    {
        $destAccount = Account::create([
            'store_id' => $this->store->id,
            'name' => 'Bank Account',
            'type' => 'bank',
            'opening_cents' => 50000,
        ]);

        $transfer = MoneyTransfer::create([
            'store_id' => $this->store->id,
            'from_account_id' => $this->account->id,
            'to_account_id' => $destAccount->id,
            'amount_cents' => 20000,
            'transferred_on' => now()->toDateString(),
        ]);

        AccountTransaction::create([
            'store_id' => $this->store->id,
            'account_id' => $this->account->id,
            'user_id' => $this->user->id,
            'direction' => 'credit',
            'amount_cents' => 20000,
            'description' => 'Transfer out',
            'source_key' => "transfer:{$transfer->id}:out",
            'transacted_on' => now()->toDateString(),
        ]);

        AccountTransaction::create([
            'store_id' => $this->store->id,
            'account_id' => $destAccount->id,
            'user_id' => $this->user->id,
            'direction' => 'debit',
            'amount_cents' => 20000,
            'description' => 'Transfer in',
            'source_key' => "transfer:{$transfer->id}:in",
            'transacted_on' => now()->toDateString(),
        ]);

        $response = $this->actingAs($this->user)->from('/money-transfers')->post(route('transfers.reverse', $transfer));
        $response->assertSessionHas('status', 'Money transfer reversed and balances restored.');

        $this->assertDatabaseHas('account_transactions', [
            'account_id' => $this->account->id,
            'direction' => 'debit',
            'source_key' => "transfer:{$transfer->id}:reversal:in",
        ]);
        $this->assertDatabaseHas('account_transactions', [
            'account_id' => $destAccount->id,
            'direction' => 'credit',
            'source_key' => "transfer:{$transfer->id}:reversal:out",
        ]);
    }

    public function test_expense_deletion_reverses_ledger(): void
    {
        $expCategory = ExpenseCategory::create([
            'store_id' => $this->store->id,
            'name' => 'Electricity & Utilities',
        ]);
        $expense = Expense::create([
            'store_id' => $this->store->id,
            'expense_category_id' => $expCategory->id,
            'account_id' => $this->account->id,
            'user_id' => $this->user->id,
            'spent_on' => now()->toDateString(),
            'amount_cents' => 15000,
            'note' => 'Monthly electricity bill',
        ]);

        AccountTransaction::create([
            'store_id' => $this->store->id,
            'account_id' => $this->account->id,
            'user_id' => $this->user->id,
            'direction' => 'credit',
            'amount_cents' => 15000,
            'description' => 'Expense payment',
            'source_key' => "expense:{$expense->id}",
            'transacted_on' => now()->toDateString(),
        ]);

        $response = $this->actingAs($this->user)->from('/expense')->delete(route('expenses.destroy', $expense));
        $response->assertSessionHas('status', 'Expense deleted and account balance restored.');

        $this->assertDatabaseMissing('expenses', ['id' => $expense->id]);
        $this->assertDatabaseHas('account_transactions', [
            'account_id' => $this->account->id,
            'direction' => 'debit',
            'source_key' => "expense:{$expense->id}:reversal",
        ]);
    }

    public function test_attendance_and_payroll_crud(): void
    {
        $employee = Employee::create([
            'store_id' => $this->store->id,
            'name' => 'John Doe Pharmacist',
            'email' => 'john@bornopos.test',
            'phone' => '01800000000',
            'salary_cents' => 2500000,
            'status' => 'active',
        ]);

        // 1. Attendance CRUD
        $attendance = Attendance::create([
            'store_id' => $this->store->id,
            'employee_id' => $employee->id,
            'attended_on' => now()->toDateString(),
            'status' => 'present',
            'check_in' => '09:00',
            'check_out' => '18:00',
        ]);

        $resp = $this->actingAs($this->user)->getJson('/attendance?employee_id='.$employee->id);
        $resp->assertOk();
        $resp->assertSee('John Doe Pharmacist');

        $delResp = $this->actingAs($this->user)->from('/attendance')->delete("/attendance/{$attendance->id}");
        $delResp->assertSessionHas('status', 'Attendance record deleted.');
        $this->assertDatabaseMissing('attendances', ['id' => $attendance->id]);

        // 2. Payroll CRUD & Reversal
        $payroll = Payroll::create([
            'store_id' => $this->store->id,
            'employee_id' => $employee->id,
            'account_id' => $this->account->id,
            'month' => now()->format('Y-m'),
            'amount_cents' => 2500000,
            'paid_on' => now()->toDateString(),
            'status' => 'paid',
        ]);

        AccountTransaction::create([
            'store_id' => $this->store->id,
            'account_id' => $this->account->id,
            'user_id' => $this->user->id,
            'direction' => 'out',
            'amount_cents' => 2500000,
            'description' => 'Payroll salary payment',
            'source_key' => "payroll:{$payroll->id}",
            'transacted_on' => now()->toDateString(),
        ]);

        $payList = $this->actingAs($this->user)->getJson('/payrolls?month='.now()->format('Y-m'));
        $payList->assertOk();
        $payList->assertSee('John Doe Pharmacist');

        $delPay = $this->actingAs($this->user)->from('/payrolls')->delete("/payrolls/{$payroll->id}");
        $delPay->assertSessionHas('status', 'Payroll deleted and ledger reversed.');
        $this->assertDatabaseMissing('payrolls', ['id' => $payroll->id]);
        $this->assertDatabaseHas('account_transactions', [
            'account_id' => $this->account->id,
            'source_key' => "payroll:{$payroll->id}:reversal",
        ]);
    }
}
