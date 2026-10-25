import { useState } from 'react';
import { useTranslation } from '../i18n';
import { money } from '../api';
import { Modal, Pagination, SearchInput } from '../components/ui';
import { useUrlQueryState } from '../hooks/useUrlQueryState';
import {
    useGetAdminShopsQuery,
    useGetAdminShopQuery,
    useToggleShopStatusMutation,
    useExtendShopSubscriptionMutation,
    useChangeShopPlanMutation,
    useCreateAdminShopMutation,
    useNotifyShopOwnerMutation,
    useGetAdminPlansQuery,
} from '../services/bornoposApi';

export default function SuperAdminShopManagement() {
    const { t } = useTranslation();
    const { queryState, setQuery, setPage, setPerPage } = useUrlQueryState({
        search: '',
        status: '',
        plan_id: '',
        page: 1,
        per_page: 15,
    });

    const { data, isLoading, refetch } = useGetAdminShopsQuery({
        search: queryState.search,
        status: queryState.status,
        plan_id: queryState.plan_id,
        page: queryState.page,
        per_page: queryState.per_page,
    });

    const { data: plansData } = useGetAdminPlansQuery();
    const plans = plansData?.plans || [];

    const [toggleStatus, { isLoading: toggling }] = useToggleShopStatusMutation();
    const [extendSubscription, { isLoading: extending }] = useExtendShopSubscriptionMutation();
    const [changePlan, { isLoading: changingPlan }] = useChangeShopPlanMutation();
    const [createShop, { isLoading: creatingShop }] = useCreateAdminShopMutation();
    const [notifyOwner, { isLoading: notifying }] = useNotifyShopOwnerMutation();

    // Modals
    const [selectedShopId, setSelectedShopId] = useState(null);
    const { data: detailData } = useGetAdminShopQuery(selectedShopId, { skip: !selectedShopId });
    const [detailModalOpen, setDetailModalOpen] = useState(false);

    const [suspendModalOpen, setSuspendModalOpen] = useState(false);
    const [suspendShop, setSuspendShop] = useState(null);
    const [suspendReason, setSuspendReason] = useState('');

    const [extendModalOpen, setExtendModalOpen] = useState(false);
    const [extendShop, setExtendShop] = useState(null);
    const [extendDays, setExtendDays] = useState(30);
    const [extendReason, setExtendReason] = useState('');

    const [planModalOpen, setPlanModalOpen] = useState(false);
    const [planShop, setPlanShop] = useState(null);
    const [newPlanId, setNewPlanId] = useState('');

    const [notifyModalOpen, setNotifyModalOpen] = useState(false);
    const [notifyShop, setNotifyShop] = useState(null);
    const [notifyTitle, setNotifyTitle] = useState('');
    const [notifyMessage, setNotifyMessage] = useState('');

    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [createForm, setCreateForm] = useState({
        name: '',
        business_type: 'pharmacy',
        owner_name: '',
        email: '',
        password: '',
        phone: '',
        address: '',
        plan_id: '',
        trial_days: 14,
    });

    const [feedback, setFeedback] = useState({ type: '', message: '' });

    const shops = data?.shops || [];
    const meta = data?.meta || {};
    const shopDetail = detailData?.shop;

    // Handlers
    const handleOpenDetail = (shop) => {
        setSelectedShopId(shop.id);
        setDetailModalOpen(true);
    };

    const handleOpenSuspend = (shop) => {
        setSuspendShop(shop);
        setSuspendReason('');
        setSuspendModalOpen(true);
    };

    const handleConfirmSuspend = async (e) => {
        e.preventDefault();
        setFeedback({ type: '', message: '' });
        const action = suspendShop.is_suspended ? 'activate' : 'suspend';
        try {
            const res = await toggleStatus({
                id: suspendShop.id,
                action,
                reason: suspendReason,
            }).unwrap();
            setFeedback({ type: 'success', message: res.message || t('Shop status updated.') });
            setSuspendModalOpen(false);
            refetch();
        } catch (err) {
            setFeedback({ type: 'error', message: err.data?.message || t('Failed to update shop status.') });
        }
    };

    const handleOpenExtend = (shop) => {
        setExtendShop(shop);
        setExtendDays(30);
        setExtendReason('Administrative grant / subscription validity renewal');
        setExtendModalOpen(true);
    };

    const handleConfirmExtend = async (e) => {
        e.preventDefault();
        setFeedback({ type: '', message: '' });
        try {
            const res = await extendSubscription({
                id: extendShop.id,
                days: parseInt(extendDays, 10),
                reason: extendReason,
            }).unwrap();
            setFeedback({ type: 'success', message: res.message || t('Subscription validity extended.') });
            setExtendModalOpen(false);
            refetch();
        } catch (err) {
            setFeedback({ type: 'error', message: err.data?.message || t('Failed to extend subscription.') });
        }
    };

    const handleOpenChangePlan = (shop) => {
        setPlanShop(shop);
        setNewPlanId(shop.plan?.id || (plans[0]?.id || ''));
        setPlanModalOpen(true);
    };

    const handleConfirmChangePlan = async (e) => {
        e.preventDefault();
        setFeedback({ type: '', message: '' });
        try {
            const res = await changePlan({
                id: planShop.id,
                plan_id: parseInt(newPlanId, 10),
                extend_days: 30,
            }).unwrap();
            setFeedback({ type: 'success', message: res.message || t('Plan reassigned successfully.') });
            setPlanModalOpen(false);
            refetch();
        } catch (err) {
            setFeedback({ type: 'error', message: err.data?.message || t('Failed to change plan.') });
        }
    };

    const handleOpenNotify = (shop) => {
        setNotifyShop(shop);
        setNotifyTitle('Important Notice Regarding Your BornoPos Subscription');
        setNotifyMessage('');
        setNotifyModalOpen(true);
    };

    const handleConfirmNotify = async (e) => {
        e.preventDefault();
        setFeedback({ type: '', message: '' });
        try {
            const res = await notifyOwner({
                id: notifyShop.id,
                title: notifyTitle,
                message: notifyMessage,
            }).unwrap();
            setFeedback({ type: 'success', message: res.message || t('Notification sent to shop owner.') });
            setNotifyModalOpen(false);
        } catch (err) {
            setFeedback({ type: 'error', message: err.data?.message || t('Failed to send notification.') });
        }
    };

    const handleOpenCreate = () => {
        setCreateForm({
            name: '',
            business_type: 'pharmacy',
            owner_name: '',
            email: '',
            password: 'password123',
            phone: '',
            address: '',
            plan_id: plans[0]?.id || '',
            trial_days: 14,
        });
        setCreateModalOpen(true);
    };

    const handleConfirmCreate = async (e) => {
        e.preventDefault();
        setFeedback({ type: '', message: '' });
        try {
            const res = await createShop(createForm).unwrap();
            setFeedback({ type: 'success', message: res.message || t('Shop created successfully.') });
            setCreateModalOpen(false);
            refetch();
        } catch (err) {
            setFeedback({ type: 'error', message: err.data?.message || t('Failed to create shop.') });
        }
    };

    return (
        <section className="card">
            <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h2>{t('Tenant & Shop Management')}</h2>
                    <p className="muted">{t('Manage all registered shops, tenant subscriptions, validity extensions, and owner communications.')}</p>
                </div>
                <button type="button" className="btn primary" onClick={handleOpenCreate}>
                    + {t('Create Shop Tenant')}
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

            {/* Filter Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {['', 'active', 'trial', 'expired', 'suspended', 'payment_pending'].map((st) => (
                        <button
                            key={st}
                            type="button"
                            className={`chip ${queryState.status === st ? 'active' : ''}`}
                            onClick={() => setQuery({ status: st, page: 1 })}
                        >
                            {st ? t(st.replace('_', ' ').toUpperCase()) : t('All Statuses')}
                        </button>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: '8px', flex: 1, maxWidth: '480px', justifyContent: 'flex-end' }}>
                    <SearchInput
                        value={queryState.search}
                        onChange={(val) => setQuery({ search: val, page: 1 })}
                        placeholder={t('Search by shop name, slug, owner, phone...')}
                        style={{ width: '100%' }}
                    />
                    <select
                        value={queryState.plan_id}
                        onChange={(e) => setQuery({ plan_id: e.target.value, page: 1 })}
                        style={{ width: 'auto', minWidth: '130px' }}
                    >
                        <option value="">{t('All Plans')}</option>
                        {plans.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {isLoading ? (
                <div style={{ padding: '32px', textAlign: 'center' }} className="muted">{t('Loading shops...')}</div>
            ) : shops.length === 0 ? (
                <div style={{ padding: '48px', textAlign: 'center' }} className="muted">
                    {t('No shops found matching your search or filters.')}
                </div>
            ) : (
                <div className="table-responsive">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>{t('Shop Name & ID')}</th>
                                <th>{t('Owner Details')}</th>
                                <th>{t('Plan')}</th>
                                <th>{t('Validity / Expiry')}</th>
                                <th>{t('Branches')}</th>
                                <th>{t('Status')}</th>
                                <th style={{ textAlign: 'right' }}>{t('Actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {shops.map((s) => (
                                <tr key={s.id}>
                                    <td>
                                        <div style={{ fontWeight: 700, fontSize: '14px' }}>{s.name}</div>
                                        <div style={{ fontSize: '11px', color: '#6b7280', fontFamily: 'monospace' }}>
                                            {s.slug} · {s.business_type?.replace('_', ' ')}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{s.owner?.name || t('No Owner')}</div>
                                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                            {s.owner?.phone || s.phone || '—'}
                                        </div>
                                    </td>
                                    <td>
                                        <span className="badge" style={{ background: '#e0e7ff', color: '#3730a3' }}>
                                            {s.plan?.name || t('Standard')}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{s.subscription_expires_at || '—'}</div>
                                        {s.is_expired ? (
                                            <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: 600 }}>⚠️ {t('Expired')}</div>
                                        ) : s.subscription_status === 'trial' ? (
                                            <div style={{ fontSize: '11px', color: '#3b82f6' }}>{t('In Trial')}</div>
                                        ) : null}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span className="badge" style={{ background: '#f3f4f6' }}>{s.branches_count || 1}</span>
                                    </td>
                                    <td>
                                        <span className={`badge ${s.is_suspended ? 'danger' : s.is_expired ? 'warning' : s.subscription_status === 'active' ? 'success' : 'info'}`}>
                                            {s.subscription_status}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'inline-flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                            <button
                                                type="button"
                                                className="btn sm"
                                                onClick={() => handleOpenDetail(s)}
                                                title={t('View Full Details & Usage')}
                                            >
                                                {t('Details')}
                                            </button>
                                            <button
                                                type="button"
                                                className="btn sm primary"
                                                onClick={() => handleOpenExtend(s)}
                                                title={t('Extend Validity')}
                                            >
                                                {t('Extend')}
                                            </button>
                                            <button
                                                type="button"
                                                className="btn sm"
                                                onClick={() => handleOpenChangePlan(s)}
                                                title={t('Change Subscription Plan')}
                                            >
                                                {t('Plan')}
                                            </button>
                                            <button
                                                type="button"
                                                className={`btn sm ${s.is_suspended ? 'success' : 'danger'}`}
                                                onClick={() => handleOpenSuspend(s)}
                                                title={s.is_suspended ? t('Restore Shop') : t('Suspend Shop')}
                                            >
                                                {s.is_suspended ? t('Restore') : t('Suspend')}
                                            </button>
                                            <button
                                                type="button"
                                                className="btn sm"
                                                onClick={() => handleOpenNotify(s)}
                                                title={t('Send Notice to Owner')}
                                            >
                                                🔔
                                            </button>
                                        </div>
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

            {/* Shop Details Modal */}
            {shopDetail && (
                <Modal
                    isOpen={detailModalOpen}
                    onClose={() => setDetailModalOpen(false)}
                    title={shopDetail.name}
                    subtitle={`ID: ${shopDetail.slug} · Business Type: ${shopDetail.business_type}`}
                    size="lg"
                >
                    <div className="grid" style={{ gap: '16px' }}>
                        {/* Summary Cards */}
                        <div className="grid grid-3" style={{ gap: '12px' }}>
                            <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase' }}>{t('Subscription Status')}</div>
                                <div style={{ fontWeight: 800, fontSize: '16px', marginTop: '4px' }}>
                                    <span className={`badge ${shopDetail.is_suspended ? 'danger' : shopDetail.is_expired ? 'warning' : 'success'}`}>
                                        {shopDetail.subscription_status}
                                    </span>
                                </div>
                                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                                    {t('Expires')}: {shopDetail.subscription_expires_at || t('Not set')}
                                </div>
                            </div>

                            <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase' }}>{t('Assigned Plan')}</div>
                                <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--primary, #4f46e5)', marginTop: '4px' }}>
                                    {shopDetail.plan?.name || t('Standard')}
                                </div>
                                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                                    {money(shopDetail.plan?.price_cents || 0)} / {shopDetail.plan?.interval || 'month'}
                                </div>
                            </div>

                            <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase' }}>{t('Resource Usage & Limits')}</div>
                                <div style={{ fontSize: '13px', marginTop: '4px' }}>
                                    <div>👥 {t('Staff')}: <strong>{shopDetail.usage?.users_count}</strong> / {shopDetail.plan?.max_users || '∞'}</div>
                                    <div>📦 {t('Products')}: <strong>{shopDetail.usage?.products_count}</strong> / {shopDetail.plan?.max_products || '∞'}</div>
                                    <div>🏬 {t('Branches')}: <strong>{shopDetail.usage?.branches_count || 1}</strong> / {shopDetail.plan?.max_stores || '1'}</div>
                                </div>
                            </div>
                        </div>

                        {/* Owner Details */}
                        <div style={{ background: '#f3f4f6', padding: '14px', borderRadius: '8px' }}>
                            <h4 style={{ fontSize: '13px', fontWeight: 800, marginBottom: '6px' }}>{t('Shop Owner & Contact')}:</h4>
                            <div style={{ fontSize: '13px' }}>
                                <strong>{shopDetail.owner?.name}</strong> · {shopDetail.owner?.email} · {shopDetail.owner?.phone}
                            </div>
                            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                                {t('Last Login')}: {shopDetail.owner?.last_login_at || t('Never logged in')}
                            </div>
                        </div>

                        {/* Recent Payments & Invoices */}
                        <div>
                            <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>{t('Subscription Payment History')}:</h4>
                            {shopDetail.payments?.length === 0 ? (
                                <p className="muted" style={{ fontSize: '13px' }}>{t('No subscription payment records submitted yet.')}</p>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>{t('TrxID')}</th>
                                                <th>{t('Gateway')}</th>
                                                <th>{t('Amount')}</th>
                                                <th>{t('Status')}</th>
                                                <th>{t('Date')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {shopDetail.payments.map((p) => (
                                                <tr key={p.id}>
                                                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{p.transaction_id}</td>
                                                    <td style={{ textTransform: 'uppercase' }}>{p.payment_method}</td>
                                                    <td>{money(p.amount_cents)}</td>
                                                    <td><span className={`badge ${p.status === 'approved' ? 'success' : p.status === 'rejected' ? 'danger' : 'warning'}`}>{p.status}</span></td>
                                                    <td style={{ fontSize: '12px' }}>{p.created_at}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                            <button type="button" className="btn" onClick={() => setDetailModalOpen(false)}>
                                {t('Close')}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Suspend / Restore Confirmation Modal */}
            {suspendShop && (
                <Modal
                    isOpen={suspendModalOpen}
                    onClose={() => setSuspendModalOpen(false)}
                    title={suspendShop.is_suspended ? t('Restore Shop Access') : t('Confirm Shop Suspension')}
                    subtitle={suspendShop.name}
                    size="sm"
                >
                    <form onSubmit={handleConfirmSuspend} className="grid" style={{ gap: '14px' }}>
                        {!suspendShop.is_suspended ? (
                            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '12px', borderRadius: '8px', fontSize: '13px', lineHeight: 1.5 }}>
                                ⚠️ <strong>{t('Warning')}:</strong> {t('Suspending this shop will immediately prevent staff and the owner from performing restricted business operations and POS sales until restored. Their business records and database tables will be safely preserved.')}
                            </div>
                        ) : (
                            <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#166534', padding: '12px', borderRadius: '8px', fontSize: '13px' }}>
                                ✓ {t('Restoring this shop will re-enable access for the tenant and their staff.')}
                            </div>
                        )}

                        {!suspendShop.is_suspended && (
                            <div className="field">
                                <label>{t('Suspension Reason')} *</label>
                                <textarea
                                    required
                                    rows="3"
                                    value={suspendReason}
                                    onChange={(e) => setSuspendReason(e.target.value)}
                                    placeholder={t('Reason for suspension (overdue invoices, terms breach, etc.)...')}
                                />
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button type="button" className="btn" onClick={() => setSuspendModalOpen(false)}>
                                {t('Cancel')}
                            </button>
                            <button
                                type="submit"
                                className={`btn ${suspendShop.is_suspended ? 'success' : 'danger'}`}
                                disabled={toggling}
                            >
                                {toggling ? t('Processing...') : suspendShop.is_suspended ? t('Restore Shop') : t('Confirm Suspension')}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Extend Validity Modal */}
            {extendShop && (
                <Modal
                    isOpen={extendModalOpen}
                    onClose={() => setExtendModalOpen(false)}
                    title={t('Extend Subscription Validity')}
                    subtitle={`${extendShop.name} · Current Expiry: ${extendShop.subscription_expires_at || t('Expired')}`}
                    size="sm"
                >
                    <form onSubmit={handleConfirmExtend} className="grid" style={{ gap: '14px' }}>
                        <div className="field">
                            <label>{t('Days to Add')} *</label>
                            <input
                                type="number"
                                required
                                min="1"
                                max="3650"
                                value={extendDays}
                                onChange={(e) => setExtendDays(e.target.value)}
                            />
                        </div>
                        <div className="field">
                            <label>{t('Reason / Audit Note')}</label>
                            <input
                                type="text"
                                value={extendReason}
                                onChange={(e) => setExtendReason(e.target.value)}
                                placeholder={t('Reason for manual grant...')}
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button type="button" className="btn" onClick={() => setExtendModalOpen(false)}>
                                {t('Cancel')}
                            </button>
                            <button type="submit" className="btn primary" disabled={extending}>
                                {extending ? t('Extending...') : t('Extend Validity')}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Change Plan Modal */}
            {planShop && (
                <Modal
                    isOpen={planModalOpen}
                    onClose={() => setPlanModalOpen(false)}
                    title={t('Assign / Change Subscription Plan')}
                    subtitle={planShop.name}
                    size="sm"
                >
                    <form onSubmit={handleConfirmChangePlan} className="grid" style={{ gap: '14px' }}>
                        <div className="field">
                            <label>{t('Select New Plan')} *</label>
                            <select value={newPlanId} onChange={(e) => setNewPlanId(e.target.value)}>
                                {plans.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} — {money(p.price_cents)} ({p.duration_days} days)
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button type="button" className="btn" onClick={() => setPlanModalOpen(false)}>
                                {t('Cancel')}
                            </button>
                            <button type="submit" className="btn primary" disabled={changingPlan}>
                                {changingPlan ? t('Updating...') : t('Assign Plan')}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Notification Modal */}
            {notifyShop && (
                <Modal
                    isOpen={notifyModalOpen}
                    onClose={() => setNotifyModalOpen(false)}
                    title={t('Send Notification to Shop Owner')}
                    subtitle={notifyShop.name}
                    size="sm"
                >
                    <form onSubmit={handleConfirmNotify} className="grid" style={{ gap: '14px' }}>
                        <div className="field">
                            <label>{t('Notice Title')} *</label>
                            <input
                                type="text"
                                required
                                value={notifyTitle}
                                onChange={(e) => setNotifyTitle(e.target.value)}
                            />
                        </div>
                        <div className="field">
                            <label>{t('Message Body')} *</label>
                            <textarea
                                required
                                rows="4"
                                value={notifyMessage}
                                onChange={(e) => setNotifyMessage(e.target.value)}
                                placeholder={t('Enter notification message to be delivered to the tenant owner...')}
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button type="button" className="btn" onClick={() => setNotifyModalOpen(false)}>
                                {t('Cancel')}
                            </button>
                            <button type="submit" className="btn primary" disabled={notifying}>
                                {notifying ? t('Sending...') : t('Send Notification')}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Create Shop Modal */}
            <Modal
                isOpen={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
                title={t('Create New Tenant Shop')}
                subtitle={t('Provision a new shop tenant along with their primary owner account and subscription.')}
                size="md"
            >
                <form onSubmit={handleConfirmCreate} className="grid" style={{ gap: '14px' }}>
                    <div className="grid grid-2" style={{ gap: '12px' }}>
                        <div className="field">
                            <label>{t('Shop Name')} *</label>
                            <input
                                type="text"
                                required
                                value={createForm.name}
                                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                                placeholder={t('e.g. Popular Pharmacy')}
                            />
                        </div>
                        <div className="field">
                            <label>{t('Business Type')} *</label>
                            <select value={createForm.business_type} onChange={(e) => setCreateForm({ ...createForm, business_type: e.target.value })}>
                                <option value="pharmacy">{t('Pharmacy')}</option>
                                <option value="grocery">{t('Grocery')}</option>
                                <option value="electronics">{t('Electronics')}</option>
                                <option value="restaurant">{t('Restaurant')}</option>
                                <option value="all_in_one">{t('All in One')}</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-2" style={{ gap: '12px' }}>
                        <div className="field">
                            <label>{t('Owner Full Name')} *</label>
                            <input
                                type="text"
                                required
                                value={createForm.owner_name}
                                onChange={(e) => setCreateForm({ ...createForm, owner_name: e.target.value })}
                            />
                        </div>
                        <div className="field">
                            <label>{t('Owner Email Address')} *</label>
                            <input
                                type="email"
                                required
                                value={createForm.email}
                                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-2" style={{ gap: '12px' }}>
                        <div className="field">
                            <label>{t('Password')} *</label>
                            <input
                                type="password"
                                required
                                value={createForm.password}
                                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                            />
                        </div>
                        <div className="field">
                            <label>{t('Contact Phone')}</label>
                            <input
                                type="text"
                                value={createForm.phone}
                                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                                placeholder="+880 1..."
                            />
                        </div>
                    </div>

                    <div className="grid grid-2" style={{ gap: '12px' }}>
                        <div className="field">
                            <label>{t('Subscription Plan')} *</label>
                            <select value={createForm.plan_id} onChange={(e) => setCreateForm({ ...createForm, plan_id: e.target.value })}>
                                {plans.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} ({money(p.price_cents)})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="field">
                            <label>{t('Initial Trial Days')}</label>
                            <input
                                type="number"
                                min="0"
                                value={createForm.trial_days}
                                onChange={(e) => setCreateForm({ ...createForm, trial_days: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="field">
                        <label>{t('Physical Address')}</label>
                        <input
                            type="text"
                            value={createForm.address}
                            onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                        <button type="button" className="btn" onClick={() => setCreateModalOpen(false)}>
                            {t('Cancel')}
                        </button>
                        <button type="submit" className="btn primary" disabled={creatingShop}>
                            {creatingShop ? t('Creating...') : t('Create Tenant Shop')}
                        </button>
                    </div>
                </form>
            </Modal>
        </section>
    );
}
