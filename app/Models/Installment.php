<?php

namespace App\Models;

use App\Models\Concerns\BelongsToStore;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Installment extends Model
{
    use BelongsToStore;

    protected $fillable = [
        'store_id', 'installment_plan_id', 'sequence', 'due_on', 'amount_cents', 'paid_cents', 'status',
    ];

    protected function casts(): array
    {
        return ['due_on' => 'date'];
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(InstallmentPlan::class, 'installment_plan_id');
    }

    public function payments(): MorphMany
    {
        return $this->morphMany(Payment::class, 'payable');
    }

    public function dueCents(): int
    {
        return max(0, (int) $this->amount_cents - (int) $this->paid_cents);
    }
}
