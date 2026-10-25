import { useEffect, useState } from 'react';
import { api, money } from '../api';
import { useT } from '../i18n';

export function StockCountPage() {
    const t = useT();
    const [products, setProducts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [categories, setCategories] = useState([]);
    const [counts, setCounts] = useState([]);
    const [warehouseId, setWarehouseId] = useState('');
    const [countedOn, setCountedOn] = useState(new Date().toISOString().slice(0, 10));
    const [counted, setCounted] = useState({});
    const [note, setNote] = useState('');
    const [q, setQ] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');
    const [err, setErr] = useState('');

    function loadData() {
        setLoading(true);
        const params = new URLSearchParams();
        if (q) params.set('q', q);
        api(`/stock/count?${params.toString()}`)
            .then((res) => {
                setProducts(res.products || []);
                setWarehouses(res.warehouses || []);
                setCategories(res.categories || []);
                setCounts(res.counts || []);
                if (res.warehouses?.length && !warehouseId) {
                    setWarehouseId(String(res.warehouses[0].id));
                }
            })
            .catch((e) => setErr(e.message))
            .finally(() => setLoading(false));
    }

    useEffect(() => { loadData(); }, []);

    function handleQtyChange(productId, val) {
        setCounted((prev) => ({
            ...prev,
            [productId]: val === '' ? '' : parseInt(val, 10) || 0,
        }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setMsg('');
        setErr('');
        setSaving(true);
        try {
            await api('/stock/count', {
                method: 'POST',
                body: {
                    warehouse_id: parseInt(warehouseId),
                    counted_on: countedOn,
                    note,
                    counted,
                },
            });
            setMsg(t('Stock count applied and inventory reconciled successfully.'));
            setCounted({});
            setNote('');
            loadData();
        } catch (e) {
            setErr(e.message || t('Failed to apply stock count.'));
        } finally {
            setSaving(false);
        }
    }

    return (
        <div>
            <div className="page-title">
                <div>
                    <h1>{t('Physical Stock Count & Reconciliation')}</h1>
                    <div className="crumbs">{t('Audit physical inventory on shelf against system records')}</div>
                </div>
            </div>

            {msg && <div className="flash note" style={{ marginBottom: '16px' }}>{msg}<button type="button" onClick={() => setMsg('')}>×</button></div>}
            {err && <div className="errors note" style={{ marginBottom: '16px' }}>{err}</div>}

            <form onSubmit={handleSubmit}>
                <section className="card" style={{ marginBottom: '20px', padding: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                        <div className="field">
                            <label>{t('Audit Warehouse')}</label>
                            <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} required>
                                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>
                        <div className="field">
                            <label>{t('Count Date')}</label>
                            <input type="date" value={countedOn} onChange={(e) => setCountedOn(e.target.value)} required />
                        </div>
                        <div className="field">
                            <label>{t('Audit Remarks / Note')}</label>
                            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Monthly inventory count" />
                        </div>
                    </div>
                </section>

                <section className="card" style={{ marginBottom: '20px', padding: '16px' }}>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                        <input
                            style={{ flex: 1 }}
                            placeholder={t('Search products by name, code, barcode...')}
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), loadData())}
                        />
                        <button type="button" className="btn primary" onClick={loadData}>{t('Search')}</button>
                    </div>

                    <table className="grid">
                        <thead>
                            <tr>
                                <th>{t('Product')}</th>
                                <th>{t('Code / Barcode')}</th>
                                <th>{t('Category')}</th>
                                <th style={{ textAlign: 'center' }}>{t('Expected Stock')}</th>
                                <th style={{ width: '160px', textAlign: 'center' }}>{t('Counted Physical Qty')}</th>
                                <th style={{ textAlign: 'center' }}>{t('Variance')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((p) => {
                                const countVal = counted[p.id];
                                const hasCount = countVal !== undefined && countVal !== '';
                                const variance = hasCount ? (parseInt(countVal, 10) - p.stock_qty) : 0;
                                return (
                                    <tr key={p.id}>
                                        <td><strong>{p.name}</strong></td>
                                        <td><code>{p.code || p.barcode || '—'}</code></td>
                                        <td>{p.category || '—'}</td>
                                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{p.stock_qty}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <input
                                                type="number"
                                                min="0"
                                                style={{ width: '110px', textAlign: 'center' }}
                                                value={countVal !== undefined ? countVal : ''}
                                                onChange={(e) => handleQtyChange(p.id, e.target.value)}
                                                placeholder={String(p.stock_qty)}
                                            />
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {hasCount ? (
                                                <span className={`badge ${variance === 0 ? 'success' : variance > 0 ? 'blue' : 'danger'}`}>
                                                    {variance > 0 ? `+${variance}` : variance}
                                                </span>
                                            ) : '—'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {loading && <p className="muted" style={{ padding: '16px' }}>{t('Loading products…')}</p>}

                    <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="submit" className="btn primary" disabled={saving || Object.keys(counted).length === 0}>
                            {saving ? t('Applying Reconciliations…') : t('Apply Stock Reconciliation')}
                        </button>
                    </div>
                </section>
            </form>

            <section className="card">
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>📜 {t('Recent Stock Count Audits')}</h3>
                </div>
                <table className="grid">
                    <thead>
                        <tr>
                            <th>{t('Audited On')}</th>
                            <th>{t('Warehouse')}</th>
                            <th>{t('Audited By')}</th>
                            <th>{t('Remarks')}</th>
                            <th style={{ textAlign: 'center' }}>{t('Status')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {counts.map((c) => (
                            <tr key={c.id}>
                                <td>{c.counted_on}</td>
                                <td><strong>{c.warehouse || '—'}</strong></td>
                                <td>{c.user || '—'}</td>
                                <td>{c.note || '—'}</td>
                                <td style={{ textAlign: 'center' }}><span className="badge success">{c.status}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {counts.length === 0 && <p className="empty">{t('No audit history recorded yet.')}</p>}
            </section>
        </div>
    );
}

export function SaleReturnsPage() {
    const t = useT();
    const [returns, setReturns] = useState([]);
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(true);

    function loadData() {
        setLoading(true);
        api(`/sale-returns?page=${page}`)
            .then((res) => {
                setReturns(res.returns || []);
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
                    <h1>{t('Sale Returns')}</h1>
                    <div className="crumbs">{t('Returned items, customer refunds, and restocked merchandise')}</div>
                </div>
            </div>

            <section className="card">
                <table className="grid">
                    <thead>
                        <tr>
                            <th>{t('Return Date')}</th>
                            <th>{t('Original Invoice')}</th>
                            <th style={{ textAlign: 'right' }}>{t('Refund Amount')}</th>
                            <th>{t('Reason / Note')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {returns.map((r) => (
                            <tr key={r.id}>
                                <td>{r.returned_on}</td>
                                <td><strong>{r.invoice_no || `Sale #${r.sale_id}`}</strong></td>
                                <td style={{ textAlign: 'right', fontWeight: 700, color: '#ef4444' }}>
                                    {money(r.total_cents)}
                                </td>
                                <td>{r.note || '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {loading && <p className="muted" style={{ padding: '16px' }}>{t('Loading sale returns…')}</p>}
                {!loading && returns.length === 0 && <p className="empty">{t('No sale returns recorded.')}</p>}
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
