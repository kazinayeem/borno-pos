<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAbility
{
    public function handle(Request $request, Closure $next, string ...$abilities): Response
    {
        $user = $request->user();

        $isActive = $user && ($user->is_active ?? true);
        if (! $user || ! $isActive) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json(['message' => 'Your account is inactive or unauthorized.'], 403);
            }

            abort(403, 'Your account is inactive or unauthorized.');
        }

        foreach ($abilities as $ability) {
            if ($user->canDo($ability)) {
                return $next($request);
            }
        }

        if ($request->expectsJson() || $request->is('api/*')) {
            return response()->json([
                'message' => 'You do not have permission to perform this action.',
                'required_abilities' => $abilities,
            ], 403);
        }

        abort(403, 'You do not have permission to perform this action.');
    }
}
