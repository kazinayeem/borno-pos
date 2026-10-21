<?php

namespace Database\Seeders;

use App\Models\Account;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Currency;
use App\Models\Customer;
use App\Models\Department;
use App\Models\Employee;
use App\Models\ExpenseCategory;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Store;
use App\Models\Supplier;
use App\Models\Unit;
use App\Models\User;
use App\Models\UserNotice;
use App\Models\Warehouse;
use App\Services\CheckoutService;
use App\Services\PurchaseService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Auth;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        Currency::query()->insert([
            ['name' => 'US Dollar', 'code' => 'USD', 'symbol' => '$', 'rate_bps' => 10000, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Bangladeshi Taka', 'code' => 'BDT', 'symbol' => '৳', 'rate_bps' => 1100000, 'created_at' => now(), 'updated_at' => now()],
        ]);

        Plan::query()->insert([
            ['name' => 'Starter', 'price_cents' => 0, 'interval' => 'month', 'features' => 'POS, products, and one store.', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Shop', 'price_cents' => 2900, 'interval' => 'month', 'features' => 'Purchases, reports, and payroll.', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Multi-store', 'price_cents' => 7900, 'interval' => 'month', 'features' => 'Branches and a super admin view.', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
        ]);

        User::create([
            'name' => 'Super Admin',
            'email' => 'superadmin@bornopos.test',
            'username' => 'superadmin',
            'password' => config('bornopos.demo_password'),
            'role' => 'super_admin',
        ]);

        $shops = [
            'all_in_one' => ['All in One Mart', 'allinone@bornopos.test', [
                ['Rice 5kg', 'RICE5', 40000, 65000, 'Grocery'],
                ['Notebook', 'NOTE01', 8000, 15000, 'Stationery'],
            ]],
            'grocery' => ['Super Shop', 'grocery@bornopos.test', [
                ['Milk 1L', 'MILK1', 8000, 12000, 'Dairy'],
                ['Eggs 12', 'EGG12', 14000, 18000, 'Dairy'],
            ]],
            'pharmacy' => ['City Pharmacy', 'pharmacy@bornopos.test', [
                ['Paracetamol', 'PARA500', 200, 500, 'Medicine'],
                ['Vitamin C', 'VITC', 1500, 2500, 'Medicine'],
            ]],
            'electronics' => ['Mobile House', 'electronics@bornopos.test', [
                ['USB Cable', 'USB01', 15000, 25000, 'Accessories'],
                ['Earphones', 'EAR01', 40000, 70000, 'Audio'],
            ]],
            'restaurant' => ['Borno Kitchen', 'restaurant@bornopos.test', [
                ['Chicken Biryani', 'BIR01', 18000, 32000, 'Meals'],
                ['Lime Soda', 'SODA', 2000, 6000, 'Drinks'],
            ]],
        ];

        foreach ($shops as $type => [$name, $email, $catalog]) {
            $this->shop($type, $name, $email, $catalog);
        }
    }

    private function shop(string $type, string $name, string $email, array $catalog): void
    {
        $store = Store::create([
            'name' => $name,
            'slug' => str($name)->slug().'-'.$type,
            'business_type' => $type,
            'email' => $email,
            'currency_code' => 'USD',
            'currency_symbol' => '$',
        ]);
        $owner = User::create([
            'name' => 'Admin',
            'email' => $email,
            'username' => str($email)->before('@'),
            'password' => config('bornopos.demo_password'),
            'role' => 'owner',
            'store_id' => $store->id,
        ]);
        $store->update(['owner_id' => $owner->id]);
        if ($type === 'all_in_one') {
            User::create([
                'name' => 'Cashier',
                'email' => 'cashier@bornopos.test',
                'username' => 'cashier',
                'password' => config('bornopos.demo_password'),
                'role' => 'staff',
                'store_id' => $store->id,
                'permissions' => ['pos', 'products.view', 'sales.view'],
            ]);
        }
        $warehouse = Warehouse::create(['store_id' => $store->id, 'name' => 'Main Warehouse']);
        Account::create(['store_id' => $store->id, 'name' => 'Cash', 'number' => 'CASH-001', 'type' => 'cash', 'is_default' => true, 'opening_cents' => 500000]);
        $unit = Unit::create(['store_id' => $store->id, 'name' => 'Piece', 'short_name' => 'pc']);
        $brand = Brand::create(['store_id' => $store->id, 'name' => 'House']);
        $supplier = Supplier::create(['store_id' => $store->id, 'name' => $name.' Supplier', 'phone' => '01700000000']);
        Customer::create(['store_id' => $store->id, 'name' => 'Walk-in Regular', 'phone' => '01800000000']);
        UserNotice::create(['user_id' => $owner->id, 'title' => 'Welcome to '.$name, 'body' => 'Demo data is ready for POS, purchases, and reports.']);

        Auth::login($owner);
        $lines = [];
        foreach ($catalog as [$productName, $code, $cost, $price, $categoryName]) {
            $category = Category::firstOrCreate(['store_id' => $store->id, 'name' => $categoryName]);
            $product = Product::create([
                'store_id' => $store->id,
                'name' => $productName,
                'code' => $code,
                'category_id' => $category->id,
                'brand_id' => $brand->id,
                'unit_id' => $unit->id,
                'warehouse_id' => $warehouse->id,
                'cost_cents' => $cost,
                'price_cents' => $price,
                'alert_qty' => 3,
                'featured_in_pos' => true,
                'has_batch' => $type === 'pharmacy',
            ]);
            $lines[] = [
                'product_id' => $product->id,
                'qty' => 20,
                'cost' => number_format($cost / 100, 2, '.', ''),
                'batch_no' => $type === 'pharmacy' ? 'B-'.$code : null,
                'expiry_date' => $type === 'pharmacy' ? now()->addYear()->toDateString() : null,
            ];
        }

        app(PurchaseService::class)->receive($owner, [
            'warehouse_id' => $warehouse->id,
            'supplier_id' => $supplier->id,
            'purchased_on' => now()->toDateString(),
            'payment_method' => 'Cash',
            'amount_paid' => '50.00',
            'tax' => '0',
            'discount' => '0',
            'shipping' => '0',
        ], $lines);

        $first = Product::first();
        app(CheckoutService::class)->checkout($owner, [
            'status' => 'completed',
            'payment_method' => 'Cash',
            'amount_paid' => number_format($first->price_cents / 100, 2, '.', ''),
            'discount' => '0',
            'idempotency_key' => 'seed-'.$store->id,
        ], [['product_id' => $first->id, 'qty' => 1]]);

        if ($type === 'all_in_one') {
            $category = ExpenseCategory::create(['store_id' => $store->id, 'name' => 'Rent']);
            $department = Department::create(['store_id' => $store->id, 'name' => 'Sales']);
            $employee = Employee::create(['store_id' => $store->id, 'department_id' => $department->id, 'name' => 'Karim', 'salary_cents' => 20000]);
            $expense = \App\Models\Expense::create([
                'store_id' => $store->id,
                'expense_category_id' => $category->id,
                'user_id' => $owner->id,
                'spent_on' => now()->toDateString(),
                'amount_cents' => 100000,
                'note' => 'Counter rent',
            ]);
            app(\App\Services\LedgerService::class)->post(
                Account::where('is_default', true)->first(),
                'credit',
                100000,
                'expense:'.$expense->id,
                'Expense',
                $expense,
                now(),
                $owner,
            );
            $payroll = \App\Models\Payroll::create([
                'store_id' => $store->id,
                'employee_id' => $employee->id,
                'user_id' => $owner->id,
                'month' => now()->format('Y-m'),
                'amount_cents' => 20000,
                'paid_on' => now()->toDateString(),
            ]);
            app(\App\Services\LedgerService::class)->post(
                Account::where('is_default', true)->first(),
                'credit',
                20000,
                'payroll:'.$payroll->id,
                'Salary',
                $payroll,
                now(),
                $owner,
            );
        }
        Auth::logout();
    }
}
