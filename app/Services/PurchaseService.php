<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Batch;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\Supplier;
use App\Models\User;
use App\Models\Warehouse;
use App\Support\Money;
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
                    'batch_no' => $line['batch_no'] ?? null,
                    'expiry_date' => ($line['expiry_date'] ?? null) ?: null,
                    'serial' => $line['serial'] ?? null,
                ]);

                $product->cost_cents = $cost;
                $product->warehouse_id = $warehouse->id;
                $product->save();
                $this->inventory->move($product, $qty, 'purchase', $purchase, $user);

                if (! empty($line['batch_no'] ?? null)) {
                    Batch::create([
                        'store_id' => $storeId,
                        'product_id' => $product->id,
                        'purchase_item_id' => $item->id,
                        'batch_no' => $line['batch_no'],
                        'expiry_date' => $line['expiry_date'] ?: null,
                        'qty' => $qty,
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
}
