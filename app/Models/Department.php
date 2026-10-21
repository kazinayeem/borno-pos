<?php

namespace App\Models;

use App\Models\Concerns\BelongsToStore;
use Illuminate\Database\Eloquent\Model;

class Department extends Model
{
    use BelongsToStore;

    protected $fillable = ['store_id', 'name'];
}

