<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Store extends Model
{
    protected $fillable = [
        'parent_id',
        'owner_id',
        'name',
        'slug',
        'business_type',
        'email',
        'phone',
        'address',
        'logo',
        'currency_code',
        'currency_symbol',
        'is_active',
        'subscription_status',
        'subscription_expires_at',
        'suspended_at',
        'suspension_reason',
        'active_plan_id',
        'module_overrides',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'subscription_expires_at' => 'datetime',
            'suspended_at' => 'datetime',
            'module_overrides' => 'array',
        ];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class, 'active_plan_id');
    }

    public function parentStore(): BelongsTo
    {
        return $this->belongsTo(Store::class, 'parent_id');
    }

    public function branches(): HasMany
    {
        return $this->hasMany(Store::class, 'parent_id');
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(SubscriptionInvoice::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(SubscriptionPayment::class);
    }

    public function symbol(): string
    {
        return $this->currency_symbol ?: '$';
    }

    public function isSuspended(): bool
    {
        return ! empty($this->suspended_at) || $this->subscription_status === 'suspended';
    }

    public function isExpired(): bool
    {
        if ($this->subscription_status === 'expired') {
            return true;
        }

        return $this->subscription_expires_at && $this->subscription_expires_at->isPast();
    }

    public function isSubscriptionActive(): bool
    {
        if ($this->isSuspended()) {
            return false;
        }

        if ($this->isExpired()) {
            return false;
        }

        return in_array($this->subscription_status, ['active', 'trial', 'payment_pending'], true);
    }
}
