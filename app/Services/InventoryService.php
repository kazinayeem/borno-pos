<?php

namespace App\Services;

use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class InventoryService
{
    public function move(Product $product, int $qtyChange, string $reason, ?Model $reference, ?User $user = null): Product
    {
        $product->stock_qty = (int) $product->stock_qty + $qtyChange;
        if ($product->stock_qty < 0) {
            throw new \RuntimeException("Not enough stock for {$product->name}.");
        }
        $product->save();

        InventoryMovement::create([
            'store_id' => $product->store_id,
            'product_id' => $product->id,
            'user_id' => $user?->id,
            'qty_change' => $qtyChange,
            'balance_after' => $product->stock_qty,
            'reason' => $reason,
            'reference_type' => $reference ? $reference->getMorphClass() : null,
            'reference_id' => $reference?->getKey(),
        ]);

        return $product;
    }
}
