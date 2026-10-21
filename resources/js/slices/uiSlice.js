import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { api } from '../api';

export const changeLocale = createAsyncThunk('ui/changeLocale', async (locale) => {
    await api(`/change-language?ln=${locale}`);

    return locale;
});

const uiSlice = createSlice({
    name: 'ui',
    initialState: {
        theme: localStorage.getItem('bornopos-theme') || 'light',
        locale: window.BornoPos?.locale || 'en',
        sidebar: false,
        langOpen: false,
        noticeOpen: false,
        userOpen: false,
    },
    reducers: {
        toggleTheme(state) {
            state.theme = state.theme === 'dark' ? 'light' : 'dark';
            localStorage.setItem('bornopos-theme', state.theme);
        },
        toggleSidebar(state) {
            state.sidebar = !state.sidebar;
        },
        toggleMenu(state, action) {
            const key = action.payload;
            state.langOpen = key === 'lang' ? !state.langOpen : false;
            state.noticeOpen = key === 'notice' ? !state.noticeOpen : false;
            state.userOpen = key === 'user' ? !state.userOpen : false;
        },
        closeMenus(state) {
            state.langOpen = false;
            state.noticeOpen = false;
            state.userOpen = false;
        },
    },
    extraReducers(builder) {
        builder.addCase(changeLocale.fulfilled, (state, action) => {
            state.locale = action.payload;
            state.langOpen = false;
        });
    },
});

export const { toggleTheme, toggleSidebar, toggleMenu, closeMenus } = uiSlice.actions;
export default uiSlice.reducer;
