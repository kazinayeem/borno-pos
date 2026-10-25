import { useEffect, useState } from 'react';
import { api, money } from '../api';
import { useT } from '../i18n';
import { Pagination, SearchInput } from '../components/ui';
import { useUrlQueryState } from '../hooks/useUrlQueryState';

const defaultFrom = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
const defaultTo = new Date().toISOString().slice(0, 10);

function DateRangeSelector({ from, to, onChange, onApply }) {
    const t = useT();
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
            <input
                type="date"
                value={from || ''}
                onChange={(e) => onChange?.({ from: e.target.value })}
            />
            <span className="muted">to</span>
            <input
                type="date"
                value={to || ''}
                onChange={(e) => onChange?.({ to: e.target.value })}
            />
            {onApply && (
                <button type="button" className="btn primary" onClick={onApply}>
                    {t('Apply Filter')}
                </button>
            )}
            <button type="button" className="btn" onClick={() => window.print()}>
                🖨 {t('Print')}
            </button>
        </div>
    );
}

function ReportErrorAlert({ message, onRetry }) {
    const t = useT();
    return (
        <div style={{
            padding: '14px 18px',
            background: 'var(--card, #fff)',
            border: '1px solid #fca5a5',
            borderRadius: '10px',
            margin: '16px 0',
            color: '#b91c1c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
        }}>
            <div>
                <strong>⚠️ {t('Error loading data')}:</strong> {message || t('A network or server error occurred.')}
            </div>
            {onRetry && (
                <button type="button" className="btn small" onClick={onRetry} style={{ borderColor: '#fca5a5' }}>
                    🔄 {t('Retry')}
                </button>
            )}
        </div>
    );
}

export function ReportSummaryPage() {
    const t = useT();
    const { queryState, setQuery } = useUrlQueryState({
        from: defaultFrom,
        to: defaultTo,
    });
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    function loadData() {
        setLoading(true);
        setError(null);
        api(`/report/summary?from=${queryState.from}&to=${queryState.to}`)
            .then((res) => {
                setData(res.data || null);
            })
            .catch((err) => {
                setError(err.message || t('Failed to generate summary report.'));
            })
            .finally(() => setLoading(false));
    }

    useEffect(() => {
        loadData();
    }, [queryState.from, queryState.to]);

    return (
        <div>
            <div className="page-title">
                <div>
                    <h1>{t('Business Summary Report')}</h1>
                    <div className="crumbs">{t('Comprehensive sales, purchases, expenses, and cash flow overview')}</div>
                </div>
                <DateRangeSelector
                    from={queryState.from}
                    to={queryState.to}
                    onChange={(updates) => setQuery(updates)}
                    onApply={loadData}
                />
            </div>

            {error && <ReportErrorAlert message={error} onRetry={loadData} />}

            {loading ? (
                <p className="muted" style={{ padding: '24px' }}>{t('Generating summary report…')}</p>
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
            ) : !error && (
                <p className="empty" style={{ padding: '24px' }}>{t('No report data available.')}</p>
            )}
        </div>
    );
}

export function ReportProfitLossPage() {
    const t = useT();
    const { queryState, setQuery } = useUrlQueryState({
        from: defaultFrom,
        to: defaultTo,
    });
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    function loadData() {
        setLoading(true);
        setError(null);
        api(`/report/profit-loss?from=${queryState.from}&to=${queryState.to}`)
            .then((res) => setData(res.data || null))
            .catch((err) => setError(err.message || t('Failed to calculate profit & loss statement.')))
            .finally(() => setLoading(false));
    }

    useEffect(() => {
        loadData();
    }, [queryState.from, queryState.to]);

    return (
        <div>
            <div className="page-title">
                <div>
                    <h1>{t('Profit & Loss Statement')}</h1>
                    <div className="crumbs">{t('Net profit, gross margin, cost of goods sold, and operating overheads')}</div>
                </div>
                <DateRangeSelector
                    from={queryState.from}
                    to={queryState.to}
                    onChange={(updates) => setQuery(updates)}
                    onApply={loadData}
                />
            </div>

            {error && <ReportErrorAlert message={error} onRetry={loadData} />}

            {loading ? (
                <p className="muted" style={{ padding: '24px' }}>{t('Calculating profit and loss statement…')}</p>
            ) : data ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                    <div className="card" style={{ padding: '20px' }}>
                        <span className="muted" style={{ fontSize: '13px', fontWeight: 700 }}>🛒 {t('Gross Sales (Revenue)')}</span>
                        <div style={{ fontSize: '22px', fontWeight: 800, marginTop: '8px' }}>{money(data.sales_cents || 0)}</div>
                    </div>
                    <div className="card" style={{ padding: '20px' }}>
                        <span className="muted" style={{ fontSize: '13px', fontWeight: 700 }}>📦 {t('Cost of Goods Sold (COGS)')}</span>
                        <div style={{ fontSize: '22px', fontWeight: 800, marginTop: '8px', color: '#64748b' }}>{money(data.cogs_cents || 0)}</div>
                    </div>
                    <div className="card" style={{ padding: '20px' }}>
                        <span className="muted" style={{ fontSize: '13px', fontWeight: 700 }}>📈 {t('Gross Profit')}</span>
                        <div style={{ fontSize: '22px', fontWeight: 800, marginTop: '8px', color: '#10b981' }}>{money(data.gross_profit_cents || 0)}</div>
                    </div>
                    <div className="card" style={{ padding: '20px' }}>
                        <span className="muted" style={{ fontSize: '13px', fontWeight: 700 }}>💸 {t('Total Expenses')}</span>
                        <div style={{ fontSize: '22px', fontWeight: 800, marginTop: '8px', color: '#ef4444' }}>{money(data.expenses_cents || 0)}</div>
                    </div>
                    <div className="card" style={{ padding: '20px', gridColumn: '1 / -1' }}>
                        <span className="muted" style={{ fontSize: '14px', fontWeight: 700 }}>✨ {t('Net Profit / Loss')}</span>
                        <div style={{ fontSize: '32px', fontWeight: 900, marginTop: '8px', color: (data.net_profit_cents || 0) >= 0 ? '#10b981' : '#ef4444' }}>
                            {money(data.net_profit_cents || 0)}
                        </div>
                    </div>
                </div>
            ) : !error && (
                <p className="empty" style={{ padding: '24px' }}>{t('No financial data available for this range.')}</p>
            )}
        </div>
    );
}

export function ReportPurchasesPage() {
    const t = useT();
    const { queryState, setQuery, setPage, setPerPage } = useUrlQueryState({
        from: defaultFrom,
        to: defaultTo,
        page: 1,
        per_page: 15,
    });
    const [purchases, setPurchases] = useState([]);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    function loadData() {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        if (queryState.from) params.set('from', queryState.from);
        if (queryState.to) params.set('to', queryState.to);
        if (queryState.page) params.set('page', queryState.page);
        if (queryState.per_page) params.set('per_page', queryState.per_page);

        api(`/report/purchases?${params.toString()}`)
            .then((res) => {
                setPurchases(res.purchases || []);
                setMeta(res.meta || null);
            })
            .catch((err) => {
                setError(err.message || t('Failed to load purchases report.'));
                setPurchases([]);
                setMeta(null);
            })
            .finally(() => setLoading(false));
    }

    useEffect(() => {
        loadData();
    }, [queryState.from, queryState.to, queryState.page, queryState.per_page]);

    return (
        <div>
            <div className="page-title">
                <div>
                    <h1>{t('Purchases Report')}</h1>
                    <div className="crumbs">{t('Purchased merchandise, supplier payables, and inventory acquisition logs')}</div>
                </div>
                <DateRangeSelector
                    from={queryState.from}
                    to={queryState.to}
                    onChange={(updates) => setQuery({ ...updates, page: 1 })}
                    onApply={loadData}
                />
            </div>

            {error && <ReportErrorAlert message={error} onRetry={loadData} />}

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
                {!loading && !error && purchases.length === 0 && <p className="empty">{t('No purchases found in this date range.')}</p>}
                {meta && (
                    <Pagination
                        meta={meta}
                        page={queryState.page}
                        perPage={queryState.per_page}
                        onPageChange={setPage}
                        onPerPageChange={setPerPage}
                    />
                )}
            </section>
        </div>
    );
}

export function ReportSalesPage() {
    const t = useT();
    const { queryState, setQuery, setPage, setPerPage } = useUrlQueryState({
        from: defaultFrom,
        to: defaultTo,
        page: 1,
        per_page: 15,
    });
    const [sales, setSales] = useState([]);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    function loadData() {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        if (queryState.from) params.set('from', queryState.from);
        if (queryState.to) params.set('to', queryState.to);
        if (queryState.page) params.set('page', queryState.page);
        if (queryState.per_page) params.set('per_page', queryState.per_page);

        api(`/report/sales?${params.toString()}`)
            .then((res) => {
                setSales(res.sales || []);
                setMeta(res.meta || null);
            })
            .catch((err) => {
                setError(err.message || t('Failed to load sales report.'));
                setSales([]);
                setMeta(null);
            })
            .finally(() => setLoading(false));
    }

    useEffect(() => {
        loadData();
    }, [queryState.from, queryState.to, queryState.page, queryState.per_page]);

    return (
        <div>
            <div className="page-title">
                <div>
                    <h1>{t('Sales Report')}</h1>
                    <div className="crumbs">{t('Completed transactions, customer sales, and collection details')}</div>
                </div>
                <DateRangeSelector
                    from={queryState.from}
                    to={queryState.to}
                    onChange={(updates) => setQuery({ ...updates, page: 1 })}
                    onApply={loadData}
                />
            </div>

            {error && <ReportErrorAlert message={error} onRetry={loadData} />}

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
                {!loading && !error && sales.length === 0 && <p className="empty">{t('No sales found in this date range.')}</p>}
                {meta && (
                    <Pagination
                        meta={meta}
                        page={queryState.page}
                        perPage={queryState.per_page}
                        onPageChange={setPage}
                        onPerPageChange={setPerPage}
                    />
                )}
            </section>
        </div>
    );
}

export function ReportProductsPage() {
    const t = useT();
    const { queryState, setQuery, setPage, setPerPage } = useUrlQueryState({
        search: '',
        page: 1,
        per_page: 15,
    });
    const [products, setProducts] = useState([]);
    const [totalValuation, setTotalValuation] = useState(0);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    function loadData() {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        if (queryState.page) params.set('page', queryState.page);
        if (queryState.per_page) params.set('per_page', queryState.per_page);
        if (queryState.search) params.set('search', queryState.search);

        api(`/report/product?${params.toString()}`)
            .then((res) => {
                setProducts(res.products || []);
                setTotalValuation(res.total_valuation_cents || 0);
                setMeta(res.meta || null);
            })
            .catch((err) => {
                setError(err.message || t('Failed to load product valuation report.'));
                setProducts([]);
                setMeta(null);
            })
            .finally(() => setLoading(false));
    }

    useEffect(() => {
        loadData();
    }, [queryState.page, queryState.per_page, queryState.search]);

    return (
        <div>
            <div className="page-title" style={{ flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1>{t('Product Valuation & Stock Report')}</h1>
                    <div className="crumbs">{t('Inventory valuation, on-hand counts, and asset worth')}</div>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <SearchInput
                        value={queryState.search}
                        onChange={(val) => setQuery({ search: val, page: 1 })}
                        placeholder={t('Search products...')}
                        style={{ width: '220px' }}
                    />
                    <div className="card" style={{ padding: '8px 16px', fontWeight: 800, fontSize: '15px', color: '#10b981' }}>
                        {t('Total Stock Worth')}: {money(totalValuation)}
                    </div>
                    <button type="button" className="btn" onClick={() => window.print()}>🖨 {t('Print')}</button>
                </div>
            </div>

            {error && <ReportErrorAlert message={error} onRetry={loadData} />}

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
                {!loading && !error && products.length === 0 && <p className="empty">{t('No products found.')}</p>}
                {meta && (
                    <Pagination
                        meta={meta}
                        page={queryState.page}
                        perPage={queryState.per_page}
                        onPageChange={setPage}
                        onPerPageChange={setPerPage}
                    />
                )}
            </section>
        </div>
    );
}

export function ReportExpensesPage() {
    const t = useT();
    const { queryState, setQuery, setPage, setPerPage } = useUrlQueryState({
        from: defaultFrom,
        to: defaultTo,
        page: 1,
        per_page: 15,
    });
    const [expenses, setExpenses] = useState([]);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    function loadData() {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        if (queryState.from) params.set('from', queryState.from);
        if (queryState.to) params.set('to', queryState.to);
        if (queryState.page) params.set('page', queryState.page);
        if (queryState.per_page) params.set('per_page', queryState.per_page);

        api(`/report/expense?${params.toString()}`)
            .then((res) => {
                setExpenses(res.expenses || []);
                setMeta(res.meta || null);
            })
            .catch((err) => {
                setError(err.message || t('Failed to load expense report.'));
                setExpenses([]);
                setMeta(null);
            })
            .finally(() => setLoading(false));
    }

    useEffect(() => {
        loadData();
    }, [queryState.from, queryState.to, queryState.page, queryState.per_page]);

    return (
        <div>
            <div className="page-title">
                <div>
                    <h1>{t('Expense Report')}</h1>
                    <div className="crumbs">{t('Categorized operational spending and expense audits')}</div>
                </div>
                <DateRangeSelector
                    from={queryState.from}
                    to={queryState.to}
                    onChange={(updates) => setQuery({ ...updates, page: 1 })}
                    onApply={loadData}
                />
            </div>

            {error && <ReportErrorAlert message={error} onRetry={loadData} />}

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
                {!loading && !error && expenses.length === 0 && <p className="empty">{t('No expenses recorded in this period.')}</p>}
                {meta && (
                    <Pagination
                        meta={meta}
                        page={queryState.page}
                        perPage={queryState.per_page}
                        onPageChange={setPage}
                        onPerPageChange={setPerPage}
                    />
                )}
            </section>
        </div>
    );
}
export default ReportSummaryPage;
