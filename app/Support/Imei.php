<?php

namespace App\Support;

class Imei
{
    public static function valid(string $value): bool
    {
        if (! preg_match('/^\d{15}$/', $value)) {
            return false;
        }

        $sum = 0;
        $double = false;
        for ($i = 14; $i >= 0; $i--) {
            $digit = (int) $value[$i];
            if ($double) {
                $digit *= 2;
                if ($digit > 9) {
                    $digit -= 9;
                }
            }
            $sum += $digit;
            $double = ! $double;
        }

        return $sum % 10 === 0;
    }
}
