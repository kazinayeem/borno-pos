<?php

namespace Database\Seeders;

use App\Models\AccountTransaction;
use App\Models\Coupon;
use App\Models\Customer;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Sale;
use App\Services\CheckoutService;
use App\Services\ReturnService;
use Database\Seeders\Concerns\InteractsWithDemoStores;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class SalesSeeder extends Seeder
{
    use InteractsWithDemoStores;

    public function run(): void
    {
        if ($this->refuseProduction()) {
            return;
        }

        $this->eachDemoStore(function ($store, $owner): void {
            Coupon::query()->firstOrCreate(
                ['store_id' => $store->id, 'code' => 'SAVE5'],
                ['type' => 'percent', 'value' => 500, 'expires_on' => '2027-12-31', 'is_active' => true],
            );
            $customers = Customer::query()->orderBy('id')->get();
            $products = Product::query()->where('is_active', true)->where('stock_qty', '>', 0)->orderBy('id')->get();
            if ($products->isEmpty()) {
                return;
            }

            $checkout = app(CheckoutService::class);
            $methods = ['Cash', 'paystack', 'Razorpay', 'PayPal', 'stripe'];
            for ($n = 1; $n <= 20; $n++) {
                $key = 'demo-sale-'.$store->id.'-'.$n;
                if (Sale::query()->where('idempotency_key', $key)->exists()) {
                    continue;
                }
                $product = $products[($store->id * 3 + $n) % $products->count()]->fresh();
                if (! $product || $product->stock_qty < 1) {
                    continue;
                }
                $when = $this->when($n);
                $half = $n % 7 === 0;
                try {
                    $sale = $checkout->checkout($owner, [
                        'status' => 'completed',
                        'payment_method' => $methods[$n % count($methods)],
                        'amount_paid' => $half
                            ? number_format($product->sellingPriceCents() / 200, 2, '.', '')
                            : '9999.00',
                        'discount' => $n % 5 === 0 ? '0.50' : '0',
                        'customer_id' => $customers->isNotEmpty() ? $customers[$n % $customers->count()]->id : null,
                        'idempotency_key' => $key,
                        'note' => 'demo-history',
                    ], [['product_id' => $product->id, 'qty' => 1]]);
                } catch (\Throwable $exception) {
                    $this->command?->warn($store->name.' sale '.$n.' skipped: '.$exception->getMessage());

                    continue;
                }
                $this->backdateSale($sale, $when);
            }

            for ($n = 1; $n <= 3; $n++) {
                $key = 'demo-draft-'.$store->id.'-'.$n;
                if (Sale::query()->where('idempotency_key', $key)->exists()) {
                    continue;
                }
                $product = $products[$n % $products->count()];
                try {
                    $sale = $checkout->checkout($owner, [
                        'status' => 'draft',
                        'payment_method' => 'Cash',
                        'amount_paid' => '0',
                        'discount' => '0',
                        'idempotency_key' => $key,
                        'note' => 'demo-draft',
                    ], [['product_id' => $product->id, 'qty' => 1]]);
                    $sale->update(['sold_at' => now()->subDays($n)]);
                } catch (\Throwable $exception) {
                    $this->command?->warn($store->name.' draft '.$n.' skipped: '.$exception->getMessage());
                }
            }

            $returns = app(ReturnService::class);
            foreach ([4, 9] as $n) {
                $sale = Sale::query()->where('idempotency_key', 'demo-sale-'.$store->id.'-'.$n)->with('items')->first();
                if (! $sale || $sale->status !== 'completed' || $sale->returns()->exists()) {
                    continue;
                }
                $item = $sale->items->first();
                if (! $item) {
                    continue;
                }
                $return = $returns->refund($sale, $owner, [['sale_item_id' => $item->id, 'qty' => 1]], 'demo-return');
                $date = $sale->sold_at->copy()->addDay()->toDateString();
                $return->update(['returned_on' => $date]);
                AccountTransaction::query()->where('source_key', 'return:'.$return->id.':cash')->update(['transacted_on' => $date]);
            }
        });
    }

    private function when(int $n): Carbon
    {
        if ($n === 1) {
            return now();
        }
        if ($n <= 6) {
            return now()->subDays($n - 1)->setTime(11, 0);
        }
        if ($n <= 12) {
            return now()->startOfMonth()->addDays($n - 5)->setTime(15, 0);
        }

        return now()->subMonths($n - 11)->day(8)->setTime(16, 0);
    }

    private function backdateSale(Sale $sale, Carbon $when): void
    {
        $sale->update(['sold_at' => $when]);
        Payment::query()->where('source_key', 'sale:'.$sale->id.':payment')->update(['paid_at' => $when]);
        AccountTransaction::query()->where('source_key', 'sale:'.$sale->id.':cash')->update([
            'transacted_on' => $when->toDateString(),
        ]);
    }
}
