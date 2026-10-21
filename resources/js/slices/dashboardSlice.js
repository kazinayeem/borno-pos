import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { api } from '../api';

export const loadDashboard = createAsyncThunk('dashboard/load', async ({ platform, params }) => {
    const query = new URLSearchParams(params).toString();
    const url = platform ? `/api/dashboard?${query}` : `/api/store-dashboard?${query}`;

    return api(url);
});

const dashboardSlice = createSlice({
    name: 'dashboard',
    initialState: { data: null, loading: false, error: '' },
    extraReducers(builder) {
        builder
            .addCase(loadDashboard.pending, (state) => {
                state.loading = true;
                state.error = '';
            })
            .addCase(loadDashboard.fulfilled, (state, action) => {
                state.loading = false;
                state.data = action.payload;
            })
            .addCase(loadDashboard.rejected, (state) => {
                state.loading = false;
                state.error = 'The dashboard could not be loaded.';
            });
    },
});

export default dashboardSlice.reducer;
