<?php

namespace App\Models;

use App\Models\Concerns\BelongsToStore;
use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    use BelongsToStore;

    protected $fillable = ['store_id', 'name'];

    public function products()
    {
        return $this->hasMany(Product::class);
    }
}

