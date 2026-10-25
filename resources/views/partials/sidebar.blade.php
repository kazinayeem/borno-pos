@php
    $user = auth()->user();
    $isOwnerOrSuper = $user->isSuperAdmin() || $user->isOwner();
    $modules = \App\Http\Controllers\SettingsController::modulesFor($user->store_id);
    $shop = [
        ['label' => __('Dashboard'), 'href' => route('store.dashboard'), 'active' => request()->routeIs('store.dashboard'), 'icon' => 'grid', 'permission' => 'dashboard.view'],
        ['label' => __('Product'), 'show' => $modules['product'], 'permission' => 'products.view', 'active' => request()->is('categories*','products*','barcode*','unit*','brand*','warehouse*'), 'icon' => 'box', 'children' => [
            [__('Categories'), route('categories.index'), request()->is('categories*'), 'products.view'],
            [__('Products'), route('products.index'), request()->is('products*'), 'products.view'],
            [__('Print Barcode'), route('barcode'), request()->is('barcode*'), 'products.view'],
            [__('Units'), route('units.index'), request()->is('unit*'), 'products.view'],
            [__('Brands'), route('brands.index'), request()->is('brand*'), 'products.view'],
            [__('Warehouses'), route('warehouses.index'), request()->is('warehouse*'), 'products.view'],
        ]],
        ['label' => __('Purchase'), 'show' => $modules['purchase'], 'permission' => 'purchases.view', 'active' => request()->is('purchase*','stock*'), 'icon' => 'cart', 'children' => [
            [__('Purchases'), route('purchases.index'), request()->is('purchase/list','purchase/*') && !request()->is('purchase/create','purchase/batch'), 'purchases.view'],
            [__('Add Purchase'), route('purchases.create'), request()->is('purchase/create'), 'purchases.create'],
            [__('Stock Count'), route('stock.index'), request()->is('stock*'), 'purchases.view'],
            [__('Batches'), route('batches'), request()->is('purchase/batch'), 'purchases.view'],
        ]],
        ['label' => __('Accounting'), 'show' => $modules['accounting'], 'permission' => 'accounting.view', 'active' => request()->is('accounts*','money-transfers*','account*'), 'icon' => 'wallet', 'children' => [
            [__('Accounts'), route('accounts.index'), request()->is('accounts*'), 'accounting.view'],
            [__('Money Transfer'), route('transfers.index'), request()->is('money-transfers*'), 'accounting.view'],
            [__('Balance Sheet'), route('balance'), request()->is('account/balancesheet'), 'accounting.view'],
            [__('Transactions'), route('transactions'), request()->is('account/transactions'), 'accounting.view'],
        ]],
        ['label' => __('Sales'), 'show' => $modules['sales'], 'permission' => 'sales.view', 'active' => request()->is('sales*', 'sale-returns*', 'pos*'), 'icon' => 'tag', 'children' => [
            [__('POS'), route('pos'), request()->is('pos*'), 'sales.view'],
            [__('Sales'), route('sales.index'), request()->routeIs('sales.index', 'sales.show', 'sales.print'), 'sales.view'],
            [__('Drafts'), route('sales.drafts'), request()->routeIs('sales.drafts'), 'sales.view'],
            [__('Sale Returns'), route('sales.returns'), request()->is('sale-returns*'), 'sales.view'],
        ]],
        ['label' => __('Expense'), 'show' => $modules['expense'], 'permission' => 'accounting.view', 'active' => request()->is('expense*'), 'icon' => 'receipt', 'children' => [
            [__('Expense Category'), route('expense-categories.index'), request()->is('expense-categories*'), 'accounting.view'],
            [__('Expense'), route('expenses.index'), request()->is('expense'), 'accounting.view'],
        ]],
        ['label' => __('Staff & Roles'), 'show' => true, 'permission' => 'staff.view', 'active' => request()->is('staff*','role*'), 'icon' => 'users', 'children' => [
            [__('Staff Members'), route('staff.index'), request()->is('staff*'), 'staff.view'],
            [__('Roles & Permissions'), route('roles.index'), request()->is('role*'), 'roles.view'],
        ]],
        ['label' => __('HRM'), 'show' => $modules['hrm'], 'permission' => 'staff.view', 'active' => request()->is('departments*','employees*','attendance*','payrolls*','holidays*'), 'icon' => 'users', 'children' => [
            [__('Departments'), route('departments.index'), request()->is('departments*'), 'staff.view'],
            [__('Employees'), route('employees.index'), request()->is('employees*'), 'staff.view'],
            [__('Attendance'), route('attendance'), request()->is('attendance*'), 'staff.view'],
            [__('Payrolls'), route('payrolls'), request()->is('payrolls*'), 'staff.view'],
            [__('Holidays'), route('holidays.index'), request()->is('holidays*'), 'staff.view'],
        ]],
        ['label' => __('People'), 'show' => $modules['people'], 'permission' => 'customers.view', 'active' => request()->is('customer*','supplier*'), 'icon' => 'user', 'children' => [
            [__('Customers'), route('customers.index'), request()->is('customer') || request()->is('customer/*'), 'customers.view'],
            [__('Customer Groups'), route('customer-groups.index'), request()->is('customer-group*'), 'customers.view'],
            [__('Suppliers'), route('suppliers.index'), request()->is('supplier*'), 'suppliers.view'],
        ]],
        ['label' => __('Reports'), 'show' => $modules['reports'], 'permission' => 'reports.view', 'active' => request()->is('report*','reports*'), 'icon' => 'chart', 'children' => [
            [__('Reports Center'), route('reports.center'), request()->is('reports/center*'), 'reports.view'],
            [__('Summary'), route('reports.summary'), request()->is('report/summary'), 'reports.view'],
            [__('Profit Loss'), route('reports.profit'), request()->is('report/profit-loss'), 'reports.view'],
            [__('Purchases'), route('reports.purchases'), request()->is('report/purchases'), 'reports.view'],
            [__('Sales'), route('reports.sales'), request()->is('report/sales'), 'reports.view'],
            [__('Products'), route('reports.products'), request()->is('report/product'), 'reports.view'],
            [__('Expense'), route('reports.expenses'), request()->is('report/expense'), 'reports.view'],
        ]],
        ['label' => __('Subscriptions'), 'show' => $modules['subscriptions'] && $isOwnerOrSuper, 'permission' => 'settings.view', 'active' => request()->is('subscription*'), 'icon' => 'card', 'children' => [
            [__('Purchase'), route('subscriptions.purchase'), request()->is('subscription-purchase'), 'settings.view'],
            [__('Reports'), route('subscriptions.report'), request()->is('subscription/report'), 'settings.view'],
        ]],
        ['label' => __('Store'), 'show' => $modules['store'] && $isOwnerOrSuper, 'permission' => 'settings.view', 'active' => request()->is('stores*'), 'icon' => 'shop', 'children' => [
            [__('List'), route('stores.index'), request()->routeIs('stores.index'), 'settings.view'],
            [__('Create'), route('stores.create'), request()->routeIs('stores.create'), 'settings.view'],
        ]],
        ['label' => __('Settings'), 'active' => request()->is('coupons*','currency*','tax*','user/profile*','settings*','shop-payment-gateway*'), 'icon' => 'gear', 'children' => [
            [__('Coupon'), route('coupons.index'), request()->is('coupons*'), 'settings.view'],
            [__('Currencies'), route('currencies.index'), request()->is('currency*'), 'settings.view'],
            [__('Taxes'), route('taxes.index'), request()->is('tax*'), 'settings.view'],
            [__('Profile'), route('profile'), request()->is('user/profile*')],
            [__('General Settings'), route('settings.general'), request()->is('settings/general-settings'), 'settings.view'],
            [__('Business Modules'), route('settings.modules'), request()->is('settings/business-modules'), 'settings.view'],
            [__('Payment Gateway'), route('settings.gateway'), request()->is('shop-payment-gateway*'), 'settings.view'],
        ]],
    ];
    $admin = [
        ['label' => __('Dashboard'), 'href' => route('dashboard'), 'active' => request()->routeIs('dashboard'), 'icon' => 'grid'],
        ['label' => __('Shop'), 'active' => request()->is('shop*'), 'icon' => 'shop', 'children' => [
            [__('Categories'), route('shops.categories'), request()->is('shop-categories')],
            [__('List'), route('shops.index'), request()->routeIs('shops.index')],
            [__('Create'), route('shops.create'), request()->routeIs('shops.create')],
        ]],
        ['label' => __('Subscriptions'), 'active' => request()->is('subscription*'), 'icon' => 'card', 'children' => [
            [__('Reports'), route('subscriptions.report'), request()->is('subscription/report')],
        ]],
        ['label' => __('Settings'), 'active' => request()->is('currency*','user/profile*','payment-gateway*','settings/mail*','language*','settings/general*'), 'icon' => 'gear', 'children' => [
            [__('Currencies'), route('currencies.index'), request()->is('currency*')],
            [__('Profile'), route('profile'), request()->is('user/profile*')],
            [__('Payment Gateway'), route('gateway.admin'), request()->is('payment-gateway')],
            [__('Mail'), route('mail'), request()->is('settings/mail-settings')],
            [__('Language'), route('language'), request()->is('language')],
        ]],
    ];
    $items = $user->isSuperAdmin() ? $admin : $shop;
@endphp
<aside class="sidebar">
    <a class="brand" href="{{ $user->isSuperAdmin() ? route('dashboard') : route('store.dashboard') }}">
        @include('partials.logo')
        <div><strong>BornoPos</strong><span>Powering Your Business</span></div>
    </a>
    <nav class="nav">
        @foreach ($items as $item)
            @continue(isset($item['show']) && !$item['show'])
            @php
                if (!$isOwnerOrSuper) {
                    if (isset($item['permission']) && !$user->canDo($item['permission']) && empty($item['children'])) {
                        continue;
                    }
                    if (!empty($item['children'])) {
                        $allowedChildren = array_filter($item['children'], function ($c) use ($user) {
                            $childPerm = $c[3] ?? null;
                            return empty($childPerm) || $user->canDo($childPerm);
                        });
                        if (empty($allowedChildren)) {
                            continue;
                        }
                        $item['children'] = array_values($allowedChildren);
                    }
                }
            @endphp
            @if (empty($item['children']))
                <a href="{{ $item['href'] }}" class="{{ $item['active'] ? 'active' : '' }}">@include('partials.icon', ['name' => $item['icon'] ?? 'grid'])<span>{{ $item['label'] }}</span></a>
            @else
                <details {{ $item['active'] ? 'open' : '' }}>
                    <summary class="{{ $item['active'] ? 'active' : '' }}">@include('partials.icon', ['name' => $item['icon'] ?? 'grid'])<span>{{ $item['label'] }}</span></summary>
                    <div class="sub">
                        @foreach ($item['children'] as [$label, $href, $active])
                            <a href="{{ $href }}" class="{{ $active ? 'active' : '' }}">{{ $label }}</a>
                        @endforeach
                    </div>
                </details>
            @endif
        @endforeach
        <a href="{{ route('tour') }}" class="{{ request()->routeIs('tour') ? 'active' : '' }}">@include('partials.icon', ['name' => 'compass'])<span>{{ __('Take a Tour') }}</span></a>
    </nav>
    @unless(auth()->user()->isSuperAdmin())
        <div class="upgrade">
            <strong><span class="crown">♛</span> BornoPos Pro</strong>
            <p>Unlock more features for your business</p>
            <a class="upgrade-btn" href="{{ route('subscriptions.purchase') }}">Upgrade Now →</a>
        </div>
    @endunless
    <div class="side-tools">
        <a href="{{ route('tour') }}" title="Tour">?</a>
        @if ($isOwnerOrSuper || $user->canDo('settings.view'))
            <a href="{{ $user->isSuperAdmin() ? route('profile') : route('settings.general') }}" title="Settings">⚙</a>
        @endif
        <a href="{{ route('profile') }}" title="Profile">☺</a>
        <form method="post" action="{{ route('logout') }}">@csrf<button title="Logout">↪</button></form>
    </div>
</aside>
