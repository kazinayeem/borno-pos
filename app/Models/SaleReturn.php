<?php

namespace App\Models;

use App\Models\Concerns\BelongsToStore;
use Illuminate\Database\Eloquent\Model;

class SaleReturn extends Model
{
    use BelongsToStore;

    protected $fillable = ['store_id', 'sale_id', 'user_id', 'returned_on', 'subtotal_cents', 'tax_cents', 'grand_cents', 'note'];

    protected function casts(): array
    {
        return ['returned_on' => 'date'];
    }

    public function sale()
    {
        return $this->belongsTo(Sale::class);
    }

    public function items()
    {
        return $this->hasMany(SaleReturnItem::class);
    }
}

