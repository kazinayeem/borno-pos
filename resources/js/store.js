import { configureStore } from '@reduxjs/toolkit';
import session from './slices/sessionSlice';
import ui from './slices/uiSlice';
import dashboard from './slices/dashboardSlice';
import products from './slices/productsSlice';

export const store = configureStore({
    reducer: { session, ui, dashboard, products },
});
