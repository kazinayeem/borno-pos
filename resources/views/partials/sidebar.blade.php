@php
    $modules = \App\Http\Controllers\SettingsController::modulesFor(auth()->user()->store_id);
    $shop = [
        ['label' => __('Dashboard'), 'href' => route('store.dashboard'), 'active' => request()->routeIs('store.dashboard'), 'icon' => 'grid'],
        ['label' => __('Product'), 'show' => $modules['product'], 'active' => request()->is('categories*','products*','barcode*','unit*','brand*','warehouse*'), 'icon' => 'box', 'children' => [
            [__('Categories'), route('categories.index'), request()->is('categories*')],
            [__('Products'), route('products.index'), request()->is('products*')],
            [__('Print Barcode'), route('barcode'), request()->is('barcode*')],
            [__('Units'), route('units.index'), request()->is('unit*')],
            [__('Brands'), route('brands.index'), request()->is('brand*')],
            [__('Warehouses'), route('warehouses.index'), request()->is('warehouse*')],
        ]],
        ['label' => __('Purchase'), 'show' => $modules['purchase'], 'active' => request()->is('purchase*','stock*'), 'icon' => 'cart', 'children' => [
            [__('Purchases'), route('purchases.index'), request()->is('purchase/list','purchase/*') && !request()->is('purchase/create','purchase/batch')],
            [__('Add Purchase'), route('purchases.create'), request()->is('purchase/create')],
            [__('Stock Count'), route('stock.index'), request()->is('stock*')],
            [__('Batches'), route('batches'), request()->is('purchase/batch')],
        ]],
        ['label' => __('Accounting'), 'show' => $modules['accounting'], 'active' => request()->is('accounts*','money-transfers*','account*'), 'icon' => 'wallet', 'children' => [
            [__('Accounts'), route('accounts.index'), request()->is('accounts*')],
            [__('Money Transfer'), route('transfers.index'), request()->is('money-transfers*')],
            [__('Balance Sheet'), route('balance'), request()->is('account/balancesheet')],
            [__('Transactions'), route('transactions'), request()->is('account/transactions')],
        ]],
        ['label' => __('Sales'), 'show' => $modules['sales'], 'active' => request()->is('sales*','sale-returns*'), 'icon' => 'tag', 'children' => [
            [__('Sales'), route('sales.index'), request()->routeIs('sales.index','sales.show','sales.print')],
            [__('Drafts'), route('sales.drafts'), request()->routeIs('sales.drafts')],
            [__('Sale Returns'), route('sales.returns'), request()->is('sale-returns*')],
        ]],
        ['label' => __('Expense'), 'show' => $modules['expense'], 'active' => request()->is('expense*'), 'icon' => 'receipt', 'children' => [
            [__('Expense Category'), route('expense-categories.index'), request()->is('expense-categories*')],
            [__('Expense'), route('expenses.index'), request()->is('expense')],
        ]],
        ['label' => __('HRM'), 'show' => $modules['hrm'], 'active' => request()->is('departments*','role*','employees*','attendance*','payrolls*','holidays*'), 'icon' => 'users', 'children' => [
            [__('Departments'), route('departments.index'), request()->is('departments*')],
            [__('Role Permission'), route('roles.index'), request()->is('role*')],
            [__('Employees'), route('employees.index'), request()->is('employees*')],
            [__('Attendance'), route('attendance'), request()->is('attendance*')],
            [__('Payrolls'), route('payrolls'), request()->is('payrolls*')],
            [__('Holidays'), route('holidays.index'), request()->is('holidays*')],
        ]],
        ['label' => __('People'), 'show' => $modules['people'], 'active' => request()->is('customer*','supplier*'), 'icon' => 'user', 'children' => [
            [__('Customers'), route('customers.index'), request()->is('customer') || request()->is('customer/*')],
            [__('Customer Groups'), route('customer-groups.index'), request()->is('customer-group*')],
            [__('Suppliers'), route('suppliers.index'), request()->is('supplier*')],
        ]],
        ['label' => __('Reports'), 'show' => $modules['reports'], 'active' => request()->is('report*'), 'icon' => 'chart', 'children' => [
            [__('Summary'), route('reports.summary'), request()->is('report/summary')],
            [__('Profit Loss'), route('reports.profit'), request()->is('report/profit-loss')],
            [__('Purchases'), route('reports.purchases'), request()->is('report/purchases')],
            [__('Sales'), route('reports.sales'), request()->is('report/sales')],
            [__('Products'), route('reports.products'), request()->is('report/product')],
            [__('Expense'), route('reports.expenses'), request()->is('report/expense')],
        ]],
        ['label' => __('Subscriptions'), 'show' => $modules['subscriptions'], 'active' => request()->is('subscription*'), 'icon' => 'card', 'children' => [
            [__('Purchase'), route('subscriptions.purchase'), request()->is('subscription-purchase')],
            [__('Reports'), route('subscriptions.report'), request()->is('subscription/report')],
        ]],
        ['label' => __('Store'), 'show' => $modules['store'], 'active' => request()->is('stores*'), 'icon' => 'shop', 'children' => [
            [__('List'), route('stores.index'), request()->routeIs('stores.index')],
            [__('Create'), route('stores.create'), request()->routeIs('stores.create')],
        ]],
        ['label' => __('Settings'), 'active' => request()->is('coupons*','currency*','tax*','user/profile*','settings*','shop-payment-gateway*'), 'icon' => 'gear', 'children' => [
            [__('Coupon'), route('coupons.index'), request()->is('coupons*')],
            [__('Currencies'), route('currencies.index'), request()->is('currency*')],
            [__('Taxes'), route('taxes.index'), request()->is('tax*')],
            [__('Profile'), route('profile'), request()->is('user/profile*')],
            [__('General Settings'), route('settings.general'), request()->is('settings/general-settings')],
            [__('Business Modules'), route('settings.modules'), request()->is('settings/business-modules')],
            [__('Payment Gateway'), route('settings.gateway'), request()->is('shop-payment-gateway*')],
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
    $items = auth()->user()->isSuperAdmin() ? $admin : $shop;
@endphp
<aside class="sidebar">
    <a class="brand" href="{{ auth()->user()->isSuperAdmin() ? route('dashboard') : route('store.dashboard') }}">
        @include('partials.logo')
        <div><strong>BornoPos</strong><span>Powering Your Business</span></div>
    </a>
    <nav class="nav">
        @foreach ($items as $item)
            @continue(isset($item['show']) && !$item['show'])
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
        <a href="{{ auth()->user()->isSuperAdmin() ? route('profile') : route('settings.general') }}" title="Settings">⚙</a>
        <a href="{{ route('profile') }}" title="Profile">☺</a>
        <form method="post" action="{{ route('logout') }}">@csrf<button title="Logout">↪</button></form>
    </div>
</aside>
