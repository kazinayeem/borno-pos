import { configureStore } from '@reduxjs/toolkit';
import session from './slices/sessionSlice';
import ui from './slices/uiSlice';
import { bornoposApi } from './services/bornoposApi';

export const store = configureStore({
    reducer: {
        session,
        ui,
        [bornoposApi.reducerPath]: bornoposApi.reducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(bornoposApi.middleware),
});
