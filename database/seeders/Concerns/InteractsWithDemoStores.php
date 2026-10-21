<?php

namespace Database\Seeders\Concerns;

use App\Models\Store;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

trait InteractsWithDemoStores
{
    protected function refuseProduction(): bool
    {
        if (! app()->environment('production')) {
            return false;
        }

        $this->command?->warn(static::class.' skipped in production.');

        return true;
    }

    protected function eachDemoStore(callable $callback): void
    {
        foreach (Store::query()->orderBy('id')->get() as $store) {
            $owner = User::query()->where('store_id', $store->id)->where('role', 'owner')->first();
            if (! $owner) {
                continue;
            }
            Auth::login($owner);
            try {
                $callback($store, $owner);
            } finally {
                Auth::logout();
            }
        }
    }
}
