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
                'Custom Range',
            ];
        }

        $type = strtolower($request->string('type')->toString() ?: 'monthly');

        return match ($type) {
            'today', 'daily' => [now()->startOfDay(), now()->endOfDay(), 'Today'],
            'yesterday' => [now()->subDay()->startOfDay(), now()->subDay()->endOfDay(), 'Yesterday'],
            'this_week', 'weekly' => [now()->startOfWeek(), now()->endOfWeek(), 'This Week'],
            'last_week' => [now()->subWeek()->startOfWeek(), now()->subWeek()->endOfWeek(), 'Last Week'],
            'last_month' => [now()->subMonth()->startOfMonth(), now()->subMonth()->endOfMonth(), 'Last Month'],
            'this_year', 'yearly' => [now()->startOfYear(), now()->endOfYear(), 'This Year'],
            default => [now()->startOfMonth(), now()->endOfMonth(), 'This Month'],
        };
    }
}
