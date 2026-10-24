<?php

namespace App\Models;

use App\Models\Concerns\BelongsToStore;
use Illuminate\Database\Eloquent\Model;

class Subscription extends Model
{
    use BelongsToStore;

    protected $fillable = ['store_id', 'plan_id', 'status', 'gateway', 'payment_status', 'starts_on', 'ends_on', 'amount_cents'];

    protected function casts(): array
    {
        return ['starts_on' => 'date', 'ends_on' => 'date'];
    }

    public function plan()
    {
        return $this->belongsTo(Plan::class);
    }
}
