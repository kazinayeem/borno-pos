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
    tagTypes: ['Products', 'Catalog', 'Pos', 'Sales', 'Purchases', 'Dashboard', 'Batches', 'Installments', 'Reports'],
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
            query: ({ endpoint, page = 1, q = '' }) => `${endpoint}${queryString({ page, q })}`,
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
            query: ({ drafts, page = 1, q = '' }) => `${drafts ? '/sales/draft' : '/sales'}${queryString({ page, q })}`,
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
            query: ({ status = '', page = 1 } = {}) => `/purchase/batch${queryString({ status, page })}`,
            providesTags: ['Batches'],
        }),
        getInstallments: builder.query({
            query: () => '/report/installments',
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
} = bornoposApi;
