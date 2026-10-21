<?php

namespace App\Models;

use App\Models\Concerns\BelongsToStore;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Purchase extends Model
{
    use BelongsToStore;

    protected $fillable = [
        'store_id', 'warehouse_id', 'supplier_id', 'user_id', 'account_id', 'reference',
        'purchased_on', 'status', 'subtotal_cents', 'tax_cents', 'discount_cents',
        'shipping_cents', 'grand_cents', 'paid_cents', 'payment_method', 'note', 'document',
    ];

    protected function casts(): array
    {
        return ['purchased_on' => 'date'];
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseItem::class);
    }

    public function payments(): MorphMany
    {
        return $this->morphMany(Payment::class, 'payable');
    }

    public function dueCents(): int
    {
        return max(0, (int) $this->grand_cents - (int) $this->paid_cents);
    }
}
