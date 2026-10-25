<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Plan extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'description',
        'price_cents',
        'currency',
        'interval',
        'duration_days',
        'trial_days',
        'max_users',
        'max_stores',
        'max_products',
        'allowed_modules',
        'features',
        'is_active',
        'is_featured',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'is_featured' => 'boolean',
            'sort_order' => 'integer',
            'price_cents' => 'integer',
            'duration_days' => 'integer',
            'trial_days' => 'integer',
            'max_users' => 'integer',
            'max_stores' => 'integer',
            'max_products' => 'integer',
            'allowed_modules' => 'array',
        ];
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    public function stores(): HasMany
    {
        return $this->hasMany(Store::class, 'active_plan_id');
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(SubscriptionInvoice::class);
    }
}
