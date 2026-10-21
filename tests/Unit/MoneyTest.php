<?php

namespace Tests\Unit;

use App\Support\Money;
use PHPUnit\Framework\TestCase;

class MoneyTest extends TestCase
{
    public function test_money_uses_cents(): void
    {
        $this->assertSame(1250, Money::parse('12.50'));
        $this->assertSame(125000, Money::parse('1,250'));
        $this->assertSame('$ 12.50', Money::format(1250));
        $this->assertSame('-$ 0.05', Money::format(-5));
    }
}
