import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Shell from './layout/Shell';
import CatalogPage from './pages/CatalogPage';
import { PurchaseDetail, PurchaseForm, Records, SaleDetail } from './pages/Commerce';
import Dashboard from './pages/Dashboard';
import BarcodePrint from './pages/BarcodePrint';
import Pos from './pages/Pos';
import ProductForm from './pages/ProductForm';
import Products from './pages/Products';
import Landing from './pages/Landing';
import SignIn from './pages/SignIn';

const catalogs = [
    '/categories', '/unit', '/brand', '/warehouse', '/tax', '/coupons', '/departments', '/role',
    '/employees', '/holidays', '/customer', '/customer-group', '/supplier', '/expense-categories', '/currency',
];

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

function Missing() {
    const user = useSelector((state) => state.session.user);
    const location = useLocation();
    if (!user) return <Navigate to="/signin" replace />;

    return (
        <Guard>
            <section className="card">
                <h1>This screen still uses the classic page.</h1>
                <p className="muted">Open it when you need the remaining accounting, report, or settings tools.</p>
                <a className="btn primary" href={`${location.pathname}${location.search}`}>Open page</a>
            </section>
        </Guard>
    );
}

export default function App() {
    return (
        <>
            <DocumentSync />
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/signin" element={<SignIn />} />
                <Route path="/store-dashboard" element={<Guard><Dashboard /></Guard>} />
                <Route path="/dashboard" element={<Guard><Dashboard platform /></Guard>} />
                <Route path="/products" element={<Guard><Products /></Guard>} />
                <Route path="/products/create" element={<Guard><ProductForm /></Guard>} />
                <Route path="/products/:id/edit" element={<Guard><ProductForm /></Guard>} />
                <Route path="/products/:id" element={<Guard><ProductForm readOnly /></Guard>} />
                <Route path="/barcode-print" element={<Guard><BarcodePrint /></Guard>} />
                <Route path="/pos" element={<Guard><Pos /></Guard>} />
                <Route path="/sales" element={<Guard><Records kind="sales" /></Guard>} />
                <Route path="/sales/draft" element={<Guard><Records kind="drafts" /></Guard>} />
                <Route path="/sales/:id" element={<Guard><SaleDetail /></Guard>} />
                <Route path="/purchase/list" element={<Guard><Records kind="purchases" /></Guard>} />
                <Route path="/purchase/create" element={<Guard><PurchaseForm /></Guard>} />
                <Route path="/purchase/:id" element={<Guard><PurchaseDetail /></Guard>} />
                {catalogs.map((path) => (
                    <Route key={path} path={path} element={<Guard><CatalogPage endpoint={path} /></Guard>} />
                ))}
                <Route path="*" element={<Missing />} />
            </Routes>
        </>
    );
}
