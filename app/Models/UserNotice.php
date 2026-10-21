<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserNotice extends Model
{
    protected $fillable = ['user_id','title','body','read_at'];

    protected function casts(): array
    {
        return ['read_at' => 'datetime'];
    }
}

