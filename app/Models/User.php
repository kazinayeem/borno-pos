<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

#[Fillable(['name', 'email', 'password', 'username', 'phone', 'role', 'role_id', 'is_active', 'store_id', 'locale', 'permissions', 'last_login_at', 'last_login_ip'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    protected $attributes = [
        'is_active' => true,
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'permissions' => 'array',
        ];
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function shopRole(): BelongsTo
    {
        return $this->belongsTo(ShopRole::class, 'role_id');
    }

    public function notices(): HasMany
    {
        return $this->hasMany(UserNotice::class);
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === 'super_admin' || $this->role === 'admin';
    }

    public function isOwner(): bool
    {
        return $this->role === 'owner';
    }

    /**
     * Get all effective permissions for the user (from assigned role and direct overrides).
     *
     * @return array<int, string>
     */
    public function allPermissions(): array
    {
        if ($this->isSuperAdmin() || $this->isOwner()) {
            return ['*'];
        }

        $rolePermissions = $this->shopRole?->permissions ?? [];
        $directPermissions = $this->permissions ?? [];

        return array_values(array_unique(array_merge($rolePermissions, $directPermissions)));
    }

    /**
     * Check if user has a specific permission or capability.
     */
    public function canDo(string $ability): bool
    {
        if (! $this->is_active) {
            return false;
        }

        if ($this->isSuperAdmin() || $this->isOwner()) {
            return true;
        }

        $all = $this->allPermissions();

        if (in_array('*', $all, true) || in_array($ability, $all, true)) {
            return true;
        }

        // Backward compatibility mappings
        if ($ability === 'products.manage') {
            return in_array('products.create', $all, true)
                || in_array('products.edit', $all, true)
                || in_array('products.delete', $all, true)
                || in_array('products.manage', $all, true);
        }

        if ($ability === 'pos') {
            return in_array('pos.view', $all, true)
                || in_array('pos.create', $all, true)
                || in_array('pos', $all, true);
        }

        if ($ability === 'purchases.manage') {
            return in_array('purchases.create', $all, true)
                || in_array('purchases.edit', $all, true)
                || in_array('purchases.delete', $all, true)
                || in_array('purchases.manage', $all, true);
        }

        return false;
    }

    public function roleTitle(): string
    {
        if ($this->shopRole) {
            return $this->shopRole->name;
        }

        return ucwords(str_replace('_', ' ', $this->role));
    }

    public function homeRoute(): string
    {
        if ($this->isSuperAdmin()) {
            return 'dashboard';
        }

        if ($this->isOwner() || $this->canDo('dashboard.view')) {
            return 'store.dashboard';
        }

        if ($this->canDo('pos.view') || $this->canDo('pos')) {
            return 'pos';
        }

        if ($this->canDo('sales.view')) {
            return 'sales.index';
        }

        if ($this->canDo('products.view')) {
            return 'products.index';
        }

        if ($this->canDo('accounting.view')) {
            return 'accounts.index';
        }

        return 'store.dashboard';
    }
}
