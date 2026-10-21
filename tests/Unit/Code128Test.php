<?php

namespace Tests\Unit;

use App\Support\Code128;
use Tests\TestCase;

class Code128Test extends TestCase
{
    public function test_code_128_checksum_and_bars_for_a_product_code(): void
    {
        $this->assertSame([104, 34, 33, 50, 45, 106], Code128::codes('BAR'));

        $svg = Code128::svg('ALL0001');
        $this->assertStringStartsWith('<svg ', $svg);
        $this->assertStringContainsString('<rect ', $svg);
        $this->assertStringContainsString('aria-label="ALL0001"', $svg);
        $this->assertGreaterThan(20, substr_count($svg, '<rect '));
    }
}
