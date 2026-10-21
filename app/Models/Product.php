<?php

namespace App\Models;

use App\Models\Concerns\BelongsToStore;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    use BelongsToStore;

    protected $fillable = [
        'store_id', 'category_id', 'brand_id', 'unit_id', 'sale_unit_id', 'purchase_unit_id',
        'warehouse_id', 'tax_id', 'name', 'code', 'type', 'cost_cents', 'price_cents',
        'promo_price_cents', 'alert_qty', 'stock_qty', 'image', 'description', 'tax_method',
        'is_active', 'featured_in_pos', 'has_serial', 'has_batch', 'has_variant',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'featured_in_pos' => 'boolean',
            'has_serial' => 'boolean',
            'has_batch' => 'boolean',
            'has_variant' => 'boolean',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    public function tax(): BelongsTo
    {
        return $this->belongsTo(Tax::class);
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class);
    }

    public function movements(): HasMany
    {
        return $this->hasMany(InventoryMovement::class);
    }

    public function sellingPriceCents(): int
    {
        if ($this->promo_price_cents !== null && $this->promo_price_cents >= 0) {
            return (int) $this->promo_price_cents;
        }

        return (int) $this->price_cents;
    }

    public function isLowStock(): bool
    {
        return $this->stock_qty <= $this->alert_qty;
    }
}
