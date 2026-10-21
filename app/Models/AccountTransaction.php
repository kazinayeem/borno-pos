<?php

namespace App\Models;

use App\Models\Concerns\BelongsToStore;
use Illuminate\Database\Eloquent\Model;

class AccountTransaction extends Model
{
    use BelongsToStore;

    protected $fillable = ['store_id', 'account_id', 'user_id', 'transacted_on', 'direction', 'amount_cents', 'description', 'reference_type', 'reference_id', 'source_key'];

    protected function casts(): array
    {
        return ['transacted_on' => 'date'];
    }

    public function account()
    {
        return $this->belongsTo(Account::class);
    }
}

