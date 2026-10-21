<?php

namespace App\Models;

use App\Models\Concerns\BelongsToStore;
use Illuminate\Database\Eloquent\Model;

class Coupon extends Model
{
    use BelongsToStore;

    protected $fillable = ['store_id', 'code', 'type', 'value', 'expires_on', 'is_active'];

    protected function casts(): array
    {
        return ['expires_on' => 'date', 'is_active' => 'boolean'];
    }
}

