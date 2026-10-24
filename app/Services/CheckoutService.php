<?php

namespace App\Services;

use App\Models\Batch;
use App\Models\Coupon;
use App\Models\Customer;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductSerial;
use App\Models\ProductSerialEvent;
use App\Models\ProductVariant;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SaleItemBatch;
use App\Models\User;
use App\Support\Imei;
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
     * @param  array<int, array{product_id:int, qty:int, serial?:string, batch_id?:int, product_variant_id?:int}>  $lines
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
                if ($status === 'completed') {
                    $this->assertAvailable($product, $qty);
                }

                $price = $product->sellingPriceCents();
                $variantId = ! empty($line['product_variant_id']) ? (int) $line['product_variant_id'] : null;
                if ($variantId) {
                    $variant = ProductVariant::where('product_id', $product->id)->find($variantId);
                    if (! $variant) {
                        throw ValidationException::withMessages(['items' => "Choose a valid variant for {$product->name}."]);
                    }
                    if ((int) $variant->price_cents > 0) {
                        $price = (int) $variant->price_cents;
                    }
                }
                $lineSub = $price * $qty;
                $rate = (int) ($product->tax?->rate_bps ?? 0);
                $lineTax = $product->tax_method === 'inclusive' || $rate === 0
                    ? 0
                    : intdiv($lineSub * $rate, 10000);
                $subtotal += $lineSub;
                $taxTotal += $lineTax;

                $item = SaleItem::create([
                    'sale_id' => $sale->id,
                    'product_id' => $product->id,
                    'product_variant_id' => $variantId,
                    'qty' => $qty,
                    'price_cents' => $price,
                    'cost_cents' => (int) $product->cost_cents,
                    'tax_cents' => $lineTax,
                    'subtotal_cents' => $lineSub,
                    'serial' => isset($line['serial']) ? trim((string) $line['serial']) : null,
                ]);

                if ($status === 'completed') {
                    $this->fulfill($sale, $item, $product, $user, ! empty($line['batch_id']) ? (int) $line['batch_id'] : null);
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
                if (! $product) {
                    throw ValidationException::withMessages([
                        'items' => 'Stock changed. Refresh the draft before completing it.',
                    ]);
                }
                $this->assertAvailable($product, (int) $item->qty);
                $this->fulfill($sale, $item, $product, $user, $item->batch_id ? (int) $item->batch_id : null);
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

    private function assertAvailable(Product $product, int $qty): void
    {
        if (in_array($product->type, ['service', 'digital'], true)) {
            return;
        }
        if ($product->type === 'combo' && $product->ingredients()->exists()) {
            foreach ($product->ingredients as $row) {
                $ingredient = Product::where('store_id', $product->store_id)->lockForUpdate()->find($row->ingredient_id);
                $need = (int) $row->qty * $qty;
                if (! $ingredient || (int) $ingredient->stock_qty < $need) {
                    $name = $ingredient->name ?? 'an ingredient';
                    throw ValidationException::withMessages([
                        'items' => "Not enough {$name} to sell {$product->name}.",
                    ]);
                }
            }

            return;
        }
        if ($product->has_serial && $qty !== 1) {
            throw ValidationException::withMessages(['items' => "Sell {$product->name} one serial number at a time."]);
        }
        if ((int) $product->stock_qty < $qty) {
            throw ValidationException::withMessages([
                'items' => "Only {$product->stock_qty} {$product->name} left in stock.",
            ]);
        }
    }

    private function fulfill(Sale $sale, SaleItem $item, Product $product, User $user, ?int $preferredBatchId): void
    {
        $qty = (int) $item->qty;
        if (in_array($product->type, ['service', 'digital'], true)) {
            return;
        }
        if ($product->type === 'combo' && $product->ingredients()->exists()) {
            foreach ($product->ingredients as $row) {
                $ingredient = Product::where('store_id', $product->store_id)->lockForUpdate()->find($row->ingredient_id);
                $need = (int) $row->qty * $qty;
                $this->inventory->move($ingredient, -$need, 'sale', $sale, $user);
                if ($ingredient->has_batch) {
                    $this->consumeBatches($ingredient, $need, null, null);
                }
            }

            return;
        }
        if ($product->has_serial) {
            $this->sellSerial($product, $item);
        }
        if ($item->product_variant_id) {
            $variant = ProductVariant::where('product_id', $product->id)->lockForUpdate()->find($item->product_variant_id);
            if (! $variant || (int) $variant->stock_qty < $qty) {
                throw ValidationException::withMessages(['items' => "Not enough stock for the selected {$product->name} variant."]);
            }
            $variant->decrement('stock_qty', $qty);
        } elseif ($product->has_variant) {
            $allocated = (int) $product->variants()->sum('stock_qty');
            if ($allocated > 0 && $allocated >= (int) $product->stock_qty) {
                throw ValidationException::withMessages(['items' => "Choose a variant for {$product->name}."]);
            }
        }
        $this->inventory->move($product, -$qty, 'sale', $sale, $user);
        if ($product->has_batch) {
            $this->consumeBatches($product, $qty, $preferredBatchId, $item);
        }
    }

    private function sellSerial(Product $product, SaleItem $item): void
    {
        $identifier = trim((string) $item->serial);
        if ($identifier === '') {
            throw ValidationException::withMessages(['items' => "Enter the serial number or IMEI for {$product->name}."]);
        }
        $serial = ProductSerial::where('store_id', $product->store_id)->where('identifier', $identifier)->lockForUpdate()->first();
        if (! $serial || (int) $serial->product_id !== (int) $product->id || $serial->status !== 'in_stock') {
            throw ValidationException::withMessages(['items' => "{$identifier} is not available to sell."]);
        }
        if ($serial->kind === 'imei' && ! Imei::valid($identifier)) {
            throw ValidationException::withMessages(['items' => "{$identifier} is not a valid IMEI."]);
        }
        $months = (int) ($product->details['warranty_months'] ?? 0);
        $serial->update([
            'status' => 'sold',
            'sale_item_id' => $item->id,
            'warranty_starts_on' => $months > 0 ? now()->toDateString() : null,
            'warranty_ends_on' => $months > 0 ? now()->addMonths($months)->toDateString() : null,
        ]);
        ProductSerialEvent::create([
            'store_id' => $product->store_id,
            'product_serial_id' => $serial->id,
            'kind' => 'sold',
            'happened_on' => now()->toDateString(),
        ]);
    }

    private function consumeBatches(Product $product, int $qty, ?int $preferredId, ?SaleItem $item): void
    {
        $firstId = null;
        if ($preferredId) {
            $preferred = Batch::where('product_id', $product->id)->whereKey($preferredId)->lockForUpdate()->first();
            if (! $preferred || (int) $preferred->qty < 1) {
                throw ValidationException::withMessages(['items' => "{$product->name} does not have that batch in stock."]);
            }
            if ($preferred->expiry_date && $preferred->expiry_date->lt(now()->startOfDay())) {
                throw ValidationException::withMessages(['items' => "Batch {$preferred->batch_no} of {$product->name} is expired."]);
            }
            $take = min($qty, (int) $preferred->qty);
            $preferred->decrement('qty', $take);
            $this->rememberBatch($item, $preferred->id, $take);
            $qty -= $take;
            $firstId = $preferred->id;
        }

        $batches = Batch::where('product_id', $product->id)
            ->where('qty', '>', 0)
            ->where(function ($query) {
                $query->whereNull('expiry_date')->orWhereDate('expiry_date', '>=', now()->toDateString());
            })
            ->orderByRaw('case when expiry_date is null then 1 else 0 end')
            ->orderBy('expiry_date')
            ->lockForUpdate()
            ->get();

        foreach ($batches as $batch) {
            if ($qty <= 0) {
                break;
            }
            if ($preferredId && (int) $batch->id === (int) $preferredId) {
                continue;
            }
            $take = min($qty, (int) $batch->qty);
            $batch->decrement('qty', $take);
            $this->rememberBatch($item, $batch->id, $take);
            $qty -= $take;
            $firstId ??= $batch->id;
        }

        if ($qty > 0) {
            throw ValidationException::withMessages(['items' => "Not enough unexpired batch stock for {$product->name}."]);
        }
        if ($item && $firstId && ! $item->batch_id) {
            $item->update(['batch_id' => $firstId]);
        }
    }

    private function rememberBatch(?SaleItem $item, int $batchId, int $qty): void
    {
        if (! $item || $qty < 1) {
            return;
        }
        SaleItemBatch::create([
            'sale_item_id' => $item->id,
            'batch_id' => $batchId,
            'qty' => $qty,
            'returned_qty' => 0,
        ]);
    }
}
