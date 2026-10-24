<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Customer;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\ReportService;
use App\Support\DateRange;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportsCenterController extends Controller
{
    public function data(Request $request, ReportService $reportService): JsonResponse
    {
        $user = $request->user();
        $storeId = (int) $user->store_id;
        $tab = $request->string('tab', 'sales')->toString();

        [$from, $to, $label] = DateRange::fromRequest($request);

        $filters = [
            'staff_id' => $request->filled('staff_id') ? $request->integer('staff_id') : null,
            'customer_id' => $request->filled('customer_id') ? $request->integer('customer_id') : null,
            'warehouse_id' => $request->filled('warehouse_id') ? $request->integer('warehouse_id') : null,
            'category_id' => $request->filled('category_id') ? $request->integer('category_id') : null,
            'payment_method' => $request->filled('payment_method') ? $request->string('payment_method')->toString() : null,
        ];

        // Seller/restricted staff can only see their own sales/staff metrics unless authorized
        $canViewAllStaff = $user->isOwner() || $user->isSuperAdmin() || $user->canDo('staff.view');
        if (! $canViewAllStaff) {
            $filters['staff_id'] = $user->id;
        }

        $reportData = match ($tab) {
            'inventory' => $reportService->getInventoryReport($storeId, $filters),
            'financial' => $reportService->getFinancialReport($storeId, $from, $to, $filters),
            'staff' => $reportService->getStaffReport($storeId, $from, $to),
            'parties' => $reportService->getPartiesReport($storeId),
            default => $reportService->getSalesReport($storeId, $from, $to, $filters),
        };

        // Lookup data for the filter selectors
        $staffList = User::where('store_id', $storeId)
            ->with('shopRole')
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'role_id']);

        return response()->json([
            'tab' => $tab,
            'label' => $label,
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'data' => $reportData,
            'can_view_all_staff' => $canViewAllStaff,
            'lookups' => [
                'staff' => $staffList->map(fn ($u) => [
                    'id' => $u->id,
                    'name' => $u->name,
                    'role_title' => $u->roleTitle(),
                ])->values(),
                'categories' => Category::where('store_id', $storeId)->orderBy('name')->get(['id', 'name']),
                'warehouses' => Warehouse::where('store_id', $storeId)->get(['id', 'name']),
                'customers' => Customer::where('store_id', $storeId)->orderBy('name')->limit(100)->get(['id', 'name', 'phone']),
                'payment_methods' => ['cash', 'card', 'bank', 'bkash', 'nagad', 'rocket', 'other'],
            ],
        ]);
    }

    public function export(Request $request, ReportService $reportService): StreamedResponse
    {
        $user = $request->user();
        $storeId = (int) $user->store_id;
        $tab = $request->string('tab', 'sales')->toString();

        [$from, $to] = DateRange::fromRequest($request);

        $filters = [
            'staff_id' => $request->filled('staff_id') ? $request->integer('staff_id') : null,
            'customer_id' => $request->filled('customer_id') ? $request->integer('customer_id') : null,
            'warehouse_id' => $request->filled('warehouse_id') ? $request->integer('warehouse_id') : null,
            'category_id' => $request->filled('category_id') ? $request->integer('category_id') : null,
            'payment_method' => $request->filled('payment_method') ? $request->string('payment_method')->toString() : null,
        ];

        if (! ($user->isOwner() || $user->isSuperAdmin() || $user->canDo('staff.view'))) {
            $filters['staff_id'] = $user->id;
        }

        $filename = "bornopos-{$tab}-report-".now()->format('Y-m-d').'.csv';

        return response()->streamDownload(function () use ($reportService, $storeId, $tab, $from, $to, $filters) {
            echo $reportService->exportCsv($storeId, $tab, $from, $to, $filters);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Cache-Control' => 'no-store, no-cache',
        ]);
    }
}
