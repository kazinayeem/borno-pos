<?php

use App\Http\Controllers\AccountingController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CatalogController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\HrmController;
use App\Http\Controllers\InstallmentController;
use App\Http\Controllers\PosController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\PurchaseController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SaleController;
use App\Http\Controllers\SerialController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\ShopController;
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => view('spa'))->name('home');
Route::get('/api/store-dashboard', [DashboardController::class, 'shop'])->middleware(['auth', 'shop'])->name('store.dashboard.api');
Route::get('/api/dashboard', [DashboardController::class, 'platform'])->middleware(['auth', 'role:super_admin'])->name('dashboard.api');
Route::get('/api/products', [ProductController::class, 'index'])->middleware(['auth', 'shop', 'ability:products.view,products.manage'])->name('products.api');
Route::get('/signin', [AuthController::class, 'signin'])->name('signin');
Route::post('/login', [AuthController::class, 'login'])->name('login');
Route::get('/signup', [AuthController::class, 'signupForm'])->name('signup');
Route::post('/signup', [AuthController::class, 'signup'])->name('signup.store');
Route::get('/change-language', [AuthController::class, 'locale'])->name('locale');

Route::middleware('auth')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
    Route::get('/user/profile', [SettingsController::class, 'profile'])->name('profile');
    Route::put('/user/profile', [SettingsController::class, 'updateProfile'])->name('profile.update');
    Route::get('/search', [ShopController::class, 'search'])->name('search');
    Route::post('/notices/read', [ShopController::class, 'readNotices'])->name('notices.read');
    Route::get('/tour', [ShopController::class, 'tour'])->name('tour');

    Route::get('/dashboard', [DashboardController::class, 'platform'])->middleware('role:super_admin')->name('dashboard');

    Route::middleware('role:super_admin')->group(function () {
        Route::get('/shops', [ShopController::class, 'index'])->name('shops.index');
        Route::get('/shop/create', [ShopController::class, 'create'])->name('shops.create');
        Route::post('/shops', [ShopController::class, 'store'])->name('shops.store');
        Route::get('/shop-categories', [ShopController::class, 'categories'])->name('shops.categories');
        Route::get('/payment-gateway', [SettingsController::class, 'gateway'])->name('gateway.admin');
        Route::post('/payment-gateway', [SettingsController::class, 'updateGateway'])->name('gateway.admin.update');
        Route::get('/settings/mail-settings', [SettingsController::class, 'mail'])->name('mail');
        Route::post('/settings/mail-settings', [SettingsController::class, 'updateMail'])->name('mail.update');
        Route::get('/language', [SettingsController::class, 'language'])->name('language');
        Route::post('/subscriptions/{subscription}/activate', [ShopController::class, 'activate'])->name('subscriptions.activate');
    });

    Route::middleware('shop')->group(function () {
        Route::get('/store-dashboard', [DashboardController::class, 'shop'])->name('store.dashboard');
        Route::get('/pos', [PosController::class, 'index'])->middleware('ability:pos')->name('pos');
        Route::post('/pos', [PosController::class, 'store'])->middleware('ability:pos')->name('pos.store');

        Route::get('/products', [ProductController::class, 'index'])->middleware('ability:products.view,products.manage')->name('products.index');
        Route::get('/products/create', [ProductController::class, 'create'])->middleware('ability:products.manage')->name('products.create');
        Route::post('/products', [ProductController::class, 'store'])->middleware('ability:products.manage')->name('products.store');
        Route::get('/products/{product}', [ProductController::class, 'show'])->middleware('ability:products.view,products.manage')->name('products.show');
        Route::get('/products/{product}/edit', [ProductController::class, 'edit'])->middleware('ability:products.manage')->name('products.edit');
        Route::put('/products/{product}', [ProductController::class, 'update'])->middleware('ability:products.manage')->name('products.update');
        Route::delete('/products/{product}', [ProductController::class, 'destroy'])->middleware('ability:products.manage')->name('products.destroy');
        Route::get('/barcode-print', [ProductController::class, 'barcode'])->middleware('ability:products.view,products.manage')->name('barcode');

        Route::get('/purchase/list', [PurchaseController::class, 'index'])->name('purchases.index');
        Route::get('/purchase/create', [PurchaseController::class, 'create'])->name('purchases.create');
        Route::get('/purchase/batch', [ReportController::class, 'batches'])->name('batches');
        Route::post('/purchase', [PurchaseController::class, 'store'])->name('purchases.store');
        Route::get('/purchase/{purchase}', [PurchaseController::class, 'show'])->name('purchases.show');

        Route::get('/sales', [SaleController::class, 'index'])->middleware('ability:sales.view')->name('sales.index');
        Route::get('/sales/draft', [SaleController::class, 'drafts'])->middleware('ability:sales.view')->name('sales.drafts');
        Route::get('/sales/{sale}', [SaleController::class, 'show'])->middleware('ability:sales.view')->name('sales.show');
        Route::get('/sales/{sale}/print', [SaleController::class, 'print'])->middleware('ability:sales.view')->name('sales.print');
        Route::post('/sales/{sale}/complete', [SaleController::class, 'complete'])->name('sales.complete');
        Route::post('/sales/{sale}/return', [SaleController::class, 'returnStore'])->name('sales.return');
        Route::post('/sales/{sale}/installments', [InstallmentController::class, 'store'])->middleware('ability:sales.view')->name('sales.installments.store');
        Route::get('/report/installments', [InstallmentController::class, 'index'])->middleware('ability:sales.view')->name('installments.index');
        Route::post('/installments/{installment}/pay', [InstallmentController::class, 'pay'])->middleware('ability:sales.view')->name('installments.pay');
        Route::post('/product-serials/{serial}/service', [SerialController::class, 'service'])->middleware('ability:products.manage,sales.view')->name('serials.service');
        Route::get('/sale-returns', [SaleController::class, 'returns'])->name('sales.returns');

        Route::get('/accounts', [AccountingController::class, 'accounts'])->name('accounts.index');
        Route::post('/accounts', [AccountingController::class, 'storeAccount'])->name('accounts.store');
        Route::get('/money-transfers', [AccountingController::class, 'transfers'])->name('transfers.index');
        Route::post('/money-transfers', [AccountingController::class, 'storeTransfer'])->name('transfers.store');
        Route::get('/account/balancesheet', [AccountingController::class, 'balance'])->name('balance');
        Route::get('/account/transactions', [AccountingController::class, 'transactions'])->name('transactions');
        Route::get('/expense', [AccountingController::class, 'expenses'])->name('expenses.index');
        Route::post('/expense', [AccountingController::class, 'storeExpense'])->name('expenses.store');

        Route::get('/attendance', [HrmController::class, 'attendance'])->name('attendance');
        Route::post('/attendance', [HrmController::class, 'storeAttendance'])->name('attendance.store');
        Route::get('/payrolls', [HrmController::class, 'payrolls'])->name('payrolls');
        Route::post('/payrolls', [HrmController::class, 'storePayroll'])->name('payrolls.store');

        Route::get('/stock/count', [ReportController::class, 'stockCount'])->name('stock.index');
        Route::post('/stock/count', [ReportController::class, 'storeStockCount'])->name('stock.store');
        Route::get('/report/summary', [ReportController::class, 'summary'])->name('reports.summary');
        Route::get('/report/profit-loss', [ReportController::class, 'profit'])->name('reports.profit');
        Route::get('/report/purchases', [ReportController::class, 'purchases'])->name('reports.purchases');
        Route::get('/report/sales', [ReportController::class, 'sales'])->name('reports.sales');
        Route::get('/report/product', [ReportController::class, 'products'])->name('reports.products');
        Route::get('/report/expense', [ReportController::class, 'expenses'])->name('reports.expenses');

        Route::get('/stores', [ShopController::class, 'index'])->name('stores.index');
        Route::get('/stores/create', [ShopController::class, 'create'])->name('stores.create');
        Route::post('/stores', [ShopController::class, 'store'])->name('stores.store');
        Route::get('/subscription-purchase', [ShopController::class, 'plans'])->name('subscriptions.purchase');
        Route::post('/subscription-purchase', [ShopController::class, 'buy'])->name('subscriptions.buy');

        Route::get('/settings/general-settings', [SettingsController::class, 'general'])->name('settings.general');
        Route::post('/settings/general-settings', [SettingsController::class, 'updateGeneral'])->name('settings.general.update');
        Route::post('/settings/store-currency', [SettingsController::class, 'setStoreCurrency'])->name('settings.currency.update');
        Route::get('/settings/business-modules', [SettingsController::class, 'modules'])->name('settings.modules');
        Route::post('/settings/business-modules', [SettingsController::class, 'updateModules'])->name('settings.modules.update');
        Route::get('/shop-payment-gateway', [SettingsController::class, 'gateway'])->name('settings.gateway');
        Route::post('/shop-payment-gateway', [SettingsController::class, 'updateGateway'])->name('settings.gateway.update');

        $catalog = [
            'categories' => 'categories',
            'unit' => 'units',
            'brand' => 'brands',
            'warehouse' => 'warehouses',
            'tax' => 'taxes',
            'coupons' => 'coupons',
            'departments' => 'departments',
            'role' => 'roles',
            'employees' => 'employees',
            'holidays' => 'holidays',
            'customer' => 'customers',
            'customer-group' => 'customer-groups',
            'supplier' => 'suppliers',
            'expense-categories' => 'expense-categories',
        ];
        foreach ($catalog as $uri => $key) {
            Route::get($uri, [CatalogController::class, 'index'])->defaults('resource', $key)->name($key.'.index');
            Route::get($uri.'/create', [CatalogController::class, 'create'])->defaults('resource', $key)->name($key.'.create');
            Route::post($uri, [CatalogController::class, 'store'])->defaults('resource', $key)->name($key.'.store');
            Route::get($uri.'/{id}/edit', [CatalogController::class, 'edit'])->defaults('resource', $key)->whereNumber('id')->name($key.'.edit');
            Route::put($uri.'/{id}', [CatalogController::class, 'update'])->defaults('resource', $key)->whereNumber('id')->name($key.'.update');
            Route::delete($uri.'/{id}', [CatalogController::class, 'destroy'])->defaults('resource', $key)->whereNumber('id')->name($key.'.destroy');
        }
    });

    Route::get('/subscription/report', [ShopController::class, 'report'])->name('subscriptions.report');
    foreach (['currency' => 'currencies'] as $uri => $key) {
        Route::get($uri, [CatalogController::class, 'index'])->defaults('resource', $key)->name($key.'.index');
        Route::get($uri.'/create', [CatalogController::class, 'create'])->defaults('resource', $key)->name($key.'.create');
        Route::post($uri, [CatalogController::class, 'store'])->defaults('resource', $key)->name($key.'.store');
        Route::get($uri.'/{id}/edit', [CatalogController::class, 'edit'])->defaults('resource', $key)->whereNumber('id')->name($key.'.edit');
        Route::put($uri.'/{id}', [CatalogController::class, 'update'])->defaults('resource', $key)->whereNumber('id')->name($key.'.update');
        Route::delete($uri.'/{id}', [CatalogController::class, 'destroy'])->defaults('resource', $key)->whereNumber('id')->name($key.'.destroy');
    }
});
