<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetLocale
{
    public function handle(Request $request, Closure $next): Response
    {
        $locale = session('locale', $request->user()?->locale ?? config('app.locale'));
        if (in_array($locale, ['en', 'bn', 'ar'], true)) {
            app()->setLocale($locale);
        }

        return $next($request);
    }
}
