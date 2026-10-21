<?php

namespace App\Models;

use App\Models\Concerns\BelongsToStore;
use Illuminate\Database\Eloquent\Model;

class Account extends Model
{
    use BelongsToStore;

    protected $fillable = ['store_id', 'name', 'number', 'type', 'opening_cents', 'is_default'];

    protected function casts(): array
    {
        return ['is_default' => 'boolean'];
    }

    public function transactions()
    {
        return $this->hasMany(AccountTransaction::class);
    }

    public function balanceCents(): int
    {
        $debits = (int) $this->transactions()->where('direction', 'debit')->sum('amount_cents');
        $credits = (int) $this->transactions()->where('direction', 'credit')->sum('amount_cents');

        return (int) $this->opening_cents + $debits - $credits;
    }
}

