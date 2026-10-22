import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import App from './App.jsx';
import { store } from './store';
import './ui.css';

if (window.BornoPos && !window.BornoPos.status) {
    const saved = sessionStorage.getItem('bornopos-status');
    if (saved) {
        window.BornoPos.status = saved;
        sessionStorage.removeItem('bornopos-status');
    }
}

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <Provider store={store}>
            <BrowserRouter>
                <MotionConfig reducedMotion="user">
                    <App />
                </MotionConfig>
            </BrowserRouter>
        </Provider>
    </StrictMode>,
);
