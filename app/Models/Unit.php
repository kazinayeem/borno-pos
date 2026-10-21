<?php

namespace App\Models;

use App\Models\Concerns\BelongsToStore;
use Illuminate\Database\Eloquent\Model;

class Unit extends Model
{
    use BelongsToStore;

    protected $fillable = ['store_id', 'name', 'short_name'];
}

