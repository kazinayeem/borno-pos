<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Batch;
use App\Models\Coupon;
use App\Models\Customer;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\User;
use App\Support\Money;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CheckoutService
{
    public function __construct(
        private InventoryService $inventory,
        private LedgerService $ledger,
    ) {}

    /**
     * @param  array<int, array{product_id:int, qty:int, serial?:string}>  $lines
     */
    public function checkout(User $user, array $data, array $lines): Sale
    {
        $key = $data['idempotency_key'] ?? null;
        if ($key) {
            $existing = Sale::withoutGlobalScopes()->where('idempotency_key', $key)->first();
            if ($existing) {
                if ((int) $existing->store_id !== (int) $user->store_id) {
                    abort(403);
                }

                return $existing;
            }
        }

        if ($lines === []) {
            throw ValidationException::withMessages(['items' => 'Add at least one product to the cart.']);
        }

        return DB::transaction(function () use ($user, $data, $lines, $key) {
            $storeId = (int) $user->store_id;
            $status = ($data['status'] ?? 'completed') === 'draft' ? 'draft' : 'completed';
            $customer = null;
            if (! empty($data['customer_id'])) {
                $customer = Customer::where('store_id', $storeId)->find($data['customer_id']);
                if (! $customer) {
                    throw ValidationException::withMessages(['customer_id' => 'Choose a customer from this shop.']);
                }
            }

            $sale = Sale::create([
                'store_id' => $storeId,
                'customer_id' => $customer?->id,
                'user_id' => $user->id,
                'invoice_no' => 'posr-'.now()->format('Ymd-His').'-'.random_int(10, 99),
                'sold_at' => now(),
                'status' => $status,
                'payment_method' => $data['payment_method'] ?? 'Cash',
                'coupon_code' => $data['coupon_code'] ?? null,
                'note' => $data['note'] ?? null,
                'idempotency_key' => $key,
                'subtotal_cents' => 0,
                'discount_cents' => 0,
                'coupon_cents' => 0,
                'tax_cents' => 0,
                'grand_cents' => 0,
                'paid_cents' => 0,
            ]);

            $subtotal = 0;
            $taxTotal = 0;
            foreach ($lines as $line) {
                $qty = (int) $line['qty'];
                if ($qty < 1) {
                    throw ValidationException::withMessages(['items' => 'Quantity must be at least 1.']);
                }
                $product = Product::where('store_id', $storeId)->lockForUpdate()->find($line['product_id']);
                if (! $product || ! $product->is_active) {
                    throw ValidationException::withMessages(['items' => 'A selected product is not available.']);
                }
                if ($status === 'completed' && $product->stock_qty < $qty) {
                    throw ValidationException::withMessages([
                        'items' => "Only {$product->stock_qty} {$product->name} left in stock.",
                    ]);
                }

                $price = $product->sellingPriceCents();
                $lineSub = $price * $qty;
                $rate = (int) ($product->tax?->rate_bps ?? 0);
                $lineTax = $product->tax_method === 'inclusive' || $rate === 0
                    ? 0
                    : intdiv($lineSub * $rate, 10000);
                $subtotal += $lineSub;
                $taxTotal += $lineTax;

                SaleItem::create([
                    'sale_id' => $sale->id,
                    'product_id' => $product->id,
                    'qty' => $qty,
                    'price_cents' => $price,
                    'cost_cents' => (int) $product->cost_cents,
                    'tax_cents' => $lineTax,
                    'subtotal_cents' => $lineSub,
                    'serial' => $line['serial'] ?? null,
                ]);

                if ($status === 'completed') {
                    $this->inventory->move($product, -$qty, 'sale', $sale, $user);
                    $this->consumeBatches($product, $qty);
                }
            }

            $discount = min(Money::parse($data['discount'] ?? 0), $subtotal);
            $couponCents = $this->couponDiscount($storeId, $data['coupon_code'] ?? null, $subtotal - $discount);
            $grand = max(0, $subtotal - $discount - $couponCents + $taxTotal);
            $paid = $status === 'draft' ? 0 : Money::parse($data['amount_paid'] ?? 0);
            if ($paid > $grand) {
                $paid = $grand;
            }

            $sale->update([
                'subtotal_cents' => $subtotal,
                'discount_cents' => $discount,
                'coupon_cents' => $couponCents,
                'tax_cents' => $taxTotal,
                'grand_cents' => $grand,
                'paid_cents' => $paid,
                'coupon_code' => $couponCents > 0 ? ($data['coupon_code'] ?? null) : null,
            ]);

            if ($status === 'completed' && $paid > 0) {
                $account = $this->ledger->defaultAccount($storeId);
                Payment::create([
                    'store_id' => $storeId,
                    'payable_type' => $sale->getMorphClass(),
                    'payable_id' => $sale->id,
                    'account_id' => $account->id,
                    'user_id' => $user->id,
                    'method' => $sale->payment_method,
                    'amount_cents' => $paid,
                    'paid_at' => now(),
                    'source_key' => 'sale:'.$sale->id.':payment',
                ]);
                $this->ledger->post(
                    $account,
                    'debit',
                    $paid,
                    'sale:'.$sale->id.':cash',
                    'Sale '.$sale->invoice_no,
                    $sale,
                    $sale->sold_at,
                    $user,
                );
            }

            return $sale->fresh(['items.product', 'customer', 'payments']);
        });
    }

    public function completeDraft(Sale $sale, User $user, int $paidCents, string $method): Sale
    {
        if ($sale->status !== 'draft') {
            return $sale;
        }

        return DB::transaction(function () use ($sale, $user, $paidCents, $method) {
            $sale = Sale::whereKey($sale->id)->lockForUpdate()->firstOrFail();
            foreach ($sale->items as $item) {
                $product = Product::where('store_id', $sale->store_id)->lockForUpdate()->find($item->product_id);
                if (! $product || $product->stock_qty < $item->qty) {
                    throw ValidationException::withMessages([
                        'items' => 'Stock changed. Refresh the draft before completing it.',
                    ]);
                }
                $this->inventory->move($product, -(int) $item->qty, 'sale', $sale, $user);
                $this->consumeBatches($product, (int) $item->qty);
            }
            $paid = min($paidCents, (int) $sale->grand_cents);
            $sale->update([
                'status' => 'completed',
                'paid_cents' => $paid,
                'payment_method' => $method,
                'sold_at' => now(),
            ]);
            if ($paid > 0) {
                $account = $this->ledger->defaultAccount((int) $sale->store_id);
                Payment::create([
                    'store_id' => $sale->store_id,
                    'payable_type' => $sale->getMorphClass(),
                    'payable_id' => $sale->id,
                    'account_id' => $account->id,
                    'user_id' => $user->id,
                    'method' => $method,
                    'amount_cents' => $paid,
                    'paid_at' => now(),
                    'source_key' => 'sale:'.$sale->id.':payment',
                ]);
                $this->ledger->post($account, 'debit', $paid, 'sale:'.$sale->id.':cash', 'Sale '.$sale->invoice_no, $sale, now(), $user);
            }

            return $sale->fresh(['items.product', 'customer']);
        });
    }

    private function couponDiscount(int $storeId, ?string $code, int $base): int
    {
        if (! $code || $base <= 0) {
            return 0;
        }
        $coupon = Coupon::where('store_id', $storeId)->where('code', $code)->where('is_active', true)->first();
        if (! $coupon || ($coupon->expires_on && $coupon->expires_on->isPast())) {
            throw ValidationException::withMessages(['coupon_code' => 'That coupon is not valid.']);
        }
        if ($coupon->type === 'percent') {
            return min($base, intdiv($base * (int) $coupon->value, 10000));
        }

        return min($base, (int) $coupon->value);
    }

    private function consumeBatches(Product $product, int $qty): void
    {
        $batches = Batch::where('product_id', $product->id)->where('qty', '>', 0)->orderBy('expiry_date')->lockForUpdate()->get();
        foreach ($batches as $batch) {
            if ($qty <= 0) {
                break;
            }
            $take = min($qty, (int) $batch->qty);
            $batch->decrement('qty', $take);
            $qty -= $take;
        }
    }
}
