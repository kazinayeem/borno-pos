import { useState } from 'react';
import { api, money, setCurrency } from '../api';
import { useT } from '../i18n';
import { useDeleteCatalogMutation, useGetCatalogQuery, useSaveCatalogMutation } from '../services/bornoposApi';
import { SearchInput, PrimaryButton, SecondaryButton, Pagination, Modal, ConfirmModal, useUrlQueryState } from '../components/ui';

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
    const {
        params,
        setQuery,
        setPage,
        setPerPage,
        resetFilters,
    } = useUrlQueryState({
        search: '',
        page: 1,
        per_page: 15,
    });

    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({});
    const [message, setMessage] = useState('');
    const [modalError, setModalError] = useState('');
    const [deleteTarget, setDeleteTarget] = useState(null);

    const { data, isFetching, isError } = useGetCatalogQuery({
        endpoint,
        page: params.page,
        q: params.search,
        per_page: params.per_page,
    });
    const [save, saveState] = useSaveCatalogMutation();
    const [remove, removeState] = useDeleteCatalogMutation();
    const fields = data?.fields || [];
    const rows = data?.data || [];
    const meta = data?.meta || { current_page: params.page, last_page: 1, total: 0, from: 0, to: 0 };

    function open(row = null) {
        setEditing(row || {});
        setForm(seed(fields, row));
        setModalError('');
    }

    async function submit(event) {
        event.preventDefault();
        setModalError('');
        const result = await save({ endpoint, id: editing?.id, body: form });
        if (result.error) {
            const bag = result.error.data?.errors || {};
            setModalError(Object.values(bag).flat().join(' ') || result.error.data?.message || t('Could not save record.'));
            return;
        }
        setEditing(null);
        setMessage(result.data?.message || (editing?.id ? t('Record updated successfully.') : t('Record created successfully.')));
    }

    async function confirmDelete() {
        if (!deleteTarget) return;
        const result = await remove({ endpoint, id: deleteTarget.id });
        if (result.error) {
            setMessage(result.error.data?.message || t('Could not delete record.'));
        } else {
            setMessage(result.data?.message || t('Record deleted successfully.'));
        }
        setDeleteTarget(null);
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
                    <div className="crumbs">{data?.singular ? t(data.singular) : ''}</div>
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

            <section className="card table-card" data-tour={endpoint === '/categories' ? 'categories-view' : 'catalog-card'}>
                <div className="toolbar" style={{ marginBottom: '14px' }}>
                    <SearchInput
                        value={params.search}
                        placeholder={t('Search {item}...', { item: data?.title || 'records' })}
                        onChange={(event) => setQuery({ search: event.target.value })}
                        onClear={() => setQuery({ search: '' })}
                        style={{ maxWidth: '360px' }}
                    />
                </div>
                {isError && <p className="error">{t('This list could not be loaded.')}</p>}
                <table className="grid">
                    <thead>
                        <tr>
                            <th>{t('SL')}</th>
                            {fields.filter((field) => field.type !== 'checks').map((field) => <th key={field.name}>{t(field.label)}</th>)}
                            <th style={{ textAlign: 'right' }}>{t('Action')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, index) => (
                            <tr key={row.id || index}>
                                <td>{(meta.from || 1) + index}</td>
                                {fields.filter((field) => field.type !== 'checks').map((field) => (
                                    <td key={field.name}>{display(row, field)}</td>
                                ))}
                                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                    {endpoint === '/currency' && (
                                        <button
                                            className="btn secondary"
                                            type="button"
                                            style={{ marginRight: '8px', fontSize: '12px', padding: '4px 8px' }}
                                            onClick={() => activateCurrency(row)}
                                        >
                                            {t('Set Default')}
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className="icon-btn"
                                        style={{ marginRight: '6px' }}
                                        onClick={() => open(row)}
                                        title={t('Edit')}
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        type="button"
                                        className="icon-btn"
                                        onClick={() => setDeleteTarget(row)}
                                        title={t('Delete')}
                                    >
                                        🗑
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {isFetching && <p className="muted" style={{ padding: '16px' }}>{t('Loading')}</p>}
                {!isFetching && !rows.length && <p className="empty">{t('No records found.')}</p>}
                <Pagination
                    currentPage={meta.current_page || params.page}
                    lastPage={meta.last_page || 1}
                    total={meta.total || 0}
                    from={meta.from || 0}
                    to={meta.to || 0}
                    perPage={params.per_page}
                    onPageChange={setPage}
                    onPerPageChange={setPerPage}
                    perPageOptions={[10, 15, 25, 50]}
                />
            </section>

            {/* Modal: Add / Edit Record */}
            <Modal
                isOpen={editing !== null}
                onClose={() => setEditing(null)}
                title={editing?.id ? t('Edit {item}', { item: data?.singular || 'Record' }) : t('Add New {item}', { item: data?.singular || 'Record' })}
                subtitle={t('Fill in the details below and save your changes.')}
                icon="📝"
                size={fields.length > 4 ? 'lg' : 'md'}
                footer={
                    <>
                        <SecondaryButton type="button" onClick={() => setEditing(null)}>
                            {t('Cancel')}
                        </SecondaryButton>
                        <PrimaryButton type="submit" form="catalog-modal-form" loading={saveState.isLoading}>
                            {saveState.isLoading ? t('Saving...') : t('Save')}
                        </PrimaryButton>
                    </>
                }
            >
                {modalError && (
                    <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
                        {modalError}
                    </div>
                )}
                <form
                    id="catalog-modal-form"
                    onSubmit={submit}
                    style={{
                        display: 'grid',
                        gridTemplateColumns: fields.length > 4 ? 'repeat(2, 1fr)' : '1fr',
                        gap: '14px',
                    }}
                >
                    {fields.map((field) => (
                        <div
                            key={field.name}
                            style={{
                                gridColumn: (field.type === 'checks' || field.type === 'textarea' || fields.length <= 4) ? '1 / -1' : 'auto',
                            }}
                        >
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-heading, #0f172a)', marginBottom: '6px' }}>
                                {t(field.label)}
                            </label>
                            {field.type === 'select' && (
                                <select
                                    value={form[field.name] ?? ''}
                                    onChange={(event) => setForm({ ...form, [field.name]: event.target.value })}
                                    style={{ width: '100%' }}
                                >
                                    <option value="">{t('Choose')}</option>
                                    {Object.entries(data?.options?.[field.name] || field.choices || {}).map(([id, name]) => (
                                        <option key={id} value={id}>
                                            {name}
                                        </option>
                                    ))}
                                </select>
                            )}
                            {field.type === 'checks' && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                                    {Object.entries(field.choices || {}).map(([id, name]) => (
                                        <label
                                            key={id}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                cursor: 'pointer',
                                                fontSize: '13px',
                                                padding: '6px 12px',
                                                background: (form[field.name] || []).includes(id) ? '#eff6ff' : 'var(--bg, #f8fafc)',
                                                border: `1px solid ${(form[field.name] || []).includes(id) ? 'var(--primary, #2563eb)' : 'var(--border, #e2e8f0)'}`,
                                                borderRadius: '8px',
                                                fontWeight: 600,
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={(form[field.name] || []).includes(id)}
                                                onChange={(event) => {
                                                    const current = new Set(form[field.name] || []);
                                                    event.target.checked ? current.add(id) : current.delete(id);
                                                    setForm({ ...form, [field.name]: [...current] });
                                                }}
                                            />
                                            {name}
                                        </label>
                                    ))}
                                </div>
                            )}
                            {field.type === 'checkbox' && (
                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '4px' }}>
                                    <input
                                        type="checkbox"
                                        checked={!!form[field.name]}
                                        onChange={(event) => setForm({ ...form, [field.name]: event.target.checked })}
                                    />
                                    <span>{t('Active / Enabled')}</span>
                                </label>
                            )}
                            {field.type === 'date' && (
                                <input
                                    type="date"
                                    value={String(form[field.name] || '').slice(0, 10)}
                                    onChange={(event) => setForm({ ...form, [field.name]: event.target.value })}
                                    style={{ width: '100%' }}
                                />
                            )}
                            {!['select', 'checks', 'checkbox', 'date'].includes(field.type || 'text') && (
                                <input
                                    value={form[field.name] ?? ''}
                                    onChange={(event) => setForm({ ...form, [field.name]: event.target.value })}
                                    style={{ width: '100%' }}
                                />
                            )}
                        </div>
                    ))}
                </form>
            </Modal>

            {/* Modal: Delete Confirmation */}
            <ConfirmModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={confirmDelete}
                title={t('Delete {item}', { item: data?.singular || 'Record' })}
                message={t('Are you sure you want to delete "{name}"? This action cannot be undone.', {
                    name: deleteTarget?.name || deleteTarget?.code || deleteTarget?.title || t('this item'),
                })}
                confirmText={t('Delete')}
                cancelText={t('Cancel')}
                variant="danger"
                isLoading={removeState.isLoading}
            />
        </>
    );
}
