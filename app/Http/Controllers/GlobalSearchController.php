<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Sale;
use App\Models\Store;
use App\Models\SubscriptionInvoice;
use App\Models\SubscriptionPayment;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GlobalSearchController extends Controller
{
    public function search(Request $request): JsonResponse
    {
        $user = $request->user();
        $storeId = (int) $user->store_id;
        $term = trim($request->string('q')->toString());
        $filterType = strtolower($request->string('type', 'all')->toString());

        if (empty($term)) {
            return response()->json([
                'query' => '',
                'total' => 0,
                'results' => [],
                'categories' => $this->getAvailableCategories($user),
            ]);
        }

        $results = [];

        // 1. Products & SKUs, Barcodes
        $canProducts = $user->isOwner() || $user->isSuperAdmin() || $user->canDo('products.view');
        if ($canProducts && in_array($filterType, ['all', 'products', 'product'], true)) {
            $products = Product::withoutGlobalScopes()
                ->where('store_id', $storeId)
                ->where(function ($query) use ($term) {
                    $query->where('name', 'like', "%{$term}%")
                        ->orWhere('code', 'like', "%{$term}%")
                        ->orWhere('barcode', 'like', "%{$term}%")
                        ->orWhere('sku', 'like', "%{$term}%")
                        ->orWhere('generic_name', 'like', "%{$term}%");
                })
                ->with(['category', 'brand'])
                ->limit(6)
                ->get();

            foreach ($products as $p) {
                $results[] = [
                    'id' => 'product-'.$p->id,
                    'type' => 'products',
                    'category' => 'Product',
                    'title' => $p->name,
                    'subtitle' => 'Code: '.($p->code ?: $p->barcode ?: 'N/A').($p->category ? ' · '.$p->category->name : '').' · Stock: '.$p->stock_qty,
                    'badge' => $p->type,
                    'url' => '/products/'.$p->id,
                    'icon' => '📦',
                ];
            }
        }

        // 2. Invoices & Sales Transactions
        $canSales = $user->isOwner() || $user->isSuperAdmin() || $user->canDo('sales.view');
        if (in_array($filterType, ['all', 'sales', 'invoices', 'invoice'], true)) {
            $salesQuery = Sale::withoutGlobalScopes()
                ->where('store_id', $storeId)
                ->where(function ($query) use ($term) {
                    $query->where('invoice_no', 'like', "%{$term}%")
                        ->orWhereHas('customer', fn ($cq) => $cq->where('name', 'like', "%{$term}%")->orWhere('phone', 'like', "%{$term}%"));
                })
                ->with(['customer', 'user']);

            // If seller lacks global sales view permission, only show their own sales
            if (! $canSales) {
                $salesQuery->where('user_id', $user->id);
            }

            $sales = $salesQuery->latest('sold_at')->limit(6)->get();

            foreach ($sales as $s) {
                $results[] = [
                    'id' => 'sale-'.$s->id,
                    'type' => 'sales',
                    'category' => 'Invoice',
                    'title' => 'Invoice #'.$s->invoice_no,
                    'subtitle' => ($s->customer ? $s->customer->name.' · ' : '').number_format($s->grand_cents / 100, 2).' · '.optional($s->sold_at)->format('d M Y'),
                    'badge' => ucfirst($s->status),
                    'url' => '/sales/'.$s->id,
                    'icon' => '🧾',
                ];
            }
        }

        // 3. Purchase Records
        $canPurchases = $user->isOwner() || $user->isSuperAdmin() || $user->canDo('purchases.view');
        if ($canPurchases && in_array($filterType, ['all', 'purchases', 'purchase'], true)) {
            $purchases = Purchase::withoutGlobalScopes()
                ->where('store_id', $storeId)
                ->where(function ($query) use ($term) {
                    $query->where('reference', 'like', "%{$term}%")
                        ->orWhereHas('supplier', fn ($sq) => $sq->where('name', 'like', "%{$term}%"));
                })
                ->with('supplier')
                ->latest('purchased_on')
                ->limit(5)
                ->get();

            foreach ($purchases as $pur) {
                $results[] = [
                    'id' => 'purchase-'.$pur->id,
                    'type' => 'purchases',
                    'category' => 'Purchase',
                    'title' => 'Purchase #'.$pur->reference,
                    'subtitle' => ($pur->supplier ? $pur->supplier->name.' · ' : '').number_format($pur->grand_cents / 100, 2).' · '.optional($pur->purchased_on)->format('d M Y'),
                    'badge' => ucfirst($pur->status),
                    'url' => '/purchase/'.$pur->id,
                    'icon' => '🛍️',
                ];
            }
        }

        // 4. Customers
        $canCustomers = $user->isOwner() || $user->isSuperAdmin() || $user->canDo('customers.view');
        if ($canCustomers && in_array($filterType, ['all', 'customers', 'customer'], true)) {
            $customers = Customer::withoutGlobalScopes()
                ->where('store_id', $storeId)
                ->where(function ($query) use ($term) {
                    $query->where('name', 'like', "%{$term}%")
                        ->orWhere('phone', 'like', "%{$term}%")
                        ->orWhere('email', 'like', "%{$term}%");
                })
                ->limit(5)
                ->get();

            foreach ($customers as $c) {
                $results[] = [
                    'id' => 'customer-'.$c->id,
                    'type' => 'customers',
                    'category' => 'Customer',
                    'title' => $c->name,
                    'subtitle' => 'Phone: '.($c->phone ?: 'N/A').($c->email ? ' · '.$c->email : ''),
                    'badge' => 'Customer',
                    'url' => '/customer',
                    'icon' => '👤',
                ];
            }
        }

        // 5. Suppliers
        $canSuppliers = $user->isOwner() || $user->isSuperAdmin() || $user->canDo('suppliers.view');
        if ($canSuppliers && in_array($filterType, ['all', 'suppliers', 'supplier'], true)) {
            $suppliers = Supplier::withoutGlobalScopes()
                ->where('store_id', $storeId)
                ->where(function ($query) use ($term) {
                    $query->where('name', 'like', "%{$term}%")
                        ->orWhere('phone', 'like', "%{$term}%")
                        ->orWhere('email', 'like', "%{$term}%");
                })
                ->limit(5)
                ->get();

            foreach ($suppliers as $sup) {
                $results[] = [
                    'id' => 'supplier-'.$sup->id,
                    'type' => 'suppliers',
                    'category' => 'Supplier',
                    'title' => $sup->name,
                    'subtitle' => 'Phone: '.($sup->phone ?: 'N/A').($sup->company_name ? ' · '.$sup->company_name : ''),
                    'badge' => 'Supplier',
                    'url' => '/supplier',
                    'icon' => '🏢',
                ];
            }
        }

        // 6. Staff Members (Only if owner or has staff.view)
        $canStaff = $user->isOwner() || $user->isSuperAdmin() || $user->canDo('staff.view');
        if ($canStaff && in_array($filterType, ['all', 'staff', 'employee'], true)) {
            $staffMembers = User::withoutGlobalScopes()
                ->where('store_id', $storeId)
                ->where(function ($query) use ($term) {
                    $query->where('name', 'like', "%{$term}%")
                        ->orWhere('email', 'like', "%{$term}%")
                        ->orWhere('username', 'like', "%{$term}%")
                        ->orWhere('phone', 'like', "%{$term}%");
                })
                ->with('shopRole')
                ->limit(5)
                ->get();

            foreach ($staffMembers as $sm) {
                $results[] = [
                    'id' => 'staff-'.$sm->id,
                    'type' => 'staff',
                    'category' => 'Staff',
                    'title' => $sm->name,
                    'subtitle' => $sm->roleTitle().' · '.$sm->email.($sm->phone ? ' · '.$sm->phone : ''),
                    'badge' => $sm->is_active ? 'Active' : 'Inactive',
                    'url' => '/staff',
                    'icon' => '👥',
                ];
            }
        }

        // 7. Relevant Reports Shortcuts
        $canReports = $user->isOwner() || $user->isSuperAdmin() || $user->canDo('reports.view');
        if ($canReports && in_array($filterType, ['all', 'reports', 'report'], true)) {
            $reportItems = [
                ['title' => 'Sales Summary Report', 'tab' => 'sales', 'keywords' => ['sales', 'revenue', 'daily', 'weekly', 'monthly']],
                ['title' => 'Staff Performance Report', 'tab' => 'staff', 'keywords' => ['staff', 'employee', 'seller', 'performance', 'cashier']],
                ['title' => 'Inventory & Low Stock Report', 'tab' => 'inventory', 'keywords' => ['inventory', 'stock', 'low stock', 'out of stock', 'warehouse']],
                ['title' => 'Profit & Loss Statement', 'tab' => 'financial', 'keywords' => ['profit', 'loss', 'financial', 'gross profit', 'net profit', 'margin']],
                ['title' => 'Customer & Supplier Balances Report', 'tab' => 'parties', 'keywords' => ['customer', 'supplier', 'receivable', 'payable', 'due']],
            ];

            foreach ($reportItems as $rep) {
                $matched = str_contains(strtolower($rep['title']), strtolower($term));
                if (! $matched) {
                    foreach ($rep['keywords'] as $kw) {
                        if (str_contains(strtolower($kw), strtolower($term)) || str_contains(strtolower($term), strtolower($kw))) {
                            $matched = true;
                            break;
                        }
                    }
                }

                if ($matched) {
                    $results[] = [
                        'id' => 'report-'.$rep['tab'],
                        'type' => 'reports',
                        'category' => 'Report',
                        'title' => $rep['title'],
                        'subtitle' => 'Open in Advanced Reports Center',
                        'badge' => 'Reports',
                        'url' => '/reports/center?tab='.$rep['tab'],
                        'icon' => '📈',
                    ];
                }
            }
        }

        // 8. Super Admin Platform Search: Shops, Invoices, Payments
        if ($user->isSuperAdmin()) {
            if (in_array($filterType, ['all', 'shops', 'shop', 'tenants'], true)) {
                $shops = Store::withoutGlobalScopes()
                    ->where(function ($q) use ($term) {
                        $q->where('name', 'like', "%{$term}%")
                            ->orWhere('slug', 'like', "%{$term}%")
                            ->orWhere('email', 'like', "%{$term}%")
                            ->orWhere('phone', 'like', "%{$term}%")
                            ->orWhere('subscription_status', 'like', "%{$term}%")
                            ->orWhereHas('owner', fn ($oq) => $oq->where('name', 'like', "%{$term}%"));
                    })
                    ->with('owner')
                    ->limit(6)
                    ->get();

                foreach ($shops as $s) {
                    $results[] = [
                        'id' => 'shop-'.$s->id,
                        'type' => 'shops',
                        'category' => 'Shop / Tenant',
                        'title' => $s->name,
                        'subtitle' => 'Status: '.ucfirst($s->subscription_status).' · Owner: '.($s->owner?->name ?: 'N/A').' · Phone: '.($s->phone ?: 'N/A'),
                        'badge' => ucfirst($s->subscription_status),
                        'url' => '/stores',
                        'icon' => '🏬',
                    ];
                }
            }

            if (in_array($filterType, ['all', 'payments', 'payment'], true)) {
                $subPayments = SubscriptionPayment::withoutGlobalScopes()
                    ->where(function ($q) use ($term) {
                        $q->where('transaction_id', 'like', "%{$term}%")
                            ->orWhere('sender_phone', 'like', "%{$term}%")
                            ->orWhereHas('store', fn ($sq) => $sq->where('name', 'like', "%{$term}%"));
                    })
                    ->with('store')
                    ->limit(6)
                    ->get();

                foreach ($subPayments as $pmt) {
                    $results[] = [
                        'id' => 'sub-payment-'.$pmt->id,
                        'type' => 'payments',
                        'category' => 'Subscription Payment',
                        'title' => 'TrxID: '.$pmt->transaction_id,
                        'subtitle' => 'Shop: '.($pmt->store?->name ?: 'N/A').' · Method: '.strtoupper($pmt->payment_method).' · Amount: ৳'.number_format($pmt->amount_cents / 100, 2),
                        'badge' => ucfirst($pmt->status),
                        'url' => '/dashboard',
                        'icon' => '💳',
                    ];
                }
            }

            if (in_array($filterType, ['all', 'invoices', 'invoice'], true)) {
                $subInvoices = SubscriptionInvoice::withoutGlobalScopes()
                    ->where(function ($q) use ($term) {
                        $q->where('invoice_no', 'like', "%{$term}%")
                            ->orWhereHas('store', fn ($sq) => $sq->where('name', 'like', "%{$term}%"));
                    })
                    ->with('store')
                    ->limit(6)
                    ->get();

                foreach ($subInvoices as $inv) {
                    $results[] = [
                        'id' => 'sub-invoice-'.$inv->id,
                        'type' => 'invoices',
                        'category' => 'Subscription Invoice',
                        'title' => 'Invoice: '.$inv->invoice_no,
                        'subtitle' => 'Shop: '.($inv->store?->name ?: 'N/A').' · Total: ৳'.number_format($inv->total_cents / 100, 2),
                        'badge' => ucfirst($inv->status),
                        'url' => '/subscription/report',
                        'icon' => '🧾',
                    ];
                }
            }
        }

        return response()->json([
            'query' => $term,
            'total' => count($results),
            'results' => $results,
            'categories' => $this->getAvailableCategories($user),
        ]);
    }

    private function getAvailableCategories(User $user): array
    {
        $cats = ['all' => 'All'];
        if ($user->isOwner() || $user->isSuperAdmin() || $user->canDo('products.view')) {
            $cats['products'] = 'Products';
        }
        $cats['sales'] = 'Invoices';
        if ($user->isOwner() || $user->isSuperAdmin() || $user->canDo('purchases.view')) {
            $cats['purchases'] = 'Purchases';
        }
        if ($user->isOwner() || $user->isSuperAdmin() || $user->canDo('customers.view')) {
            $cats['customers'] = 'Customers';
        }
        if ($user->isOwner() || $user->isSuperAdmin() || $user->canDo('suppliers.view')) {
            $cats['suppliers'] = 'Suppliers';
        }
        if ($user->isOwner() || $user->isSuperAdmin() || $user->canDo('staff.view')) {
            $cats['staff'] = 'Staff';
        }
        if ($user->isOwner() || $user->isSuperAdmin() || $user->canDo('reports.view')) {
            $cats['reports'] = 'Reports';
        }
        if ($user->isSuperAdmin()) {
            $cats['shops'] = 'Shops';
            $cats['payments'] = 'Payments';
            $cats['invoices'] = 'Invoices';
        }

        return $cats;
    }
}
