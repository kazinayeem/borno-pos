<?php

namespace App\Models\Concerns;

use App\Models\Store;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait BelongsToStore
{
    public static function bootBelongsToStore(): void
    {
        static::addGlobalScope('store', function (Builder $query) {
            $storeId = auth()->user()?->store_id;
            if ($storeId) {
                $query->where($query->getModel()->qualifyColumn('store_id'), $storeId);
            }
        });

        static::creating(function ($model) {
            if (empty($model->store_id) && auth()->user()?->store_id) {
                $model->store_id = auth()->user()->store_id;
            }
        });
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }
}
