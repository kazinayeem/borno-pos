<?php

namespace Database\Seeders;

use App\Models\Account;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Holiday;
use App\Models\InventoryMovement;
use App\Models\MoneyTransfer;
use App\Models\Payroll;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\StockCount;
use App\Models\StockCountItem;
use App\Models\Supplier;
use App\Models\Warehouse;
use App\Services\InventoryService;
use App\Services\LedgerService;
use App\Services\PurchaseService;
use Database\Seeders\Concerns\InteractsWithDemoStores;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class AccountingSeeder extends Seeder
{
    use InteractsWithDemoStores;

    public function run(): void
    {
        if ($this->refuseProduction()) {
            return;
        }

        $this->eachDemoStore(function ($store, $owner): void {
            $cash = Account::query()->where('is_default', true)->first();
            $bank = Account::query()->firstOrCreate(
                ['store_id' => $store->id, 'name' => 'Bank'],
                ['number' => 'BANK-'.$store->id, 'type' => 'bank', 'is_default' => false, 'opening_cents' => 0],
            );
            $ledger = app(LedgerService::class);

            if ($cash && ! MoneyTransfer::query()->where('note', 'demo-transfer')->exists()) {
                $transfer = MoneyTransfer::query()->create([
                    'store_id' => $store->id,
                    'from_account_id' => $cash->id,
                    'to_account_id' => $bank->id,
                    'user_id' => $owner->id,
                    'transferred_on' => '2026-09-15',
                    'amount_cents' => 5000,
                    'note' => 'demo-transfer',
                ]);
                $ledger->post($cash, 'credit', 5000, 'transfer:'.$transfer->id.':out', 'Transfer to bank', $transfer, '2026-09-15', $owner);
                $ledger->post($bank, 'debit', 5000, 'transfer:'.$transfer->id.':in', 'Transfer from cash', $transfer, '2026-09-15', $owner);
            }

            $categories = ['Rent', 'Utilities', 'Transport', 'Supplies'];
            foreach ($categories as $name) {
                $category = ExpenseCategory::query()->firstOrCreate(['store_id' => $store->id, 'name' => $name]);
                foreach (['2026-06', '2026-07', '2026-08', '2026-09', '2026-10'] as $month) {
                    $amount = match ($name) {
                        'Rent' => 45000,
                        'Utilities' => 8000,
                        'Transport' => 3500,
                        default => 2200,
                    };
                    $expense = Expense::query()->firstOrCreate(
                        ['store_id' => $store->id, 'note' => 'demo:'.$name.':'.$month],
                        [
                            'expense_category_id' => $category->id,
                            'account_id' => $cash?->id,
                            'user_id' => $owner->id,
                            'spent_on' => $month.'-06',
                            'amount_cents' => $amount,
                        ],
                    );
                    if ($expense->wasRecentlyCreated && $cash) {
                        $ledger->post($cash, 'credit', $amount, 'expense:'.$expense->id, $name, $expense, $expense->spent_on, $owner);
                    }
                }
            }

            foreach (Employee::query()->get() as $employee) {
                foreach (['2026-08', '2026-09', '2026-10'] as $month) {
                    $payroll = Payroll::query()->firstOrCreate(
                        ['employee_id' => $employee->id, 'month' => $month],
                        [
                            'store_id' => $store->id,
                            'account_id' => $cash?->id,
                            'user_id' => $owner->id,
                            'amount_cents' => (int) $employee->salary_cents,
                            'paid_on' => $month.'-28',
                            'note' => 'demo-payroll',
                        ],
                    );
                    if ($payroll->wasRecentlyCreated && $cash) {
                        $ledger->post($cash, 'credit', (int) $payroll->amount_cents, 'payroll:'.$payroll->id, 'Salary '.$employee->name, $payroll, $payroll->paid_on, $owner);
                    }
                }
            }

            foreach ([
                ['Victory Day', '2026-12-16', '2026-12-16'],
                ['Eid holiday', '2026-06-07', '2026-06-09'],
            ] as [$name, $start, $end]) {
                Holiday::query()->firstOrCreate(
                    ['store_id' => $store->id, 'name' => $name],
                    ['starts_on' => $start, 'ends_on' => $end],
                );
            }

            foreach (Employee::query()->get() as $employee) {
                for ($day = 1; $day <= 8; $day++) {
                    $date = now()->subDays($day)->toDateString();
                    $exists = Attendance::query()
                        ->where('employee_id', $employee->id)
                        ->whereDate('attended_on', $date)
                        ->exists();
                    if ($exists) {
                        continue;
                    }
                    Attendance::query()->create([
                        'store_id' => $store->id,
                        'employee_id' => $employee->id,
                        'attended_on' => $date,
                        'status' => $day === 3 ? 'late' : 'present',
                        'check_in' => $day === 3 ? '10:10' : '09:00',
                        'check_out' => '18:00',
                    ]);
                }
            }

            Purchase::query()->where('reference', 'like', 'PO-'.$store->id.'-C%')->get()->each(function (Purchase $purchase) {
                if (preg_match('/-C(\d+)-/', (string) $purchase->reference, $match)) {
                    $date = Carbon::create(2026, 10, 3)->subMonths((int) $match[1])->toDateString();
                    if ($purchase->purchased_on?->toDateString() !== $date) {
                        $purchase->update(['purchased_on' => $date]);
                    }
                }
            });

            $reference = 'DEMO-PO-'.$store->id.'-1';
            $supplier = Supplier::query()->where('name', 'North Grain House')->first() ?: Supplier::query()->first();
            $warehouse = Warehouse::query()->first();
            $lines = Product::query()->where('is_active', true)->orderBy('id')->limit(2)->get();
            if ($supplier && $warehouse && $lines->count() === 2 && ! Purchase::query()->where('reference', $reference)->exists()) {
                app(PurchaseService::class)->receive($owner, [
                    'warehouse_id' => $warehouse->id,
                    'supplier_id' => $supplier->id,
                    'purchased_on' => '2026-08-12',
                    'reference' => $reference,
                    'payment_method' => 'Cash',
                    'amount_paid' => number_format($lines->sum('cost_cents') / 100, 2, '.', ''),
                    'tax' => '0',
                    'discount' => '0',
                    'shipping' => '0',
                ], $lines->map(function (Product $product) {
                    $line = [
                        'product_id' => $product->id,
                        'qty' => 2,
                        'cost' => number_format($product->cost_cents / 100, 2, '.', ''),
                        'batch_no' => $product->has_batch ? 'DEMO-'.$product->code : null,
                        'expiry_date' => $product->has_batch ? '2027-08-12' : null,
                    ];
                    if ($product->has_serial) {
                        $line['identifier_kind'] = 'serial';
                        $line['serial'] = 'DEMO-SN-'.$product->id.'-1,DEMO-SN-'.$product->id.'-2';
                    }

                    return $line;
                })->all());
            }

            if (! StockCount::query()->where('note', 'demo-count')->exists() && $warehouse) {
                $count = StockCount::query()->create([
                    'store_id' => $store->id,
                    'warehouse_id' => $warehouse->id,
                    'user_id' => $owner->id,
                    'counted_on' => '2026-10-01',
                    'status' => 'completed',
                    'note' => 'demo-count',
                ]);
                foreach (Product::query()->orderBy('id')->limit(5)->get() as $product) {
                    StockCountItem::query()->create([
                        'stock_count_id' => $count->id,
                        'product_id' => $product->id,
                        'expected_qty' => $product->stock_qty,
                        'counted_qty' => $product->stock_qty,
                    ]);
                }
            }

            if (! InventoryMovement::query()->where('reason', 'adjustment')->exists()) {
                $product = Product::query()->where('stock_qty', '>', 2)->orderBy('id')->first();
                if ($product) {
                    app(InventoryService::class)->move($product, -1, 'adjustment', null, $owner);
                }
            }
        });
    }
}
