import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Shell from './layout/Shell';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import SignIn from './pages/SignIn';

export function DocumentSync() {
    const { theme, locale } = useSelector((state) => state.ui);

    useEffect(() => {
        document.documentElement.lang = locale;
        document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.classList.toggle('dark', theme === 'dark');
        document.body.classList.toggle('dark', theme === 'dark');
    }, [theme, locale]);

    return null;
}

function Guard({ children }) {
    const user = useSelector((state) => state.session.user);
    const location = useLocation();
    if (!user) {
        return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
    }

    return <Shell>{children}</Shell>;
}

export default function App() {
    return (
        <>
        <DocumentSync />
        <Routes>
            <Route path="/signin" element={<SignIn />} />
            <Route path="/store-dashboard" element={<Guard><Dashboard /></Guard>} />
            <Route path="/dashboard" element={<Guard><Dashboard platform /></Guard>} />
            <Route path="/products" element={<Guard><Products /></Guard>} />
            <Route path="*" element={<Navigate to="/signin" replace />} />
        </Routes>
        </>
    );
}
