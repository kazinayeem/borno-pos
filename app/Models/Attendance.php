<?php

namespace App\Models;

use App\Models\Concerns\BelongsToStore;
use Illuminate\Database\Eloquent\Model;

class Attendance extends Model
{
    use BelongsToStore;

    protected $fillable = ['store_id', 'employee_id', 'attended_on', 'status', 'check_in', 'check_out'];

    protected function casts(): array
    {
        return ['attended_on' => 'date'];
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}

