<?php

namespace App\Support;

use Illuminate\Validation\ValidationException;

class Money
{
    public static function format(int $cents, string $symbol = '$'): string
    {
        $negative = $cents < 0;
        $cents = abs($cents);
        $formatted = number_format($cents / 100, 2);

        return ($negative ? '-' : '').$symbol.' '.$formatted;
    }

    public static function parse(mixed $value): int
    {
        if ($value === null || $value === '') {
            return 0;
        }

        $normalized = str_replace([',', ' '], '', trim((string) $value));

        if (! preg_match('/^-?\d+(\.\d{1,2})?$/', $normalized)) {
            throw ValidationException::withMessages([
                'amount' => 'Enter an amount with up to 2 decimal places.',
            ]);
        }

        $negative = str_starts_with($normalized, '-');
        $normalized = ltrim($normalized, '-');
        [$whole, $fraction] = array_pad(explode('.', $normalized, 2), 2, '0');
        $fraction = str_pad(substr($fraction, 0, 2), 2, '0');

        return ($negative ? -1 : 1) * (((int) $whole * 100) + (int) $fraction);
    }
}
