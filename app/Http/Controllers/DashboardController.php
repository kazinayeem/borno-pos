<?php

namespace App\Http\Controllers;

use App\Models\AccountTransaction;
use App\Services\DashboardService;
use App\Support\DateRange;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function shop(Request $request, DashboardService $dashboard)
    {
        [$from, $to, $label] = DateRange::fromRequest($request);
        $data = $dashboard->shop((int) $request->user()->store_id, $from, $to);
        $transactions = AccountTransaction::query()
            ->with('account')
            ->whereBetween('transacted_on', [$from->toDateString(), $to->toDateString()])
            ->latest()
            ->limit(8)
            ->get();

        return view('dashboard.shop', [
            'data' => $data,
            'from' => $from,
            'to' => $to,
            'label' => $label,
            'transactions' => $transactions,
        ]);
    }

    public function platform(Request $request, DashboardService $dashboard)
    {
        [$from, $to, $label] = DateRange::fromRequest($request);

        return view('dashboard.platform', [
            'data' => $dashboard->platform($from, $to),
            'from' => $from,
            'to' => $to,
            'label' => $label,
        ]);
    }
}
