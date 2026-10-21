<?php

namespace App\Models;

use App\Models\Concerns\BelongsToStore;
use Illuminate\Database\Eloquent\Model;

class Batch extends Model
{
    use BelongsToStore;

    protected $fillable = ['store_id', 'product_id', 'purchase_item_id', 'batch_no', 'expiry_date', 'qty'];

    protected function casts(): array
    {
        return ['expiry_date' => 'date'];
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}

