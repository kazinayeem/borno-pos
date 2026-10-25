export const shopNav = [
    { label: 'Dashboard', href: '/store-dashboard', icon: 'grid', spa: true, permission: 'dashboard.view' },
    { label: 'Product', icon: 'box', permission: 'products.view', match: ['/products', '/categories', '/barcode-print', '/unit', '/brand', '/warehouse'], children: [
        ['Categories', '/categories', true, 'products.view'],
        ['Products', '/products', true, 'products.view'],
        ['Print Barcode', '/barcode-print', true, 'products.view'],
        ['Units', '/unit', true, 'products.view'],
        ['Brands', '/brand', true, 'products.view'],
        ['Warehouses', '/warehouse', true, 'products.view'],
    ] },
    { label: 'Purchase', icon: 'cart', permission: 'purchases.view', match: ['/purchase', '/stock'], children: [
        ['Purchases', '/purchase/list', true, 'purchases.view'],
        ['Add Purchase', '/purchase/create', true, 'purchases.create'],
        ['Stock Count', '/stock/count', true, 'purchases.view'],
        ['Batches', '/purchase/batch', true, 'purchases.view'],
    ] },
    { label: 'Accounting', icon: 'wallet', permission: 'accounting.view', match: ['/accounts', '/money-transfers', '/account'], children: [
        ['Accounts', '/accounts', true, 'accounting.view'],
        ['Money Transfer', '/money-transfers', true, 'accounting.view'],
        ['Balance Sheet', '/account/balancesheet', true, 'accounting.view'],
        ['Transactions', '/account/transactions', true, 'accounting.view'],
    ] },
    { label: 'Sales', icon: 'tag', permission: 'sales.view', match: ['/sales', '/sale-returns', '/report/installments'], children: [
        ['Sales', '/sales', true, 'sales.view'],
        ['Drafts', '/sales/draft', true, 'sales.view'],
        ['Sale Returns', '/sale-returns', true, 'sales.view'],
        ['Installments', '/report/installments', true, 'sales.view'],
    ] },
    { label: 'Expense', icon: 'receipt', permission: 'accounting.view', match: ['/expense'], children: [
        ['Expense Category', '/expense-categories', true, 'accounting.view'],
        ['Expense', '/expense', true, 'accounting.view'],
    ] },
    { label: 'Staff & Roles', icon: 'users', permission: 'staff.view', match: ['/staff', '/role'], children: [
        ['Staff Members', '/staff', true, 'staff.view'],
        ['Roles & Permissions', '/role', true, 'roles.view'],
    ] },
    { label: 'HRM', icon: 'users', permission: 'staff.view', match: ['/departments', '/employees', '/attendance', '/payrolls', '/holidays'], children: [
        ['Departments', '/departments', true, 'staff.view'],
        ['Employees', '/employees', true, 'staff.view'],
        ['Attendance', '/attendance', true, 'staff.view'],
        ['Payrolls', '/payrolls', true, 'staff.view'],
        ['Holidays', '/holidays', true, 'staff.view'],
    ] },
    { label: 'People', icon: 'users', permission: 'customers.view', match: ['/customer', '/supplier'], children: [
        ['Customers', '/customer', true, 'customers.view'],
        ['Customer Groups', '/customer-group', true, 'customers.view'],
        ['Suppliers', '/supplier', true, 'suppliers.view'],
    ] },
    { label: 'Reports', icon: 'chart', permission: 'reports.view', match: ['/report', '/reports/center'], children: [
        ['Reports Center', '/reports/center', true, 'reports.view'],
        ['Summary', '/report/summary', true, 'reports.view'],
        ['Profit Loss', '/report/profit-loss', true, 'reports.view'],
        ['Purchases', '/report/purchases', true, 'reports.view'],
        ['Sales', '/report/sales', true, 'reports.view'],
        ['Products', '/report/product', true, 'reports.view'],
        ['Expense', '/report/expense', true, 'reports.view'],
    ] },
    { label: 'Subscriptions', icon: 'card', permission: 'settings.view', match: ['/subscription'], children: [
        ['Purchase', '/subscription-purchase', true, 'settings.view'],
        ['Reports', '/subscription/report', true, 'settings.view'],
    ] },
    { label: 'Store', icon: 'shop', permission: 'settings.view', match: ['/stores'], children: [
        ['List', '/stores', true, 'settings.view'],
        ['Create', '/stores/create', true, 'settings.view'],
    ] },
    { label: 'Settings', icon: 'gear', permission: 'settings.view', match: ['/coupons', '/currency', '/tax', '/user/profile', '/settings'], children: [
        ['Coupon', '/coupons', true, 'settings.view'],
        ['Currencies', '/currency', true, 'settings.view'],
        ['Taxes', '/tax', true, 'settings.view'],
        ['Profile', '/user/profile', true],
        ['General Settings', '/settings/general-settings', true, 'settings.view'],
        ['Business Modules', '/settings/business-modules', true, 'settings.view'],
        ['Payment Gateway', '/shop-payment-gateway', true, 'settings.view'],
    ] },
];

export const adminNav = [
    { label: 'Dashboard', href: '/dashboard', icon: 'grid', spa: true },
    { label: 'Shop', icon: 'shop', match: ['/shop', '/stores'], children: [
        ['Categories', '/shop-categories', true],
        ['List', '/stores', true],
        ['Create', '/stores/create', true],
    ] },
    { label: 'Subscriptions', icon: 'card', match: ['/subscription'], children: [
        ['Reports', '/subscription/report', true],
    ] },
    { label: 'Settings', icon: 'gear', match: ['/currency', '/user/profile', '/payment-gateway', '/settings', '/language'], children: [
        ['Currencies', '/currency', true],
        ['Profile', '/user/profile', true],
        ['Payment Gateway', '/shop-payment-gateway', true],
        ['Mail', '/settings/mail-settings', true],
        ['Language', '/language', true],
    ] },
];
