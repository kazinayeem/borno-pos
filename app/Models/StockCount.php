<?php

namespace App\Models;

use App\Models\Concerns\BelongsToStore;
use Illuminate\Database\Eloquent\Model;

class StockCount extends Model
{
    use BelongsToStore;

    protected $fillable = ['store_id', 'warehouse_id', 'user_id', 'counted_on', 'status', 'note'];

    protected function casts(): array
    {
        return ['counted_on' => 'date'];
    }

    public function items()
    {
        return $this->hasMany(StockCountItem::class);
    }

    public function warehouse()
    {
        return $this->belongsTo(Warehouse::class);
    }
}
