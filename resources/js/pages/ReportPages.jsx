import { useEffect, useState } from 'react';
import { api, money } from '../api';
import { useT } from '../i18n';

function DateRangeSelector({ from, to, setFrom, setTo, onApply }) {
    const t = useT();
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <span className="muted">to</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            <button type="button" className="btn primary" onClick={onApply}>{t('Apply Filter')}</button>
            <button type="button" className="btn" onClick={() => window.print()}>🖨 {t('Print')}</button>
        </div>
    );
}

export function ReportSummaryPage() {
    const t = useT();
    const [from, setFrom] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
    const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    function loadData() {
        setLoading(true);
        api(`/report/summary?from=${from}&to=${to}`)
            .then((res) => setData(res.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }

    useEffect(() => { loadData(); }, []);

    return (
        <div>
            <div className="page-title">
                <div>
                    <h1>{t('Business Summary Report')}</h1>
                    <div className="crumbs">{t('Comprehensive sales, purchases, expenses, and cash flow overview')}</div>
                </div>
                <DateRangeSelector from={from} to={to} setFrom={setFrom} setTo={setTo} onApply={loadData} />
            </div>

            {loading ? (
                <p className="muted">{t('Generating summary report…')}</p>
            ) : data ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                    <div className="card" style={{ padding: '20px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--muted)' }}>🛒 {t('Total Sales')}</span>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981', marginTop: '8px' }}>{money(data.sales_cents || 0)}</div>
                        <small className="muted" style={{ display: 'block', marginTop: '4px' }}>{data.sales_count || 0} {t('invoices')}</small>
                    </div>
                    <div className="card" style={{ padding: '20px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--muted)' }}>📦 {t('Total Purchases')}</span>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: '#2563eb', marginTop: '8px' }}>{money(data.purchases_cents || 0)}</div>
                        <small className="muted" style={{ display: 'block', marginTop: '4px' }}>{data.purchases_count || 0} {t('purchase orders')}</small>
                    </div>
                    <div className="card" style={{ padding: '20px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--muted)' }}>💸 {t('Operating Expenses')}</span>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: '#ef4444', marginTop: '8px' }}>{money(data.expenses_cents || 0)}</div>
                    </div>
                    <div className="card" style={{ padding: '20px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--muted)' }}>✨ {t('Net Profit / Surplus')}</span>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: (data.net_profit_cents || 0) >= 0 ? '#10b981' : '#ef4444', marginTop: '8px' }}>
                            {money(data.net_profit_cents || 0)}
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

export function ReportProfitLossPage() {
    const t = useT();
    const [from, setFrom] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
    const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    function loadData() {
        setLoading(true);
        api(`/report/profit-loss?from=${from}&to=${to}`)
            .then((res) => setData(res.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }

    useEffect(() => { loadData(); }, []);

    return (
        <div>
            <div className="page-title">
                <div>
                    <h1>{t('Profit & Loss Statement')}</h1>
                    <div className="crumbs">{t('Net profit, gross margin, cost of goods sold, and operating overheads')}</div>
                </div>
                <DateRangeSelector from={from} to={to} setFrom={setFrom} setTo={setTo} onApply={loadData} />
            </div>

            {loading ? (
                <p className="muted">{t('Calculating profit and loss statement…')}</p>
            ) : data ? (
                <section className="card" style={{ maxWidth: '720px', margin: '0 auto' }}>
                    <table className="grid">
                        <tbody>
                            <tr>
                                <td><strong>{t('Total Sales Revenue')}</strong></td>
                                <td style={{ textAlign: 'right', fontWeight: 700, color: '#10b981' }}>{money(data.sales_cents || 0)}</td>
                            </tr>
                            <tr>
                                <td>{t('Cost of Goods Sold (COGS)')}</td>
                                <td style={{ textAlign: 'right', color: '#ef4444' }}>-{money(data.cogs_cents || 0)}</td>
                            </tr>
                            <tr style={{ background: 'var(--bg)', fontWeight: 800 }}>
                                <td>{t('Gross Margin')}</td>
                                <td style={{ textAlign: 'right', color: '#10b981' }}>{money((data.sales_cents || 0) - (data.cogs_cents || 0))}</td>
                            </tr>
                            <tr>
                                <td>{t('Operating Overheads & Expenses')}</td>
                                <td style={{ textAlign: 'right', color: '#ef4444' }}>-{money(data.expenses_cents || 0)}</td>
                            </tr>
                            <tr>
                                <td>{t('Staff Salary & Payroll Cost')}</td>
                                <td style={{ textAlign: 'right', color: '#ef4444' }}>-{money(data.salary_cost_cents || 0)}</td>
                            </tr>
                            <tr style={{ background: 'var(--bg)', borderTop: '2px solid var(--border)', fontSize: '16px' }}>
                                <td><strong>{t('Net Operating Profit')}</strong></td>
                                <td style={{ textAlign: 'right', fontWeight: 800, color: (data.net_profit_cents || 0) >= 0 ? '#10b981' : '#ef4444' }}>
                                    {money(data.net_profit_cents || 0)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </section>
            ) : null}
        </div>
    );
}

export function ReportPurchasesPage() {
    const t = useT();
    const [from, setFrom] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
    const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
    const [purchases, setPurchases] = useState([]);
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(true);

    function loadData() {
        setLoading(true);
        api(`/report/purchases?from=${from}&to=${to}&page=${page}`)
            .then((res) => {
                setPurchases(res.purchases || []);
                setMeta(res.meta || null);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }

    useEffect(() => { loadData(); }, [page]);

    return (
        <div>
            <div className="page-title">
                <div>
                    <h1>{t('Purchases Report')}</h1>
                    <div className="crumbs">{t('Purchased merchandise, supplier payables, and inventory acquisition logs')}</div>
                </div>
                <DateRangeSelector from={from} to={to} setFrom={setFrom} setTo={setTo} onApply={() => { setPage(1); loadData(); }} />
            </div>

            <section className="card">
                <table className="grid">
                    <thead>
                        <tr>
                            <th>{t('Date')}</th>
                            <th>{t('Reference')}</th>
                            <th>{t('Supplier')}</th>
                            <th>{t('Warehouse')}</th>
                            <th style={{ textAlign: 'right' }}>{t('Total Amount')}</th>
                            <th style={{ textAlign: 'right' }}>{t('Paid')}</th>
                            <th style={{ textAlign: 'right' }}>{t('Due')}</th>
                            <th style={{ textAlign: 'center' }}>{t('Status')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {purchases.map((p) => (
                            <tr key={p.id}>
                                <td>{p.purchased_on}</td>
                                <td><strong>{p.reference}</strong></td>
                                <td>{p.supplier || '—'}</td>
                                <td>{p.warehouse || '—'}</td>
                                <td style={{ textAlign: 'right', fontWeight: 700 }}>{money(p.grand_cents)}</td>
                                <td style={{ textAlign: 'right', color: '#10b981' }}>{money(p.paid_cents)}</td>
                                <td style={{ textAlign: 'right', color: p.due_cents > 0 ? '#ef4444' : 'var(--muted)' }}>{money(p.due_cents)}</td>
                                <td style={{ textAlign: 'center' }}><span className="badge">{p.status}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {loading && <p className="muted" style={{ padding: '16px' }}>{t('Loading report…')}</p>}
                {!loading && purchases.length === 0 && <p className="empty">{t('No purchases found in this date range.')}</p>}
                {meta && meta.last_page > 1 && (
                    <div className="actions" style={{ padding: '12px 16px' }}>
                        <button type="button" className="btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t('Previous')}</button>
                        <span className="muted" style={{ alignSelf: 'center', fontSize: '13px' }}>Page {page} of {meta.last_page}</span>
                        <button type="button" className="btn" disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)}>{t('Next')}</button>
                    </div>
                )}
            </section>
        </div>
    );
}

export function ReportSalesPage() {
    const t = useT();
    const [from, setFrom] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
    const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
    const [sales, setSales] = useState([]);
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(true);

    function loadData() {
        setLoading(true);
        api(`/report/sales?from=${from}&to=${to}&page=${page}`)
            .then((res) => {
                setSales(res.sales || []);
                setMeta(res.meta || null);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }

    useEffect(() => { loadData(); }, [page]);

    return (
        <div>
            <div className="page-title">
                <div>
                    <h1>{t('Sales Report')}</h1>
                    <div className="crumbs">{t('Completed transactions, customer sales, and collection details')}</div>
                </div>
                <DateRangeSelector from={from} to={to} setFrom={setFrom} setTo={setTo} onApply={() => { setPage(1); loadData(); }} />
            </div>

            <section className="card">
                <table className="grid">
                    <thead>
                        <tr>
                            <th>{t('Date')}</th>
                            <th>{t('Invoice')}</th>
                            <th>{t('Customer')}</th>
                            <th>{t('Billed By')}</th>
                            <th style={{ textAlign: 'right' }}>{t('Total Amount')}</th>
                            <th style={{ textAlign: 'right' }}>{t('Paid')}</th>
                            <th style={{ textAlign: 'right' }}>{t('Due')}</th>
                            <th style={{ textAlign: 'center' }}>{t('Status')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sales.map((s) => (
                            <tr key={s.id}>
                                <td>{s.created_at}</td>
                                <td><strong>{s.invoice_no}</strong></td>
                                <td>{s.customer || 'Walk-in'}</td>
                                <td>{s.billed_by || '—'}</td>
                                <td style={{ textAlign: 'right', fontWeight: 700 }}>{money(s.grand_cents)}</td>
                                <td style={{ textAlign: 'right', color: '#10b981' }}>{money(s.paid_cents)}</td>
                                <td style={{ textAlign: 'right', color: s.due_cents > 0 ? '#ef4444' : 'var(--muted)' }}>{money(s.due_cents)}</td>
                                <td style={{ textAlign: 'center' }}><span className="badge success">{s.status}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {loading && <p className="muted" style={{ padding: '16px' }}>{t('Loading report…')}</p>}
                {!loading && sales.length === 0 && <p className="empty">{t('No sales found in this date range.')}</p>}
                {meta && meta.last_page > 1 && (
                    <div className="actions" style={{ padding: '12px 16px' }}>
                        <button type="button" className="btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t('Previous')}</button>
                        <span className="muted" style={{ alignSelf: 'center', fontSize: '13px' }}>Page {page} of {meta.last_page}</span>
                        <button type="button" className="btn" disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)}>{t('Next')}</button>
                    </div>
                )}
            </section>
        </div>
    );
}

export function ReportProductsPage() {
    const t = useT();
    const [products, setProducts] = useState([]);
    const [totalValuation, setTotalValuation] = useState(0);
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(true);

    function loadData() {
        setLoading(true);
        api(`/report/product?page=${page}`)
            .then((res) => {
                setProducts(res.products || []);
                setTotalValuation(res.total_valuation_cents || 0);
                setMeta(res.meta || null);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }

    useEffect(() => { loadData(); }, [page]);

    return (
        <div>
            <div className="page-title">
                <div>
                    <h1>{t('Product Valuation & Stock Report')}</h1>
                    <div className="crumbs">{t('Inventory valuation, on-hand counts, and asset worth')}</div>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div className="card" style={{ padding: '8px 16px', fontWeight: 800, fontSize: '15px', color: '#10b981' }}>
                        {t('Total Stock Worth')}: {money(totalValuation)}
                    </div>
                    <button type="button" className="btn" onClick={() => window.print()}>🖨 {t('Print')}</button>
                </div>
            </div>

            <section className="card">
                <table className="grid">
                    <thead>
                        <tr>
                            <th>{t('Product')}</th>
                            <th>{t('Code')}</th>
                            <th>{t('Category')}</th>
                            <th style={{ textAlign: 'center' }}>{t('Stock Qty')}</th>
                            <th style={{ textAlign: 'right' }}>{t('Unit Cost')}</th>
                            <th style={{ textAlign: 'right' }}>{t('Selling Price')}</th>
                            <th style={{ textAlign: 'right' }}>{t('Valuation')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map((p) => (
                            <tr key={p.id}>
                                <td><strong>{p.name}</strong></td>
                                <td><code>{p.code || '—'}</code></td>
                                <td>{p.category || '—'}</td>
                                <td style={{ textAlign: 'center', fontWeight: 700 }}>{p.stock_qty}</td>
                                <td style={{ textAlign: 'right' }}>{money(p.cost_cents)}</td>
                                <td style={{ textAlign: 'right' }}>{money(p.price_cents)}</td>
                                <td style={{ textAlign: 'right', fontWeight: 700, color: '#10b981' }}>{money(p.valuation_cents)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {loading && <p className="muted" style={{ padding: '16px' }}>{t('Loading inventory valuation…')}</p>}
                {!loading && products.length === 0 && <p className="empty">{t('No products found.')}</p>}
                {meta && meta.last_page > 1 && (
                    <div className="actions" style={{ padding: '12px 16px' }}>
                        <button type="button" className="btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t('Previous')}</button>
                        <span className="muted" style={{ alignSelf: 'center', fontSize: '13px' }}>Page {page} of {meta.last_page}</span>
                        <button type="button" className="btn" disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)}>{t('Next')}</button>
                    </div>
                )}
            </section>
        </div>
    );
}

export function ReportExpensesPage() {
    const t = useT();
    const [from, setFrom] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
    const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
    const [expenses, setExpenses] = useState([]);
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(true);

    function loadData() {
        setLoading(true);
        api(`/report/expense?from=${from}&to=${to}&page=${page}`)
            .then((res) => {
                setExpenses(res.expenses || []);
                setMeta(res.meta || null);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }

    useEffect(() => { loadData(); }, [page]);

    return (
        <div>
            <div className="page-title">
                <div>
                    <h1>{t('Expense Report')}</h1>
                    <div className="crumbs">{t('Categorized operational spending and expense audits')}</div>
                </div>
                <DateRangeSelector from={from} to={to} setFrom={setFrom} setTo={setTo} onApply={() => { setPage(1); loadData(); }} />
            </div>

            <section className="card">
                <table className="grid">
                    <thead>
                        <tr>
                            <th>{t('Date')}</th>
                            <th>{t('Category')}</th>
                            <th style={{ textAlign: 'right' }}>{t('Amount')}</th>
                            <th>{t('Description')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {expenses.map((e) => (
                            <tr key={e.id}>
                                <td>{e.spent_on}</td>
                                <td><span className="badge">{e.category || 'General'}</span></td>
                                <td style={{ textAlign: 'right', fontWeight: 700, color: '#ef4444' }}>{money(e.amount_cents)}</td>
                                <td>{e.note || '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {loading && <p className="muted" style={{ padding: '16px' }}>{t('Loading expenses…')}</p>}
                {!loading && expenses.length === 0 && <p className="empty">{t('No expenses recorded in this period.')}</p>}
                {meta && meta.last_page > 1 && (
                    <div className="actions" style={{ padding: '12px 16px' }}>
                        <button type="button" className="btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t('Previous')}</button>
                        <span className="muted" style={{ alignSelf: 'center', fontSize: '13px' }}>Page {page} of {meta.last_page}</span>
                        <button type="button" className="btn" disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)}>{t('Next')}</button>
                    </div>
                )}
            </section>
        </div>
    );
}
