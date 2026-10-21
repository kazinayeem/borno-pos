<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class DateRange
{
    /**
     * @return array{0: Carbon, 1: Carbon, 2: string}
     */
    public static function fromRequest(Request $request): array
    {
        if ($request->filled(['from', 'to'])) {
            return [
                Carbon::parse($request->string('from'))->startOfDay(),
                Carbon::parse($request->string('to'))->endOfDay(),
                'Custom',
            ];
        }

        return match ($request->string('type')->toString() ?: 'monthly') {
            'daily' => [now()->startOfDay(), now()->endOfDay(), 'Today'],
            'weekly' => [now()->startOfWeek(), now()->endOfWeek(), 'This Week'],
            'yearly' => [now()->startOfYear(), now()->endOfYear(), 'This Year'],
            default => [now()->startOfMonth(), now()->endOfMonth(), 'This Month'],
        };
    }
}
