<?php

namespace App\Models;

use App\Models\Concerns\BelongsToStore;
use Illuminate\Database\Eloquent\Model;

class Employee extends Model
{
    use BelongsToStore;

    protected $fillable = ['store_id', 'department_id', 'user_id', 'name', 'email', 'phone', 'salary_cents', 'joined_on'];

    protected function casts(): array
    {
        return ['joined_on' => 'date'];
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }
}
