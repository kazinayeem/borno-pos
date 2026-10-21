<?php

namespace App\Models;

use App\Models\Concerns\BelongsToStore;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Sale extends Model
{
    use BelongsToStore;

    protected $fillable = [
        'store_id', 'customer_id', 'user_id', 'warehouse_id', 'invoice_no', 'sold_at', 'status',
        'subtotal_cents', 'discount_cents', 'coupon_cents', 'tax_cents', 'grand_cents', 'paid_cents',
        'payment_method', 'coupon_code', 'note', 'idempotency_key',
    ];

    protected function casts(): array
    {
        return ['sold_at' => 'datetime'];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }

    public function payments(): MorphMany
    {
        return $this->morphMany(Payment::class, 'payable');
    }

    public function returns(): HasMany
    {
        return $this->hasMany(SaleReturn::class);
    }

    public function dueCents(): int
    {
        return max(0, (int) $this->grand_cents - (int) $this->paid_cents);
    }
}
