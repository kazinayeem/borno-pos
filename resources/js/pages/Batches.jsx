import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money } from '../api';
import { useT } from '../i18n';
import { useGetBatchesQuery } from '../services/bornoposApi';
import { useUrlQueryState } from '../hooks/useUrlQueryState';
import { Pagination, SearchInput, Modal, PrimaryButton, SecondaryButton } from '../components/ui';

const filterTabs = [
    ['', 'All'],
    ['soon', 'Expiring soon'],
    ['expired', 'Expired'],
];

export default function Batches() {
    const t = useT();
    const {
        params,
        setQuery,
        setPage,
        setPerPage,
        resetFilters,
    } = useUrlQueryState({
        status: '',
        search: '',
        page: 1,
        per_page: 15,
    });

    const { data, isFetching, isError, refetch } = useGetBatchesQuery({
        status: params.status,
        search: params.search,
        page: params.page,
        per_page: params.per_page,
    });

    const [editingBatch, setEditingBatch] = useState(null);
    const [batchNo, setBatchNo] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [manufacturedOn, setManufacturedOn] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [msg, setMsg] = useState('');
    const [modalErr, setModalErr] = useState('');

    const meta = data?.meta || { current_page: params.page, last_page: 1, total: 0, from: 0, to: 0 };

    function openEditModal(row) {
        setEditingBatch(row);
        setBatchNo(row.batch_no || '');
        setExpiryDate(row.expiry_date || '');
        setManufacturedOn(row.manufactured_on || '');
        setModalErr('');
    }

    async function handleSave(e) {
        e.preventDefault();
        if (!editingBatch) return;
        setIsSaving(true);
        setModalErr('');
        try {
            const res = await api(`/purchase/batch/${editingBatch.id}`, {
                method: 'PUT',
                body: {
                    batch_no: batchNo,
                    expiry_date: expiryDate || null,
                    manufactured_on: manufacturedOn || null,
                },
            });
            setEditingBatch(null);
            setMsg(res.message || t('Batch details updated successfully.'));
            refetch();
        } catch (err) {
            setModalErr(err.message || t('Failed to update batch details.'));
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <>
            <div className="page-title">
                <div>
                    <h1>{t('Batches')}</h1>
                    <div className="crumbs">{t('Stock still on hand, with expiry status from each product’s near-expiry window.')}</div>
                </div>
            </div>

            {msg && (
                <div className="flash note" style={{ marginBottom: '16px' }}>
                    {msg}
                    <button type="button" onClick={() => setMsg('')}>×</button>
                </div>
            )}

            <section className="card" data-tour="batches-view">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                    <div className="tabs" style={{ margin: 0 }}>
                        {filterTabs.map(([value, label]) => (
                            <button
                                type="button"
                                key={label}
                                className={`chip ${params.status === value ? 'active' : ''}`}
                                onClick={() => setQuery({ status: value })}
                            >
                                {t(label)}
                            </button>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <SearchInput
                            value={params.search}
                            placeholder={t('Search batch or product...')}
                            onChange={(e) => setQuery({ search: e.target.value })}
                            onClear={() => setQuery({ search: '' })}
                            style={{ minWidth: '260px' }}
                        />
                        {(params.search || params.status) && (
                            <button className="btn" type="button" onClick={() => resetFilters()}>
                                {t('Reset')}
                            </button>
                        )}
                    </div>
                </div>
                {isError && <p className="error">{t('The batch list could not be loaded.')}</p>}
                <table className="grid">
                    <thead>
                        <tr>
                            <th>{t('Product')}</th>
                            <th>{t('Batch')}</th>
                            <th>{t('Qty')}</th>
                            <th>{t('Manufactured')}</th>
                            <th>{t('Expiry')}</th>
                            <th>{t('Cost')}</th>
                            <th>{t('Status')}</th>
                            <th style={{ textAlign: 'right' }}>{t('Actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(data?.data || []).map((row) => (
                            <tr key={row.id}>
                                <td>{row.product_id ? <Link to={`/products/${row.product_id}`}>{row.product}</Link> : row.product}</td>
                                <td><strong>{row.batch_no}</strong></td>
                                <td>{row.qty}</td>
                                <td>{row.manufactured_on || '—'}</td>
                                <td>{row.expiry_date || '—'}</td>
                                <td>{money(row.cost_cents || 0)}</td>
                                <td>
                                    <span className={`badge ${row.status === 'ok' ? 'success' : (row.status === 'soon' ? 'warning' : 'danger')}`}>
                                        {row.status}
                                    </span>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    <button
                                        type="button"
                                        className="icon-btn"
                                        onClick={() => openEditModal(row)}
                                        title={t('Edit Batch')}
                                    >
                                        ✏️
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {isFetching && <p className="muted" style={{ padding: '16px' }}>{t('Loading')}</p>}
                {!isFetching && !(data?.data || []).length && <p className="empty">{t('No batches in this view.')}</p>}
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

            {/* Modal: Edit Batch */}
            <Modal
                isOpen={!!editingBatch}
                onClose={() => setEditingBatch(null)}
                title={t('Edit Batch Details')}
                subtitle={editingBatch?.product ? t('Product: {name}', { name: editingBatch.product }) : t('Update batch tracking numbers and expiry.')}
                icon="📦"
                size="md"
                footer={
                    <>
                        <SecondaryButton type="button" onClick={() => setEditingBatch(null)}>
                            {t('Cancel')}
                        </SecondaryButton>
                        <PrimaryButton type="submit" form="edit-batch-form" disabled={isSaving}>
                            {isSaving ? t('Saving...') : t('Save Changes')}
                        </PrimaryButton>
                    </>
                }
            >
                {modalErr && (
                    <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
                        {modalErr}
                    </div>
                )}
                <form id="edit-batch-form" onSubmit={handleSave}>
                    <div className="field" style={{ marginBottom: '14px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                            {t('Batch / Lot Number')} *
                        </label>
                        <input
                            type="text"
                            value={batchNo}
                            onChange={(e) => setBatchNo(e.target.value)}
                            required
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                        <div className="field">
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                                {t('Manufactured On')}
                            </label>
                            <input
                                type="date"
                                value={manufacturedOn}
                                onChange={(e) => setManufacturedOn(e.target.value)}
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div className="field">
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                                {t('Expiry Date')}
                            </label>
                            <input
                                type="date"
                                value={expiryDate}
                                onChange={(e) => setExpiryDate(e.target.value)}
                                style={{ width: '100%' }}
                            />
                        </div>
                    </div>
                </form>
            </Modal>
        </>
    );
}
