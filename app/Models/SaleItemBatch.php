<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SaleItemBatch extends Model
{
    protected $fillable = ['sale_item_id', 'batch_id', 'qty', 'returned_qty'];

    public function batch(): BelongsTo
    {
        return $this->belongsTo(Batch::class);
    }

    public function saleItem(): BelongsTo
    {
        return $this->belongsTo(SaleItem::class);
    }
}
