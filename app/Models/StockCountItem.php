<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockCountItem extends Model
{
    protected $fillable = ['stock_count_id','product_id','expected_qty','counted_qty'];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}

