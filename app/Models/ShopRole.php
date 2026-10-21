<?php

namespace App\Models;

use App\Models\Concerns\BelongsToStore;
use Illuminate\Database\Eloquent\Model;

class ShopRole extends Model
{
    use BelongsToStore;

    protected $fillable = ['store_id', 'name', 'permissions'];

    protected function casts(): array
    {
        return ['permissions' => 'array'];
    }
}

