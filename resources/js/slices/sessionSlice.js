import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { api } from '../api';

export const login = createAsyncThunk('session/login', async (body, { rejectWithValue }) => {
    try {
        return await api('/login', { method: 'POST', body });
    } catch (error) {
        return rejectWithValue(error.payload?.errors?.login?.[0] || 'These credentials do not match our records.');
    }
});

export const logout = createAsyncThunk('session/logout', async () => {
    await api('/logout', { method: 'POST', body: {} });
    sessionStorage.setItem('bornopos-status', 'You logged out successfully.');
});

function readStatus() {
    const saved = sessionStorage.getItem('bornopos-status');
    if (saved) {
        sessionStorage.removeItem('bornopos-status');
    }

    return window.BornoPos?.status || saved || '';
}

const sessionSlice = createSlice({
    name: 'session',
    initialState: {
        user: window.BornoPos?.user ?? null,
        status: readStatus(),
        error: '',
        pending: false,
    },
    reducers: {
        clearStatus(state) {
            state.status = '';
        },
        updateUser(state, action) {
            if (state.user) {
                state.user = { ...state.user, ...action.payload };
            }
        },
    },
    extraReducers(builder) {
        builder
            .addCase(login.pending, (state) => {
                state.pending = true;
                state.error = '';
            })
            .addCase(login.fulfilled, (state, action) => {
                state.pending = false;
                state.user = action.payload.user;
            })
            .addCase(login.rejected, (state, action) => {
                state.pending = false;
                state.error = action.payload || 'These credentials do not match our records.';
            })
            .addCase(logout.fulfilled, (state) => {
                state.user = null;
                state.status = 'You logged out successfully.';
            });
    },
});

export const { clearStatus, updateUser } = sessionSlice.actions;
export default sessionSlice.reducer;
