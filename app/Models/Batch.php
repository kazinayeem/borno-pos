<?php

namespace App\Models;

use App\Models\Concerns\BelongsToStore;
use Illuminate\Database\Eloquent\Model;

class Batch extends Model
{
    use BelongsToStore;

    protected $fillable = ['store_id', 'product_id', 'purchase_item_id', 'batch_no', 'manufactured_on', 'expiry_date', 'qty', 'cost_cents'];

    protected function casts(): array
    {
        return [
            'manufactured_on' => 'date',
            'expiry_date' => 'date',
        ];
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
