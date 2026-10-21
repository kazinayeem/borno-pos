<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class SeedDemoCommand extends Command
{
    protected $signature = 'bornopos:seed-demo';

    protected $description = 'Seed local BornoPos demo shops, products, history, and images. Refuses to run in production.';

    public function handle(): int
    {
        if (app()->environment('production')) {
            $this->components->error('Demo data is not seeded when APP_ENV is production.');

            return self::FAILURE;
        }

        $this->call('db:seed', ['--force' => true]);
        $this->components->info('Demo data is ready. Password for every demo account: '.config('bornopos.demo_password'));

        return self::SUCCESS;
    }
}
