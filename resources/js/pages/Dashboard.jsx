import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { Chart } from 'chart.js/auto';
import { money } from '../api';
import { useT } from '../i18n';
import { loadDashboard } from '../slices/dashboardSlice';

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

function useChart(ref, build) {
    useEffect(() => {
        if (!ref.current || !build) return undefined;
        const chart = build(ref.current);
        return () => chart.destroy();
    }, [ref, build]);
}

export default function Dashboard({ platform = false }) {
    const dispatch = useDispatch();
    const user = useSelector((state) => state.session.user);
    const { data, loading } = useSelector((state) => state.dashboard);
    const t = useT();
    const [params, setParams] = useSearchParams();
    const type = params.get('type') || 'monthly';
    const query = params.toString();
    const flowRef = useRef(null);
    const cashRef = useRef(null);
    const donutRef = useRef(null);

    useEffect(() => {
        dispatch(loadDashboard({ platform, params: { type, from: params.get('from') || '', to: params.get('to') || '' } }));
    }, [dispatch, platform, query]);

    useChart(flowRef, data?.chart && ((canvas) => new Chart(canvas, {
        type: 'line',
        data: { labels: data.chart.labels, datasets: [
            { label: 'Sales', data: data.chart.sales, borderColor: '#22c55e', tension: 0.35, pointRadius: 0 },
            { label: 'Purchase', data: data.chart.purchases, borderColor: '#3b82f6', tension: 0.35, pointRadius: 0 },
        ] },
        options: { plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } },
    })));

    useChart(cashRef, data?.cashflow && ((canvas) => new Chart(canvas, {
        type: 'line',
        data: { labels: data.cashflow.labels, datasets: [
            { label: 'Debit', data: data.cashflow.debits, borderColor: '#ef4444', tension: 0.35, pointRadius: 0 },
            { label: 'Credit', data: data.cashflow.credits, borderColor: '#6366f1', tension: 0.35, pointRadius: 0 },
        ] },
        options: { plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } },
    })));

    useChart(donutRef, data?.categories && ((canvas) => new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: data.categories.map((row) => row.name),
            datasets: [{ data: data.categories.map((row) => row.percent), backgroundColor: ['#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ef4444'], borderWidth: 0 }],
        },
        options: { cutout: '72%', plugins: { legend: { position: 'right' } } },
    })));

    if (platform) {
        const kpis = data?.kpis || {};
        return (
            <>
                <div className="page-title"><div><h1>{t('Welcome back, {name}', { name: user?.name })}</h1><div className="muted">{t('Platform overview.')}</div></div></div>
                <div className="kpis">
                    {[['Total Subscription Sale', kpis.subscription_sale, true], ['Total Subscriber', kpis.subscribers], ['Total Main Shop', kpis.shops], ['Total Store', kpis.stores]].map(([label, value, cash]) => (
                        <article className="kpi" key={label}><div className="label">{t(label)}</div><strong>{cash ? money(value || 0) : (value || 0)}</strong><em>{data?.label}</em></article>
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
            <div className="kpis">
                {cards.map(([key, label, bg, color, icon]) => (
                    <article className="kpi" key={key}>
                        <div className="label"><span className="mark" style={{ background: bg, color }}>{icon}</span> {t(label)}</div>
                        <strong>{money(data?.kpis?.[key] || 0)}</strong>
                        <em>{data?.label || (loading ? 'Loading' : '')}</em>
                        <svg className="wave" viewBox="0 0 300 40" preserveAspectRatio="none"><path d="M0 28 C 50 8, 90 36, 140 22 S 230 6, 300 24 V40 H0Z" fill={bg} /></svg>
                    </article>
                ))}
            </div>
            <div className="grid-2">
                <section className="card">
                    <div className="card-head"><h2>{t('Purchase and Sale Flow')}</h2><span className="muted">{data?.label}</span></div>
                    <canvas ref={flowRef} height="120" />
                </section>
                <section className="card">
                    <div className="card-head"><h2>{t('Sales in {month}', { month: data?.month || '' })}</h2><a href="/sales">{t('View all →')}</a></div>
                    <table>
                        <thead><tr><th>#</th><th>{t('Product Details')}</th><th>{t('QTY')}</th><th>{t('Total')}</th></tr></thead>
                        <tbody>
                            {data?.sales?.length ? data.sales.map((sale, index) => (
                                <tr key={sale.id}><td>{index + 1}</td><td><a href={`/sales/${sale.id}`}>{sale.invoice_no}</a><div className="muted">{sale.sold_at}</div></td><td>{sale.items}</td><td>{money(sale.grand_cents)}</td></tr>
                            )) : <tr><td className="empty" colSpan="4">{t('No data found')}</td></tr>}
                        </tbody>
                    </table>
                </section>
            </div>
            <div className="grid-3">
                <section className="card">
                    <div className="card-head"><h2>{t('Top Selling Products')}</h2><a href="/products">{t('View all →')}</a></div>
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
                    <div className="card-head"><h2>{t('Purchase in {month}', { month: data?.month || '' })}</h2><a href="/purchase/list">{t('View all →')}</a></div>
                    <table>
                        <thead><tr><th>#</th><th>Product Details</th><th>Total</th></tr></thead>
                        <tbody>
                            {data?.purchases?.length ? data.purchases.map((row, index) => (
                                <tr key={row.id}><td>{index + 1}</td><td><a href={`/purchase/${row.id}`}>{row.reference}</a></td><td>{money(row.grand_cents)}</td></tr>
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
