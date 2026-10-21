<?php

namespace App\Support;

use Illuminate\Validation\ValidationException;

class ProductRules
{
    public static function assert(string $type, bool $batch, bool $serial, bool $variant): void
    {
        $errors = [];
        if (in_array($type, ['service', 'digital'], true) && ($batch || $serial || $variant)) {
            $errors['type'] = 'Services and digital products cannot use batch, serial, or variant tracking.';
        }
        if ($type === 'ingredient' && ($serial || $variant)) {
            $errors['type'] = 'Ingredients keep a single stock quantity. Leave serial and variant tracking off.';
        }
        if ($type === 'combo' && ($batch || $serial || $variant)) {
            $errors['type'] = 'A bundle deducts its ingredients. Track batches or serials on those ingredients.';
        }
        if ($batch && $serial) {
            $errors['has_serial'] = 'Choose batch tracking or serial tracking for this product.';
        }
        if ($serial && $variant) {
            $errors['has_variant'] = 'Serialized products do not also use variants.';
        }
        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
    }
}
