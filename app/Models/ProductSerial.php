<?php

namespace App\Models;

use App\Models\Concerns\BelongsToStore;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductSerial extends Model
{
    use BelongsToStore;

    protected $fillable = [
        'store_id', 'product_id', 'purchase_item_id', 'sale_item_id', 'identifier', 'kind', 'status',
        'warranty_starts_on', 'warranty_ends_on',
    ];

    protected function casts(): array
    {
        return [
            'warranty_starts_on' => 'date',
            'warranty_ends_on' => 'date',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(ProductSerialEvent::class);
    }
}
