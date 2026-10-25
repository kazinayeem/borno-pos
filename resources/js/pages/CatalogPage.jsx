import { useState } from 'react';
import { api, money, setCurrency } from '../api';
import { useT } from '../i18n';
import { useDeleteCatalogMutation, useGetCatalogQuery, useSaveCatalogMutation } from '../services/bornoposApi';

function display(row, field) {
    const value = row[field.name];
    if (value === null || value === undefined || value === '') return '—';
    if (field.type === 'money' || String(field.name).endsWith('_cents')) return money(value);
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return value.name || JSON.stringify(value);

    return String(value);
}

function seed(fields, row) {
    const next = {};
    fields.forEach((field) => {
        let value = row?.[field.name];
        if (field.type === 'money' && typeof value === 'number') value = (value / 100).toFixed(2);
        if (field.type === 'checkbox') value = !!value;
        if (field.type === 'checks') value = value || [];
        next[field.name] = value ?? (field.type === 'checks' ? [] : '');
    });

    return next;
}

export default function CatalogPage({ endpoint }) {
    const t = useT();
    const [page, setPage] = useState(1);
    const [q, setQ] = useState('');
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({});
    const [message, setMessage] = useState('');
    const { data, isFetching, isError } = useGetCatalogQuery({ endpoint, page, q });
    const [save, saveState] = useSaveCatalogMutation();
    const [remove] = useDeleteCatalogMutation();
    const fields = data?.fields || [];
    const rows = data?.data || [];
    const meta = data?.meta || { current_page: 1, last_page: 1, total: 0, from: 0, to: 0 };

    function open(row = null) {
        setEditing(row || {});
        setForm(seed(fields, row));
        setMessage('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async function submit(event) {
        event.preventDefault();
        const result = await save({ endpoint, id: editing?.id, body: form });
        if (result.error) {
            const bag = result.error.data?.errors || {};
            setMessage(Object.values(bag).flat().join(' ') || result.error.data?.message || 'Could not save.');
            return;
        }
        setEditing(null);
        setMessage(result.data?.message || 'Saved.');
    }

    async function destroy(row) {
        if (!window.confirm('Delete this record?')) return;
        const result = await remove({ endpoint, id: row.id });
        if (result.error) {
            setMessage(result.error.data?.message || 'Could not delete.');
        } else {
            setMessage(result.data?.message || 'Deleted successfully.');
        }
    }

    async function activateCurrency(row) {
        try {
            const res = await api('/settings/store-currency', {
                method: 'POST',
                body: {
                    currency_code: row.code,
                    currency_symbol: row.symbol,
                },
            });
            setCurrency(row.symbol, row.code);
            setMessage(res.message || `Store currency set to ${row.name} (${row.symbol}).`);
        } catch (err) {
            setMessage(err.message || 'Could not update currency.');
        }
    }

    const isErrorMessage = message && (
        message.toLowerCase().includes('not') ||
        message.toLowerCase().includes('cannot') ||
        message.toLowerCase().includes('failed') ||
        message.toLowerCase().includes('error')
    );

    return (
        <>
            <div className="page-title">
                <div>
                    <h1>{t(data?.title || 'Loading')}</h1>
                    <div className="crumbs">{data?.singular}</div>
                </div>
                <button className="btn primary" type="button" onClick={() => open(null)}>
                    + {t('Add')} {data?.singular ? t(data.singular) : ''}
                </button>
            </div>
            {message && (
                <div
                    className="status"
                    style={{
                        marginBottom: '16px',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        background: isErrorMessage ? '#fee2e2' : '#dcfce7',
                        color: isErrorMessage ? '#991b1b' : '#166534',
                        border: `1px solid ${isErrorMessage ? '#fca5a5' : '#86efac'}`,
                        fontWeight: 500,
                    }}
                >
                    {message}
                </div>
            )}
            {editing !== null && (
                <form
                    className="card form-grid"
                    onSubmit={submit}
                    style={{
                        border: '2px solid var(--primary, #4f46e5)',
                        marginBottom: '20px',
                        boxShadow: '0 4px 12px rgba(79, 70, 229, 0.08)',
                    }}
                >
                    <div className="wide" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>
                            {editing?.id ? t('Edit {item}', { item: data?.singular || 'Item' }) : t('Add New {item}', { item: data?.singular || 'Item' })}
                        </h2>
                        <button
                            type="button"
                            onClick={() => setEditing(null)}
                            style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}
                            title="Close"
                        >
                            ✕
                        </button>
                    </div>
                    {fields.map((field) => (
                        <label key={field.name} className={field.type === 'checks' ? 'wide' : ''}>
                            {field.label}
                            {field.type === 'select' && (
                                <select value={form[field.name] ?? ''} onChange={(event) => setForm({ ...form, [field.name]: event.target.value })}>
                                    <option value="">Choose</option>
                                    {Object.entries(data?.options?.[field.name] || field.choices || {}).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                                </select>
                            )}
                            {field.type === 'checks' && (
                                <div className="checks">
                                    {Object.entries(field.choices || {}).map(([id, name]) => (
                                        <label key={id} className="check">
                                            <input type="checkbox" checked={(form[field.name] || []).includes(id)} onChange={(event) => {
                                                const current = new Set(form[field.name] || []);
                                                event.target.checked ? current.add(id) : current.delete(id);
                                                setForm({ ...form, [field.name]: [...current] });
                                            }} /> {name}
                                        </label>
                                    ))}
                                </div>
                            )}
                            {field.type === 'checkbox' && <input type="checkbox" checked={!!form[field.name]} onChange={(event) => setForm({ ...form, [field.name]: event.target.checked })} />}
                            {field.type === 'date' && <input type="date" value={String(form[field.name] || '').slice(0, 10)} onChange={(event) => setForm({ ...form, [field.name]: event.target.value })} />}
                            {!['select', 'checks', 'checkbox', 'date'].includes(field.type || 'text') && (
                                <input value={form[field.name] ?? ''} onChange={(event) => setForm({ ...form, [field.name]: event.target.value })} />
                            )}
                        </label>
                    ))}
                    <div className="wide actions" style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button className="btn primary" type="submit" disabled={saveState.isLoading}>
                            {saveState.isLoading ? t('Saving...') : t('Save')}
                        </button>
                        <button className="btn" type="button" onClick={() => setEditing(null)}>{t('Cancel')}</button>
                    </div>
                </form>
            )}
            <section className="card table-card" data-tour={endpoint === '/categories' ? 'categories-view' : 'catalog-card'}>
                <div className="toolbar">
                    <input value={q} placeholder="Search" onChange={(event) => { setQ(event.target.value); setPage(1); }} />
                </div>
                {isError && <p className="error">This list could not be loaded.</p>}
                <table className="grid">
                    <thead>
                        <tr>
                            <th>SL</th>
                            {fields.filter((field) => field.type !== 'checks').map((field) => <th key={field.name}>{field.label}</th>)}
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length ? rows.map((row, index) => (
                            <tr key={row.id}>
                                <td>{(meta.from || 1) + index}</td>
                                {fields.filter((field) => field.type !== 'checks').map((field) => <td key={field.name}>{display(row, field)}</td>)}
                                <td className="row-actions">
                                    {endpoint === '/currency' && (
                                        row.code === (window.BornoPos?.currency_code || 'USD') ? (
                                            <span className="badge ok" style={{ fontSize: '11px', padding: '4px 8px' }}>✓ Active</span>
                                        ) : (
                                            <button className="btn primary" type="button" style={{ fontSize: '11px', padding: '4px 8px' }} onClick={() => activateCurrency(row)}>Set Active</button>
                                        )
                                    )}
                                    <button className="btn" type="button" onClick={() => open(row)}>Edit</button>
                                    <button className="btn" type="button" onClick={() => destroy(row)}>Delete</button>
                                </td>
                            </tr>
                        )) : <tr><td className="empty" colSpan={fields.length + 2}>{isFetching ? t('Loading') : t('No data found')}</td></tr>}
                    </tbody>
                </table>
                <div className="pager">
                    <span>{t('Showing {from} to {to} of {total} entries', { from: meta.from || 0, to: meta.to || 0, total: meta.total })}</span>
                    <div className="pages">
                        <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</button>
                        <button type="button" disabled={page >= meta.last_page} onClick={() => setPage(page + 1)}>›</button>
                    </div>
                </div>
            </section>
        </>
    );
}
