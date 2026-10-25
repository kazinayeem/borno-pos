import { useState } from 'react';
import { useTranslation } from '../i18n';
import { money } from '../api';
import { Modal, Pagination, SearchInput } from '../components/ui';
import { useUrlQueryState } from '../hooks/useUrlQueryState';
import {
    useGetAdminPaymentsQuery,
    useApproveAdminPaymentMutation,
    useRejectAdminPaymentMutation,
    useGetAdminPlansQuery,
    useSaveAdminPlanMutation,
    useToggleAdminPlanMutation,
    useGetAdminInvoicesQuery,
    useGetAdminInvoiceQuery,
    useGetAdminPlanSubscribersQuery,
} from '../services/bornoposApi';

/**
 * 1. PAYMENT VERIFICATION QUEUE
 */
export function PaymentVerificationPage() {
    const { t } = useTranslation();
    const { queryState, setQuery, setPage, setPerPage } = useUrlQueryState({
        search: '',
        status: 'pending',
        payment_method: '',
        page: 1,
        per_page: 15,
    });

    const { data, isLoading, isError, refetch } = useGetAdminPaymentsQuery({
        search: queryState.search,
        status: queryState.status,
        payment_method: queryState.payment_method,
        page: queryState.page,
        per_page: queryState.per_page,
    });

    const [approvePayment, { isLoading: approving }] = useApproveAdminPaymentMutation();
    const [rejectPayment, { isLoading: rejecting }] = useRejectAdminPaymentMutation();

    const [selectedPayment, setSelectedPayment] = useState(null);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [feedback, setFeedback] = useState({ type: '', message: '' });

    const payments = data?.payments || data?.data || [];
    const meta = data?.meta || {};

    const handleApprove = async (payment) => {
        if (!window.confirm(t('Are you sure you want to approve this payment? This will mark the invoice paid and activate/extend the shop subscription.'))) {
            return;
        }
        setFeedback({ type: '', message: '' });
        try {
            const res = await approvePayment(payment.id).unwrap();
            setFeedback({ type: 'success', message: res.message || t('Payment approved successfully.') });
            setViewModalOpen(false);
            refetch();
        } catch (err) {
            setFeedback({ type: 'error', message: err.data?.message || t('Failed to approve payment.') });
        }
    };

    const handleRejectSubmit = async (e) => {
        e.preventDefault();
        if (!rejectionReason.trim()) return;
        setFeedback({ type: '', message: '' });
        try {
            const res = await rejectPayment({ id: selectedPayment.id, reason: rejectionReason }).unwrap();
            setFeedback({ type: 'success', message: res.message || t('Payment rejected.') });
            setRejectModalOpen(false);
            setViewModalOpen(false);
            setRejectionReason('');
            refetch();
        } catch (err) {
            setFeedback({ type: 'error', message: err.data?.message || t('Failed to reject payment.') });
        }
    };

    return (
        <section className="card">
            <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h2>{t('Payment Verification Queue')}</h2>
                    <p className="muted">{t('Review, verify, and approve manual bKash and Nagad subscription payments.')}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {['pending', 'approved', 'rejected', ''].map((st) => (
                        <button
                            key={st}
                            type="button"
                            className={`chip ${queryState.status === st ? 'active' : ''}`}
                            onClick={() => setQuery({ status: st, page: 1 })}
                        >
                            {st ? t(st.charAt(0).toUpperCase() + st.slice(1)) : t('All')}
                        </button>
                    ))}
                </div>
            </div>

            {feedback.message && (
                <div style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    background: feedback.type === 'success' ? '#dcfce7' : '#fee2e2',
                    border: `1px solid ${feedback.type === 'success' ? '#86efac' : '#fca5a5'}`,
                    color: feedback.type === 'success' ? '#166534' : '#991b1b',
                }}>
                    {feedback.message}
                </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '240px' }}>
                    <SearchInput
                        value={queryState.search}
                        onChange={(val) => setQuery({ search: val, page: 1 })}
                        placeholder={t('Search by TrxID, sender phone, shop, or subscriber...')}
                    />
                </div>
                <select
                    value={queryState.payment_method}
                    onChange={(e) => setQuery({ payment_method: e.target.value, page: 1 })}
                    style={{ width: 'auto', minWidth: '160px' }}
                >
                    <option value="">{t('All Gateways')}</option>
                    <option value="bkash">bKash</option>
                    <option value="nagad">Nagad</option>
                    <option value="bank">Bank</option>
                    <option value="manual">Manual</option>
                </select>
            </div>

            {isError && (
                <div style={{ padding: '16px 20px', background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', borderRadius: '10px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span><strong>⚠️ {t('Error')}:</strong> {t('Failed to load payment verification queue.')}</span>
                    <button type="button" className="btn small" onClick={() => refetch()} style={{ borderColor: '#fca5a5' }}>🔄 {t('Retry')}</button>
                </div>
            )}

            {isLoading ? (
                <div style={{ padding: '32px', textAlign: 'center' }} className="muted">{t('Loading payment queue...')}</div>
            ) : !isError && payments.length === 0 ? (
                <div style={{ padding: '48px', textAlign: 'center' }} className="muted">
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>✓</div>
                    <div style={{ fontWeight: 600 }}>{t('No payment requests found.')}</div>
                    <p style={{ fontSize: '13px', marginTop: '4px' }}>{t('There are no payments matching the selected criteria.')}</p>
                </div>
            ) : (
                <div className="table-responsive">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>{t('ID / TrxID')}</th>
                                <th>{t('Shop & Owner')}</th>
                                <th>{t('Plan')}</th>
                                <th>{t('Gateway')}</th>
                                <th>{t('Amount')}</th>
                                <th>{t('Sender Phone')}</th>
                                <th>{t('Date')}</th>
                                <th>{t('Status')}</th>
                                <th style={{ textAlign: 'right' }}>{t('Actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.map((p) => {
                                const isPending = p.status === 'pending';
                                return (
                                    <tr key={p.id}>
                                        <td>
                                            <div style={{ fontWeight: 700, fontFamily: 'monospace' }}>{p.transaction_id}</div>
                                            <div style={{ fontSize: '11px', color: '#6b7280' }}>REQ #{p.id}</div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{p.store_name || t('Unknown Shop')}</div>
                                            <div style={{ fontSize: '12px', color: '#6b7280' }}>{p.user_name} ({p.user_email})</div>
                                        </td>
                                        <td>
                                            <span className="badge" style={{ background: '#f3f4f6', color: '#374151' }}>
                                                {p.plan_name || t('Custom')}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{ textTransform: 'uppercase', fontWeight: 700, color: p.payment_method === 'bkash' ? '#d11e5f' : '#f7931e' }}>
                                                {p.payment_method}
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: 700, color: '#16a34a' }}>
                                            {money(p.amount_cents)}
                                        </td>
                                        <td style={{ fontFamily: 'monospace' }}>{p.sender_phone || '—'}</td>
                                        <td style={{ fontSize: '12px' }}>{p.created_at}</td>
                                        <td>
                                            <span className={`badge ${p.status === 'approved' ? 'success' : p.status === 'rejected' ? 'danger' : 'warning'}`}>
                                                {p.status}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                                                <button
                                                    type="button"
                                                    className="btn sm"
                                                    onClick={() => { setSelectedPayment(p); setViewModalOpen(true); }}
                                                >
                                                    {t('View')}
                                                </button>
                                                {isPending && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className="btn sm success"
                                                            disabled={approving}
                                                            onClick={() => handleApprove(p)}
                                                        >
                                                            {t('Approve')}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn sm danger"
                                                            onClick={() => { setSelectedPayment(p); setRejectModalOpen(true); }}
                                                        >
                                                            {t('Reject')}
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {meta.total > meta.per_page && (
                <Pagination
                    currentPage={meta.current_page}
                    lastPage={meta.last_page}
                    total={meta.total}
                    from={meta.from}
                    to={meta.to}
                    onPageChange={setPage}
                    perPage={meta.per_page}
                    onPerPageChange={setPerPage}
                />
            )}

            {/* View Details Modal */}
            {selectedPayment && (
                <Modal
                    isOpen={viewModalOpen}
                    onClose={() => setViewModalOpen(false)}
                    title={t('Payment Request Details')}
                    subtitle={`${selectedPayment.payment_method?.toUpperCase()} · TrxID: ${selectedPayment.transaction_id}`}
                    size="md"
                >
                    <div className="grid" style={{ gap: '14px' }}>
                        <div className="grid grid-2" style={{ gap: '12px', background: 'var(--bg, #f9fafb)', padding: '16px', borderRadius: '8px' }}>
                            <div>
                                <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>{t('Shop Name')}</div>
                                <div style={{ fontWeight: 700, fontSize: '15px' }}>{selectedPayment.store_name}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>{t('Submitted By')}</div>
                                <div style={{ fontWeight: 600 }}>{selectedPayment.user_name}</div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>{selectedPayment.user_email}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>{t('Subscription Plan')}</div>
                                <div style={{ fontWeight: 700, color: 'var(--primary, #4f46e5)' }}>{selectedPayment.plan_name}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>{t('Amount Paid')}</div>
                                <div style={{ fontWeight: 900, fontSize: '16px', color: '#16a34a' }}>{money(selectedPayment.amount_cents)}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>{t('Payment Method')}</div>
                                <div style={{ fontWeight: 700, textTransform: 'uppercase' }}>{selectedPayment.payment_method}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>{t('Sender Phone')}</div>
                                <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>{selectedPayment.sender_phone || '—'}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>{t('Transaction ID')}</div>
                                <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>{selectedPayment.transaction_id}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>{t('Verification Status')}</div>
                                <span className={`badge ${selectedPayment.status === 'approved' ? 'success' : selectedPayment.status === 'rejected' ? 'danger' : 'warning'}`}>
                                    {selectedPayment.status}
                                </span>
                            </div>
                        </div>

                        {selectedPayment.notes && (
                            <div>
                                <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>{t('Notes from Shop Owner')}:</div>
                                <div style={{ background: '#f3f4f6', padding: '10px 14px', borderRadius: '6px', fontSize: '13px' }}>
                                    {selectedPayment.notes}
                                </div>
                            </div>
                        )}

                        {selectedPayment.screenshot_url && (
                            <div>
                                <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>{t('Receipt / Screenshot')}:</div>
                                <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', maxHeight: '300px', display: 'flex', justifyContent: 'center', background: '#000' }}>
                                    <a href={selectedPayment.screenshot_url} target="_blank" rel="noopener noreferrer">
                                        <img src={selectedPayment.screenshot_url} alt="Receipt Screenshot" style={{ maxHeight: '300px', width: 'auto', objectFit: 'contain' }} />
                                    </a>
                                </div>
                                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px', textAlign: 'center' }}>
                                    {t('Click image to open in full size.')}
                                </div>
                            </div>
                        )}

                        {selectedPayment.rejection_reason && (
                            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '12px', borderRadius: '8px' }}>
                                <strong>{t('Rejection Reason')}:</strong> {selectedPayment.rejection_reason}
                            </div>
                        )}

                        {selectedPayment.verifier_name && (
                            <div style={{ fontSize: '12px', color: '#6b7280', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                                {t('Verified by {name} on {date}', { name: selectedPayment.verifier_name, date: selectedPayment.verified_at })}
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                            <button type="button" className="btn" onClick={() => setViewModalOpen(false)}>
                                {t('Close')}
                            </button>
                            {selectedPayment.status === 'pending' && (
                                <>
                                    <button
                                        type="button"
                                        className="btn danger"
                                        onClick={() => { setViewModalOpen(false); setRejectModalOpen(true); }}
                                    >
                                        {t('Reject with Reason')}
                                    </button>
                                    <button
                                        type="button"
                                        className="btn success"
                                        disabled={approving}
                                        onClick={() => handleApprove(selectedPayment)}
                                    >
                                        {approving ? t('Approving...') : t('Approve Payment')}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </Modal>
            )}

            {/* Rejection Modal */}
            {selectedPayment && (
                <Modal
                    isOpen={rejectModalOpen}
                    onClose={() => setRejectModalOpen(false)}
                    title={t('Reject Payment Request')}
                    subtitle={t('Please specify why this payment could not be approved. This reason will be shown to the shop owner.')}
                    size="sm"
                >
                    <form onSubmit={handleRejectSubmit} className="grid" style={{ gap: '14px' }}>
                        <div className="field">
                            <label>{t('Rejection Reason')} *</label>
                            <textarea
                                required
                                rows="3"
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder={t('e.g. Transaction ID was not found in our bKash statement, or the received amount was less than required.')}
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button type="button" className="btn" onClick={() => setRejectModalOpen(false)}>
                                {t('Cancel')}
                            </button>
                            <button type="submit" className="btn danger" disabled={rejecting}>
                                {rejecting ? t('Rejecting...') : t('Confirm Rejection')}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </section>
    );
}

/**
 * 2. SUBSCRIPTION PLAN MANAGEMENT
 */
export function SubscriptionPlansPage() {
    const { t } = useTranslation();
    const { data, isLoading, refetch } = useGetAdminPlansQuery();
    const [savePlan, { isLoading: saving }] = useSaveAdminPlanMutation();
    const [togglePlan] = useToggleAdminPlanMutation();

    const [modalOpen, setModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);
    const [viewingSubscribersPlan, setViewingSubscribersPlan] = useState(null);
    const [previewingPlan, setPreviewingPlan] = useState(null);
    const [feedback, setFeedback] = useState({ type: '', message: '' });

    const [form, setForm] = useState({
        name: '',
        slug: '',
        description: '',
        currency: 'BDT',
        price_cents: 0,
        interval: 'month',
        duration_days: 30,
        trial_days: 0,
        max_users: 5,
        max_stores: 1,
        max_products: 500,
        features: '',
        is_featured: false,
        sort_order: 0,
        is_active: true,
    });

    const plans = data?.plans || [];

    const openCreate = () => {
        setEditingPlan(null);
        setForm({
            name: '',
            slug: '',
            description: '',
            currency: 'BDT',
            price_cents: 290000,
            interval: 'month',
            duration_days: 30,
            trial_days: 0,
            max_users: 5,
            max_stores: 1,
            max_products: 500,
            features: 'POS Terminal, Inventory Tracking, Standard Reports',
            is_featured: false,
            sort_order: 0,
            is_active: true,
        });
        setModalOpen(true);
    };

    const openEdit = (plan) => {
        setEditingPlan(plan);
        setForm({
            name: plan.name || '',
            slug: plan.slug || '',
            description: plan.description || '',
            currency: plan.currency || 'BDT',
            price_cents: plan.price_cents ?? 0,
            interval: plan.interval || 'month',
            duration_days: plan.duration_days || 30,
            trial_days: plan.trial_days || 0,
            max_users: plan.max_users || 5,
            max_stores: plan.max_stores || 1,
            max_products: plan.max_products || 500,
            features: typeof plan.features === 'string' ? plan.features : (Array.isArray(plan.features) ? plan.features.join(', ') : ''),
            is_featured: Boolean(plan.is_featured),
            sort_order: plan.sort_order ?? 0,
            is_active: plan.is_active,
        });
        setModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setFeedback({ type: '', message: '' });
        try {
            const res = await savePlan({
                id: editingPlan?.id,
                ...form,
                price_cents: parseInt(form.price_cents, 10),
                duration_days: parseInt(form.duration_days, 10),
                trial_days: parseInt(form.trial_days, 10),
                max_users: parseInt(form.max_users, 10),
                max_stores: parseInt(form.max_stores, 10),
                max_products: parseInt(form.max_products, 10),
                sort_order: parseInt(form.sort_order || 0, 10),
                is_featured: Boolean(form.is_featured),
            }).unwrap();
            setFeedback({ type: 'success', message: res.message || t('Plan saved successfully.') });
            setModalOpen(false);
            refetch();
        } catch (err) {
            setFeedback({ type: 'error', message: err.data?.message || t('Failed to save plan.') });
        }
    };

    const handleToggle = async (id) => {
        try {
            await togglePlan(id).unwrap();
            refetch();
        } catch (err) {
            setFeedback({ type: 'error', message: t('Failed to toggle plan status.') });
        }
    };

    return (
        <section className="card">
            <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h2>{t('Subscription Plans')}</h2>
                    <p className="muted">{t('Manage platform subscription tiers, resource quotas, and pricing.')}</p>
                </div>
                <button type="button" className="btn primary" onClick={openCreate}>
                    + {t('Add Plan')}
                </button>
            </div>

            {feedback.message && (
                <div style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    background: feedback.type === 'success' ? '#dcfce7' : '#fee2e2',
                    border: `1px solid ${feedback.type === 'success' ? '#86efac' : '#fca5a5'}`,
                    color: feedback.type === 'success' ? '#166534' : '#991b1b',
                }}>
                    {feedback.message}
                </div>
            )}

            {isLoading ? (
                <div style={{ padding: '32px', textAlign: 'center' }} className="muted">{t('Loading plans...')}</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '16px' }}>
                    {plans.map((p) => (
                        <div
                            key={p.id}
                            style={{
                                border: `1px solid ${p.is_featured ? 'var(--primary, #4f46e5)' : p.is_active ? 'var(--border)' : '#e5e7eb'}`,
                                borderRadius: '12px',
                                padding: '24px',
                                background: p.is_active ? 'var(--card-bg, #fff)' : '#f9fafb',
                                opacity: p.is_active ? 1 : 0.75,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                position: 'relative',
                            }}
                        >
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '8px', flexWrap: 'wrap' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>{p.name}</h3>
                                        {p.is_featured && (
                                            <span style={{ fontSize: '10px', background: 'var(--primary, #4f46e5)', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                                {t('Featured')}
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                        <span style={{ fontSize: '11px', color: '#6b7280' }}>#{p.sort_order ?? 0}</span>
                                        <span className={`badge ${p.is_active ? 'success' : 'secondary'}`}>
                                            {p.is_active ? t('Active') : t('Inactive')}
                                        </span>
                                    </div>
                                </div>

                                {p.description && (
                                    <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 10px 0' }}>{p.description}</p>
                                )}

                                <div style={{ fontSize: '26px', fontWeight: 900, color: 'var(--primary, #4f46e5)', marginBottom: '8px' }}>
                                    {money(p.price_cents)}
                                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#6b7280' }}> / {p.duration_days} {t('days')} ({p.currency || 'BDT'})</span>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setViewingSubscribersPlan(p)}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        fontSize: '12px',
                                        color: '#2563eb',
                                        background: 'none',
                                        border: 'none',
                                        padding: 0,
                                        cursor: 'pointer',
                                        marginBottom: '16px',
                                        fontWeight: 600,
                                        textDecoration: 'underline',
                                    }}
                                >
                                    👥 {p.subscribers_count} {t('Active Subscribers')} →
                                </button>

                                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px', marginBottom: '16px', fontSize: '13px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <span className="muted">{t('Max Stores')}:</span>
                                        <strong>{p.max_stores}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <span className="muted">{t('Max Staff / Users')}:</span>
                                        <strong>{p.max_users}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <span className="muted">{t('Max Products')}:</span>
                                        <strong>{p.max_products}</strong>
                                    </div>
                                    {p.trial_days > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: '#2563eb' }}>
                                            <span>{t('Free Trial')}:</span>
                                            <strong>{p.trial_days} {t('days')}</strong>
                                        </div>
                                    )}
                                </div>

                                {p.features && (
                                    <div style={{ fontSize: '12px', color: '#4b5563', marginBottom: '16px', lineHeight: 1.5 }}>
                                        {typeof p.features === 'string' ? p.features : (Array.isArray(p.features) ? p.features.join(', ') : '')}
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '6px', borderTop: '1px solid var(--border)', paddingTop: '14px', flexWrap: 'wrap' }}>
                                <button type="button" className="btn sm secondary" style={{ flex: 1 }} onClick={() => setPreviewingPlan(p)}>
                                    👁️ {t('Preview')}
                                </button>
                                <button type="button" className="btn sm" style={{ flex: 1 }} onClick={() => openEdit(p)}>
                                    {t('Edit')}
                                </button>
                                <button
                                    type="button"
                                    className={`btn sm ${p.is_active ? 'danger' : 'success'}`}
                                    onClick={() => handleToggle(p.id)}
                                >
                                    {p.is_active ? t('Deactivate') : t('Activate')}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Plan Create / Edit Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editingPlan ? t('Edit Plan') : t('Create Subscription Plan')}
                subtitle={t('Configure plan terms, pricing, limits, and module features.')}
                size="md"
            >
                <form onSubmit={handleSave} className="grid" style={{ gap: '14px' }}>
                    <div className="grid grid-2" style={{ gap: '12px' }}>
                        <div className="field">
                            <label>{t('Plan Name')} *</label>
                            <input
                                type="text"
                                required
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder={t('e.g. Pro Pharmacy')}
                            />
                        </div>
                        <div className="field">
                            <label>{t('Slug / Identifier')}</label>
                            <input
                                type="text"
                                value={form.slug}
                                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                                placeholder={t('e.g. pro-pharmacy (optional)')}
                            />
                        </div>
                    </div>

                    <div className="field">
                        <label>{t('Short Description')}</label>
                        <input
                            type="text"
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            placeholder={t('e.g. Perfect for multi-store pharmacy chains')}
                        />
                    </div>

                    <div className="grid grid-3" style={{ gap: '12px' }}>
                        <div className="field">
                            <label>{t('Price (in Cents / Paisa)')} *</label>
                            <input
                                type="number"
                                required
                                min="0"
                                value={form.price_cents}
                                onChange={(e) => setForm({ ...form, price_cents: e.target.value })}
                                placeholder="450000 = ৳4,500.00"
                            />
                            <div style={{ fontSize: '11px', color: '#6b7280' }}>
                                {t('Preview')}: {money(parseInt(form.price_cents || 0, 10))}
                            </div>
                        </div>
                        <div className="field">
                            <label>{t('Currency')} *</label>
                            <input
                                type="text"
                                required
                                value={form.currency}
                                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                                placeholder="BDT"
                            />
                        </div>
                        <div className="field">
                            <label>{t('Billing Period')} *</label>
                            <select value={form.interval} onChange={(e) => setForm({ ...form, interval: e.target.value })}>
                                <option value="month">{t('Monthly')}</option>
                                <option value="quarter">{t('Quarterly')}</option>
                                <option value="year">{t('Yearly')}</option>
                                <option value="custom">{t('Custom')}</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-3" style={{ gap: '12px' }}>
                        <div className="field">
                            <label>{t('Duration (Days)')} *</label>
                            <input
                                type="number"
                                required
                                min="1"
                                value={form.duration_days}
                                onChange={(e) => setForm({ ...form, duration_days: e.target.value })}
                            />
                        </div>
                        <div className="field">
                            <label>{t('Trial (Days)')}</label>
                            <input
                                type="number"
                                min="0"
                                value={form.trial_days}
                                onChange={(e) => setForm({ ...form, trial_days: e.target.value })}
                            />
                        </div>
                        <div className="field">
                            <label>{t('Sort Order')}</label>
                            <input
                                type="number"
                                value={form.sort_order}
                                onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <div className="grid grid-3" style={{ gap: '12px' }}>
                        <div className="field">
                            <label>{t('Max Stores / Branches')} *</label>
                            <input
                                type="number"
                                required
                                min="1"
                                value={form.max_stores}
                                onChange={(e) => setForm({ ...form, max_stores: e.target.value })}
                            />
                        </div>
                        <div className="field">
                            <label>{t('Max Staff Users')} *</label>
                            <input
                                type="number"
                                required
                                min="1"
                                value={form.max_users}
                                onChange={(e) => setForm({ ...form, max_users: e.target.value })}
                            />
                        </div>
                        <div className="field">
                            <label>{t('Max Products')} *</label>
                            <input
                                type="number"
                                required
                                min="1"
                                value={form.max_products}
                                onChange={(e) => setForm({ ...form, max_products: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="field">
                        <label>{t('Features & Benefits Description')}</label>
                        <textarea
                            rows="3"
                            value={form.features}
                            onChange={(e) => setForm({ ...form, features: e.target.value })}
                            placeholder={t('Comma-separated or bullet list of features...')}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                            <input
                                type="checkbox"
                                checked={form.is_featured}
                                onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
                            />
                            <strong>{t('Mark as Featured / Most Popular')}</strong>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                            <input
                                type="checkbox"
                                checked={form.is_active}
                                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                            />
                            <span>{t('Active & Published')}</span>
                        </label>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                        <button type="button" className="btn" onClick={() => setModalOpen(false)}>
                            {t('Cancel')}
                        </button>
                        <button type="submit" className="btn primary" disabled={saving}>
                            {saving ? t('Saving...') : t('Save Plan')}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Subscribers Modal */}
            <PlanSubscribersModal
                plan={viewingSubscribersPlan}
                onClose={() => setViewingSubscribersPlan(null)}
            />

            {/* Plan Preview Modal */}
            <PlanPreviewModal
                plan={previewingPlan}
                onClose={() => setPreviewingPlan(null)}
            />
        </section>
    );
}

function PlanSubscribersModal({ plan, onClose }) {
    const { t } = useTranslation();
    const { data, isLoading } = useGetAdminPlanSubscribersQuery(plan?.id, { skip: !plan?.id });
    const subscribers = data?.subscribers || [];

    return (
        <Modal
            isOpen={Boolean(plan)}
            onClose={onClose}
            title={`${t('Subscribers for')} "${plan?.name}"`}
            subtitle={t('List of shops and businesses currently or previously subscribed to this plan.')}
            size="lg"
        >
            {isLoading ? (
                <div style={{ padding: '32px', textAlign: 'center' }} className="muted">{t('Loading subscribers...')}</div>
            ) : subscribers.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center' }} className="muted">{t('No shops subscribed to this plan yet.')}</div>
            ) : (
                <div style={{ overflowX: 'auto', maxHeight: '450px' }}>
                    <table className="table" style={{ width: '100%', fontSize: '13px' }}>
                        <thead>
                            <tr>
                                <th>{t('Shop')}</th>
                                <th>{t('Owner')}</th>
                                <th>{t('Status')}</th>
                                <th>{t('Stores / Products')}</th>
                                <th>{t('Period')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {subscribers.map((sub) => (
                                <tr key={sub.id}>
                                    <td>
                                        <strong>{sub.shop_name}</strong>
                                        <div style={{ fontSize: '11px', color: '#6b7280' }}>ID: {sub.shop_id}</div>
                                    </td>
                                    <td>
                                        <div>{sub.owner_name}</div>
                                        <div style={{ fontSize: '11px', color: '#6b7280' }}>{sub.owner_email}</div>
                                    </td>
                                    <td>
                                        <span className={`badge ${sub.status === 'active' ? 'success' : sub.status === 'expired' ? 'danger' : 'warning'}`}>
                                            {sub.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div>{sub.stores_count} {t('stores')}</div>
                                        <div style={{ fontSize: '11px', color: '#6b7280' }}>{sub.products_count} {t('products')}</div>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '12px' }}>{sub.starts_at ? new Date(sub.starts_at).toLocaleDateString() : '—'}</div>
                                        <div style={{ fontSize: '11px', color: '#6b7280' }}>
                                            {t('to')} {sub.ends_at ? new Date(sub.ends_at).toLocaleDateString() : '—'}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button type="button" className="btn" onClick={onClose}>{t('Close')}</button>
            </div>
        </Modal>
    );
}

function PlanPreviewModal({ plan, onClose }) {
    const { t } = useTranslation();
    if (!plan) return null;

    const featureList = typeof plan.features === 'string'
        ? plan.features.split(',').map((f) => f.trim()).filter(Boolean)
        : (Array.isArray(plan.features) ? plan.features : []);

    return (
        <Modal
            isOpen={Boolean(plan)}
            onClose={onClose}
            title={`${t('Shop Owner Preview')}: ${plan.name}`}
            subtitle={t('This is how the subscription card appears to shop owners on the purchase page.')}
            size="md"
        >
            <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
                <div style={{
                    width: '320px',
                    borderRadius: '16px',
                    border: plan.is_featured ? '2px solid var(--primary, #4f46e5)' : '1px solid var(--border, #e5e7eb)',
                    background: '#fff',
                    boxShadow: plan.is_featured ? '0 10px 25px -5px rgba(79, 70, 229, 0.15)' : '0 2px 8px rgba(0,0,0,0.04)',
                    padding: '24px',
                    position: 'relative',
                }}>
                    {plan.is_featured && (
                        <div style={{
                            position: 'absolute',
                            top: '-12px',
                            right: '20px',
                            background: 'var(--primary, #4f46e5)',
                            color: '#fff',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: '999px',
                            textTransform: 'uppercase',
                        }}>
                            {t('Most Popular')}
                        </div>
                    )}
                    <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px 0' }}>{plan.name}</h3>
                    {plan.description && <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 14px 0' }}>{plan.description}</p>}

                    <div style={{ fontSize: '30px', fontWeight: 900, color: 'var(--primary, #4f46e5)', marginBottom: '16px' }}>
                        {money(plan.price_cents)}
                        <span style={{ fontSize: '13px', fontWeight: 500, color: '#6b7280' }}> / {plan.duration_days} {t('days')}</span>
                    </div>

                    <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '12px', marginBottom: '16px', fontSize: '13px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ color: '#6b7280' }}>🏪 {t('Max Stores')}:</span>
                            <strong>{plan.max_stores}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ color: '#6b7280' }}>👥 {t('Max Staff')}:</span>
                            <strong>{plan.max_users}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ color: '#6b7280' }}>📦 {t('Max Products')}:</span>
                            <strong>{plan.max_products}</strong>
                        </div>
                    </div>

                    {featureList.length > 0 && (
                        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0', fontSize: '12px' }}>
                            {featureList.map((f, i) => (
                                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#374151' }}>
                                    <span style={{ color: '#10b981', fontWeight: 800 }}>✓</span> {f}
                                </li>
                            ))}
                        </ul>
                    )}

                    <button type="button" className="btn primary" style={{ width: '100%', pointerEvents: 'none' }}>
                        {plan.price_cents === 0 ? t('Activate Free Plan') : t('Select Plan & Pay')}
                    </button>
                </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button type="button" className="btn" onClick={onClose}>{t('Close')}</button>
            </div>
        </Modal>
    );
}

/**
 * 3. SUBSCRIPTION INVOICES & PRINTING
 */
export function SubscriptionInvoicesPage() {
    const { t } = useTranslation();
    const { queryState, setQuery, setPage, setPerPage } = useUrlQueryState({
        search: '',
        status: '',
        page: 1,
        per_page: 15,
    });

    const { data, isLoading, isError, refetch } = useGetAdminInvoicesQuery({
        search: queryState.search,
        status: queryState.status,
        page: queryState.page,
        per_page: queryState.per_page,
    });

    const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
    const { data: singleInvoiceData } = useGetAdminInvoiceQuery(selectedInvoiceId, {
        skip: !selectedInvoiceId,
    });

    const invoices = data?.invoices || data?.data || [];
    const meta = data?.meta || {};
    const invoice = singleInvoiceData?.invoice;

    const handlePrint = () => {
        window.print();
    };

    return (
        <section className="card">
            <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h2>{t('Subscription Invoices')}</h2>
                    <p className="muted">{t('Audit and track all system-generated tenant billing invoices.')}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {['', 'paid', 'unpaid', 'overdue'].map((st) => (
                        <button
                            key={st}
                            type="button"
                            className={`chip ${queryState.status === st ? 'active' : ''}`}
                            onClick={() => setQuery({ status: st, page: 1 })}
                        >
                            {st ? t(st.charAt(0).toUpperCase() + st.slice(1)) : t('All')}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ marginBottom: '16px', maxWidth: '400px' }}>
                <SearchInput
                    value={queryState.search}
                    onChange={(val) => setQuery({ search: val, page: 1 })}
                    placeholder={t('Search by invoice number or shop name...')}
                />
            </div>

            {isError && (
                <div style={{ padding: '16px 20px', background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', borderRadius: '10px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span><strong>⚠️ {t('Error')}:</strong> {t('Failed to load subscription invoices.')}</span>
                    <button type="button" className="btn small" onClick={() => refetch()} style={{ borderColor: '#fca5a5' }}>🔄 {t('Retry')}</button>
                </div>
            )}

            {isLoading ? (
                <div style={{ padding: '32px', textAlign: 'center' }} className="muted">{t('Loading invoices...')}</div>
            ) : !isError && invoices.length === 0 ? (
                <div style={{ padding: '48px', textAlign: 'center' }} className="muted">
                    {t('No subscription invoices found.')}
                </div>
            ) : (
                <div className="table-responsive">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>{t('Invoice #')}</th>
                                <th>{t('Shop Name')}</th>
                                <th>{t('Plan')}</th>
                                <th>{t('Total')}</th>
                                <th>{t('Paid')}</th>
                                <th>{t('Due')}</th>
                                <th>{t('Date')}</th>
                                <th>{t('Status')}</th>
                                <th style={{ textAlign: 'right' }}>{t('Action')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoices.map((inv) => (
                                <tr key={inv.id}>
                                    <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{inv.invoice_no}</td>
                                    <td style={{ fontWeight: 600 }}>{inv.store_name}</td>
                                    <td>{inv.plan_name}</td>
                                    <td style={{ fontWeight: 700 }}>{money(inv.total_cents)}</td>
                                    <td style={{ color: '#16a34a' }}>{money(inv.paid_cents)}</td>
                                    <td style={{ color: inv.due_cents > 0 ? '#ef4444' : '#6b7280' }}>{money(inv.due_cents)}</td>
                                    <td style={{ fontSize: '12px' }}>{inv.created_at}</td>
                                    <td>
                                        <span className={`badge ${inv.status === 'paid' ? 'success' : inv.status === 'unpaid' ? 'warning' : 'danger'}`}>
                                            {inv.status}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button
                                            type="button"
                                            className="btn sm"
                                            onClick={() => setSelectedInvoiceId(inv.id)}
                                        >
                                            {t('View & Print')}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {meta.total > meta.per_page && (
                <Pagination
                    currentPage={meta.current_page}
                    lastPage={meta.last_page}
                    total={meta.total}
                    from={meta.from}
                    to={meta.to}
                    onPageChange={setPage}
                    perPage={meta.per_page}
                    onPerPageChange={setPerPage}
                />
            )}

            {/* Printable Invoice Modal */}
            {invoice && (
                <Modal
                    isOpen={Boolean(selectedInvoiceId)}
                    onClose={() => setSelectedInvoiceId(null)}
                    title={t('Subscription Invoice')}
                    subtitle={invoice.invoice_no}
                    size="lg"
                >
                    <div id="printable-invoice" style={{ padding: '16px', background: '#fff', color: '#111827' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #e5e7eb', paddingBottom: '20px', marginBottom: '24px' }}>
                            <div>
                                <h2 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--primary, #4f46e5)', margin: 0 }}>BornoPos SaaS</h2>
                                <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>Subscription & Platform Billing</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>{invoice.invoice_no}</h3>
                                <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                                    {t('Date')}: {invoice.created_at}
                                </div>
                                <span className={`badge ${invoice.status === 'paid' ? 'success' : 'warning'}`} style={{ marginTop: '6px' }}>
                                    {invoice.status?.toUpperCase()}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-2" style={{ gap: '24px', marginBottom: '24px' }}>
                            <div>
                                <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>{t('Billed To')}:</div>
                                <div style={{ fontWeight: 800, fontSize: '16px', marginTop: '4px' }}>{invoice.store?.name}</div>
                                <div style={{ fontSize: '13px', color: '#4b5563' }}>{invoice.store?.owner_name}</div>
                                <div style={{ fontSize: '13px', color: '#4b5563' }}>{invoice.store?.phone} · {invoice.store?.email}</div>
                                {invoice.store?.address && <div style={{ fontSize: '13px', color: '#4b5563' }}>{invoice.store?.address}</div>}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>{t('Payment Info')}:</div>
                                <div style={{ fontSize: '13px', marginTop: '4px' }}>
                                    {t('Billing Period')}: <strong>{invoice.billing_period?.toUpperCase()}</strong>
                                </div>
                                {invoice.due_date && (
                                    <div style={{ fontSize: '13px', color: '#ef4444' }}>
                                        {t('Due Date')}: <strong>{invoice.due_date}</strong>
                                    </div>
                                )}
                            </div>
                        </div>

                        <table className="table" style={{ width: '100%', marginBottom: '24px' }}>
                            <thead>
                                <tr style={{ background: '#f9fafb' }}>
                                    <th>{t('Description')}</th>
                                    <th style={{ textAlign: 'center' }}>{t('Period')}</th>
                                    <th style={{ textAlign: 'right' }}>{t('Amount')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
                                        <div style={{ fontWeight: 700 }}>{invoice.plan?.name} {t('Plan Subscription')}</div>
                                        <div style={{ fontSize: '12px', color: '#6b7280' }}>BornoPos POS SaaS Platform Access</div>
                                    </td>
                                    <td style={{ textAlign: 'center', fontSize: '13px' }}>
                                        {invoice.starts_on || '—'} {invoice.ends_on ? `to ${invoice.ends_on}` : ''}
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 700 }}>
                                        {money(invoice.subtotal_cents)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
                            <div style={{ width: '260px', fontSize: '14px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                                    <span className="muted">{t('Subtotal')}:</span>
                                    <span>{money(invoice.subtotal_cents)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '2px solid #111827', fontWeight: 900, fontSize: '16px' }}>
                                    <span>{t('Total')}:</span>
                                    <span>{money(invoice.total_cents)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', color: '#16a34a', fontWeight: 700 }}>
                                    <span>{t('Amount Paid')}:</span>
                                    <span>{money(invoice.paid_cents)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', color: invoice.due_cents > 0 ? '#ef4444' : '#6b7280', fontWeight: 700 }}>
                                    <span>{t('Balance Due')}:</span>
                                    <span>{money(invoice.due_cents)}</span>
                                </div>
                            </div>
                        </div>

                        {invoice.payments?.length > 0 && (
                            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
                                <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>{t('Associated Payment Transactions')}:</h4>
                                <div className="table-responsive">
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>{t('TrxID')}</th>
                                                <th>{t('Method')}</th>
                                                <th>{t('Amount')}</th>
                                                <th>{t('Status')}</th>
                                                <th>{t('Date')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {invoice.payments.map((p) => (
                                                <tr key={p.id}>
                                                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{p.transaction_id}</td>
                                                    <td style={{ textTransform: 'uppercase' }}>{p.payment_method}</td>
                                                    <td>{money(p.amount_cents)}</td>
                                                    <td><span className="badge success">{p.status}</span></td>
                                                    <td style={{ fontSize: '12px' }}>{p.created_at}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                            <button type="button" className="btn" onClick={() => setSelectedInvoiceId(null)}>
                                {t('Close')}
                            </button>
                            <button type="button" className="btn primary" onClick={handlePrint}>
                                🖨 {t('Print Invoice')}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </section>
    );
}
