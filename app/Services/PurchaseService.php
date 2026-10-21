<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Batch;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductSerial;
use App\Models\ProductSerialEvent;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\Supplier;
use App\Models\User;
use App\Models\Warehouse;
use App\Support\Imei;
use App\Support\Money;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PurchaseService
{
    public function __construct(
        private InventoryService $inventory,
        private LedgerService $ledger,
    ) {}

    /**
     * @param  array<int, array{product_id:int, qty:int, cost?:mixed, batch_no?:string, expiry_date?:string, serial?:string}>  $lines
     */
    public function receive(User $user, array $data, array $lines): Purchase
    {
        if ($lines === []) {
            throw ValidationException::withMessages(['items' => 'Add at least one product.']);
        }

        return DB::transaction(function () use ($user, $data, $lines) {
            $storeId = $user->store_id;
            $warehouse = Warehouse::where('store_id', $storeId)->find($data['warehouse_id'] ?? null);
            if (! $warehouse) {
                throw ValidationException::withMessages(['warehouse_id' => 'Choose a warehouse for this shop.']);
            }
            if (! empty($data['supplier_id']) && ! Supplier::where('store_id', $storeId)->whereKey($data['supplier_id'])->exists()) {
                throw ValidationException::withMessages(['supplier_id' => 'Choose a supplier for this shop.']);
            }

            $tax = Money::parse($data['tax'] ?? 0);
            $discount = Money::parse($data['discount'] ?? 0);
            $shipping = Money::parse($data['shipping'] ?? 0);
            $paid = Money::parse($data['amount_paid'] ?? 0);

            $purchase = Purchase::create([
                'store_id' => $storeId,
                'warehouse_id' => $warehouse->id,
                'supplier_id' => $data['supplier_id'] ?: null,
                'user_id' => $user->id,
                'reference' => $data['reference'] ?? ('PO-'.now()->format('Ymd-His')),
                'purchased_on' => $data['purchased_on'] ?? now()->toDateString(),
                'status' => 'received',
                'payment_method' => $data['payment_method'] ?? 'Cash',
                'note' => $data['note'] ?? null,
                'document' => $data['document'] ?? null,
                'subtotal_cents' => 0,
                'tax_cents' => $tax,
                'discount_cents' => $discount,
                'shipping_cents' => $shipping,
                'grand_cents' => 0,
                'paid_cents' => 0,
            ]);

            $subtotal = 0;
            foreach ($lines as $line) {
                $qty = (int) $line['qty'];
                if ($qty < 1) {
                    throw ValidationException::withMessages(['items' => 'Quantity must be at least 1.']);
                }
                $product = Product::where('store_id', $storeId)->lockForUpdate()->find($line['product_id']);
                if (! $product) {
                    throw ValidationException::withMessages(['items' => 'A selected product is not available.']);
                }
                $serials = $product->has_serial ? $this->serialList($line, $qty, $product) : [];
                $batchNo = $this->preparedBatch($product, $line);
                $cost = array_key_exists('cost', $line) && $line['cost'] !== '' && $line['cost'] !== null
                    ? Money::parse($line['cost'])
                    : (int) $product->cost_cents;
                $row = $cost * $qty;
                $subtotal += $row;

                $item = PurchaseItem::create([
                    'purchase_id' => $purchase->id,
                    'product_id' => $product->id,
                    'qty' => $qty,
                    'cost_cents' => $cost,
                    'subtotal_cents' => $row,
                    'batch_no' => $batchNo,
                    'expiry_date' => ($line['expiry_date'] ?? null) ?: null,
                    'serial' => $serials !== [] ? implode(',', $serials) : (($line['serial'] ?? null) ?: null),
                ]);

                $product->cost_cents = $cost;
                $product->warehouse_id = $warehouse->id;
                $product->save();
                $this->inventory->move($product, $qty, 'purchase', $purchase, $user);

                if ($batchNo && $product->has_batch) {
                    $this->storeBatch($storeId, $product, $item->id, $batchNo, $line, $qty, $cost);
                }
                foreach ($serials as $identifier) {
                    $kind = ($line['identifier_kind'] ?? 'serial') === 'imei' ? 'imei' : 'serial';
                    $serial = ProductSerial::create([
                        'store_id' => $storeId,
                        'product_id' => $product->id,
                        'purchase_item_id' => $item->id,
                        'identifier' => $identifier,
                        'kind' => $kind,
                        'status' => 'in_stock',
                    ]);
                    ProductSerialEvent::create([
                        'store_id' => $storeId,
                        'product_serial_id' => $serial->id,
                        'kind' => 'received',
                        'happened_on' => $purchase->purchased_on,
                    ]);
                }
            }

            $grand = max(0, $subtotal + $tax + $shipping - $discount);
            if ($paid > $grand) {
                throw ValidationException::withMessages(['amount_paid' => 'Paid amount cannot exceed the purchase total.']);
            }

            $purchase->update([
                'subtotal_cents' => $subtotal,
                'grand_cents' => $grand,
                'paid_cents' => $paid,
            ]);

            if ($paid > 0) {
                $account = Account::where('store_id', $storeId)->find($data['account_id'] ?? null)
                    ?? $this->ledger->defaultAccount($storeId);
                $purchase->update(['account_id' => $account->id]);
                Payment::create([
                    'store_id' => $storeId,
                    'payable_type' => $purchase->getMorphClass(),
                    'payable_id' => $purchase->id,
                    'account_id' => $account->id,
                    'user_id' => $user->id,
                    'method' => $purchase->payment_method,
                    'amount_cents' => $paid,
                    'paid_at' => now(),
                    'source_key' => 'purchase:'.$purchase->id.':payment',
                ]);
                $this->ledger->post(
                    $account,
                    'credit',
                    $paid,
                    'purchase:'.$purchase->id.':cash',
                    'Purchase '.$purchase->reference,
                    $purchase,
                    $purchase->purchased_on,
                    $user,
                );
            }

            return $purchase->fresh('items');
        });
    }

    /**
     * @param  array<string, mixed>  $line
     * @return array<int, string>
     */
    private function serialList(array $line, int $qty, Product $product): array
    {
        $serials = $line['serials'] ?? null;
        if (! is_array($serials)) {
            $one = trim((string) ($line['serial'] ?? ''));
            $serials = $one === '' ? [] : array_map('trim', explode(',', $one));
        }
        $serials = array_values(array_filter(array_map(fn ($value) => trim((string) $value), $serials), fn ($value) => $value !== ''));
        if (count($serials) !== $qty) {
            throw ValidationException::withMessages(['items' => "{$product->name} needs one serial number for each unit."]);
        }
        $kind = ($line['identifier_kind'] ?? 'serial') === 'imei' ? 'imei' : 'serial';
        foreach ($serials as $identifier) {
            if ($kind === 'imei' && ! Imei::valid($identifier)) {
                throw ValidationException::withMessages(['items' => "{$identifier} is not a valid IMEI."]);
            }
            if ($kind === 'serial' && ! preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/', $identifier)) {
                throw ValidationException::withMessages(['items' => "{$identifier} is not a valid serial number."]);
            }
            $taken = ProductSerial::where('store_id', $product->store_id)->where('identifier', $identifier)->exists();
            if ($taken || count(array_unique($serials)) !== count($serials)) {
                throw ValidationException::withMessages(['items' => "{$identifier} is already used in this shop."]);
            }
        }

        return $serials;
    }

    /**
     * @param  array<string, mixed>  $line
     */
    private function preparedBatch(Product $product, array $line): ?string
    {
        $batchNo = trim((string) ($line['batch_no'] ?? ''));
        if ($product->has_batch && ($batchNo === '' || empty($line['expiry_date']))) {
            throw ValidationException::withMessages(['items' => "{$product->name} needs a batch number and an expiry date."]);
        }
        if ($batchNo === '') {
            return null;
        }
        if (empty($line['expiry_date'])) {
            throw ValidationException::withMessages(['items' => "Batch {$batchNo} needs an expiry date."]);
        }
        if (Carbon::parse($line['expiry_date'])->startOfDay()->lt(now()->startOfDay())) {
            throw ValidationException::withMessages(['items' => "Batch {$batchNo} for {$product->name} is already expired."]);
        }
        if (! empty($line['manufactured_on']) && Carbon::parse($line['manufactured_on'])->startOfDay()->gt(Carbon::parse($line['expiry_date'])->startOfDay())) {
            throw ValidationException::withMessages(['items' => "Batch {$batchNo} expires before its manufacturing date."]);
        }

        return $batchNo;
    }

    /**
     * @param  array<string, mixed>  $line
     */
    private function storeBatch(int $storeId, Product $product, int $purchaseItemId, string $batchNo, array $line, int $qty, int $cost): void
    {
        $existing = Batch::where('product_id', $product->id)->where('batch_no', $batchNo)->lockForUpdate()->first();
        $expiry = Carbon::parse($line['expiry_date'])->toDateString();
        if ($existing) {
            $current = optional($existing->expiry_date)->toDateString();
            if ($current && $current !== $expiry) {
                throw ValidationException::withMessages(['items' => "Batch {$batchNo} is already recorded with a different expiry date."]);
            }
            $existing->increment('qty', $qty);
            $existing->update([
                'expiry_date' => $expiry,
                'cost_cents' => $cost,
                'manufactured_on' => ($line['manufactured_on'] ?? null) ?: $existing->manufactured_on,
            ]);

            return;
        }
        Batch::create([
            'store_id' => $storeId,
            'product_id' => $product->id,
            'purchase_item_id' => $purchaseItemId,
            'batch_no' => $batchNo,
            'manufactured_on' => ($line['manufactured_on'] ?? null) ?: null,
            'expiry_date' => $expiry,
            'qty' => $qty,
            'cost_cents' => $cost,
        ]);
    }
}
