import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { money } from '../api';
import { useT } from '../i18n';
import { useUrlQueryState } from '../hooks/useUrlQueryState';
import {
    useCancelPurchaseMutation,
    useGetPurchaseHistoryQuery,
    useGetPurchaseQuery,
    useGetPurchasesQuery,
    useGetPurchaseSuppliersPayablesQuery,
    useRecordPurchasePaymentMutation,
} from '../services/bornoposApi';

export default function PurchaseList() {
    const t = useT();
    const navigate = useNavigate();
    const currentUser = useSelector((state) => state.session.user);

    const defaultQuery = useMemo(() => ({
        tab: 'all',
        search: '',
        date_preset: '',
        from: '',
        to: '',
        supplier_id: '',
        warehouse_id: '',
        status: '',
        payment_status: '',
        min_amount: '',
        max_amount: '',
        min_due: '',
        max_due: '',
        page: 1,
        per_page: 10,
        sort_by: 'purchased_on',
        sort_dir: 'desc',
        supplier_search: '',
        supplier_due_only: false,
    }), []);

    const {
        query,
        searchValue: search,
        onSearchChange,
        clearSearch,
        setQuery,
        setPage,
        setPerPage,
        setSort,
        resetFilters,
    } = useUrlQueryState(defaultQuery, {
        searchKey: 'search',
        searchAlias: 'q',
        sortByKey: 'sort_by',
        sortDirKey: 'sort_dir',
        sortDirAlias: 'sort_direction',
    });

    const activeTab = query.tab || 'all';
    const datePreset = query.date_preset || '';
    const from = query.from || query.from_date || '';
    const to = query.to || query.to_date || '';
    const supplierId = query.supplier_id || '';
    const warehouseId = query.warehouse_id || '';
    const status = query.status || '';
    const paymentStatus = query.payment_status || '';
    const minAmount = query.min_amount || '';
    const maxAmount = query.max_amount || '';
    const minDue = query.min_due || '';
    const maxDue = query.max_due || '';
    const page = query.page || 1;
    const perPage = query.per_page || 10;
    const sortBy = query.sort_by || 'purchased_on';
    const sortDirection = query.sort_dir || 'desc';

    const supplierSearch = query.supplier_search || '';
    const supplierDueOnly = !!query.supplier_due_only;

    // UI state
    const [isFilterOpen, setIsFilterOpen] = useState(() => {
        return Boolean(
            query.date_preset ||
            query.from ||
            query.to ||
            query.supplier_id ||
            query.warehouse_id ||
            query.status ||
            query.payment_status ||
            query.min_amount ||
            query.max_amount ||
            query.min_due ||
            query.max_due
        );
    });
    const [selectedPurchaseIdForDetail, setSelectedPurchaseIdForDetail] = useState(null);
    const [paymentModalPurchase, setPaymentModalPurchase] = useState(null);
    const [notification, setNotification] = useState({ type: '', text: '' });

    // Active filter query params for API
    const queryParams = useMemo(() => {
        const params = {
            page,
            per_page: perPage,
            sort_by: sortBy,
            sort_direction: sortDirection,
        };
        const s = query.search || query.q;
        if (s) params.q = s;
        if (activeTab === 'due') params.due_only = 1;
        if (datePreset) params.date_preset = datePreset;
        if (from) params.from = from;
        if (to) params.to = to;
        if (supplierId) params.supplier_id = supplierId;
        if (warehouseId) params.warehouse_id = warehouseId;
        if (status) params.status = status;
        if (paymentStatus) params.payment_status = paymentStatus;
        if (minAmount) params.min_amount = minAmount;
        if (maxAmount) params.max_amount = maxAmount;
        if (minDue) params.min_due = minDue;
        if (maxDue) params.max_due = maxDue;
        return params;
    }, [
        page,
        perPage,
        sortBy,
        sortDirection,
        query.search,
        query.q,
        activeTab,
        datePreset,
        from,
        to,
        supplierId,
        warehouseId,
        status,
        paymentStatus,
        minAmount,
        maxAmount,
        minDue,
        maxDue,
    ]);

    // Fetch purchases
    const { data, isFetching, error, refetch } = useGetPurchasesQuery(queryParams);
    const purchases = data?.data || [];
    const meta = data?.meta || { current_page: 1, last_page: 1, from: 0, to: 0, total: 0 };
    const summary = data?.summary || {
        total_purchases_count: 0,
        total_amount_cents: 0,
        total_paid_cents: 0,
        total_due_cents: 0,
        unpaid_count: 0,
        partial_count: 0,
        paid_count: 0,
        overdue_count: 0,
    };
    const filtersData = data?.filters || { suppliers: [], warehouses: [], accounts: [] };

    // Fetch supplier payables if tab is active
    const {
        data: supplierPayablesData,
        isFetching: isFetchingSuppliers,
        refetch: refetchSuppliers,
    } = useGetPurchaseSuppliersPayablesQuery(
        { q: supplierSearch, due_only: supplierDueOnly ? 1 : 0 },
        { skip: activeTab !== 'suppliers' }
    );

    const [cancelPurchase, { isLoading: isCancelling }] = useCancelPurchaseMutation();

    // Check count of active filters
    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (query.search || query.q) count++;
        if (datePreset) count++;
        if (from || to) count++;
        if (supplierId) count++;
        if (warehouseId) count++;
        if (status) count++;
        if (paymentStatus) count++;
        if (minAmount || maxAmount) count++;
        if (minDue || maxDue) count++;
        return count;
    }, [
        query.search,
        query.q,
        datePreset,
        from,
        to,
        supplierId,
        warehouseId,
        status,
        paymentStatus,
        minAmount,
        maxAmount,
        minDue,
        maxDue,
    ]);

    function handleResetFilters() {
        resetFilters(['tab']);
    }

    function handleSort(column) {
        setSort(column, 'desc');
    }

    async function handleCancel(purchase) {
        if (purchase.status === 'cancelled') return;
        const reason = window.prompt(
            t('Enter reason for cancelling / reversing this purchase (Stock and accounts will be reversed):'),
            'Cancelled by manager'
        );
        if (reason === null) return;

        try {
            const res = await cancelPurchase({ id: purchase.id, reason: reason || 'Cancelled by manager' });
            if (res.error) {
                setNotification({
                    type: 'error',
                    text: res.error.data?.message || t('Could not cancel purchase. Check available stock.'),
                });
            } else {
                setNotification({
                    type: 'success',
                    text: t('Purchase cancelled and stock/ledger successfully reversed.'),
                });
                refetch();
            }
        } catch (err) {
            setNotification({ type: 'error', text: t('An unexpected error occurred.') });
        }
    }

    function exportCsv() {
        const params = new URLSearchParams();
        Object.entries(queryParams).forEach(([k, v]) => {
            if (v !== undefined && v !== '' && k !== 'page' && k !== 'per_page') {
                params.append(k, v);
            }
        });
        window.location.href = `/purchase/export?${params.toString()}`;
    }

    function printReport() {
        window.print();
    }

    return (
        <section className="purchase-management-page">
            {/* Notification alert */}
            {notification.text && (
                <div
                    style={{
                        padding: '12px 18px',
                        marginBottom: '16px',
                        borderRadius: '8px',
                        fontWeight: 500,
                        backgroundColor: notification.type === 'error' ? '#fee2e2' : '#dcfce7',
                        color: notification.type === 'error' ? '#991b1b' : '#166534',
                        border: `1px solid ${notification.type === 'error' ? '#f87171' : '#86efac'}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <span>{notification.text}</span>
                    <button
                        type="button"
                        onClick={() => setNotification({ type: '', text: '' })}
                        style={{ background: 'transparent', border: 0, cursor: 'pointer', fontWeight: 700 }}
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Header & Page Title */}
            <div className="page-title no-print">
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span>📦</span>
                        <span>{t('Purchase Management')}</span>
                    </h1>
                    <div className="crumbs">
                        {t('Track supplier purchase orders, accounts payable, payment history & inventory intake')}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                        className="btn"
                        type="button"
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            backgroundColor: isFilterOpen ? '#e0f2fe' : '',
                            borderColor: isFilterOpen ? '#0284c7' : '',
                            color: isFilterOpen ? '#0369a1' : '',
                        }}
                    >
                        <span>⚙️</span>
                        <span>{t('Advanced Filters')}</span>
                        {activeFiltersCount > 0 && (
                            <span
                                style={{
                                    backgroundColor: '#0284c7',
                                    color: '#fff',
                                    borderRadius: '999px',
                                    padding: '1px 6px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                }}
                            >
                                {activeFiltersCount}
                            </span>
                        )}
                    </button>

                    <button
                        className="btn"
                        type="button"
                        onClick={printReport}
                        title={t('Print filtered purchase list')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                        <span>🖨️</span>
                        <span>{t('Print Report')}</span>
                    </button>

                    <button
                        className="btn"
                        type="button"
                        onClick={exportCsv}
                        title={t('Export full matching purchases to CSV')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                        <span>📥</span>
                        <span>{t('Export CSV')}</span>
                    </button>

                    <Link
                        to="/purchase/create"
                        data-tour="add-purchase-btn"
                        className="btn btn-primary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                        <span>➕</span>
                        <span>{t('New Purchase')}</span>
                    </Link>
                </div>
            </div>

            {/* Print Header (Visible only when printing report) */}
            <div className="print-only-report-header" style={{ display: 'none', marginBottom: '20px' }}>
                <h2 style={{ margin: 0 }}>{t('Purchase Report')}</h2>
                <p style={{ margin: '4px 0', color: '#64748b' }}>
                    Generated: {new Date().toLocaleString()} · Total Purchases: {summary.total_purchases_count} · Total Amount:{' '}
                    {money(summary.total_amount_cents)} · Outstanding Due: {money(summary.total_due_cents)}
                </p>
                {activeFiltersCount > 0 && (
                    <p style={{ fontSize: '11px', color: '#475569' }}>
                        Filters applied: {debouncedSearch ? `Search: "${debouncedSearch}", ` : ''}
                        {datePreset ? `Preset: ${datePreset}, ` : ''}
                        {from ? `From: ${from}, ` : ''}
                        {to ? `To: ${to}, ` : ''}
                        {paymentStatus ? `Payment: ${paymentStatus}` : ''}
                    </p>
                )}
            </div>

            {/* Navigation Tabs */}
            <div
                className="no-print"
                style={{
                    display: 'flex',
                    gap: '4px',
                    borderBottom: '2px solid #e2e8f0',
                    marginBottom: '18px',
                }}
            >
                <button
                    type="button"
                    onClick={() => {
                        setQuery({ tab: 'all', page: 1 }, { replace: false });
                    }}
                    style={{
                        padding: '10px 18px',
                        background: 'transparent',
                        border: 0,
                        borderBottom: activeTab === 'all' ? '3px solid #0284c7' : '3px solid transparent',
                        color: activeTab === 'all' ? '#0284c7' : '#64748b',
                        fontWeight: activeTab === 'all' ? 700 : 500,
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                    }}
                >
                    <span>📋 {t('All Purchases')}</span>
                    <span
                        style={{
                            backgroundColor: activeTab === 'all' ? '#e0f2fe' : '#f1f5f9',
                            color: activeTab === 'all' ? '#0369a1' : '#64748b',
                            borderRadius: '12px',
                            padding: '1px 8px',
                            fontSize: '0.75rem',
                        }}
                    >
                        {summary.total_purchases_count}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => {
                        setQuery({ tab: 'due', page: 1 }, { replace: false });
                    }}
                    style={{
                        padding: '10px 18px',
                        background: 'transparent',
                        border: 0,
                        borderBottom: activeTab === 'due' ? '3px solid #dc2626' : '3px solid transparent',
                        color: activeTab === 'due' ? '#dc2626' : '#64748b',
                        fontWeight: activeTab === 'due' ? 700 : 500,
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                    }}
                >
                    <span>⚠️ {t('Payable Due Purchases')}</span>
                    {(summary.unpaid_count > 0 || summary.partial_count > 0) && (
                        <span
                            style={{
                                backgroundColor: '#fee2e2',
                                color: '#b91c1c',
                                borderRadius: '12px',
                                padding: '1px 8px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                            }}
                        >
                            {summary.unpaid_count + summary.partial_count}
                        </span>
                    )}
                </button>

                <button
                    type="button"
                    onClick={() => {
                        setQuery({ tab: 'suppliers' }, { replace: false });
                    }}
                    style={{
                        padding: '10px 18px',
                        background: 'transparent',
                        border: 0,
                        borderBottom: activeTab === 'suppliers' ? '3px solid #0891b2' : '3px solid transparent',
                        color: activeTab === 'suppliers' ? '#0891b2' : '#64748b',
                        fontWeight: activeTab === 'suppliers' ? 700 : 500,
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                    }}
                >
                    <span>🏢 {t('Supplier Payables Summary')}</span>
                </button>
            </div>

            {/* KPI Summary Dashboard Cards */}
            <div
                className="no-print"
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '12px',
                    marginBottom: '20px',
                }}
            >
                {/* Total Purchases */}
                <div
                    className="card"
                    onClick={() => {
                        setQuery({ tab: 'all' });
                        handleResetFilters();
                    }}
                    style={{
                        cursor: 'pointer',
                        padding: '14px 16px',
                        borderLeft: '4px solid #0284c7',
                        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    }}
                    title={t('Click to reset and view all purchases')}
                >
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                        {t('Total Purchases')}
                    </div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px' }}>
                        {money(summary.total_amount_cents)}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        {summary.total_purchases_count} {t('invoices')}
                    </div>
                </div>

                {/* Total Paid */}
                <div
                    className="card"
                    onClick={() => {
                        setQuery({ tab: 'all', payment_status: 'paid', page: 1 });
                    }}
                    style={{
                        cursor: 'pointer',
                        padding: '14px 16px',
                        borderLeft: '4px solid #16a34a',
                    }}
                    title={t('Click to filter fully paid purchases')}
                >
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                        {t('Total Paid')}
                    </div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#16a34a', margin: '4px 0 2px' }}>
                        {money(summary.total_paid_cents)}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#16a34a' }}>
                        {summary.paid_count} {t('settled')}
                    </div>
                </div>

                {/* Outstanding Due */}
                <div
                    className="card"
                    onClick={() => {
                        setQuery({ tab: 'due', page: 1 });
                    }}
                    style={{
                        cursor: 'pointer',
                        padding: '14px 16px',
                        borderLeft: '4px solid #ef4444',
                        backgroundColor: summary.total_due_cents > 0 ? '#fff5f5' : '#fff',
                    }}
                    title={t('Click to view all outstanding payables')}
                >
                    <div style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 700, textTransform: 'uppercase' }}>
                        {t('Outstanding Due')}
                    </div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#dc2626', margin: '4px 0 2px' }}>
                        {money(summary.total_due_cents)}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#b91c1c' }}>
                        {summary.unpaid_count + summary.partial_count} {t('pending invoices')}
                    </div>
                </div>

                {/* Unpaid Count */}
                <div
                    className="card"
                    onClick={() => {
                        setQuery({ tab: 'all', payment_status: 'due', page: 1 });
                    }}
                    style={{
                        cursor: 'pointer',
                        padding: '14px 16px',
                        borderLeft: '4px solid #ea580c',
                    }}
                    title={t('Click to filter completely unpaid purchases')}
                >
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                        {t('Unpaid Purchases')}
                    </div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ea580c', margin: '4px 0 2px' }}>
                        {summary.unpaid_count}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{t('0% paid so far')}</div>
                </div>

                {/* Partially Paid */}
                <div
                    className="card"
                    onClick={() => {
                        setQuery({ tab: 'all', payment_status: 'partial', page: 1 });
                    }}
                    style={{
                        cursor: 'pointer',
                        padding: '14px 16px',
                        borderLeft: '4px solid #d97706',
                    }}
                    title={t('Click to filter partially paid purchases')}
                >
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                        {t('Partially Paid')}
                    </div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#d97706', margin: '4px 0 2px' }}>
                        {summary.partial_count}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{t('with partial balance')}</div>
                </div>

                {/* Overdue Payables */}
                <div
                    className="card"
                    style={{
                        padding: '14px 16px',
                        borderLeft: '4px solid #7c3aed',
                    }}
                >
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                        {t('Overdue (>30 Days)')}
                    </div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#7c3aed', margin: '4px 0 2px' }}>
                        {summary.overdue_count}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{t('due past 30 days')}</div>
                </div>
            </div>

            {/* TAB: Supplier Payables Summary */}
            {activeTab === 'suppliers' ? (
                <div className="card" style={{ padding: '20px' }}>
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '16px',
                            flexWrap: 'wrap',
                            gap: '12px',
                        }}
                    >
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.15rem' }}>{t('Supplier Accounts Payable Summary')}</h2>
                            <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                                {t('Reconciled outstanding balance and total purchases per supplier')}
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <div className="search-box" style={{ maxWidth: '280px' }}>
                                <input
                                    type="text"
                                    placeholder={t('Search supplier...')}
                                    value={supplierSearch}
                                    onChange={(e) => setQuery({ supplier_search: e.target.value })}
                                />
                            </div>
                            <label
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '0.88rem',
                                    cursor: 'pointer',
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={supplierDueOnly}
                                    onChange={(e) => setQuery({ supplier_due_only: e.target.checked })}
                                />
                                <span>{t('Show Due Only')}</span>
                            </label>
                        </div>
                    </div>

                    <div className="table-responsive">
                        <table className="grid">
                            <thead>
                                <tr>
                                    <th>{t('Supplier')}</th>
                                    <th>{t('Contact & Phone')}</th>
                                    <th style={{ textAlign: 'center' }}>{t('Purchases')}</th>
                                    <th style={{ textAlign: 'right' }}>{t('Total Invoiced')}</th>
                                    <th style={{ textAlign: 'right' }}>{t('Total Paid')}</th>
                                    <th style={{ textAlign: 'right' }}>{t('Outstanding Balance')}</th>
                                    <th>{t('Oldest Due Date')}</th>
                                    <th style={{ textAlign: 'center' }}>{t('Action')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isFetchingSuppliers ? (
                                    <tr>
                                        <td colSpan="8" style={{ textAlign: 'center', padding: '30px' }}>
                                            <span className="spinner" /> {t('Loading supplier payables...')}
                                        </td>
                                    </tr>
                                ) : (supplierPayablesData?.data || []).length === 0 ? (
                                    <tr>
                                        <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                                            {t('No suppliers found.')}
                                        </td>
                                    </tr>
                                ) : (
                                    (supplierPayablesData?.data || []).map((supplier) => (
                                        <tr key={supplier.id}>
                                            <td>
                                                <strong>{supplier.name}</strong>
                                                {supplier.company && (
                                                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                                        {supplier.company}
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <div>{supplier.phone || '—'}</div>
                                                {supplier.email && (
                                                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                                        {supplier.email}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span
                                                    style={{
                                                        padding: '2px 8px',
                                                        borderRadius: '10px',
                                                        backgroundColor: '#f1f5f9',
                                                        fontSize: '0.85rem',
                                                    }}
                                                >
                                                    {supplier.purchases_count}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>{money(supplier.total_grand_cents)}</td>
                                            <td style={{ textAlign: 'right', color: '#16a34a' }}>
                                                {money(supplier.total_paid_cents)}
                                            </td>
                                            <td
                                                style={{
                                                    textAlign: 'right',
                                                    fontWeight: 700,
                                                    color: supplier.total_due_cents > 0 ? '#dc2626' : '#16a34a',
                                                }}
                                            >
                                                {money(supplier.total_due_cents)}
                                            </td>
                                            <td>
                                                {supplier.oldest_due_date ? (
                                                    <span style={{ fontSize: '0.85rem', color: '#b91c1c' }}>
                                                        ⚠️ {supplier.oldest_due_date}
                                                    </span>
                                                ) : (
                                                    <span style={{ fontSize: '0.85rem', color: '#16a34a' }}>
                                                        ✓ Settled
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <button
                                                    className="btn btn-sm"
                                                    type="button"
                                                    onClick={() => {
                                                        setQuery({ tab: 'all', supplier_id: String(supplier.id), page: 1 }, { replace: false });
                                                    }}
                                                >
                                                    {t('View Purchases')}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* TAB: Purchases List View */
                <>
                    {/* Collapsible Filter Panel */}
                    {isFilterOpen && (
                        <div
                            className="card no-print"
                            style={{
                                padding: '16px 20px',
                                marginBottom: '16px',
                                backgroundColor: '#f8fafc',
                                border: '1px solid #cbd5e1',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '12px',
                                }}
                            >
                                <strong style={{ fontSize: '0.95rem' }}>🎯 {t('Filter Criteria')}</strong>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button className="btn btn-sm" type="button" onClick={handleResetFilters}>
                                        {t('Reset All Filters')}
                                    </button>
                                    <button
                                        className="btn btn-sm btn-primary"
                                        type="button"
                                        onClick={() => setIsFilterOpen(false)}
                                    >
                                        {t('Close Filters')}
                                    </button>
                                </div>
                            </div>

                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                                    gap: '12px',
                                }}
                            >
                                {/* Date Range Preset */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--muted)' }}>
                                        {t('Date Range')}
                                    </label>
                                    <select
                                        value={datePreset}
                                        onChange={(e) => {
                                            setQuery({ date_preset: e.target.value });
                                        }}
                                        style={{ width: '100%' }}
                                    >
                                        <option value="">{t('All Time')}</option>
                                        <option value="today">{t('Today')}</option>
                                        <option value="yesterday">{t('Yesterday')}</option>
                                        <option value="this_week">{t('This Week')}</option>
                                        <option value="this_month">{t('This Month')}</option>
                                        <option value="custom">{t('Custom Range')}</option>
                                    </select>
                                </div>

                                {/* From Date */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--muted)' }}>
                                        {t('From Date')}
                                    </label>
                                    <input
                                        type="date"
                                        value={from}
                                        onChange={(e) => {
                                            setQuery({ from: e.target.value, date_preset: 'custom' });
                                        }}
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                {/* To Date */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--muted)' }}>
                                        {t('To Date')}
                                    </label>
                                    <input
                                        type="date"
                                        value={to}
                                        onChange={(e) => {
                                            setQuery({ to: e.target.value, date_preset: 'custom' });
                                        }}
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                {/* Supplier Filter */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--muted)' }}>
                                        {t('Supplier')}
                                    </label>
                                    <select
                                        value={supplierId}
                                        onChange={(e) => {
                                            setQuery({ supplier_id: e.target.value });
                                        }}
                                        style={{ width: '100%' }}
                                    >
                                        <option value="">{t('All Suppliers')}</option>
                                        {filtersData.suppliers.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.name} {s.company ? `(${s.company})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Warehouse Filter */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--muted)' }}>
                                        {t('Warehouse')}
                                    </label>
                                    <select
                                        value={warehouseId}
                                        onChange={(e) => {
                                            setQuery({ warehouse_id: e.target.value });
                                        }}
                                        style={{ width: '100%' }}
                                    >
                                        <option value="">{t('All Warehouses')}</option>
                                        {filtersData.warehouses.map((w) => (
                                            <option key={w.id} value={w.id}>
                                                {w.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Purchase Status */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--muted)' }}>
                                        {t('Purchase Status')}
                                    </label>
                                    <select
                                        value={status}
                                        onChange={(e) => {
                                            setQuery({ status: e.target.value });
                                        }}
                                        style={{ width: '100%' }}
                                    >
                                        <option value="">{t('All Statuses')}</option>
                                        <option value="received">{t('Received')}</option>
                                        <option value="cancelled">{t('Cancelled')}</option>
                                    </select>
                                </div>

                                {/* Payment Status */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--muted)' }}>
                                        {t('Payment Status')}
                                    </label>
                                    <select
                                        value={paymentStatus}
                                        onChange={(e) => {
                                            setQuery({ payment_status: e.target.value });
                                        }}
                                        style={{ width: '100%' }}
                                    >
                                        <option value="">{t('All Payment Statuses')}</option>
                                        <option value="paid">{t('Fully Paid')}</option>
                                        <option value="partial">{t('Partially Paid')}</option>
                                        <option value="due">{t('Payable Due')}</option>
                                        <option value="overpaid">{t('Overpaid')}</option>
                                        <option value="cancelled">{t('Cancelled')}</option>
                                    </select>
                                </div>

                                {/* Min & Max Amount */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--muted)' }}>
                                        {t('Total Amount Range (BDT)')}
                                    </label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input
                                            type="number"
                                            placeholder={t('Min')}
                                            value={minAmount}
                                            onChange={(e) => setQuery({ min_amount: e.target.value })}
                                            style={{ width: '50%' }}
                                        />
                                        <input
                                            type="number"
                                            placeholder={t('Max')}
                                            value={maxAmount}
                                            onChange={(e) => setQuery({ max_amount: e.target.value })}
                                            style={{ width: '50%' }}
                                        />
                                    </div>
                                </div>

                                {/* Min & Max Due */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--muted)' }}>
                                        {t('Outstanding Due Range (BDT)')}
                                    </label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input
                                            type="number"
                                            placeholder={t('Min Due')}
                                            value={minDue}
                                            onChange={(e) => setQuery({ min_due: e.target.value })}
                                            style={{ width: '50%' }}
                                        />
                                        <input
                                            type="number"
                                            placeholder={t('Max Due')}
                                            value={maxDue}
                                            onChange={(e) => setQuery({ max_due: e.target.value })}
                                            style={{ width: '50%' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Search & Table Controls */}
                    <div
                        className="card"
                        style={{
                            padding: '16px 20px',
                            marginBottom: '16px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '12px',
                        }}
                    >
                        {/* Universal Search Box */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1', minWidth: '260px', maxWidth: '500px' }}>
                            <div className="search-box" style={{ width: '100%', position: 'relative' }}>
                                <input
                                    type="text"
                                    placeholder={t('Search reference, supplier, product, batch, status...')}
                                    value={search}
                                    onChange={(e) => onSearchChange(e.target.value)}
                                    style={{ paddingRight: search ? '32px' : '12px' }}
                                />
                                {search && (
                                    <button
                                        type="button"
                                        onClick={clearSearch}
                                        style={{
                                            position: 'absolute',
                                            right: '8px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'transparent',
                                            border: 0,
                                            cursor: 'pointer',
                                            color: '#64748b',
                                            fontSize: '1rem',
                                            fontWeight: 700,
                                        }}
                                        title={t('Clear search')}
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Page Size & Matching Results Counter */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '0.88rem', color: '#64748b' }}>
                                {t('Found')} <strong>{meta.total}</strong> {t('purchases')}
                            </span>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '0.82rem', color: '#64748b' }}>{t('Show:')}</span>
                                <select
                                    value={perPage}
                                    onChange={(e) => {
                                        setPerPage(Number(e.target.value));
                                    }}
                                    style={{
                                        padding: '4px 8px',
                                        borderRadius: '6px',
                                        border: '1px solid #cbd5e1',
                                        fontSize: '0.85rem',
                                    }}
                                >
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Purchases Table */}
                    <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                        <div className="table-responsive">
                            <table className="grid" data-tour="purchases-table" style={{ margin: 0 }}>
                                <thead>
                                    <tr>
                                        <th style={{ width: '48px', textAlign: 'center' }}>#</th>
                                        <th
                                            onClick={() => handleSort('reference')}
                                            style={{ cursor: 'pointer', userSelect: 'none' }}
                                        >
                                            {t('Reference')} {sortBy === 'reference' && (sortDirection === 'asc' ? '▲' : '▼')}
                                        </th>
                                        <th
                                            onClick={() => handleSort('purchased_on')}
                                            style={{ cursor: 'pointer', userSelect: 'none' }}
                                        >
                                            {t('Date')} {sortBy === 'purchased_on' && (sortDirection === 'asc' ? '▲' : '▼')}
                                        </th>
                                        <th
                                            onClick={() => handleSort('supplier')}
                                            style={{ cursor: 'pointer', userSelect: 'none' }}
                                        >
                                            {t('Supplier')} {sortBy === 'supplier' && (sortDirection === 'asc' ? '▲' : '▼')}
                                        </th>
                                        <th>{t('Warehouse')}</th>
                                        <th style={{ textAlign: 'center' }}>{t('Status')}</th>
                                        <th
                                            onClick={() => handleSort('grand_cents')}
                                            style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
                                        >
                                            {t('Total Amount')}{' '}
                                            {sortBy === 'grand_cents' && (sortDirection === 'asc' ? '▲' : '▼')}
                                        </th>
                                        <th
                                            onClick={() => handleSort('paid_cents')}
                                            style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
                                        >
                                            {t('Paid')}{' '}
                                            {sortBy === 'paid_cents' && (sortDirection === 'asc' ? '▲' : '▼')}
                                        </th>
                                        <th
                                            onClick={() => handleSort('due_cents')}
                                            style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
                                        >
                                            {t('Outstanding Due')}{' '}
                                            {sortBy === 'due_cents' && (sortDirection === 'asc' ? '▲' : '▼')}
                                        </th>
                                        <th style={{ textAlign: 'center' }}>{t('Payment Status')}</th>
                                        <th>{t('Created By')}</th>
                                        <th style={{ textAlign: 'center', width: '130px' }} className="no-print">
                                            {t('Actions')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isFetching ? (
                                        <tr>
                                            <td colSpan="12" style={{ textAlign: 'center', padding: '40px' }}>
                                                <span className="spinner" /> {t('Loading purchases...')}
                                            </td>
                                        </tr>
                                    ) : error ? (
                                        <tr>
                                            <td colSpan="12" style={{ textAlign: 'center', padding: '50px 20px', color: '#dc2626' }}>
                                                <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>⚠️</div>
                                                <strong style={{ fontSize: '1.1rem' }}>
                                                    {error.data?.message || t('Failed to load purchases.')}
                                                </strong>
                                                <p style={{ color: '#64748b', margin: '4px 0 14px' }}>
                                                    {t('An error occurred while fetching the purchase list.')}
                                                </p>
                                                <button className="btn btn-sm btn-primary" type="button" onClick={() => refetch()}>
                                                    ↺ {t('Retry')}
                                                </button>
                                            </td>
                                        </tr>
                                    ) : purchases.length === 0 ? (
                                        <tr>
                                            <td colSpan="12" style={{ textAlign: 'center', padding: '50px 20px' }}>
                                                <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🔍</div>
                                                <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>
                                                    {t('No purchases matching your criteria.')}
                                                </strong>
                                                <p style={{ color: '#64748b', margin: '4px 0 14px' }}>
                                                    {t('Try clearing search terms or resetting the filter options.')}
                                                </p>
                                                {activeFiltersCount > 0 && (
                                                    <button className="btn btn-sm btn-primary" type="button" onClick={handleResetFilters}>
                                                        {t('Reset Filters')}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ) : (
                                        purchases.map((purchase, index) => {
                                            const sl = (meta.current_page - 1) * perPage + index + 1;
                                            const isCancelled = purchase.status === 'cancelled';
                                            const isPaid = purchase.payment_status === 'paid';
                                            const isPartial = purchase.payment_status === 'partial';
                                            const isDue = purchase.payment_status === 'due';

                                            return (
                                                <tr
                                                    key={purchase.id}
                                                    style={{
                                                        backgroundColor: isCancelled ? '#f8fafc' : undefined,
                                                        opacity: isCancelled ? 0.75 : 1,
                                                    }}
                                                >
                                                    <td style={{ textAlign: 'center', color: '#64748b' }}>{sl}</td>

                                                    {/* Reference */}
                                                    <td>
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedPurchaseIdForDetail(purchase.id)}
                                                            style={{
                                                                background: 'transparent',
                                                                border: 0,
                                                                color: '#0284c7',
                                                                fontWeight: 700,
                                                                cursor: 'pointer',
                                                                padding: 0,
                                                                textAlign: 'left',
                                                            }}
                                                        >
                                                            {purchase.reference}
                                                        </button>
                                                        {purchase.items_count > 0 && (
                                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                                {purchase.items_count} {t('items')}
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Date */}
                                                    <td>{purchase.purchased_on || '—'}</td>

                                                    {/* Supplier */}
                                                    <td>
                                                        <strong>{purchase.supplier || t('General Supplier')}</strong>
                                                        {purchase.supplier_phone && (
                                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                                📞 {purchase.supplier_phone}
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Warehouse */}
                                                    <td>{purchase.warehouse || '—'}</td>

                                                    {/* Status */}
                                                    <td style={{ textAlign: 'center' }}>
                                                        <span
                                                            style={{
                                                                display: 'inline-block',
                                                                padding: '2px 8px',
                                                                borderRadius: '4px',
                                                                fontSize: '0.75rem',
                                                                fontWeight: 700,
                                                                textTransform: 'uppercase',
                                                                backgroundColor: isCancelled ? '#fee2e2' : '#dcfce7',
                                                                color: isCancelled ? '#b91c1c' : '#15803d',
                                                            }}
                                                        >
                                                            {purchase.status}
                                                        </span>
                                                    </td>

                                                    {/* Total Amount */}
                                                    <td style={{ textAlign: 'right', fontWeight: 700 }}>
                                                        {money(purchase.grand_cents)}
                                                    </td>

                                                    {/* Paid Amount */}
                                                    <td style={{ textAlign: 'right', color: '#16a34a' }}>
                                                        {money(purchase.paid_cents)}
                                                    </td>

                                                    {/* Outstanding Due */}
                                                    <td
                                                        style={{
                                                            textAlign: 'right',
                                                            fontWeight: 700,
                                                            color: purchase.due_cents > 0 && !isCancelled ? '#dc2626' : '#16a34a',
                                                        }}
                                                    >
                                                        {isCancelled ? (
                                                            <span style={{ color: '#64748b' }}>—</span>
                                                        ) : purchase.due_cents > 0 ? (
                                                            money(purchase.due_cents)
                                                        ) : (
                                                            <span style={{ color: '#16a34a' }}>✓ 0.00</span>
                                                        )}
                                                    </td>

                                                    {/* Payment Status Badge */}
                                                    <td style={{ textAlign: 'center' }}>
                                                        <span
                                                            style={{
                                                                display: 'inline-block',
                                                                padding: '3px 8px',
                                                                borderRadius: '999px',
                                                                fontSize: '0.72rem',
                                                                fontWeight: 700,
                                                                textTransform: 'uppercase',
                                                                backgroundColor: isCancelled
                                                                    ? '#f1f5f9'
                                                                    : isPaid
                                                                    ? '#dcfce7'
                                                                    : isPartial
                                                                    ? '#fef3c7'
                                                                    : '#fee2e2',
                                                                color: isCancelled
                                                                    ? '#64748b'
                                                                    : isPaid
                                                                    ? '#15803d'
                                                                    : isPartial
                                                                    ? '#b45309'
                                                                    : '#b91c1c',
                                                            }}
                                                        >
                                                            {purchase.payment_status}
                                                        </span>
                                                    </td>

                                                    {/* Created By */}
                                                    <td style={{ fontSize: '0.85rem' }}>{purchase.created_by || '—'}</td>

                                                    {/* Actions */}
                                                    <td style={{ textAlign: 'center' }} className="no-print">
                                                        <div style={{ display: 'inline-flex', gap: '4px' }}>
                                                            {/* View Details */}
                                                            <button
                                                                className="btn btn-sm"
                                                                type="button"
                                                                onClick={() => setSelectedPurchaseIdForDetail(purchase.id)}
                                                                title={t('View Purchase Details')}
                                                                style={{ padding: '4px 6px' }}
                                                            >
                                                                👁️
                                                            </button>

                                                            {/* Record Payment */}
                                                            {!isCancelled && purchase.due_cents > 0 && (
                                                                <button
                                                                    className="btn btn-sm"
                                                                    type="button"
                                                                    onClick={() => setPaymentModalPurchase(purchase)}
                                                                    title={t('Record Supplier Payment')}
                                                                    style={{
                                                                        padding: '4px 6px',
                                                                        backgroundColor: '#dcfce7',
                                                                        color: '#15803d',
                                                                        borderColor: '#86efac',
                                                                    }}
                                                                >
                                                                    💳
                                                                </button>
                                                            )}

                                                            {/* Print Invoice */}
                                                            <a
                                                                href={`/purchase/${purchase.id}/print?format=a4`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="btn btn-sm"
                                                                title={t('Print Invoice')}
                                                                style={{ padding: '4px 6px', textDecoration: 'none' }}
                                                            >
                                                                🖨️
                                                            </a>

                                                            {/* Cancel Purchase */}
                                                            {!isCancelled && (
                                                                <button
                                                                    className="btn btn-sm"
                                                                    type="button"
                                                                    onClick={() => handleCancel(purchase)}
                                                                    title={t('Cancel / Reverse Purchase')}
                                                                    style={{
                                                                        padding: '4px 6px',
                                                                        backgroundColor: '#fee2e2',
                                                                        color: '#b91c1c',
                                                                        borderColor: '#fca5a5',
                                                                    }}
                                                                >
                                                                    ✕
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Bar */}
                        <div
                            className="no-print"
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '12px 20px',
                                borderTop: '1px solid #e2e8f0',
                                backgroundColor: '#f8fafc',
                                flexWrap: 'wrap',
                                gap: '8px',
                            }}
                        >
                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                {t('Showing')} <strong>{meta.from || 0}</strong> {t('to')}{' '}
                                <strong>{meta.to || 0}</strong> {t('of')} <strong>{meta.total}</strong>{' '}
                                {t('purchases')}
                            </div>

                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                <button
                                    className="btn btn-sm"
                                    type="button"
                                    disabled={meta.current_page <= 1}
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                >
                                    ‹ {t('Prev')}
                                </button>
                                <span style={{ padding: '0 8px', fontSize: '0.85rem', fontWeight: 600 }}>
                                    {meta.current_page} / {meta.last_page || 1}
                                </span>
                                <button
                                    className="btn btn-sm"
                                    type="button"
                                    disabled={meta.current_page >= meta.last_page}
                                    onClick={() => setPage((p) => p + 1)}
                                >
                                    {t('Next')} ›
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* MODAL: Record Supplier Payment */}
            {paymentModalPurchase && (
                <RecordPaymentModal
                    purchase={paymentModalPurchase}
                    accounts={filtersData.accounts}
                    onClose={() => setPaymentModalPurchase(null)}
                    onSuccess={(updated) => {
                        setPaymentModalPurchase(null);
                        setNotification({
                            type: 'success',
                            text: t('Payment successfully recorded and account balance updated.'),
                        });
                        refetch();
                    }}
                />
            )}

            {/* MODAL / DRAWER: View Purchase Details */}
            {selectedPurchaseIdForDetail && (
                <PurchaseDetailDrawer
                    purchaseId={selectedPurchaseIdForDetail}
                    onClose={() => setSelectedPurchaseIdForDetail(null)}
                    onOpenPayment={(p) => {
                        setSelectedPurchaseIdForDetail(null);
                        setPaymentModalPurchase(p);
                    }}
                    onCancelSuccess={() => {
                        refetch();
                    }}
                />
            )}
        </section>
    );
}

/**
 * Record Payment Modal Component
 */
function RecordPaymentModal({ purchase, accounts, onClose, onSuccess }) {
    const t = useT();
    const [recordPayment, { isLoading }] = useRecordPurchasePaymentMutation();

    const dueAmount = purchase.due_cents / 100;
    const [amount, setAmount] = useState(dueAmount.toFixed(2));
    const [paymentMethod, setPaymentMethod] = useState(purchase.payment_method || 'Cash');
    const [accountId, setAccountId] = useState(accounts[0]?.id || '');
    const [paidAt, setPaidAt] = useState(new Date().toISOString().split('T')[0]);
    const [note, setNote] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    async function handleSubmit(e) {
        e.preventDefault();
        setErrorMessage('');

        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            setErrorMessage(t('Please enter a valid positive payment amount.'));
            return;
        }

        if (numericAmount > dueAmount + 0.001) {
            setErrorMessage(t('Payment amount cannot exceed the remaining due of ') + money(purchase.due_cents));
            return;
        }

        try {
            const res = await recordPayment({
                id: purchase.id,
                body: {
                    amount,
                    payment_method: paymentMethod,
                    account_id: accountId || null,
                    paid_at: paidAt,
                    note,
                },
            });

            if (res.error) {
                setErrorMessage(res.error.data?.message || t('Failed to record supplier payment.'));
            } else {
                onSuccess(res.data);
            }
        } catch (err) {
            setErrorMessage(t('An unexpected network error occurred.'));
        }
    }

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '16px',
            }}
        >
            <div
                className="card"
                style={{
                    width: '100%',
                    maxWidth: '480px',
                    padding: '24px',
                    backgroundColor: '#fff',
                    borderRadius: '12px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.25rem' }}>💳 {t('Record Supplier Payment')}</h2>
                        <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '2px' }}>
                            {t('Reference:')} <strong>#{purchase.reference}</strong> · {purchase.supplier || t('Supplier')}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{ background: 'transparent', border: 0, fontSize: '1.3rem', cursor: 'pointer', color: '#64748b' }}
                    >
                        ×
                    </button>
                </div>

                {/* Due status summary box */}
                <div
                    style={{
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '12px 14px',
                        marginBottom: '16px',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr',
                        gap: '8px',
                        textAlign: 'center',
                    }}
                >
                    <div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>{t('Total')}</div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{money(purchase.grand_cents)}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>{t('Paid')}</div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#16a34a' }}>
                            {money(purchase.paid_cents)}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.72rem', color: '#dc2626', textTransform: 'uppercase', fontWeight: 700 }}>
                            {t('Remaining Due')}
                        </div>
                        <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#dc2626' }}>
                            {money(purchase.due_cents)}
                        </div>
                    </div>
                </div>

                {errorMessage && (
                    <div
                        style={{
                            padding: '8px 12px',
                            backgroundColor: '#fee2e2',
                            color: '#991b1b',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            marginBottom: '14px',
                        }}
                    >
                        {errorMessage}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Amount */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t('Payment Amount (BDT) *')}</label>
                            <button
                                type="button"
                                onClick={() => setAmount(dueAmount.toFixed(2))}
                                style={{
                                    background: 'transparent',
                                    border: 0,
                                    color: '#0284c7',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                }}
                            >
                                {t('Pay Full Due')}
                            </button>
                        </div>
                        <input
                            type="number"
                            step="0.01"
                            max={dueAmount}
                            required
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            style={{
                                width: '100%',
                                fontSize: '1.05rem',
                                fontWeight: 700,
                            }}
                        />
                    </div>

                    {/* Payment Account */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                            {t('Paid From Account *')}
                        </label>
                        <select
                            value={accountId}
                            onChange={(e) => setAccountId(e.target.value)}
                            style={{ width: '100%' }}
                        >
                            {accounts.map((acc) => (
                                <option key={acc.id} value={acc.id}>
                                    {acc.name} {acc.account_number ? `(${acc.account_number})` : ''} - {acc.type}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Method & Date */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                                {t('Payment Method')}
                            </label>
                            <select
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                style={{ width: '100%' }}
                            >
                                <option value="Cash">{t('Cash')}</option>
                                <option value="Bank Transfer">{t('Bank Transfer')}</option>
                                <option value="bKash">{t('bKash')}</option>
                                <option value="Nagad">{t('Nagad')}</option>
                                <option value="Card">{t('Card')}</option>
                                <option value="Cheque">{t('Cheque')}</option>
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                                {t('Payment Date')}
                            </label>
                            <input
                                type="date"
                                value={paidAt}
                                onChange={(e) => setPaidAt(e.target.value)}
                                style={{ width: '100%' }}
                            />
                        </div>
                    </div>

                    {/* Note */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                            {t('Notes / Reference')}
                        </label>
                        <input
                            type="text"
                            placeholder={t('e.g. Cheque # or Bank Txn ID')}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            style={{ width: '100%' }}
                        />
                    </div>

                    {/* Submit buttons */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                        <button className="btn" type="button" onClick={onClose} disabled={isLoading}>
                            {t('Cancel')}
                        </button>
                        <button className="btn btn-primary" type="submit" disabled={isLoading}>
                            {isLoading ? t('Recording Payment...') : t('Save Payment')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/**
 * Purchase Details Drawer / Modal Component
 */
function PurchaseDetailDrawer({ purchaseId, onClose, onOpenPayment, onCancelSuccess }) {
    const t = useT();
    const { data, isFetching } = useGetPurchaseQuery(purchaseId);
    const { data: historyData } = useGetPurchaseHistoryQuery(purchaseId);
    const [cancelPurchase, { isLoading: isCancelling }] = useCancelPurchaseMutation();
    const [tab, setTab] = useState('items'); // 'items' | 'payments' | 'history'

    const purchase = data?.purchase;

    async function handleCancel() {
        if (!purchase || purchase.status === 'cancelled') return;
        const reason = window.prompt(t('Enter reason for cancelling / reversing this purchase:'), 'Purchase cancelled by manager');
        if (reason === null) return;
        const res = await cancelPurchase({ id: purchase.id, reason: reason || 'Purchase cancelled' });
        if (res.error) {
            alert(res.error.data?.message || t('Could not cancel purchase. Check available stock.'));
        } else {
            alert(t('Purchase cancelled and stock/ledger successfully reversed.'));
            onCancelSuccess?.();
            onClose();
        }
    }

    if (!purchase && isFetching) {
        return (
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                }}
            >
                <div className="card" style={{ padding: '30px', textAlign: 'center' }}>
                    <span className="spinner" /> {t('Loading purchase details...')}
                </div>
            </div>
        );
    }

    if (!purchase) return null;

    const isCancelled = purchase.status === 'cancelled';

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '16px',
            }}
        >
            <div
                className="card"
                style={{
                    width: '100%',
                    maxWidth: '850px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    padding: '24px',
                    backgroundColor: '#fff',
                    borderRadius: '12px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                }}
            >
                {/* Header */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        borderBottom: '1px solid #e2e8f0',
                        paddingBottom: '16px',
                        marginBottom: '16px',
                    }}
                >
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{purchase.reference}</h2>
                            <span
                                style={{
                                    display: 'inline-block',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    backgroundColor: isCancelled ? '#fee2e2' : '#dcfce7',
                                    color: isCancelled ? '#b91c1c' : '#15803d',
                                }}
                            >
                                {purchase.status}
                            </span>
                            <span
                                style={{
                                    display: 'inline-block',
                                    padding: '2px 8px',
                                    borderRadius: '999px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    backgroundColor:
                                        purchase.payment_status === 'paid'
                                            ? '#dcfce7'
                                            : purchase.payment_status === 'partial'
                                            ? '#fef3c7'
                                            : '#fee2e2',
                                    color:
                                        purchase.payment_status === 'paid'
                                            ? '#15803d'
                                            : purchase.payment_status === 'partial'
                                            ? '#b45309'
                                            : '#b91c1c',
                                }}
                            >
                                {purchase.payment_status}
                            </span>
                        </div>
                        <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '4px' }}>
                            {t('Date:')} {purchase.purchased_on} · {t('Warehouse:')} {purchase.warehouse?.name || 'Main'} ·{' '}
                            {t('Created By:')} {purchase.user?.name || 'Admin'}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <a
                            href={`/purchase/${purchase.id}/print?format=a4`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-sm"
                            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                            <span>🖨️</span> A4 Invoice
                        </a>
                        <a
                            href={`/purchase/${purchase.id}/print?format=pos`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-sm"
                            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                            <span>🧾</span> 80mm POS
                        </a>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                background: 'transparent',
                                border: 0,
                                fontSize: '1.4rem',
                                cursor: 'pointer',
                                color: '#64748b',
                                marginLeft: '6px',
                            }}
                        >
                            ×
                        </button>
                    </div>
                </div>

                {/* Supplier & Financial Overview Cards */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                        gap: '12px',
                        marginBottom: '18px',
                    }}
                >
                    <div style={{ backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                            {t('Supplier Information')}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', marginTop: '2px' }}>
                            {purchase.supplier?.name || t('General Supplier')}
                        </div>
                        {purchase.supplier?.company && (
                            <div style={{ fontSize: '0.8rem', color: '#475569' }}>🏢 {purchase.supplier.company}</div>
                        )}
                        {purchase.supplier?.phone && (
                            <div style={{ fontSize: '0.8rem', color: '#475569' }}>📞 {purchase.supplier.phone}</div>
                        )}
                        {purchase.supplier?.address && (
                            <div style={{ fontSize: '0.8rem', color: '#475569' }}>📍 {purchase.supplier.address}</div>
                        )}
                    </div>

                    <div style={{ backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                            {t('Financial Summary')}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginTop: '4px' }}>
                            <span>{t('Grand Total:')}</span>
                            <strong>{money(purchase.grand_cents)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginTop: '2px' }}>
                            <span>{t('Paid Amount:')}</span>
                            <span style={{ color: '#16a34a', fontWeight: 600 }}>{money(purchase.paid_cents)}</span>
                        </div>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '0.92rem',
                                marginTop: '4px',
                                borderTop: '1px solid #cbd5e1',
                                paddingTop: '4px',
                            }}
                        >
                            <span style={{ fontWeight: 700, color: purchase.due_cents > 0 ? '#dc2626' : '#16a34a' }}>
                                {t('Outstanding Due:')}
                            </span>
                            <strong style={{ color: purchase.due_cents > 0 ? '#dc2626' : '#16a34a' }}>
                                {money(purchase.due_cents)}
                            </strong>
                        </div>
                    </div>
                </div>

                {/* Sub-tabs: Items, Payments, History */}
                <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid #cbd5e1', marginBottom: '14px' }}>
                    <button
                        type="button"
                        onClick={() => setTab('items')}
                        style={{
                            padding: '8px 14px',
                            background: 'transparent',
                            border: 0,
                            borderBottom: tab === 'items' ? '2px solid #0284c7' : '2px solid transparent',
                            color: tab === 'items' ? '#0284c7' : '#64748b',
                            fontWeight: tab === 'items' ? 700 : 500,
                            cursor: 'pointer',
                        }}
                    >
                        📦 {t('Purchased Items')} ({purchase.items?.length || 0})
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab('payments')}
                        style={{
                            padding: '8px 14px',
                            background: 'transparent',
                            border: 0,
                            borderBottom: tab === 'payments' ? '2px solid #0284c7' : '2px solid transparent',
                            color: tab === 'payments' ? '#0284c7' : '#64748b',
                            fontWeight: tab === 'payments' ? 700 : 500,
                            cursor: 'pointer',
                        }}
                    >
                        💳 {t('Payment History')} ({purchase.payments?.length || 0})
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab('history')}
                        style={{
                            padding: '8px 14px',
                            background: 'transparent',
                            border: 0,
                            borderBottom: tab === 'history' ? '2px solid #0284c7' : '2px solid transparent',
                            color: tab === 'history' ? '#0284c7' : '#64748b',
                            fontWeight: tab === 'history' ? 700 : 500,
                            cursor: 'pointer',
                        }}
                    >
                        🕒 {t('Audit & Event Logs')}
                    </button>
                </div>

                {/* Tab: Items */}
                {tab === 'items' && (
                    <div className="table-responsive">
                        <table className="grid">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>{t('Product Name')}</th>
                                    <th>{t('Batch / Expiry')}</th>
                                    <th style={{ textAlign: 'center' }}>{t('Qty')}</th>
                                    <th style={{ textAlign: 'right' }}>{t('Cost')}</th>
                                    <th style={{ textAlign: 'right' }}>{t('Subtotal')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(purchase.items || []).map((item, idx) => (
                                    <tr key={item.id || idx}>
                                        <td>{idx + 1}</td>
                                        <td>
                                            <strong>{item.product_name}</strong>
                                            {item.product_code && (
                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                    SKU: {item.product_code}
                                                </div>
                                            )}
                                            {item.serial && (
                                                <div style={{ fontSize: '0.75rem', color: '#0284c7' }}>
                                                    S/N: {item.serial}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            {item.batch_no ? (
                                                <div>
                                                    <strong>{item.batch_no}</strong>
                                                    {item.expiry_date && (
                                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                            Exp: {item.expiry_date}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                '—'
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>{item.qty}</td>
                                        <td style={{ textAlign: 'right' }}>{money(item.cost_cents)}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{money(item.subtotal_cents)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Tab: Payments */}
                {tab === 'payments' && (
                    <div>
                        {(purchase.payments || []).length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>
                                {t('No payments recorded for this purchase yet.')}
                            </p>
                        ) : (
                            <table className="grid">
                                <thead>
                                    <tr>
                                        <th>{t('Date & Time')}</th>
                                        <th>{t('Method')}</th>
                                        <th>{t('Account')}</th>
                                        <th>{t('Staff')}</th>
                                        <th style={{ textAlign: 'right' }}>{t('Amount')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {purchase.payments.map((pmt) => (
                                        <tr key={pmt.id}>
                                            <td>{pmt.paid_at}</td>
                                            <td>{pmt.method}</td>
                                            <td>{pmt.account || 'Main Cash'}</td>
                                            <td>{pmt.user || 'Admin'}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                                                {money(pmt.amount_cents)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {/* Tab: Audit History */}
                {tab === 'history' && (
                    <div>
                        {(historyData?.history || []).length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>
                                {t('No audit event logs found for this purchase.')}
                            </p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {historyData.history.map((ev) => (
                                    <div
                                        key={ev.id}
                                        style={{
                                            padding: '10px 14px',
                                            backgroundColor: '#f8fafc',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '6px',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <div>
                                            <strong style={{ color: '#0f172a' }}>{ev.action}</strong>
                                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                                {t('By:')} {ev.user} · {ev.created_at}
                                            </div>
                                            {ev.details && (
                                                <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '2px' }}>
                                                    {Object.entries(ev.details)
                                                        .map(([k, v]) => `${k}: ${v}`)
                                                        .join(' | ')}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Footer Actions */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderTop: '1px solid #e2e8f0',
                        paddingTop: '16px',
                        marginTop: '20px',
                    }}
                >
                    <div>
                        {!isCancelled && (
                            <button
                                className="btn"
                                type="button"
                                disabled={isCancelling}
                                onClick={handleCancel}
                                style={{
                                    backgroundColor: '#fee2e2',
                                    color: '#b91c1c',
                                    borderColor: '#fca5a5',
                                }}
                            >
                                {isCancelling ? t('Cancelling...') : t('Cancel / Reverse Purchase')}
                            </button>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {!isCancelled && purchase.due_cents > 0 && (
                            <button
                                className="btn btn-primary"
                                type="button"
                                onClick={() => onOpenPayment(purchase)}
                            >
                                💳 {t('Record Payment')}
                            </button>
                        )}
                        <button className="btn" type="button" onClick={onClose}>
                            {t('Close')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
