<?php

namespace App\Models;

use App\Models\Concerns\BelongsToStore;
use Illuminate\Database\Eloquent\Model;

class InventoryMovement extends Model
{
    use BelongsToStore;

    protected $fillable = ['store_id', 'product_id', 'user_id', 'qty_change', 'balance_after', 'reason', 'reference_type', 'reference_id'];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
