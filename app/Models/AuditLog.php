<?php

namespace App\Models;

use App\Models\Concerns\BelongsToStore;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditLog extends Model
{
    use BelongsToStore;

    protected $fillable = [
        'store_id',
        'user_id',
        'action',
        'target_type',
        'target_id',
        'details',
        'ip_address',
    ];

    protected function casts(): array
    {
        return [
            'details' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public static function record(
        int $storeId,
        ?int $userId,
        string $action,
        ?string $targetType = null,
        ?int $targetId = null,
        ?array $details = null,
        ?string $ipAddress = null
    ): self {
        return self::create([
            'store_id' => $storeId,
            'user_id' => $userId,
            'action' => $action,
            'target_type' => $targetType,
            'target_id' => $targetId,
            'details' => $details,
            'ip_address' => $ipAddress ?: request()->ip(),
        ]);
    }
}
