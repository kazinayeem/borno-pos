import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Link, useSearchParams } from 'react-router-dom';
import { Chart } from 'chart.js/auto';
import { money } from '../api';
import { motion } from '../motion';
import { useT } from '../i18n';
import { useGetDashboardQuery } from '../services/bornoposApi';

const cards = [
    ['total_sales', 'Total Sales', '#e8f1ff', '#2f80ed', '🛒'],
    ['net_profit', 'Net Profit', '#e7f8ee', '#16a34a', '$'],
    ['gross_profit', 'Gross Profit', '#fff6e5', '#d97706', '📊'],
    ['sales_return', 'Sales Return', '#ffecec', '#ef4444', '↩'],
    ['purchase', 'Purchase', '#f3e8ff', '#7c3aed', '🛍'],
    ['purchase_due', 'Purchase Due', '#e8f4ff', '#0284c7', '📄'],
    ['expense', 'Expense', '#f4e9ff', '#9333ea', '💳'],
    ['salary', 'Salary Cost', '#e8f8ef', '#059669', '💵'],
];

const ranges = [['daily', 'Today'], ['weekly', 'This Week'], ['monthly', 'This Month'], ['yearly', 'This Year']];

function chartMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 420 };
}

export default function Dashboard({ platform = false }) {
    const user = useSelector((state) => state.session.user);
    const t = useT();
    const [params, setParams] = useSearchParams();
    const type = params.get('type') || 'monthly';
    const { data, isFetching: loading } = useGetDashboardQuery({
        platform,
        type,
        from: params.get('from') || '',
        to: params.get('to') || '',
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
            data: { labels: data.chart.labels, datasets: [
                { label: 'Sales', data: data.chart.sales, borderColor: '#22c55e', tension: 0.35, pointRadius: 0 },
                { label: 'Purchase', data: data.chart.purchases, borderColor: '#3b82f6', tension: 0.35, pointRadius: 0 },
            ] },
            options: { animation: chartMotion(), plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } },
        });

        return () => chart.destroy();
    }, [flowKey]);

    useEffect(() => {
        if (!cashRef.current || !data?.cashflow) return undefined;
        const chart = new Chart(cashRef.current, {
            type: 'line',
            data: { labels: data.cashflow.labels, datasets: [
                { label: 'Debit', data: data.cashflow.debits, borderColor: '#ef4444', tension: 0.35, pointRadius: 0 },
                { label: 'Credit', data: data.cashflow.credits, borderColor: '#6366f1', tension: 0.35, pointRadius: 0 },
            ] },
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

    if (platform) {
        const kpis = data?.kpis || {};
        return (
            <>
                <div className="page-title"><div><h1>{t('Welcome back, {name}', { name: user?.name })}</h1><div className="muted">{t('Platform overview.')}</div></div></div>
                <div className="kpis">
                    {[['Total Subscription Sale', kpis.subscription_sale, true], ['Total Subscriber', kpis.subscribers], ['Total Main Shop', kpis.shops], ['Total Store', kpis.stores]].map(([label, value, cash], index) => (
                        <motion.article className="kpi" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: index * 0.06 }} whileHover={{ y: -3 }} key={label}><div className="label">{t(label)}</div><strong>{cash ? money(value || 0) : (value || 0)}</strong><em>{data?.label}</em></motion.article>
                    ))}
                </div>
            </>
        );
    }

    return (
        <>
            <div className="page-title">
                <div>
                    <h1>{t('Welcome back, {name}', { name: user?.name })}</h1>
                    <div className="muted">{t("Here's what's happening with your business today.")}</div>
                </div>
                <form className="filters" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); setParams({ from: form.get('from'), to: form.get('to') }); }}>
                    {ranges.map(([key, text]) => (
                        <button key={key} className={`chip ${!params.get('from') && type === key ? 'active' : ''}`} type="button" onClick={() => setParams({ type: key })}>{t(text)}</button>
                    ))}
                    <span className="date-range">
                        <input type="date" name="from" defaultValue={data?.from || ''} aria-label="From" />
                        <span>–</span>
                        <input type="date" name="to" defaultValue={data?.to || ''} aria-label="To" />
                        <button type="submit">{t('Apply')}</button>
                    </span>
                </form>
            </div>
            <div className={`kpis ${!data && loading ? 'is-loading' : ''}`}>
                {cards.map(([key, label, bg, color, icon], index) => (
                    <motion.article className="kpi" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: index * 0.06 }} whileHover={{ y: -3 }} key={key}>
                        <div className="label"><span className="mark" style={{ background: bg, color }}>{icon}</span> {t(label)}</div>
                        {!data && loading ? <span className="skeleton" /> : <strong>{money(data?.kpis?.[key] || 0)}</strong>}
                        <em>{data?.label || (loading ? t('Loading') : '')}</em>
                        <svg className="wave" viewBox="0 0 300 40" preserveAspectRatio="none"><path d="M0 28 C 50 8, 90 36, 140 22 S 230 6, 300 24 V40 H0Z" fill={bg} /></svg>
                    </motion.article>
                ))}
            </div>
            <div className="grid-2">
                <section className="card">
                    <div className="card-head"><h2>{t('Purchase and Sale Flow')}</h2><span className="muted">{data?.label}</span></div>
                    <canvas ref={flowRef} height="120" />
                </section>
                <section className="card">
                    <div className="card-head"><h2>{t('Sales in {month}', { month: data?.month || '' })}</h2><Link to="/sales">{t('View all →')}</Link></div>
                    <table>
                        <thead><tr><th>#</th><th>{t('Product Details')}</th><th>{t('QTY')}</th><th>{t('Total')}</th></tr></thead>
                        <tbody>
                            {data?.sales?.length ? data.sales.map((sale, index) => (
                                <tr key={sale.id}><td>{index + 1}</td><td><Link to={`/sales/${sale.id}`}>{sale.invoice_no}</Link><div className="muted">{sale.sold_at}</div></td><td>{sale.items}</td><td>{money(sale.grand_cents)}</td></tr>
                            )) : <tr><td className="empty" colSpan="4">{t('No data found')}</td></tr>}
                        </tbody>
                    </table>
                </section>
            </div>
            <div className="grid-3">
                <section className="card">
                    <div className="card-head"><h2>{t('Top Selling Products')}</h2><Link to="/products">{t('View all →')}</Link></div>
                    <table>
                        <thead><tr><th>#</th><th>{t('Product')}</th><th>{t('QTY')}</th><th>{t('Total')}</th></tr></thead>
                        <tbody>
                            {data?.top_products?.length ? data.top_products.map((row, index) => (
                                <tr key={row.name}><td>{index + 1}</td><td>{row.name}</td><td>{row.qty}</td><td>{money(row.total)}</td></tr>
                            )) : <tr><td className="empty" colSpan="4">{t('No data found')}</td></tr>}
                        </tbody>
                    </table>
                </section>
                <section className="card">
                    <div className="card-head"><h2>{t('Sales by Category')}</h2><span className="muted">{data?.label}</span></div>
                    <div className="donut-wrap">
                        <canvas ref={donutRef} />
                        <div className="donut-center">{money(data?.kpis?.total_sales || 0)}<small>Total Sales</small></div>
                    </div>
                </section>
                <section className="card">
                    <div className="card-head"><h2>{t('Purchase in {month}', { month: data?.month || '' })}</h2><Link to="/purchase/list">{t('View all →')}</Link></div>
                    <table>
                        <thead><tr><th>#</th><th>Product Details</th><th>Total</th></tr></thead>
                        <tbody>
                            {data?.purchases?.length ? data.purchases.map((row, index) => (
                                <tr key={row.id}><td>{index + 1}</td><td><Link to={`/purchase/${row.id}`}>{row.reference}</Link></td><td>{money(row.grand_cents)}</td></tr>
                            )) : <tr><td className="empty" colSpan="3">{t('No data found')}</td></tr>}
                        </tbody>
                    </table>
                </section>
            </div>
            <section className="card gap">
                <div className="card-head"><h2>{t('Cash Flow')}</h2></div>
                <canvas ref={cashRef} height="90" />
            </section>
            <section className="card gap">
                <div className="card-head"><h2>{t('Recent Transaction')}</h2></div>
                <table>
                    <thead><tr><th>#</th><th>{t('Date')}</th><th>{t('Payment Method')}</th><th>{t('Translation By')}</th><th>{t('Status')}</th><th>{t('Amount')}</th></tr></thead>
                    <tbody>
                        {data?.transactions?.length ? data.transactions.map((row, index) => (
                            <tr key={row.id}>
                                <td>{index + 1}</td>
                                <td>{row.date}</td>
                                <td>{t('Cash')}</td>
                                <td>{user?.name}</td>
                                <td><span className={`badge ${row.direction === 'debit' ? 'bad' : 'ok'}`}>{row.direction}</span></td>
                                <td>{money(row.amount_cents)}</td>
                            </tr>
                        )) : <tr><td className="empty" colSpan="6">{t('No data found')}</td></tr>}
                    </tbody>
                </table>
            </section>
        </>
    );
}
