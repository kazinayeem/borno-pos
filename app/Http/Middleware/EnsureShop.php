<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureShop
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user()?->store_id) {
            abort(403, 'This area is available to shop accounts.');
        }

        return $next($request);
    }
}
