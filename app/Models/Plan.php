<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Plan extends Model
{
    protected $fillable = ['name', 'price_cents', 'interval', 'features', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }
}
