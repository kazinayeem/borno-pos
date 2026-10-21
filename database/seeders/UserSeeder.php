<?php

namespace Database\Seeders;

use App\Models\Store;
use App\Models\User;
use Database\Seeders\Concerns\InteractsWithDemoStores;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    use InteractsWithDemoStores;

    public function run(): void
    {
        if ($this->refuseProduction()) {
            return;
        }

        $store = Store::query()->where('business_type', 'all_in_one')->first();
        if (! $store) {
            return;
        }

        $password = config('bornopos.demo_password');
        $accounts = [
            ['Manager', 'manager@bornopos.test', 'manager', ['pos', 'products.view', 'products.manage', 'sales.view', 'purchases.manage', 'reports.view']],
            ['Inventory Staff', 'inventory@bornopos.test', 'inventory', ['products.view', 'products.manage', 'purchases.manage']],
            ['Cashier', 'cashier@bornopos.test', 'cashier', ['pos', 'products.view', 'sales.view']],
        ];

        foreach ($accounts as [$name, $email, $username, $permissions]) {
            User::query()->firstOrCreate(
                ['email' => $email],
                [
                    'name' => $name,
                    'username' => $username,
                    'password' => $password,
                    'role' => 'staff',
                    'store_id' => $store->id,
                    'permissions' => $permissions,
                ],
            );
        }
    }
}
