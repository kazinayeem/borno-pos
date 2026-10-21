<?php

namespace Database\Factories;

use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    protected $model = Product::class;

    public function definition(): array
    {
        $name = fake()->unique()->words(2, true);

        return [
            'name' => ucfirst($name),
            'code' => strtoupper(fake()->unique()->bothify('BP#####')),
            'type' => 'standard',
            'cost_cents' => 400,
            'price_cents' => 800,
            'alert_qty' => 2,
            'near_expiry_days' => 30,
            'stock_qty' => 0,
            'is_active' => true,
            'featured_in_pos' => true,
            'details' => [],
        ];
    }
}
