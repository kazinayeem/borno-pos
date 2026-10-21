import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { api } from '../api';

export const loadProducts = createAsyncThunk('products/load', async (params) => {
    const query = new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '' && value != null)),
    );

    return api(`/api/products?${query.toString()}`);
});

const productsSlice = createSlice({
    name: 'products',
    initialState: {
        data: [],
        meta: { current_page: 1, last_page: 1, from: 0, to: 0, total: 0, per_page: 10 },
        categories: [],
        brands: [],
        filters: { q: '', category_id: '', brand_id: '', status: '', page: 1, per_page: 10 },
        loading: false,
    },
    reducers: {
        setFilters(state, action) {
            state.filters = { ...state.filters, ...action.payload };
        },
    },
    extraReducers(builder) {
        builder
            .addCase(loadProducts.pending, (state) => {
                state.loading = true;
            })
            .addCase(loadProducts.fulfilled, (state, action) => {
                state.loading = false;
                state.data = action.payload.data;
                state.meta = action.payload.meta;
                state.categories = action.payload.categories;
                state.brands = action.payload.brands;
            })
            .addCase(loadProducts.rejected, (state) => {
                state.loading = false;
            });
    },
});

export const { setFilters } = productsSlice.actions;
export default productsSlice.reducer;
