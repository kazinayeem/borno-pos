<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SaleItem extends Model
{
    protected $fillable = ['sale_id','product_id','product_variant_id','batch_id','qty','price_cents','cost_cents','tax_cents','subtotal_cents','serial'];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function sale()
    {
        return $this->belongsTo(Sale::class);
    }

    public function batchAllocations()
    {
        return $this->hasMany(SaleItemBatch::class);
    }
}

