<?php

namespace App\Models;

use App\Models\Concerns\BelongsToStore;
use Illuminate\Database\Eloquent\Model;

class Expense extends Model
{
    use BelongsToStore;

    protected $fillable = ['store_id', 'expense_category_id', 'account_id', 'user_id', 'spent_on', 'amount_cents', 'note', 'attachment'];

    protected function casts(): array
    {
        return ['spent_on' => 'date'];
    }

    public function category()
    {
        return $this->belongsTo(ExpenseCategory::class, 'expense_category_id');
    }
}
