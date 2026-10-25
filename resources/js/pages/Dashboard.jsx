import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, useSearchParams } from 'react-router-dom';
import { Chart } from 'chart.js/auto';
import { money } from '../api';
import { motion } from '../motion';
import { useT } from '../i18n';
import { useGetDashboardQuery } from '../services/bornoposApi';

const cards = [
    ['total_sales', 'Total Sales', '#e8f1ff', '#2f80ed', '🛒'],
    ['net_profit', 'Net Profit', '#e7f8ee', '#16a34a', '💰'],
    ['gross_profit', 'Gross Profit', '#fff6e5', '#d97706', '📊'],
    ['sales_return', 'Sales Return', '#ffecec', '#ef4444', '↩'],
    ['purchase', 'Purchase', '#f3e8ff', '#7c3aed', '🛍'],
    ['purchase_due', 'Purchase Due', '#e8f4ff', '#0284c7', '📄'],
    ['expense', 'Expense', '#f4e9ff', '#9333ea', '💳'],
    ['salary', 'Salary Cost', '#e8f8ef', '#059669', '💵'],
];

const ranges = [
    ['today', 'Today'],
    ['yesterday', 'Yesterday'],
    ['this_week', 'This Week'],
    ['last_week', 'Last Week'],
    ['this_month', 'This Month'],
    ['last_month', 'Last Month'],
    ['this_year', 'This Year'],
];

function chartMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 420 };
}

export default function Dashboard({ platform = false }) {
    const user = useSelector((state) => state.session.user);
    const t = useT();
    const [params, setParams] = useSearchParams();
    const [showMoreFilters, setShowMoreFilters] = useState(false);

    const type = params.get('type') || 'this_month';
    const staffId = params.get('staff_id') || '';
    const roleId = params.get('role_id') || '';
    const warehouseId = params.get('warehouse_id') || '';
    const categoryId = params.get('category_id') || '';
    const customerId = params.get('customer_id') || '';
    const paymentMethod = params.get('payment_method') || '';
    const paymentStatus = params.get('payment_status') || '';
    const from = params.get('from') || '';
    const to = params.get('to') || '';

    const { data, isFetching: loading } = useGetDashboardQuery({
        platform,
        type,
        from,
        to,
        staff_id: staffId,
        role_id: roleId,
        warehouse_id: warehouseId,
        category_id: categoryId,
        customer_id: customerId,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
    });

    const flowRef = useRef(null);
    const cashRef = useRef(null);
    const donutRef = useRef(null);
    const flowKey = data?.chart ? JSON.stringify(data.chart) : '';
    const cashKey = data?.cashflow ? JSON.stringify(data.cashflow) : '';
    const donutKey = data?.categories ? JSON.stringify(data.categories) : '';

    useEffect(() => {
        if (!flowRef.current || !data?.chart) return undefined;
        const chart = new Chart(flowRef.current, {
            type: 'line',
            data: {
                labels: data.chart.labels,
                datasets: [
                    { label: 'Sales', data: data.chart.sales, borderColor: '#22c55e', tension: 0.35, pointRadius: 0 },
                    { label: 'Purchase', data: data.chart.purchases, borderColor: '#3b82f6', tension: 0.35, pointRadius: 0 },
                ],
            },
            options: { animation: chartMotion(), plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } },
        });

        return () => chart.destroy();
    }, [flowKey]);

    useEffect(() => {
        if (!cashRef.current || !data?.cashflow) return undefined;
        const chart = new Chart(cashRef.current, {
            type: 'line',
            data: {
                labels: data.cashflow.labels,
                datasets: [
                    { label: 'Debit', data: data.cashflow.debits, borderColor: '#ef4444', tension: 0.35, pointRadius: 0 },
                    { label: 'Credit', data: data.cashflow.credits, borderColor: '#6366f1', tension: 0.35, pointRadius: 0 },
                ],
            },
            options: { animation: chartMotion(), plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } },
        });

        return () => chart.destroy();
    }, [cashKey]);

    useEffect(() => {
        if (!donutRef.current || !data?.categories) return undefined;
        const chart = new Chart(donutRef.current, {
            type: 'doughnut',
            data: {
                labels: data.categories.map((row) => row.name),
                datasets: [{ data: data.categories.map((row) => row.percent), backgroundColor: ['#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ef4444'], borderWidth: 0 }],
            },
            options: { animation: chartMotion(), cutout: '72%', plugins: { legend: { position: 'right' } } },
        });

        return () => chart.destroy();
    }, [donutKey]);

    function updateFilter(updates) {
        const next = new URLSearchParams(params);
        Object.entries(updates).forEach(([key, value]) => {
            if (value === '' || value === null || value === undefined) {
                next.delete(key);
            } else {
                next.set(key, value);
            }
        });
        setParams(next);
    }

    function resetFilters() {
        setParams({});
    }

    if (platform) {
        const kpis = data?.kpis || {};
        return (
            <>
                <div className="page-title">
                    <div>
                        <h1>{t('Welcome back, {name}', { name: user?.name })}</h1>
                        <div className="muted">{t('Platform overview.')}</div>
                    </div>
                </div>
                <div className="kpis">
                    {[['Total Subscription Sale', kpis.subscription_sale, true], ['Total Subscriber', kpis.subscribers], ['Total Main Shop', kpis.shops], ['Total Store', kpis.stores]].map(([label, value, cash], index) => (
                        <motion.article className="kpi" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: index * 0.06 }} whileHover={{ y: -3 }} key={label}>
                            <div className="label">{t(label)}</div>
                            <strong>{cash ? money(value || 0) : (value || 0)}</strong>
                            <em>{data?.label}</em>
                        </motion.article>
                    ))}
                </div>
            </>
        );
    }

    const lookups = data?.filter_lookups || {};
    const selectedStaff = data?.selected_staff_summary;
    const isOwner = user?.role === 'owner' || user?.role === 'super_admin' || user?.role === 'admin';
    const canViewAllStaff = data?.can_view_all_staff ?? isOwner;

    return (
        <>
            {/* Header with Title and Primary Filter Presets */}
            <div className="page-title" style={{ flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1>{t('Welcome back, {name}', { name: user?.name })}</h1>
                    <div className="muted">
                        {t("Here's what's happening with your business today.")}
                    </div>
                </div>

                <div data-tour="dashboard-filters" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {ranges.map(([key, text]) => (
                            <button
                                key={key}
                                className={`chip ${!from && type === key ? 'active' : ''}`}
                                type="button"
                                onClick={() => updateFilter({ type: key, from: '', to: '' })}
                            >
                                {t(text)}
                            </button>
                        ))}
                    </div>

                    <button
                        type="button"
                        className={`chip ${showMoreFilters ? 'active' : ''}`}
                        onClick={() => setShowMoreFilters(!showMoreFilters)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                        <span>⚙</span> {t('Advanced Filters')}
                    </button>
                </div>
            </div>

            {/* Advanced Multi-Dimensional Filter Toolbar */}
            <section
                className="card"
                style={{
                    padding: '16px 20px',
                    marginBottom: '24px',
                    border: '1px solid var(--border)',
                    background: 'var(--card-head)',
                }}
            >
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        const fd = new FormData(e.currentTarget);
                        updateFilter({
                            from: fd.get('from'),
                            to: fd.get('to'),
                            staff_id: fd.get('staff_id'),
                            role_id: fd.get('role_id'),
                            warehouse_id: fd.get('warehouse_id'),
                            category_id: fd.get('category_id'),
                            customer_id: fd.get('customer_id'),
                            payment_method: fd.get('payment_method'),
                            payment_status: fd.get('payment_status'),
                        });
                    }}
                >
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                            gap: '12px',
                            alignItems: 'end',
                        }}
                    >
                        {/* Custom Date Range */}
                        <div className="field" style={{ margin: 0 }}>
                            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-heading, #0f172a)', marginBottom: '4px' }}>
                                📅 {t('From Date')}
                            </label>
                            <input type="date" name="from" defaultValue={from || data?.from || ''} style={{ width: '100%' }} />
                        </div>
                        <div className="field" style={{ margin: 0 }}>
                            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-heading, #0f172a)', marginBottom: '4px' }}>
                                📅 {t('To Date')}
                            </label>
                            <input type="date" name="to" defaultValue={to || data?.to || ''} style={{ width: '100%' }} />
                        </div>

                        {/* Searchable Staff Selector (Owner Controls) */}
                        {canViewAllStaff && (
                            <div className="field" style={{ margin: 0 }}>
                                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-heading, #0f172a)', marginBottom: '4px' }}>
                                    👤 {t('Staff Member')}
                                </label>
                                <select
                                    name="staff_id"
                                    value={staffId}
                                    onChange={(e) => updateFilter({ staff_id: e.target.value })}
                                    style={{ width: '100%' }}
                                >
                                    <option value="">{t('👥 All Staff (Aggregated)')}</option>
                                    {(lookups.staff || []).map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name} ({s.role_title})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Branch / Warehouse */}
                        <div className="field" style={{ margin: 0 }}>
                            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-heading, #0f172a)', marginBottom: '4px' }}>
                                🏢 {t('Branch / Warehouse')}
                            </label>
                            <select
                                name="warehouse_id"
                                value={warehouseId}
                                onChange={(e) => updateFilter({ warehouse_id: e.target.value })}
                                style={{ width: '100%' }}
                            >
                                <option value="">{t('All Warehouses')}</option>
                                {(lookups.warehouses || []).map((w) => (
                                    <option key={w.id} value={w.id}>{w.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Payment Method */}
                        <div className="field" style={{ margin: 0 }}>
                            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-heading, #0f172a)', marginBottom: '4px' }}>
                                💳 {t('Payment Method')}
                            </label>
                            <select
                                name="payment_method"
                                value={paymentMethod}
                                onChange={(e) => updateFilter({ payment_method: e.target.value })}
                                style={{ width: '100%' }}
                            >
                                <option value="">{t('All Methods')}</option>
                                {(lookups.payment_methods || []).map((pm) => (
                                    <option key={pm} value={pm}>{ucfirst(pm)}</option>
                                ))}
                            </select>
                        </div>

                        {/* Filter Buttons */}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                            <button className="btn primary" type="submit" style={{ flex: 1 }}>
                                {t('Apply')}
                            </button>
                            <button
                                className="btn"
                                type="button"
                                onClick={resetFilters}
                                style={{ flex: 1 }}
                            >
                                {t('Reset')}
                            </button>
                        </div>
                    </div>

                    {/* Collapsible Secondary Filters */}
                    {showMoreFilters && (
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                                gap: '12px',
                                marginTop: '14px',
                                paddingTop: '14px',
                                borderTop: '1px solid var(--line, #e2e8f0)',
                            }}
                        >
                            {canViewAllStaff && (
                                <div className="field" style={{ margin: 0 }}>
                                    <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-heading, #0f172a)', marginBottom: '4px' }}>
                                        🛡️ {t('Role')}
                                    </label>
                                    <select
                                        name="role_id"
                                        value={roleId}
                                        onChange={(e) => updateFilter({ role_id: e.target.value })}
                                        style={{ width: '100%' }}
                                    >
                                        <option value="">{t('All Roles')}</option>
                                        {(lookups.roles || []).map((r) => (
                                            <option key={r.id} value={r.id}>{r.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="field" style={{ margin: 0 }}>
                                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-heading, #0f172a)', marginBottom: '4px' }}>
                                    📦 {t('Product Category')}
                                </label>
                                <select
                                    name="category_id"
                                    value={categoryId}
                                    onChange={(e) => updateFilter({ category_id: e.target.value })}
                                    style={{ width: '100%' }}
                                >
                                    <option value="">{t('All Categories')}</option>
                                    {(lookups.categories || []).map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="field" style={{ margin: 0 }}>
                                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-heading, #0f172a)', marginBottom: '4px' }}>
                                    👥 {t('Customer')}
                                </label>
                                <select
                                    name="customer_id"
                                    value={customerId}
                                    onChange={(e) => updateFilter({ customer_id: e.target.value })}
                                    style={{ width: '100%' }}
                                >
                                    <option value="">{t('All Customers')}</option>
                                    {(lookups.customers || []).map((c) => (
                                        <option key={c.id} value={c.id}>{c.name} ({c.phone || 'No phone'})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="field" style={{ margin: 0 }}>
                                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-heading, #0f172a)', marginBottom: '4px' }}>
                                    📑 {t('Payment Status')}
                                </label>
                                <select
                                    name="payment_status"
                                    value={paymentStatus}
                                    onChange={(e) => updateFilter({ payment_status: e.target.value })}
                                    style={{ width: '100%' }}
                                >
                                    <option value="">{t('All Statuses')}</option>
                                    <option value="paid">{t('Paid in Full')}</option>
                                    <option value="partial">{t('Partially Paid')}</option>
                                    <option value="due">{t('Due (Unpaid)')}</option>
                                </select>
                            </div>
                        </div>
                    )}
                </form>
            </section>

            {/* Individual Staff Inspector Card (when a single staff member is selected) */}
            {selectedStaff && (
                <section
                    className="card"
                    style={{
                        padding: '20px 24px',
                        marginBottom: '24px',
                        borderLeft: '4px solid var(--blue)',
                        background: 'var(--card)',
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div
                                style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '50%',
                                    background: 'var(--blue)',
                                    color: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 800,
                                    fontSize: '18px',
                                }}
                            >
                                {selectedStaff.user.name.slice(0, 1).toUpperCase()}
                            </div>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>
                                        {selectedStaff.user.name}
                                    </h2>
                                    <span className="badge ok">{selectedStaff.user.role_title}</span>
                                </div>
                                <div className="muted" style={{ fontSize: '12px', marginTop: '2px' }}>
                                    {selectedStaff.user.email} · {selectedStaff.user.phone || t('No phone')} · {t('Last active')}: {selectedStaff.user.last_login_at || t('Never')}
                                </div>
                            </div>
                        </div>

                        <button
                            type="button"
                            className="btn"
                            onClick={() => updateFilter({ staff_id: '' })}
                            style={{ fontSize: '12px', padding: '6px 12px' }}
                        >
                            ✕ {t('Back to All Staff')}
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                        <div style={{ padding: '12px', background: 'var(--card-head)', borderRadius: '10px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>{t('Completed Sales')}</div>
                            <strong style={{ fontSize: '18px' }}>{selectedStaff.tx_count}</strong>
                        </div>
                        <div style={{ padding: '12px', background: 'var(--card-head)', borderRadius: '10px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>{t('Total Sales Volume')}</div>
                            <strong style={{ fontSize: '18px', color: '#2563eb' }}>{money(selectedStaff.total_sales_cents)}</strong>
                        </div>
                        <div style={{ padding: '12px', background: 'var(--card-head)', borderRadius: '10px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>{t('Units Sold')}</div>
                            <strong style={{ fontSize: '18px' }}>{selectedStaff.sold_products_qty}</strong>
                        </div>
                        <div style={{ padding: '12px', background: 'var(--card-head)', borderRadius: '10px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>{t('Average Order')}</div>
                            <strong style={{ fontSize: '18px' }}>{money(selectedStaff.avg_ticket_cents)}</strong>
                        </div>
                        <div style={{ padding: '12px', background: 'var(--card-head)', borderRadius: '10px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>{t('Returns & Refunds')}</div>
                            <strong style={{ fontSize: '18px', color: selectedStaff.returns_cents > 0 ? '#ef4444' : 'inherit' }}>
                                {money(selectedStaff.returns_cents)} ({selectedStaff.returns_count})
                            </strong>
                        </div>
                        <div style={{ padding: '12px', background: 'var(--card-head)', borderRadius: '10px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>{t('Discounts Given')}</div>
                            <strong style={{ fontSize: '18px' }}>{money(selectedStaff.discount_cents)}</strong>
                        </div>
                    </div>
                </section>
            )}

            {/* KPI Cards Grid */}
            <div className={`kpis ${!data && loading ? 'is-loading' : ''}`} data-tour="dashboard-summary">
                {cards.map(([key, label, bg, color, icon], index) => (
                    <motion.article
                        className="kpi"
                        data-tour={index === 0 ? 'dashboard-sales-card' : undefined}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: index * 0.05 }}
                        whileHover={{ y: -3 }}
                        key={key}
                    >
                        <div className="label">
                            <span className="mark" style={{ background: bg, color }}>{icon}</span> {t(label)}
                        </div>
                        {!data && loading ? <span className="skeleton" /> : <strong>{money(data?.kpis?.[key] || 0)}</strong>}
                        <em>{data?.label || (loading ? t('Loading') : '')}</em>
                        <svg className="wave" viewBox="0 0 300 40" preserveAspectRatio="none">
                            <path d="M0 28 C 50 8, 90 36, 140 22 S 230 6, 300 24 V40 H0Z" fill={bg} />
                        </svg>
                    </motion.article>
                ))}
            </div>

            {/* Charts & Flow */}
            <div className="grid-2" data-tour="dashboard-charts">
                <section className="card">
                    <div className="card-head">
                        <h2>{t('Purchase and Sale Flow')}</h2>
                        <span className="muted">{data?.label}</span>
                    </div>
                    <canvas ref={flowRef} height="120" />
                </section>

                <section className="card">
                    <div className="card-head">
                        <h2>{t('Recent Sales ({count})', { count: data?.sales?.length || 0 })}</h2>
                        <Link to="/sales">{t('View all →')}</Link>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>{t('Invoice & Staff')}</th>
                                <th>{t('Customer')}</th>
                                <th>{t('Total')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data?.sales?.length ? (
                                data.sales.map((sale, index) => (
                                    <tr key={sale.id}>
                                        <td>{index + 1}</td>
                                        <td>
                                            <Link to={`/sales/${sale.id}`} style={{ fontWeight: 700 }}>
                                                {sale.invoice_no}
                                            </Link>
                                            <div className="muted" style={{ fontSize: '11px' }}>
                                                👤 {sale.staff} ({sale.payment_method})
                                            </div>
                                        </td>
                                        <td>{sale.customer}</td>
                                        <td><strong>{money(sale.grand_cents)}</strong></td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td className="empty" colSpan="4">{t('No data found for selected filters')}</td></tr>
                            )}
                        </tbody>
                    </table>
                </section>
            </div>

            {/* Staff Performance Comparison Table (Owner & Manager View) */}
            {canViewAllStaff && data?.staff_performance?.length > 0 && (
                <section className="card gap">
                    <div className="card-head">
                        <div>
                            <h2>👥 {t('Staff Sales Performance & Activity')}</h2>
                            <span className="muted">{t('Compare sales, average order value, and discounts by staff member for {period}', { period: data?.label })}</span>
                        </div>
                        <Link to="/reports/center?tab=staff">{t('Full Staff Report →')}</Link>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>{t('Staff Member')}</th>
                                    <th>{t('Role')}</th>
                                    <th>{t('Status')}</th>
                                    <th style={{ textAlign: 'right' }}>{t('Orders')}</th>
                                    <th style={{ textAlign: 'right' }}>{t('Total Sales')}</th>
                                    <th style={{ textAlign: 'right' }}>{t('Avg Ticket')}</th>
                                    <th style={{ textAlign: 'right' }}>{t('Discounts')}</th>
                                    <th style={{ textAlign: 'right' }}>{t('Returns')}</th>
                                    <th style={{ textAlign: 'center' }}>{t('Action')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.staff_performance.map((s) => {
                                    const isSelected = String(staffId) === String(s.id);

                                    return (
                                        <tr key={s.id} style={{ background: isSelected ? 'var(--card-head)' : 'transparent' }}>
                                            <td>
                                                <strong>{s.name}</strong>
                                                <div className="muted" style={{ fontSize: '11px' }}>{s.email}</div>
                                            </td>
                                            <td><span className="badge">{s.role_title}</span></td>
                                            <td><span className={`badge ${s.is_active ? 'ok' : 'bad'}`}>{s.is_active ? 'Active' : 'Inactive'}</span></td>
                                            <td style={{ textAlign: 'right' }}>{s.tx_count}</td>
                                            <td style={{ textAlign: 'right' }}><strong style={{ color: '#2563eb' }}>{money(s.total_sales_cents)}</strong></td>
                                            <td style={{ textAlign: 'right' }}>{money(s.avg_ticket_cents)}</td>
                                            <td style={{ textAlign: 'right' }}>{money(s.discount_cents)}</td>
                                            <td style={{ textAlign: 'right', color: s.returns_cents > 0 ? '#ef4444' : 'inherit' }}>
                                                {money(s.returns_cents)}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {isSelected ? (
                                                    <button
                                                        type="button"
                                                        className="btn small"
                                                        onClick={() => updateFilter({ staff_id: '' })}
                                                    >
                                                        {t('Clear Filter')}
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className="btn small primary"
                                                        onClick={() => updateFilter({ staff_id: s.id })}
                                                    >
                                                        {t('Inspect')}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            <div className="grid-3" data-tour="dashboard-shortcuts">
                <section className="card">
                    <div className="card-head">
                        <h2>{t('Top Selling Products')}</h2>
                        <Link to="/products">{t('View all →')}</Link>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>{t('Product')}</th>
                                <th>{t('QTY')}</th>
                                <th>{t('Total')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data?.top_products?.length ? (
                                data.top_products.map((row, index) => (
                                    <tr key={row.name}>
                                        <td>{index + 1}</td>
                                        <td>{row.name}</td>
                                        <td>{row.qty}</td>
                                        <td>{money(row.total)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td className="empty" colSpan="4">{t('No data found')}</td></tr>
                            )}
                        </tbody>
                    </table>
                </section>

                <section className="card">
                    <div className="card-head">
                        <h2>{t('Sales by Category')}</h2>
                        <span className="muted">{data?.label}</span>
                    </div>
                    <div className="donut-wrap">
                        <canvas ref={donutRef} />
                        <div className="donut-center">
                            {money(data?.kpis?.total_sales || 0)}
                            <small>{t('Total Sales')}</small>
                        </div>
                    </div>
                </section>

                <section className="card">
                    <div className="card-head">
                        <h2>{t('Recent Purchases')}</h2>
                        <Link to="/purchase/list">{t('View all →')}</Link>
                    </div>
                    <table>
                        <thead>
                            <tr><th>#</th><th>{t('Reference & Supplier')}</th><th>{t('Total')}</th></tr>
                        </thead>
                        <tbody>
                            {data?.purchases?.length ? (
                                data.purchases.map((row, index) => (
                                    <tr key={row.id}>
                                        <td>{index + 1}</td>
                                        <td>
                                            <Link to={`/purchase/${row.id}`}>{row.reference}</Link>
                                            <div className="muted" style={{ fontSize: '11px' }}>{row.supplier}</div>
                                        </td>
                                        <td>{money(row.grand_cents)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td className="empty" colSpan="3">{t('No data found')}</td></tr>
                            )}
                        </tbody>
                    </table>
                </section>
            </div>

            <section className="card gap">
                <div className="card-head"><h2>{t('Cash Flow')}</h2></div>
                <canvas ref={cashRef} height="90" />
            </section>
        </>
    );
}

function ucfirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}
