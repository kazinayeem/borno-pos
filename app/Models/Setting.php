<?php

namespace App\Models;

use App\Models\Concerns\BelongsToStore;
use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    use BelongsToStore;

    protected $fillable = ['store_id', 'key', 'value'];
}
