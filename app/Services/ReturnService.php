<?php

namespace App\Services;

use App\Models\Sale;
use App\Models\SaleReturn;
use App\Models\SaleReturnItem;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReturnService
{
    public function __construct(
        private InventoryService $inventory,
        private LedgerService $ledger,
    ) {}

    /**
     * @param  array<int, array{sale_item_id:int, qty:int}>  $lines
     */
    public function refund(Sale $sale, User $user, array $lines, ?string $note = null): SaleReturn
    {
        if ($sale->status !== 'completed') {
            throw ValidationException::withMessages(['sale' => 'Only completed sales can be returned.']);
        }
        if ((int) $sale->store_id !== (int) $user->store_id) {
            abort(403);
        }

        return DB::transaction(function () use ($sale, $user, $lines, $note) {
            $sale->load('items');
            $subtotal = 0;
            $tax = 0;
            $prepared = [];
            foreach ($lines as $line) {
                $qty = (int) ($line['qty'] ?? 0);
                if ($qty < 1) {
                    continue;
                }
                $item = $sale->items->firstWhere('id', (int) $line['sale_item_id']);
                if (! $item) {
                    throw ValidationException::withMessages(['items' => 'A return line does not belong to this invoice.']);
                }
                $already = (int) SaleReturnItem::where('sale_item_id', $item->id)->sum('qty');
                if ($already + $qty > (int) $item->qty) {
                    throw ValidationException::withMessages(['items' => 'Return quantity is higher than the quantity sold.']);
                }
                $lineSub = (int) $item->price_cents * $qty;
                $lineTax = $item->qty > 0 ? intdiv((int) $item->tax_cents * $qty, (int) $item->qty) : 0;
                $subtotal += $lineSub;
                $tax += $lineTax;
                $prepared[] = [$item, $qty, $lineSub, $lineTax];
            }
            if ($prepared === []) {
                throw ValidationException::withMessages(['items' => 'Enter a quantity to return.']);
            }

            $return = SaleReturn::create([
                'store_id' => $sale->store_id,
                'sale_id' => $sale->id,
                'user_id' => $user->id,
                'returned_on' => now()->toDateString(),
                'subtotal_cents' => $subtotal,
                'tax_cents' => $tax,
                'grand_cents' => $subtotal + $tax,
                'note' => $note,
            ]);

            foreach ($prepared as [$item, $qty, $lineSub, $lineTax]) {
                SaleReturnItem::create([
                    'sale_return_id' => $return->id,
                    'product_id' => $item->product_id,
                    'sale_item_id' => $item->id,
                    'qty' => $qty,
                    'price_cents' => $item->price_cents,
                    'cost_cents' => $item->cost_cents,
                    'tax_cents' => $lineTax,
                    'subtotal_cents' => $lineSub,
                ]);
                $product = $item->product()->lockForUpdate()->first();
                $this->inventory->move($product, $qty, 'sale_return', $return, $user);
            }

            $refund = min((int) $return->grand_cents, (int) $sale->paid_cents);
            if ($refund > 0) {
                $account = $this->ledger->defaultAccount((int) $sale->store_id);
                $this->ledger->post(
                    $account,
                    'credit',
                    $refund,
                    'return:'.$return->id.':cash',
                    'Refund '.$sale->invoice_no,
                    $return,
                    $return->returned_on,
                    $user,
                );
                $sale->paid_cents = max(0, (int) $sale->paid_cents - $refund);
                $sale->save();
            }

            return $return->fresh('items');
        });
    }
}
