export const shopNav = [
    { label: 'Dashboard', href: '/store-dashboard', icon: 'grid', spa: true },
    { label: 'Product', icon: 'box', match: ['/products', '/categories', '/barcode-print', '/unit', '/brand', '/warehouse'], children: [
        ['Categories', '/categories', true],
        ['Products', '/products', true],
        ['Print Barcode', '/barcode-print', true],
        ['Units', '/unit', true],
        ['Brands', '/brand', true],
        ['Warehouses', '/warehouse', true],
    ] },
    { label: 'Purchase', icon: 'cart', match: ['/purchase', '/stock'], children: [
        ['Purchases', '/purchase/list', true],
        ['Add Purchase', '/purchase/create', true],
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
        ['Sales', '/sales', true],
        ['Drafts', '/sales/draft', true],
        ['Sale Returns', '/sale-returns'],
    ] },
    { label: 'Expense', icon: 'receipt', match: ['/expense'], children: [
        ['Expense Category', '/expense-categories', true],
        ['Expense', '/expense'],
    ] },
    { label: 'HRM', icon: 'users', match: ['/departments', '/role', '/employees', '/attendance', '/payrolls', '/holidays'], children: [
        ['Departments', '/departments', true],
        ['Role Permission', '/role', true],
        ['Employees', '/employees', true],
        ['Attendance', '/attendance'],
        ['Payrolls', '/payrolls'],
        ['Holidays', '/holidays', true],
    ] },
    { label: 'People', icon: 'users', match: ['/customer', '/supplier'], children: [
        ['Customers', '/customer', true],
        ['Customer Groups', '/customer-group', true],
        ['Suppliers', '/supplier', true],
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
        ['Coupon', '/coupons', true],
        ['Currencies', '/currency', true],
        ['Taxes', '/tax', true],
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
        ['Currencies', '/currency', true],
        ['Profile', '/user/profile'],
        ['Payment Gateway', '/payment-gateway'],
        ['Mail', '/settings/mail-settings'],
        ['Language', '/language'],
    ] },
];
