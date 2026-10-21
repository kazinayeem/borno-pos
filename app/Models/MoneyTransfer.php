<?php

namespace App\Models;

use App\Models\Concerns\BelongsToStore;
use Illuminate\Database\Eloquent\Model;

class MoneyTransfer extends Model
{
    use BelongsToStore;

    protected $fillable = ['store_id', 'from_account_id', 'to_account_id', 'user_id', 'transferred_on', 'amount_cents', 'note'];

    protected function casts(): array
    {
        return ['transferred_on' => 'date'];
    }

    public function fromAccount()
    {
        return $this->belongsTo(Account::class, 'from_account_id');
    }

    public function toAccount()
    {
        return $this->belongsTo(Account::class, 'to_account_id');
    }
}

