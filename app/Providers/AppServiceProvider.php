<?php

namespace App\Providers;

use Illuminate\Support\Facades\Blade;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\View;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            DB::statement('PRAGMA foreign_keys = ON');
        }

        View::composer('*', function ($view) {
            $view->with('moneySymbol', auth()->user()?->store?->symbol() ?? '$');
        });

        Blade::directive('money', function (string $expression) {
            return "<?php echo \\App\\Support\\Money::format((int) ({$expression}), \$moneySymbol ?? '\$'); ?>";
        });
    }
}
