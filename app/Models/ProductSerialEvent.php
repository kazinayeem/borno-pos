<?php

namespace App\Models;

use App\Models\Concerns\BelongsToStore;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductSerialEvent extends Model
{
    use BelongsToStore;

    protected $fillable = ['store_id', 'product_serial_id', 'kind', 'note', 'happened_on'];

    protected function casts(): array
    {
        return ['happened_on' => 'date'];
    }

    public function serial(): BelongsTo
    {
        return $this->belongsTo(ProductSerial::class, 'product_serial_id');
    }
}
