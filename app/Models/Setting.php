<?php

namespace App\Models;

use App\Models\Concerns\BelongsToStore;
use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    use BelongsToStore;

    protected $fillable = ['store_id', 'key', 'value'];

    public static function getPlatform(string $key, mixed $default = null): mixed
    {
        $setting = static::withoutGlobalScopes()
            ->whereNull('store_id')
            ->where('key', $key)
            ->first();

        if (! $setting) {
            return $default;
        }

        $decoded = json_decode($setting->value, true);

        return (json_last_error() === JSON_ERROR_NONE) ? $decoded : $setting->value;
    }

    public static function setPlatform(string $key, mixed $value): void
    {
        $encoded = is_array($value) || is_object($value) ? json_encode($value) : (string) $value;

        static::withoutGlobalScopes()->updateOrCreate(
            ['store_id' => null, 'key' => $key],
            ['value' => $encoded]
        );
    }
}
