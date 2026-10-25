<?php

namespace App\Models;

use App\Models\Concerns\BelongsToStore;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SubscriptionInvoice extends Model
{
    use BelongsToStore;

    protected $fillable = [
        'invoice_no',
        'store_id',
        'subscription_id',
        'plan_id',
        'billing_period',
        'starts_on',
        'ends_on',
        'subtotal_cents',
        'discount_cents',
        'tax_cents',
        'total_cents',
        'paid_cents',
        'due_cents',
        'status',
        'due_date',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'starts_on' => 'date',
            'ends_on' => 'date',
            'due_date' => 'date',
            'subtotal_cents' => 'integer',
            'discount_cents' => 'integer',
            'tax_cents' => 'integer',
            'total_cents' => 'integer',
            'paid_cents' => 'integer',
            'due_cents' => 'integer',
        ];
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(SubscriptionPayment::class, 'invoice_id');
    }

    public static function generateInvoiceNo(): string
    {
        $prefix = 'INV-SUB-'.now()->format('Ymd');
        $count = static::withoutGlobalScopes()->whereDate('created_at', now()->toDateString())->count() + 1;

        return sprintf('%s-%04d', $prefix, $count);
    }
}
