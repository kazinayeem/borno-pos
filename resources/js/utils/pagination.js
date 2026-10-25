/**
 * Universal pagination adapter for Laravel API responses.
 *
 * Normalizes different backend formats:
 * - { data: [...], meta: { current_page, last_page, total, per_page, from, to } }
 * - { data: [...], current_page, last_page, total, per_page, from, to }
 * - { purchases: [...], meta: ... } / { sales: [...] } / { expenses: [...] }
 * - Plain arrays or null/undefined during loading
 *
 * @param {Object|Array|null} payload - Backend response payload
 * @param {number} fallbackPage - Fallback current page
 * @param {number} fallbackPerPage - Fallback per-page limit
 * @returns {Object} Normalized { items, data, meta, isEmpty, hasPages }
 */
export function normalizePagination(payload, fallbackPage = 1, fallbackPerPage = 15) {
    if (!payload) {
        return {
            items: [],
            data: [],
            meta: {
                current_page: fallbackPage,
                currentPage: fallbackPage,
                last_page: 1,
                lastPage: 1,
                total: 0,
                per_page: fallbackPerPage,
                perPage: fallbackPerPage,
                from: 0,
                to: 0,
            },
            isEmpty: true,
            hasPages: false,
        };
    }

    // Extract items array
    let items = [];
    if (Array.isArray(payload)) {
        items = payload;
    } else if (Array.isArray(payload.data)) {
        items = payload.data;
    } else if (Array.isArray(payload.items)) {
        items = payload.items;
    } else if (Array.isArray(payload.purchases)) {
        items = payload.purchases;
    } else if (Array.isArray(payload.sales)) {
        items = payload.sales;
    } else if (Array.isArray(payload.products)) {
        items = payload.products;
    } else if (Array.isArray(payload.expenses)) {
        items = payload.expenses;
    } else if (Array.isArray(payload.transfers)) {
        items = payload.transfers;
    } else if (Array.isArray(payload.transactions)) {
        items = payload.transactions;
    } else if (Array.isArray(payload.staff)) {
        items = payload.staff;
    } else if (Array.isArray(payload.shops)) {
        items = payload.shops;
    } else if (Array.isArray(payload.plans)) {
        items = payload.plans;
    } else if (Array.isArray(payload.payments)) {
        items = payload.payments;
    } else if (Array.isArray(payload.invoices)) {
        items = payload.invoices;
    }

    // Extract meta object
    const rawMeta = payload.meta || payload.pagination || (typeof payload.current_page !== 'undefined' ? payload : {});
    const currentPage = Math.max(1, Number(rawMeta.current_page ?? rawMeta.currentPage ?? rawMeta.page ?? fallbackPage) || 1);
    const lastPage = Math.max(1, Number(rawMeta.last_page ?? rawMeta.lastPage ?? 1) || 1);
    const total = Math.max(0, Number(rawMeta.total ?? items.length) || 0);
    const perPage = Math.max(1, Number(rawMeta.per_page ?? rawMeta.perPage ?? fallbackPerPage) || fallbackPerPage);
    const from = Number(rawMeta.from ?? (total > 0 ? (currentPage - 1) * perPage + 1 : 0)) || 0;
    const to = Number(rawMeta.to ?? Math.min(currentPage * perPage, total)) || 0;

    const meta = {
        current_page: currentPage,
        currentPage,
        last_page: lastPage,
        lastPage,
        total,
        per_page: perPage,
        perPage,
        from,
        to,
    };

    return {
        items,
        data: items,
        meta,
        isEmpty: items.length === 0,
        hasPages: lastPage > 1,
    };
}
