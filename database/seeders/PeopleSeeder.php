<?php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\CustomerGroup;
use App\Models\Department;
use App\Models\Employee;
use App\Models\ShopRole;
use App\Models\Supplier;
use Database\Seeders\Concerns\InteractsWithDemoStores;
use Illuminate\Database\Seeder;

class PeopleSeeder extends Seeder
{
    use InteractsWithDemoStores;

    public function run(): void
    {
        if ($this->refuseProduction()) {
            return;
        }

        $this->eachDemoStore(function ($store): void {
            $retail = CustomerGroup::query()->firstOrCreate(
                ['store_id' => $store->id, 'name' => 'Retail'],
                ['discount_bps' => 0],
            );
            $wholesale = CustomerGroup::query()->firstOrCreate(
                ['store_id' => $store->id, 'name' => 'Wholesale'],
                ['discount_bps' => 500],
            );

            $people = [
                ['Rahim Uddin', 'rahim', '01711000001', 'Retail'],
                ['Karim Mia', 'karim', '01711000002', 'Retail'],
                ['Ayesha Khan', 'ayesha', '01711000003', 'Retail'],
                ['Nusrat Jahan', 'nusrat', '01711000004', 'Wholesale'],
                ['Jamal Hossain', 'jamal', '01711000005', 'Retail'],
                ['Rina Akter', 'rina', '01711000006', 'Retail'],
                ['Hasan Ali', 'hasan', '01711000007', 'Wholesale'],
                ['Mitu Rahman', 'mitu', '01711000008', 'Retail'],
                ['Farhana Islam', 'farhana', '01711000009', 'Retail'],
                ['Imran Chowdhury', 'imran', '01711000010', 'Wholesale'],
                ['Sadia Noor', 'sadia', '01711000011', 'Retail'],
                ['Tanvir Ahmed', 'tanvir', '01711000012', 'Retail'],
                ['Lamia Hossain', 'lamia', '01711000013', 'Retail'],
                ['Omar Faruk', 'omar', '01711000014', 'Wholesale'],
                ['Priya Das', 'priya', '01711000015', 'Retail'],
                ['Walk-in Regular', 'walkin', '01800000000', 'Retail'],
            ];
            foreach ($people as [$name, $handle, $phone, $group]) {
                Customer::query()->firstOrCreate(
                    ['store_id' => $store->id, 'name' => $name],
                    [
                        'phone' => $phone,
                        'email' => $handle.'.'.$store->id.'@customers.bornopos.test',
                        'address' => 'Dhaka',
                        'customer_group_id' => $group === 'Wholesale' ? $wholesale->id : $retail->id,
                    ],
                );
            }

            $companies = [
                ['North Grain House', 'Grain House Ltd'],
                ['Fresh Dairy Co', 'Fresh Dairy'],
                ['City Wholesale', 'City Wholesale'],
                ['Metro Supplies', 'Metro Supplies'],
                ['Delta Traders', 'Delta Traders'],
                ['Green Basket', 'Green Basket'],
                ['Padma Distributors', 'Padma Distributors'],
                ['Tech Source BD', 'Tech Source'],
            ];
            foreach ($companies as $index => [$name, $company]) {
                Supplier::query()->firstOrCreate(
                    ['store_id' => $store->id, 'name' => $name],
                    [
                        'company' => $company,
                        'phone' => '016100000'.str_pad((string) $index, 2, '0', STR_PAD_LEFT),
                        'email' => str($name)->slug().'.'.$store->id.'@suppliers.bornopos.test',
                        'address' => 'Chattogram depot',
                    ],
                );
            }

            $departments = ['Sales', 'Inventory', 'Accounts'];
            if ($store->business_type === 'restaurant') {
                $departments[] = 'Kitchen';
            }
            foreach ($departments as $name) {
                Department::query()->firstOrCreate(['store_id' => $store->id, 'name' => $name]);
            }
            $sales = Department::query()->where('name', 'Sales')->first();
            $inventory = Department::query()->where('name', 'Inventory')->first();
            $staff = [
                ['Karim', $sales?->id, 22000],
                ['Nabila', $sales?->id, 18000],
                ['Shakil', $inventory?->id, 20000],
                ['Rupa', $inventory?->id, 17500],
            ];
            foreach ($staff as $index => [$name, $departmentId, $salary]) {
                Employee::query()->firstOrCreate(
                    ['store_id' => $store->id, 'name' => $name],
                    [
                        'department_id' => $departmentId,
                        'email' => str($name)->slug().'.'.$store->id.'@staff.bornopos.test',
                        'phone' => '015100000'.str_pad((string) $index, 2, '0', STR_PAD_LEFT),
                        'salary_cents' => $salary,
                        'joined_on' => '2025-03-01',
                    ],
                );
            }

            foreach ([
                'Manager' => ['pos', 'products.view', 'products.manage', 'sales.view', 'purchases.manage', 'reports.view'],
                'Cashier' => ['pos', 'products.view', 'sales.view'],
                'Inventory Staff' => ['products.view', 'products.manage', 'purchases.manage'],
            ] as $role => $permissions) {
                ShopRole::query()->firstOrCreate(
                    ['store_id' => $store->id, 'name' => $role],
                    ['permissions' => $permissions],
                );
            }
        });
    }
}
