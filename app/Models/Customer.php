<?php

namespace App\Models;

use App\Models\Concerns\BelongsToStore;
use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    use BelongsToStore;

    protected $fillable = ['store_id', 'customer_group_id', 'name', 'email', 'phone', 'address'];

    public function group()
    {
        return $this->belongsTo(CustomerGroup::class, 'customer_group_id');
    }
}
