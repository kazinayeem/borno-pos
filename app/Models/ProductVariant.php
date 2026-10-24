<?php

namespace App\Models;

use App\Models\Concerns\BelongsToStore;
use Illuminate\Database\Eloquent\Model;

class ProductVariant extends Model
{
    use BelongsToStore;

    protected $fillable = ['store_id', 'product_id', 'name', 'sku', 'barcode', 'price_cents', 'stock_qty', 'attributes'];

    protected function casts(): array
    {
        return ['attributes' => 'array'];
    }
}
