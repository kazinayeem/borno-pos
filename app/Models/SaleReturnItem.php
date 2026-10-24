<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SaleReturnItem extends Model
{
    protected $fillable = ['sale_return_id', 'product_id', 'sale_item_id', 'qty', 'price_cents', 'cost_cents', 'tax_cents', 'subtotal_cents'];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
