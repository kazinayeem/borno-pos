<?php

namespace App\Models;

use App\Models\Concerns\BelongsToStore;
use Database\Factories\ProductFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    /** @use HasFactory<ProductFactory> */
    use BelongsToStore, HasFactory;

    protected $fillable = [
        'store_id', 'category_id', 'brand_id', 'unit_id', 'sale_unit_id', 'purchase_unit_id',
        'warehouse_id', 'supplier_id', 'tax_id', 'name', 'slug', 'code', 'barcode', 'type', 'cost_cents', 'price_cents',
        'promo_price_cents', 'alert_qty', 'near_expiry_days', 'stock_qty', 'image', 'description', 'details', 'tax_method',
        'is_active', 'featured_in_pos', 'has_serial', 'has_batch', 'has_variant',
        'generic_name', 'strength', 'dosage_form', 'pack_size', 'dar_no', 'route', 'prescription_required', 'therapeutic_class',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'featured_in_pos' => 'boolean',
            'has_serial' => 'boolean',
            'has_batch' => 'boolean',
            'has_variant' => 'boolean',
            'prescription_required' => 'boolean',
            'details' => 'array',
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

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class);
    }

    public function batches(): HasMany
    {
        return $this->hasMany(Batch::class);
    }

    public function serials(): HasMany
    {
        return $this->hasMany(ProductSerial::class);
    }

    public function ingredients(): HasMany
    {
        return $this->hasMany(ProductIngredient::class);
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
