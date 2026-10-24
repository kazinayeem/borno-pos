<?php

namespace App\Models;

use App\Models\Concerns\BelongsToStore;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    use BelongsToStore;

    protected $fillable = ['store_id', 'payable_type', 'payable_id', 'account_id', 'user_id', 'method', 'amount_cents', 'paid_at', 'source_key'];

    protected function casts(): array
    {
        return ['paid_at' => 'datetime'];
    }

    public function payable()
    {
        return $this->morphTo();
    }

    public function account()
    {
        return $this->belongsTo(Account::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
