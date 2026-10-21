<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PurchaseItem extends Model
{
    protected $fillable = ['purchase_id','product_id','qty','cost_cents','subtotal_cents','batch_no','expiry_date','serial'];

    protected function casts(): array
    {
        return ['expiry_date' => 'date'];
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function purchase()
    {
        return $this->belongsTo(Purchase::class);
    }
}

