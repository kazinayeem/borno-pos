import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Shell from './layout/Shell';
import CatalogPage from './pages/CatalogPage';
import { PurchaseDetail, PurchaseForm, Records, SaleDetail } from './pages/Commerce';
import Dashboard from './pages/Dashboard';
import BarcodePrint from './pages/BarcodePrint';
import Batches from './pages/Batches';
import Installments from './pages/Installments';
import Pos from './pages/Pos';
import ProductForm from './pages/ProductForm';
import Products from './pages/Products';
import Landing from './pages/Landing';
import SignIn from './pages/SignIn';
import StaffManagement from './pages/StaffManagement';
import RoleManagement from './pages/RoleManagement';
import ReportsCenter from './pages/ReportsCenter';
import PurchaseList from './pages/PurchaseList';

const catalogs = [
    '/categories', '/unit', '/brand', '/warehouse', '/tax', '/coupons', '/departments',
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

function Guard({ children, ability }) {
    const user = useSelector((state) => state.session.user);
    const location = useLocation();

    if (!user) {
        return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
    }

    if (ability) {
        const isOwner = user.role === 'owner' || user.role === 'super_admin';
        const hasPerm = isOwner || (Array.isArray(user.permissions) && user.permissions.includes(ability));
        if (!hasPerm) {
            return (
                <Shell>
                    <section className="card" style={{ maxWidth: '640px', margin: '48px auto', textAlign: 'center', padding: '48px 24px' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
                        <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>Access Restricted</h2>
                        <p className="muted" style={{ marginBottom: '24px', fontSize: '14px' }}>
                            You do not have the required permission (<code>{ability}</code>) to view this module.
                        </p>
                        <a className="btn primary" href={user.home_route || '/store-dashboard'}>
                            Return to Authorized Dashboard
                        </a>
                    </section>
                </Shell>
            );
        }
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
                <Route path="/store-dashboard" element={<Guard ability="dashboard.view"><Dashboard /></Guard>} />
                <Route path="/dashboard" element={<Guard><Dashboard platform /></Guard>} />
                <Route path="/products" element={<Guard ability="products.view"><Products /></Guard>} />
                <Route path="/products/create" element={<Guard ability="products.create"><ProductForm /></Guard>} />
                <Route path="/products/:id/edit" element={<Guard ability="products.edit"><ProductForm /></Guard>} />
                <Route path="/products/:id" element={<Guard ability="products.view"><ProductForm readOnly /></Guard>} />
                <Route path="/barcode-print" element={<Guard ability="products.view"><BarcodePrint /></Guard>} />
                <Route path="/pos" element={<Guard ability="pos.view"><Pos /></Guard>} />
                <Route path="/sales" element={<Guard ability="sales.view"><Records kind="sales" /></Guard>} />
                <Route path="/sales/draft" element={<Guard ability="sales.view"><Records kind="drafts" /></Guard>} />
                <Route path="/sales/:id" element={<Guard ability="sales.view"><SaleDetail /></Guard>} />
                <Route path="/purchase/list" element={<Guard ability="purchases.view"><PurchaseList /></Guard>} />
                <Route path="/purchase/create" element={<Guard ability="purchases.create"><PurchaseForm /></Guard>} />
                <Route path="/purchase/batch" element={<Guard ability="purchases.view"><Batches /></Guard>} />
                <Route path="/purchase/:id" element={<Guard ability="purchases.view"><PurchaseDetail /></Guard>} />
                <Route path="/report/installments" element={<Guard ability="sales.view"><Installments /></Guard>} />
                <Route path="/staff" element={<Guard ability="staff.view"><StaffManagement /></Guard>} />
                <Route path="/role" element={<Guard ability="roles.view"><RoleManagement /></Guard>} />
                <Route path="/reports/center" element={<Guard ability="reports.view"><ReportsCenter /></Guard>} />
                {catalogs.map((path) => (
                    <Route key={path} path={path} element={<Guard><CatalogPage endpoint={path} /></Guard>} />
                ))}
                <Route path="*" element={<Missing />} />
            </Routes>
        </>
    );
}
