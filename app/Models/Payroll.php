<?php

namespace App\Models;

use App\Models\Concerns\BelongsToStore;
use Illuminate\Database\Eloquent\Model;

class Payroll extends Model
{
    use BelongsToStore;

    protected $fillable = ['store_id', 'employee_id', 'account_id', 'user_id', 'month', 'amount_cents', 'paid_on', 'note'];

    protected function casts(): array
    {
        return ['paid_on' => 'date'];
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}
