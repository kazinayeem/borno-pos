<?php

namespace Database\Seeders;

use App\Models\Plan;
use App\Models\Setting;
use App\Models\Subscription;
use Database\Seeders\Concerns\InteractsWithDemoStores;
use Illuminate\Database\Seeder;

class SettingsSeeder extends Seeder
{
    use InteractsWithDemoStores;

    public function run(): void
    {
        if ($this->refuseProduction()) {
            return;
        }

        Setting::query()->withoutGlobalScopes()->firstOrCreate(
            ['store_id' => null, 'key' => 'mail'],
            ['value' => json_encode(['host' => '', 'port' => '587', 'username' => '', 'from' => 'support@bornopos.test'])],
        );

        $plan = Plan::query()->where('name', 'Shop')->first();
        $this->eachDemoStore(function ($store) use ($plan): void {
            if (! $store->phone) {
                $store->update([
                    'phone' => '+880 1700 00000'.$store->id,
                    'address' => 'House 12, Road 4, Dhanmondi, Dhaka',
                ]);
            }
            Setting::query()->firstOrCreate(
                ['store_id' => $store->id, 'key' => 'invoice_footer'],
                ['value' => 'Thank you for shopping at '.$store->name.'. Goods sold can be returned with the invoice.'],
            );
            Setting::query()->firstOrCreate(
                ['store_id' => $store->id, 'key' => 'modules'],
                ['value' => json_encode([
                    'product' => true, 'purchase' => true, 'accounting' => true, 'sales' => true,
                    'expense' => true, 'hrm' => true, 'people' => true, 'reports' => true,
                    'subscriptions' => true, 'store' => true,
                ])],
            );
            Setting::query()->firstOrCreate(
                ['store_id' => $store->id, 'key' => 'gateways'],
                ['value' => json_encode([
                    'cash' => ['enabled' => true, 'note' => 'Local cash tender. No external charge is made.'],
                    'paystack' => ['enabled' => false, 'note' => 'Disabled. BornoPos does not charge this gateway.'],
                    'razorpay' => ['enabled' => false, 'note' => 'Disabled. BornoPos does not charge this gateway.'],
                    'paypal' => ['enabled' => false, 'note' => 'Disabled. BornoPos does not charge this gateway.'],
                    'stripe' => ['enabled' => false, 'note' => 'Disabled. BornoPos does not charge this gateway.'],
                ])],
            );
            if ($plan && ! Subscription::query()->where('store_id', $store->id)->exists()) {
                Subscription::query()->create([
                    'store_id' => $store->id,
                    'plan_id' => $plan->id,
                    'status' => 'active',
                    'gateway' => 'cash',
                    'payment_status' => 'paid',
                    'starts_on' => '2026-01-01',
                    'ends_on' => '2026-12-31',
                    'amount_cents' => $plan->price_cents,
                ]);
            }
        });
    }
}
