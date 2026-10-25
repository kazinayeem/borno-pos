import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Chart } from 'chart.js/auto';
import { money } from '../api';
import { motion } from '../motion';
import { useTranslation } from '../i18n';
import { Modal } from '../components/ui';
import {
    useGetDashboardQuery,
    useApproveAdminPaymentMutation,
    useRejectAdminPaymentMutation,
} from '../services/bornoposApi';

const ranges = [
    ['today', 'Today'],
    ['yesterday', 'Yesterday'],
    ['this_week', 'This Week'],
    ['last_week', 'Last Week'],
    ['this_month', 'This Month'],
    ['last_month', 'Last Month'],
    ['this_year', 'This Year'],
];

function chartMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 420 };
}

export default function PlatformDashboard({ user }) {
    const { t } = useTranslation();
    const [params, setParams] = useSearchParams();

    const type = params.get('type') || 'this_month';
    const from = params.get('from') || '';
    const to = params.get('to') || '';

    const { data, isFetching: loading, refetch } = useGetDashboardQuery({
        platform: true,
        type,
        from,
        to,
    });

    const [approvePayment, { isLoading: approving }] = useApproveAdminPaymentMutation();
    const [rejectPayment, { isLoading: rejecting }] = useRejectAdminPaymentMutation();

    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [feedback, setFeedback] = useState({ type: '', message: '' });

    const kpis = data?.kpis || {};
    const chartData = data?.chart;
    const planDist = data?.plan_distribution || [];
    const statusDist = data?.status_distribution || [];
    const pendingQueue = data?.pending_queue || [];
    const recentShops = data?.recent_shops || [];
    const recentPayments = data?.recent_payments || [];

    const trendRef = useRef(null);
    const planDonutRef = useRef(null);
    const statusDonutRef = useRef(null);

    const trendKey = chartData ? JSON.stringify(chartData) : '';
    const planKey = planDist.length ? JSON.stringify(planDist) : '';
    const statusKey = statusDist.length ? JSON.stringify(statusDist) : '';

    // 1. Revenue & Registrations Trend Chart
    useEffect(() => {
        if (!trendRef.current || !chartData) return undefined;
        const chart = new Chart(trendRef.current, {
            type: 'bar',
            data: {
                labels: chartData.labels,
                datasets: [
                    {
                        type: 'line',
                        label: t('Collected Revenue (৳)'),
                        data: chartData.revenue,
                        borderColor: '#16a34a',
                        backgroundColor: '#16a34a',
                        tension: 0.35,
                        yAxisID: 'y',
                        borderWidth: 2,
                        pointRadius: 3,
                    },
                    {
                        type: 'bar',
                        label: t('New Shops'),
                        data: chartData.registrations,
                        backgroundColor: 'rgba(59, 130, 246, 0.45)',
                        borderColor: '#3b82f6',
                        borderWidth: 1,
                        borderRadius: 4,
                        yAxisID: 'y1',
                    },
                ],
            },
            options: {
                animation: chartMotion(),
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: { display: true, text: t('Revenue (৳)') },
                        beginAtZero: true,
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: { display: true, text: t('Shops Count') },
                        grid: { drawOnChartArea: false },
                        beginAtZero: true,
                        ticks: { stepSize: 1 },
                    },
                },
            },
        });

        return () => chart.destroy();
    }, [trendKey, t]);

    // 2. Plan Distribution Donut
    useEffect(() => {
        if (!planDonutRef.current || !planDist.length) return undefined;
        const chart = new Chart(planDonutRef.current, {
            type: 'doughnut',
            data: {
                labels: planDist.map((p) => p.name),
                datasets: [
                    {
                        data: planDist.map((p) => p.count),
                        backgroundColor: ['#4f46e5', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'],
                        borderWidth: 0,
                    },
                ],
            },
            options: {
                animation: chartMotion(),
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: { legend: { position: 'bottom' } },
            },
        });

        return () => chart.destroy();
    }, [planKey]);

    // 3. Status Distribution Donut
    useEffect(() => {
        if (!statusDonutRef.current || !statusDist.length) return undefined;
        const chart = new Chart(statusDonutRef.current, {
            type: 'doughnut',
            data: {
                labels: statusDist.map((s) => s.name),
                datasets: [
                    {
                        data: statusDist.map((s) => s.count),
                        backgroundColor: statusDist.map((s) => s.color),
                        borderWidth: 0,
                    },
                ],
            },
            options: {
                animation: chartMotion(),
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: { legend: { position: 'bottom' } },
            },
        });

        return () => chart.destroy();
    }, [statusKey]);

    const updateFilter = (updates) => {
        const next = new URLSearchParams(params);
        Object.entries(updates).forEach(([key, value]) => {
            if (value === '' || value === null || value === undefined) {
                next.delete(key);
            } else {
                next.set(key, value);
            }
        });
        setParams(next);
    };

    const handleApprove = async (payment) => {
        if (!window.confirm(t('Approve payment of ৳{amount} for {shop}? This will activate their subscription.', { amount: (payment.amount_cents / 100).toFixed(2), shop: payment.store?.name }))) {
            return;
        }
        setFeedback({ type: '', message: '' });
        try {
            const res = await approvePayment(payment.id).unwrap();
            setFeedback({ type: 'success', message: res.message || t('Payment approved successfully.') });
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
            setRejectionReason('');
            refetch();
        } catch (err) {
            setFeedback({ type: 'error', message: err.data?.message || t('Failed to reject payment.') });
        }
    };

    return (
        <>
            {/* Header with Title and Date Presets */}
            <div className="page-title" style={{ flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1>{t('SaaS Platform Overview')}</h1>
                    <div className="muted">{t('Tenant management, live subscriptions, and manual payment verifications.')}</div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {ranges.map(([key, text]) => (
                            <button
                                key={key}
                                className={`chip ${!from && type === key ? 'active' : ''}`}
                                type="button"
                                onClick={() => updateFilter({ type: key, from: '', to: '' })}
                            >
                                {t(text)}
                            </button>
                        ))}
                    </div>

                    <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                        <input
                            type="date"
                            value={from}
                            onChange={(e) => updateFilter({ from: e.target.value, type: '' })}
                            style={{ padding: '6px 10px', fontSize: '13px' }}
                        />
                        <span className="muted">→</span>
                        <input
                            type="date"
                            value={to}
                            onChange={(e) => updateFilter({ to: e.target.value, type: '' })}
                            style={{ padding: '6px 10px', fontSize: '13px' }}
                        />
                    </div>
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

            {/* SECTION 1: FINANCIAL & RECONCILED REVENUE */}
            <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#4b5563' }}>
                        💰 {t('Subscription Revenue & Verification Pipeline')}
                    </h3>
                    <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>
                        ✓ {t('Reconciled: Only approved payments counted as collected revenue')}
                    </span>
                </div>
                <div className="kpis" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                    <motion.article className="kpi" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} whileHover={{ y: -3 }}>
                        <div className="label">{t('Total Subscription Revenue')}</div>
                        <strong style={{ color: '#16a34a' }}>{money(kpis.total_revenue || 0)}</strong>
                        <em>{t('Gross Approved Payments')}</em>
                    </motion.article>

                    <motion.article className="kpi" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }} whileHover={{ y: -3 }}>
                        <div className="label">{t('Pending Verification Queue')}</div>
                        <strong style={{ color: kpis.payments_pending > 0 ? '#f59e0b' : '#374151' }}>
                            {kpis.payments_pending || 0}
                        </strong>
                        <em><Link to="/payment-verifications" style={{ textDecoration: 'underline' }}>{t('Review Queue')} →</Link></em>
                    </motion.article>

                    <motion.article className="kpi" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }} whileHover={{ y: -3 }}>
                        <div className="label">{t('Payments Approved')}</div>
                        <strong style={{ color: '#2563eb' }}>{kpis.payments_approved || 0}</strong>
                        <em>{data?.label}</em>
                    </motion.article>

                    <motion.article className="kpi" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.15 }} whileHover={{ y: -3 }}>
                        <div className="label">{t('Payments Rejected')}</div>
                        <strong style={{ color: '#ef4444' }}>{kpis.payments_rejected || 0}</strong>
                        <em>{t('With Audited Reason')}</em>
                    </motion.article>

                    <motion.article className="kpi" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }} whileHover={{ y: -3 }}>
                        <div className="label">{t('Outstanding Invoices')}</div>
                        <strong style={{ color: '#dc2626' }}>{money(kpis.outstanding_invoices || 0)}</strong>
                        <em><Link to="/subscription-invoices" style={{ textDecoration: 'underline' }}>{t('View Invoices')} →</Link></em>
                    </motion.article>
                </div>
            </div>

            {/* SECTION 2: TENANT & SUBSCRIBER METRICS */}
            <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#4b5563', marginBottom: '12px' }}>
                    🏬 {t('Tenant & Subscription Health')}
                </h3>
                <div className="kpis" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                    <motion.article className="kpi" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.25 }} whileHover={{ y: -3 }}>
                        <div className="label">{t('Total Registered Shops')}</div>
                        <strong>{kpis.total_shops || 0}</strong>
                        <em>{t('Independent Tenants')}</em>
                    </motion.article>

                    <motion.article className="kpi" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.3 }} whileHover={{ y: -3 }}>
                        <div className="label">{t('Active Shops')}</div>
                        <strong style={{ color: '#16a34a' }}>{kpis.active_shops || 0}</strong>
                        <em>{t('Paid Active')}</em>
                    </motion.article>

                    <motion.article className="kpi" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.35 }} whileHover={{ y: -3 }}>
                        <div className="label">{t('Trial Shops')}</div>
                        <strong style={{ color: '#3b82f6' }}>{kpis.trial_shops || 0}</strong>
                        <em>{t('Onboarding Grace')}</em>
                    </motion.article>

                    <motion.article className="kpi" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.4 }} whileHover={{ y: -3 }}>
                        <div className="label">{t('Expired Subscriptions')}</div>
                        <strong style={{ color: '#ef4444' }}>{kpis.expired_subscriptions || 0}</strong>
                        <em>{t('Data Preserved')}</em>
                    </motion.article>

                    <motion.article className="kpi" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.45 }} whileHover={{ y: -3 }}>
                        <div className="label">{t('Suspended Shops')}</div>
                        <strong style={{ color: '#b91c1c' }}>{kpis.suspended_shops || 0}</strong>
                        <em>{t('Administrative Action')}</em>
                    </motion.article>

                    <motion.article className="kpi" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.5 }} whileHover={{ y: -3 }}>
                        <div className="label">{t('Expiring Soon (7d)')}</div>
                        <strong style={{ color: '#f59e0b' }}>{kpis.expiring_soon || 0}</strong>
                        <em>{t('Renewal Due')}</em>
                    </motion.article>
                </div>
            </div>

            {/* SECTION 3: VISUAL CHARTS */}
            <div className="grid grid-3" style={{ gap: '16px', marginBottom: '24px' }}>
                {/* Revenue & Growth Trend */}
                <article className="card" style={{ gridColumn: 'span 2', minHeight: '340px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div>
                            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{t('Revenue & Tenant Registrations Trend')}</h3>
                            <div className="muted" style={{ fontSize: '12px' }}>{t('Reconciled gross revenue vs newly registered shops over time.')}</div>
                        </div>
                    </div>
                    <div style={{ height: '260px', position: 'relative' }}>
                        <canvas ref={trendRef} />
                    </div>
                </article>

                {/* Plan Distribution */}
                <article className="card" style={{ minHeight: '340px' }}>
                    <div style={{ marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{t('Subscription Plan Distribution')}</h3>
                        <div className="muted" style={{ fontSize: '12px' }}>{t('Breakdown of tenants across subscription plans.')}</div>
                    </div>
                    <div style={{ height: '200px', position: 'relative', marginBottom: '12px' }}>
                        <canvas ref={planDonutRef} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                        {planDist.map((p) => (
                            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>{p.name}:</span>
                                <strong>{p.count} {t('shops')} ({p.percent}%)</strong>
                            </div>
                        ))}
                    </div>
                </article>
            </div>

            {/* SECTION 4: PENDING PAYMENT QUEUE & QUICK VERIFICATION */}
            {pendingQueue.length > 0 && (
                <div className="card" style={{ marginBottom: '24px', border: '1px solid #fde68a', background: '#fffbeb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#92400e', margin: 0 }}>
                                ⚠️ {t('Pending Payment Verification Queue ({count})', { count: pendingQueue.length })}
                            </h3>
                            <p style={{ fontSize: '12px', color: '#b45309', margin: '2px 0 0 0' }}>
                                {t('These manual payments are awaiting admin review. Subscriptions will activate upon approval.')}
                            </p>
                        </div>
                        <Link to="/payment-verifications" className="btn sm primary">
                            {t('Open Full Queue')} →
                        </Link>
                    </div>

                    <div className="table-responsive">
                        <table className="table" style={{ background: '#fff', borderRadius: '8px' }}>
                            <thead>
                                <tr>
                                    <th>{t('TrxID')}</th>
                                    <th>{t('Shop & Owner')}</th>
                                    <th>{t('Plan')}</th>
                                    <th>{t('Gateway')}</th>
                                    <th>{t('Amount')}</th>
                                    <th>{t('Sender')}</th>
                                    <th>{t('Submitted')}</th>
                                    <th style={{ textAlign: 'right' }}>{t('Action')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingQueue.map((p) => (
                                    <tr key={p.id}>
                                        <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>{p.transaction_id}</td>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{p.store?.name}</div>
                                            <div style={{ fontSize: '11px', color: '#6b7280' }}>{p.user?.name}</div>
                                        </td>
                                        <td><span className="badge">{p.plan?.name}</span></td>
                                        <td><span style={{ fontWeight: 700, textTransform: 'uppercase' }}>{p.payment_method}</span></td>
                                        <td style={{ fontWeight: 700, color: '#16a34a' }}>{money(p.amount_cents)}</td>
                                        <td style={{ fontFamily: 'monospace' }}>{p.sender_phone || '—'}</td>
                                        <td style={{ fontSize: '12px' }}>{new Date(p.created_at).toLocaleDateString()}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'inline-flex', gap: '6px' }}>
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
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* SECTION 5: RECENT SHOPS & SUBSCRIPTIONS */}
            <div className="grid grid-2" style={{ gap: '16px', marginBottom: '24px' }}>
                {/* Recent Shops */}
                <article className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{t('Recent Registered Shops')}</h3>
                        <Link to="/stores" style={{ fontSize: '13px', textDecoration: 'underline' }}>{t('View All')} →</Link>
                    </div>
                    <div className="table-responsive">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>{t('Shop Name')}</th>
                                    <th>{t('Owner')}</th>
                                    <th>{t('Plan')}</th>
                                    <th>{t('Status')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentShops.map((s) => (
                                    <tr key={s.id}>
                                        <td style={{ fontWeight: 600 }}>{s.name}</td>
                                        <td style={{ fontSize: '13px' }}>{s.owner?.name || '—'}</td>
                                        <td><span className="badge">{s.plan?.name || t('Standard')}</span></td>
                                        <td>
                                            <span className={`badge ${s.subscription_status === 'active' ? 'success' : s.subscription_status === 'trial' ? 'info' : 'danger'}`}>
                                                {s.subscription_status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </article>

                {/* Recent Payments Activity */}
                <article className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{t('Recent Subscription Payments')}</h3>
                        <Link to="/payment-verifications" style={{ fontSize: '13px', textDecoration: 'underline' }}>{t('View Queue')} →</Link>
                    </div>
                    <div className="table-responsive">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>{t('TrxID')}</th>
                                    <th>{t('Shop')}</th>
                                    <th>{t('Amount')}</th>
                                    <th>{t('Status')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentPayments.map((p) => (
                                    <tr key={p.id}>
                                        <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{p.transaction_id}</td>
                                        <td style={{ fontSize: '13px' }}>{p.store?.name}</td>
                                        <td style={{ fontWeight: 700 }}>{money(p.amount_cents)}</td>
                                        <td>
                                            <span className={`badge ${p.status === 'approved' ? 'success' : p.status === 'rejected' ? 'danger' : 'warning'}`}>
                                                {p.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </article>
            </div>

            {/* Quick Rejection Modal */}
            {selectedPayment && (
                <Modal
                    isOpen={rejectModalOpen}
                    onClose={() => setRejectModalOpen(false)}
                    title={t('Reject Payment Request')}
                    subtitle={t('Please specify the rejection reason for {shop}', { shop: selectedPayment.store?.name })}
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
                                placeholder={t('e.g. Transaction ID was not found in statement or amount mismatched.')}
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
        </>
    );
}
