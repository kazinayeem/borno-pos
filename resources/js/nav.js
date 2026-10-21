export const shopNav = [
    { label: 'Dashboard', href: '/store-dashboard', icon: 'grid', spa: true },
    { label: 'Product', icon: 'box', match: ['/products', '/categories', '/barcode-print', '/unit', '/brand', '/warehouse'], children: [
        ['Categories', '/categories'],
        ['Products', '/products', true],
        ['Print Barcode', '/barcode-print'],
        ['Units', '/unit'],
        ['Brands', '/brand'],
        ['Warehouses', '/warehouse'],
    ] },
    { label: 'Purchase', icon: 'cart', match: ['/purchase', '/stock'], children: [
        ['Purchases', '/purchase/list'],
        ['Add Purchase', '/purchase/create'],
        ['Stock Count', '/stock/count'],
        ['Batches', '/purchase/batch'],
    ] },
    { label: 'Accounting', icon: 'wallet', match: ['/accounts', '/money-transfers', '/account'], children: [
        ['Accounts', '/accounts'],
        ['Money Transfer', '/money-transfers'],
        ['Balance Sheet', '/account/balancesheet'],
        ['Transactions', '/account/transactions'],
    ] },
    { label: 'Sales', icon: 'tag', match: ['/sales', '/sale-returns'], children: [
        ['Sales', '/sales'],
        ['Drafts', '/sales/draft'],
        ['Sale Returns', '/sale-returns'],
    ] },
    { label: 'Expense', icon: 'receipt', match: ['/expense'], children: [
        ['Expense Category', '/expense-categories'],
        ['Expense', '/expense'],
    ] },
    { label: 'HRM', icon: 'users', match: ['/departments', '/role', '/employees', '/attendance', '/payrolls', '/holidays'], children: [
        ['Departments', '/departments'],
        ['Role Permission', '/role'],
        ['Employees', '/employees'],
        ['Attendance', '/attendance'],
        ['Payrolls', '/payrolls'],
        ['Holidays', '/holidays'],
    ] },
    { label: 'People', icon: 'users', match: ['/customer', '/supplier'], children: [
        ['Customers', '/customer'],
        ['Customer Groups', '/customer-group'],
        ['Suppliers', '/supplier'],
    ] },
    { label: 'Reports', icon: 'chart', match: ['/report'], children: [
        ['Summary', '/report/summary'],
        ['Profit Loss', '/report/profit-loss'],
        ['Purchases', '/report/purchases'],
        ['Sales', '/report/sales'],
        ['Products', '/report/product'],
        ['Expense', '/report/expense'],
    ] },
    { label: 'Subscriptions', icon: 'card', match: ['/subscription'], children: [
        ['Purchase', '/subscription-purchase'],
        ['Reports', '/subscription/report'],
    ] },
    { label: 'Store', icon: 'shop', match: ['/stores'], children: [
        ['List', '/stores'],
        ['Create', '/stores/create'],
    ] },
    { label: 'Settings', icon: 'gear', match: ['/coupons', '/currency', '/tax', '/user/profile', '/settings'], children: [
        ['Coupon', '/coupons'],
        ['Currencies', '/currency'],
        ['Taxes', '/tax'],
        ['Profile', '/user/profile'],
        ['General Settings', '/settings/general-settings'],
        ['Business Modules', '/settings/business-modules'],
        ['Payment Gateway', '/shop-payment-gateway'],
    ] },
];

export const adminNav = [
    { label: 'Dashboard', href: '/dashboard', icon: 'grid', spa: true },
    { label: 'Shop', icon: 'shop', match: ['/shop'], children: [
        ['Categories', '/shop-categories'],
        ['List', '/shops'],
        ['Create', '/shop/create'],
    ] },
    { label: 'Subscriptions', icon: 'card', match: ['/subscription'], children: [
        ['Reports', '/subscription/report'],
    ] },
    { label: 'Settings', icon: 'gear', match: ['/currency', '/user/profile', '/payment-gateway', '/settings', '/language'], children: [
        ['Currencies', '/currency'],
        ['Profile', '/user/profile'],
        ['Payment Gateway', '/payment-gateway'],
        ['Mail', '/settings/mail-settings'],
        ['Language', '/language'],
    ] },
];
