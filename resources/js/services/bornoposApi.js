import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { csrf } from '../api';

function queryString(params) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) search.set(key, value);
    });

    const text = search.toString();

    return text ? `?${text}` : '';
}

export const bornoposApi = createApi({
    reducerPath: 'bornoposApi',
    baseQuery: fetchBaseQuery({
        baseUrl: '/',
        credentials: 'same-origin',
        prepareHeaders(headers) {
            headers.set('Accept', 'application/json');
            headers.set('X-Requested-With', 'XMLHttpRequest');
            const token = csrf();
            if (token) headers.set('X-XSRF-TOKEN', token);

            return headers;
        },
    }),
    tagTypes: ['Products', 'Catalog', 'Pos', 'Sales', 'Purchases', 'Dashboard', 'Batches', 'Installments', 'Reports', 'Shops', 'Plans', 'Payments', 'Invoices', 'Settings'],
    endpoints: (builder) => ({
        getDashboard: builder.query({
            query: ({ platform, ...params }) => `${platform ? '/api/dashboard' : '/api/store-dashboard'}${queryString(params)}`,
            providesTags: ['Dashboard'],
        }),
        getReportsCenter: builder.query({
            query: (params) => `/api/reports/center${queryString(params)}`,
            providesTags: ['Reports'],
        }),
        getGlobalSearch: builder.query({
            query: (params) => `/api/search${queryString(params)}`,
        }),
        getProducts: builder.query({
            query: (params) => `/api/products${queryString(params)}`,
            providesTags: (result) => (result?.data || []).map((row) => ({ type: 'Products', id: row.id })).concat([{ type: 'Products', id: 'LIST' }]),
        }),
        getProductForm: builder.query({
            query: ({ id, mode }) => {
                if (!id) return '/products/create';

                return mode === 'edit' ? `/products/${id}/edit` : `/products/${id}`;
            },
            providesTags: (result, error, { id }) => [{ type: 'Products', id: id || 'NEW' }],
        }),
        saveProduct: builder.mutation({
            query: ({ id, body }) => {
                if (id && body instanceof FormData && !body.has('_method')) body.append('_method', 'PUT');

                return { url: id ? `/products/${id}` : '/products', method: 'POST', body };
            },
            invalidatesTags: (result, error, { id }) => [
                { type: 'Products', id: 'LIST' },
                { type: 'Products', id: id || result?.product?.id },
                'Pos',
                'Dashboard',
            ],
        }),
        deleteProduct: builder.mutation({
            query: (id) => ({ url: `/products/${id}`, method: 'DELETE' }),
            invalidatesTags: [{ type: 'Products', id: 'LIST' }, 'Pos', 'Dashboard'],
        }),
        getCatalog: builder.query({
            query: ({ endpoint, page = 1, q = '', search = '', per_page }) => {
                const queryObj = { page };
                const s = search || q;
                if (s) queryObj.q = s;
                if (per_page) queryObj.per_page = per_page;
                return `${endpoint}${queryString(queryObj)}`;
            },
            providesTags: (result, error, { endpoint }) => [{ type: 'Catalog', id: endpoint }],
        }),
        saveCatalog: builder.mutation({
            query: ({ endpoint, id, body }) => ({
                url: id ? `${endpoint}/${id}` : endpoint,
                method: id ? 'PUT' : 'POST',
                body,
            }),
            invalidatesTags: (result, error, { endpoint }) => [{ type: 'Catalog', id: endpoint }],
        }),
        deleteCatalog: builder.mutation({
            query: ({ endpoint, id }) => ({ url: `${endpoint}/${id}`, method: 'DELETE' }),
            invalidatesTags: (result, error, { endpoint }) => [{ type: 'Catalog', id: endpoint }],
        }),
        getBarcode: builder.query({
            query: () => '/barcode-print',
            providesTags: ['Products'],
        }),
        getPos: builder.query({
            query: (params) => `/pos${queryString(params || {})}`,
            providesTags: ['Pos'],
        }),
        checkout: builder.mutation({
            query: (body) => ({ url: '/pos', method: 'POST', body }),
            invalidatesTags: ['Pos', 'Sales', 'Products', 'Dashboard'],
        }),
        getSales: builder.query({
            query: ({ drafts, page = 1, q = '', search = '', per_page, status }) => {
                const queryObj = { page };
                const s = search || q;
                if (s) queryObj.q = s;
                if (per_page) queryObj.per_page = per_page;
                if (status) queryObj.status = status;
                return `${drafts ? '/sales/draft' : '/sales'}${queryString(queryObj)}`;
            },
            providesTags: ['Sales'],
        }),
        getSale: builder.query({
            query: (id) => `/sales/${id}`,
            providesTags: (result, error, id) => [{ type: 'Sales', id }],
        }),
        returnSale: builder.mutation({
            query: ({ id, body }) => ({ url: `/sales/${id}/return`, method: 'POST', body }),
            invalidatesTags: ['Sales', 'Products', 'Pos', 'Dashboard'],
        }),
        deleteSale: builder.mutation({
            query: (id) => ({ url: `/sales/${id}`, method: 'DELETE' }),
            invalidatesTags: ['Sales', 'Dashboard', 'Pos'],
        }),
        getPurchases: builder.query({
            query: (params = {}) => `/purchase/list${queryString(params)}`,
            providesTags: ['Purchases'],
        }),
        getPurchaseForm: builder.query({
            query: () => '/purchase/create',
        }),
        savePurchase: builder.mutation({
            query: (body) => ({ url: '/purchase', method: 'POST', body }),
            invalidatesTags: ['Purchases', 'Products', 'Pos', 'Dashboard', 'Batches'],
        }),
        getPurchase: builder.query({
            query: (id) => `/purchase/${id}`,
            providesTags: (result, error, id) => [{ type: 'Purchases', id }],
        }),
        cancelPurchase: builder.mutation({
            query: ({ id, reason }) => ({ url: `/purchase/${id}/cancel`, method: 'POST', body: { reason } }),
            invalidatesTags: ['Purchases', 'Products', 'Batches', 'Dashboard'],
        }),
        recordPurchasePayment: builder.mutation({
            query: ({ id, body }) => ({ url: `/purchase/${id}/payments`, method: 'POST', body }),
            invalidatesTags: ['Purchases', 'Dashboard'],
        }),
        getPurchaseSuppliersPayables: builder.query({
            query: (params = {}) => `/purchase/suppliers/payables${queryString(params)}`,
            providesTags: ['Purchases'],
        }),
        getPurchaseHistory: builder.query({
            query: (id) => `/purchase/${id}/history`,
            providesTags: ['Purchases'],
        }),
        getBatches: builder.query({
            query: ({ status = '', page = 1, q = '', search = '', per_page } = {}) => {
                const s = search || q;
                return `/purchase/batch${queryString({
                    status,
                    page,
                    ...(s ? { q: s } : {}),
                    ...(per_page ? { per_page } : {}),
                })}`;
            },
            providesTags: ['Batches'],
        }),
        getInstallments: builder.query({
            query: (params = {}) => {
                const query = {};
                if (params.search || params.q) query.search = params.search || params.q;
                if (params.page) query.page = params.page;
                if (params.per_page) query.per_page = params.per_page;
                if (params.status) query.status = params.status;
                return { url: '/report/installments', params: query };
            },
            providesTags: ['Installments'],
        }),
        createInstallment: builder.mutation({
            query: ({ id, body }) => ({ url: `/sales/${id}/installments`, method: 'POST', body }),
            invalidatesTags: ['Sales', 'Installments', 'Dashboard'],
        }),
        payInstallment: builder.mutation({
            query: ({ id, body }) => ({ url: `/installments/${id}/pay`, method: 'POST', body }),
            invalidatesTags: ['Sales', 'Installments', 'Dashboard'],
        }),
        recordService: builder.mutation({
            query: ({ id, body }) => ({ url: `/product-serials/${id}/service`, method: 'POST', body }),
            invalidatesTags: ['Sales'],
        }),
        getAdminShops: builder.query({
            query: (params) => `/api/admin/shops${queryString(params || {})}`,
            providesTags: ['Shops'],
        }),
        getAdminShop: builder.query({
            query: (id) => `/api/admin/shops/${id}`,
            providesTags: (result, error, id) => [{ type: 'Shops', id }],
        }),
        toggleShopStatus: builder.mutation({
            query: ({ id, ...body }) => ({ url: `/api/admin/shops/${id}/toggle-status`, method: 'POST', body }),
            invalidatesTags: ['Shops', 'Dashboard'],
        }),
        extendShopSubscription: builder.mutation({
            query: ({ id, ...body }) => ({ url: `/api/admin/shops/${id}/extend-subscription`, method: 'POST', body }),
            invalidatesTags: ['Shops', 'Dashboard'],
        }),
        changeShopPlan: builder.mutation({
            query: ({ id, ...body }) => ({ url: `/api/admin/shops/${id}/change-plan`, method: 'POST', body }),
            invalidatesTags: ['Shops', 'Plans', 'Dashboard'],
        }),
        createAdminShop: builder.mutation({
            query: (body) => ({ url: '/api/admin/shops', method: 'POST', body }),
            invalidatesTags: ['Shops', 'Dashboard'],
        }),
        notifyShopOwner: builder.mutation({
            query: ({ id, ...body }) => ({ url: `/api/admin/shops/${id}/notify`, method: 'POST', body }),
        }),
        getAdminPlans: builder.query({
            query: () => '/api/admin/plans',
            providesTags: ['Plans'],
        }),
        saveAdminPlan: builder.mutation({
            query: ({ id, ...body }) => ({
                url: id ? `/api/admin/plans/${id}` : '/api/admin/plans',
                method: id ? 'PUT' : 'POST',
                body,
            }),
            invalidatesTags: ['Plans', 'Dashboard'],
        }),
        toggleAdminPlan: builder.mutation({
            query: (id) => ({ url: `/api/admin/plans/${id}/toggle`, method: 'POST' }),
            invalidatesTags: ['Plans'],
        }),
        getAdminPlanSubscribers: builder.query({
            query: (id) => `/api/admin/plans/${id}/subscribers`,
            providesTags: (result, error, id) => [{ type: 'Plans', id: `subscribers-${id}` }],
        }),
        getAdminPayments: builder.query({
            query: (params) => `/api/admin/subscription-payments${queryString(params || {})}`,
            providesTags: ['Payments'],
        }),
        getAdminPayment: builder.query({
            query: (id) => `/api/admin/subscription-payments/${id}`,
            providesTags: (result, error, id) => [{ type: 'Payments', id }],
        }),
        approveAdminPayment: builder.mutation({
            query: (id) => ({ url: `/api/admin/subscription-payments/${id}/approve`, method: 'POST' }),
            invalidatesTags: ['Payments', 'Shops', 'Dashboard', 'Invoices'],
        }),
        rejectAdminPayment: builder.mutation({
            query: ({ id, ...body }) => ({ url: `/api/admin/subscription-payments/${id}/reject`, method: 'POST', body }),
            invalidatesTags: ['Payments', 'Shops', 'Dashboard'],
        }),
        getAdminInvoices: builder.query({
            query: (params) => `/api/admin/subscription-invoices${queryString(params || {})}`,
            providesTags: ['Invoices'],
        }),
        getAdminInvoice: builder.query({
            query: (id) => `/api/admin/subscription-invoices/${id}`,
            providesTags: (result, error, id) => [{ type: 'Invoices', id }],
        }),
        getAdminPaymentSettings: builder.query({
            query: () => '/api/admin/payment-settings',
            providesTags: ['Settings'],
        }),
        saveAdminPaymentSettings: builder.mutation({
            query: (body) => ({ url: '/api/admin/payment-settings', method: 'POST', body }),
            invalidatesTags: ['Settings'],
        }),
        getSubscriptionCheckoutInfo: builder.query({
            query: () => '/api/subscription/checkout-info',
            providesTags: ['Payments', 'Shops'],
        }),
        submitSubscriptionPayment: builder.mutation({
            query: (body) => ({
                url: '/api/subscription/submit-payment',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Payments', 'Dashboard', 'Shops'],
        }),
        getMySubscriptionHistory: builder.query({
            query: () => '/api/subscription/my-history',
            providesTags: ['Payments'],
        }),
    }),
});

export const {
    useGetDashboardQuery,
    useGetReportsCenterQuery,
    useGetGlobalSearchQuery,
    useGetProductsQuery,
    useGetProductFormQuery,
    useSaveProductMutation,
    useDeleteProductMutation,
    useGetCatalogQuery,
    useSaveCatalogMutation,
    useDeleteCatalogMutation,
    useGetBarcodeQuery,
    useGetPosQuery,
    useCheckoutMutation,
    useGetSalesQuery,
    useGetSaleQuery,
    useReturnSaleMutation,
    useDeleteSaleMutation,
    useGetPurchasesQuery,
    useGetPurchaseFormQuery,
    useSavePurchaseMutation,
    useGetPurchaseQuery,
    useCancelPurchaseMutation,
    useRecordPurchasePaymentMutation,
    useGetPurchaseSuppliersPayablesQuery,
    useGetPurchaseHistoryQuery,
    useGetBatchesQuery,
    useGetInstallmentsQuery,
    useCreateInstallmentMutation,
    usePayInstallmentMutation,
    useRecordServiceMutation,
    useGetAdminShopsQuery,
    useGetAdminShopQuery,
    useToggleShopStatusMutation,
    useExtendShopSubscriptionMutation,
    useChangeShopPlanMutation,
    useCreateAdminShopMutation,
    useNotifyShopOwnerMutation,
    useGetAdminPlansQuery,
    useGetAdminPlanSubscribersQuery,
    useSaveAdminPlanMutation,
    useToggleAdminPlanMutation,
    useGetAdminPaymentsQuery,
    useGetAdminPaymentQuery,
    useApproveAdminPaymentMutation,
    useRejectAdminPaymentMutation,
    useGetAdminInvoicesQuery,
    useGetAdminInvoiceQuery,
    useGetAdminPaymentSettingsQuery,
    useSaveAdminPaymentSettingsMutation,
    useGetSubscriptionCheckoutInfoQuery,
    useSubmitSubscriptionPaymentMutation,
    useGetMySubscriptionHistoryQuery,
} = bornoposApi;
