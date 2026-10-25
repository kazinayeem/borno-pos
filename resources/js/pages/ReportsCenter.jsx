import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams, Link } from 'react-router-dom';
import { money } from '../api';
import { useT } from '../i18n';
import { useGetReportsCenterQuery } from '../services/bornoposApi';

const tabs = [
    ['sales', '📊 Sales Reports'],
    ['inventory', '📦 Inventory Reports'],
    ['financial', '💳 Financial Reports'],
    ['staff', '👥 Staff Reports'],
    ['parties', '🤝 Customer & Supplier Reports'],
];

const ranges = [
    ['today', 'Today'],
    ['yesterday', 'Yesterday'],
    ['this_week', 'This Week'],
    ['last_week', 'Last Week'],
    ['this_month', 'This Month'],
    ['last_month', 'Last Month'],
    ['this_year', 'This Year'],
];

export default function ReportsCenter() {
    const t = useT();
    const user = useSelector((state) => state.session.user);
    const [params, setParams] = useSearchParams();

    const activeTab = params.get('tab') || 'sales';
    const type = params.get('type') || 'this_month';
    const staffId = params.get('staff_id') || '';
    const customerId = params.get('customer_id') || '';
    const categoryId = params.get('category_id') || '';
    const warehouseId = params.get('warehouse_id') || '';
    const from = params.get('from') || '';
    const to = params.get('to') || '';

    const { data: res, isFetching: loading, refetch } = useGetReportsCenterQuery({
        tab: activeTab,
        type,
        from,
        to,
        staff_id: staffId,
        customer_id: customerId,
        category_id: categoryId,
        warehouse_id: warehouseId,
    });

    const report = res?.data || {};
    const lookups = res?.lookups || {};
    const canViewAllStaff = res?.can_view_all_staff ?? (user?.role === 'owner' || user?.role === 'super_admin' || user?.role === 'admin');

    function updateFilter(updates) {
        const next = new URLSearchParams(params);
        Object.entries(updates).forEach(([k, v]) => {
            if (v === '' || v === null || v === undefined) next.delete(k);
            else next.set(k, v);
        });
        setParams(next);
    }

    function exportCsv() {
        const queryParams = new URLSearchParams({
            tab: activeTab,
            type,
            from: from || res?.from || '',
            to: to || res?.to || '',
            staff_id: staffId,
            customer_id: customerId,
            category_id: categoryId,
            warehouse_id: warehouseId,
        });
        window.open(`/api/reports/export?${queryParams.toString()}`, '_blank');
    }

    return (
        <div data-tour="reports-center">
            {/* Header */}
            <div className="page-title" style={{ flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1>{t('Advanced Reports Center')}</h1>
                    <div className="muted">
                        {t('Comprehensive sales, inventory, financial, and staff performance analytics.')}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button
                        type="button"
                        className="btn"
                        onClick={() => window.print()}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                        <span>🖨️</span> {t('Print / PDF')}
                    </button>
                    <button
                        type="button"
                        className="btn primary"
                        onClick={exportCsv}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                        <span>📥</span> {t('Export CSV')}
                    </button>
                </div>
            </div>

            {/* Category Navigation Tabs */}
            <div
                style={{
                    display: 'flex',
                    gap: '8px',
                    overflowX: 'auto',
                    borderBottom: '1px solid var(--border)',
                    paddingBottom: '12px',
                    marginBottom: '20px',
                }}
            >
                {tabs.map(([key, label]) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => updateFilter({ tab: key })}
                        style={{
                            padding: '10px 18px',
                            fontSize: '13px',
                            fontWeight: 700,
                            borderRadius: '10px',
                            border: '1px solid',
                            borderColor: activeTab === key ? 'var(--blue)' : 'var(--border)',
                            background: activeTab === key ? 'var(--blue)' : 'var(--card)',
                            color: activeTab === key ? '#fff' : 'var(--fg)',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            boxShadow: activeTab === key ? '0 2px 8px rgba(47, 128, 237, 0.25)' : 'none',
                            transition: 'all 0.15s ease',
                        }}
                    >
                        {t(label)}
                    </button>
                ))}
            </div>

            {/* Filter Toolbar */}
            {activeTab !== 'inventory' && activeTab !== 'parties' && (
                <section
                    className="card"
                    style={{
                        padding: '16px 20px',
                        marginBottom: '24px',
                        background: 'var(--card-head)',
                        border: '1px solid var(--border)',
                    }}
                >
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
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

                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                const fd = new FormData(e.currentTarget);
                                updateFilter({
                                    from: fd.get('from'),
                                    to: fd.get('to'),
                                    staff_id: fd.get('staff_id'),
                                    category_id: fd.get('category_id'),
                                });
                            }}
                            style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}
                        >
                            <input
                                type="date"
                                name="from"
                                defaultValue={from || res?.from || ''}
                                style={{ padding: '6px 10px', fontSize: '13px' }}
                            />
                            <span>–</span>
                            <input
                                type="date"
                                name="to"
                                defaultValue={to || res?.to || ''}
                                style={{ padding: '6px 10px', fontSize: '13px' }}
                            />

                            {canViewAllStaff && activeTab === 'sales' && (
                                <select
                                    name="staff_id"
                                    defaultValue={staffId}
                                    style={{ padding: '6px 10px', fontSize: '13px' }}
                                >
                                    <option value="">{t('All Staff')}</option>
                                    {(lookups.staff || []).map((s) => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            )}

                            <button className="btn primary small" type="submit">
                                {t('Filter')}
                            </button>
                            {(from || to || staffId || categoryId) && (
                                <button
                                    className="btn small"
                                    type="button"
                                    onClick={() => updateFilter({ from: '', to: '', staff_id: '', category_id: '' })}
                                >
                                    {t('Reset')}
                                </button>
                            )}
                        </form>
                    </div>
                </section>
            )}

            {/* TAB 1: SALES REPORTS */}
            {activeTab === 'sales' && (
                <>
                    {/* Summary Metric Cards */}
                    <div className="kpis" style={{ marginBottom: '24px' }}>
                        <article className="kpi">
                            <div className="label">{t('Total Gross Sales')}</div>
                            <strong>{money(report.summary?.total_revenue_cents || 0)}</strong>
                            <em>{res?.label}</em>
                        </article>
                        <article className="kpi">
                            <div className="label">{t('Sales Returns')}</div>
                            <strong style={{ color: '#ef4444' }}>{money(report.summary?.total_returns_cents || 0)}</strong>
                            <em>{t('Refunded')}</em>
                        </article>
                        <article className="kpi">
                            <div className="label">{t('Net Sales')}</div>
                            <strong style={{ color: '#16a34a' }}>{money(report.summary?.net_sales_cents || 0)}</strong>
                            <em>{t('Revenue after returns')}</em>
                        </article>
                        <article className="kpi">
                            <div className="label">{t('Total Discounts')}</div>
                            <strong>{money(report.summary?.total_discount_cents || 0)}</strong>
                            <em>{t('Coupon & Order')}</em>
                        </article>
                    </div>

                    {/* Staff Breakdown Table */}
                    {report.staff_breakdown?.length > 0 && (
                        <section className="card gap">
                            <div className="card-head">
                                <h2>👥 {t('Sales Performance by Staff Member')}</h2>
                            </div>
                            <table>
                                <thead>
                                    <tr>
                                        <th>{t('Staff Member')}</th>
                                        <th>{t('Role')}</th>
                                        <th style={{ textAlign: 'right' }}>{t('Invoices')}</th>
                                        <th style={{ textAlign: 'right' }}>{t('Total Sales')}</th>
                                        <th style={{ textAlign: 'right' }}>{t('Average Order')}</th>
                                        <th style={{ textAlign: 'right' }}>{t('Discounts Given')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {report.staff_breakdown.map((s) => (
                                        <tr key={s.staff_id}>
                                            <td><strong>{s.staff_name}</strong></td>
                                            <td><span className="badge">{s.role_title}</span></td>
                                            <td style={{ textAlign: 'right' }}>{s.transactions}</td>
                                            <td style={{ textAlign: 'right' }}><strong>{money(s.total_cents)}</strong></td>
                                            <td style={{ textAlign: 'right' }}>{money(s.avg_cents)}</td>
                                            <td style={{ textAlign: 'right' }}>{money(s.discount_cents)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </section>
                    )}

                    {/* Recent Invoices Table */}
                    <section className="card gap">
                        <div className="card-head">
                            <h2>🧾 {t('Invoices and Transactions')}</h2>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>{t('Invoice No')}</th>
                                        <th>{t('Date & Time')}</th>
                                        <th>{t('Customer')}</th>
                                        <th>{t('Staff')}</th>
                                        <th>{t('Payment Method')}</th>
                                        <th style={{ textAlign: 'right' }}>{t('Total')}</th>
                                        <th style={{ textAlign: 'right' }}>{t('Paid')}</th>
                                        <th style={{ textAlign: 'right' }}>{t('Due')}</th>
                                        <th>{t('Status')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(report.recent_invoices || []).map((row) => (
                                        <tr key={row.id}>
                                            <td>
                                                <Link to={`/sales/${row.id}`} style={{ fontWeight: 700 }}>
                                                    {row.invoice_no}
                                                </Link>
                                            </td>
                                            <td>{row.date}</td>
                                            <td>{row.customer}</td>
                                            <td>{row.staff}</td>
                                            <td>{row.payment_method}</td>
                                            <td style={{ textAlign: 'right' }}><strong>{money(row.grand_cents)}</strong></td>
                                            <td style={{ textAlign: 'right' }}>{money(row.paid_cents)}</td>
                                            <td style={{ textAlign: 'right', color: row.due_cents > 0 ? '#ef4444' : 'inherit' }}>
                                                {money(row.due_cents)}
                                            </td>
                                            <td><span className="badge ok">{row.status}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </>
            )}

            {/* TAB 2: INVENTORY REPORTS */}
            {activeTab === 'inventory' && (
                <>
                    <div className="kpis" style={{ marginBottom: '24px' }}>
                        <article className="kpi">
                            <div className="label">{t('Total Inventory Valuation (Cost)')}</div>
                            <strong>{money(report.summary?.cost_valuation_cents || 0)}</strong>
                            <em>{report.summary?.total_units_in_stock || 0} {t('units in stock')}</em>
                        </article>
                        <article className="kpi">
                            <div className="label">{t('Retail Valuation (Price)')}</div>
                            <strong style={{ color: '#2563eb' }}>{money(report.summary?.retail_valuation_cents || 0)}</strong>
                            <em>{t('Potential Profit')}: {money(report.summary?.potential_profit_cents || 0)}</em>
                        </article>
                        <article className="kpi">
                            <div className="label">{t('Low Stock Alerts')}</div>
                            <strong style={{ color: '#f59e0b' }}>{report.summary?.low_stock_count || 0}</strong>
                            <em>{t('Below threshold')}</em>
                        </article>
                        <article className="kpi">
                            <div className="label">{t('Out of Stock')}</div>
                            <strong style={{ color: '#ef4444' }}>{report.summary?.out_of_stock_count || 0}</strong>
                            <em>{t('Zero stock products')}</em>
                        </article>
                    </div>

                    <div className="grid-2">
                        {/* Low Stock Items */}
                        <section className="card">
                            <div className="card-head">
                                <h2>⚠️ {t('Low Stock Products')}</h2>
                            </div>
                            <table>
                                <thead>
                                    <tr>
                                        <th>{t('Product')}</th>
                                        <th>{t('Category')}</th>
                                        <th style={{ textAlign: 'right' }}>{t('Stock')}</th>
                                        <th style={{ textAlign: 'right' }}>{t('Alert Qty')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(report.low_stock_items || []).map((p) => (
                                        <tr key={p.id}>
                                            <td>
                                                <Link to={`/products/${p.id}/edit`}><strong>{p.name}</strong></Link>
                                                <div className="muted" style={{ fontSize: '11px' }}>{p.code}</div>
                                            </td>
                                            <td>{p.category}</td>
                                            <td style={{ textAlign: 'right', color: '#f59e0b', fontWeight: 700 }}>{p.current_stock}</td>
                                            <td style={{ textAlign: 'right' }}>{p.alert_threshold}</td>
                                        </tr>
                                    ))}
                                    {(!report.low_stock_items || report.low_stock_items.length === 0) && (
                                        <tr><td colSpan="4" className="empty">{t('No low stock items')}</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </section>

                        {/* Out of Stock Items */}
                        <section className="card">
                            <div className="card-head">
                                <h2>🚫 {t('Out of Stock Products')}</h2>
                            </div>
                            <table>
                                <thead>
                                    <tr>
                                        <th>{t('Product')}</th>
                                        <th>{t('Category')}</th>
                                        <th style={{ textAlign: 'right' }}>{t('Price')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(report.out_of_stock_items || []).map((p) => (
                                        <tr key={p.id}>
                                            <td>
                                                <Link to={`/products/${p.id}/edit`}><strong>{p.name}</strong></Link>
                                                <div className="muted" style={{ fontSize: '11px' }}>{p.code}</div>
                                            </td>
                                            <td>{p.category}</td>
                                            <td style={{ textAlign: 'right' }}>{money(p.price_cents)}</td>
                                        </tr>
                                    ))}
                                    {(!report.out_of_stock_items || report.out_of_stock_items.length === 0) && (
                                        <tr><td colSpan="3" className="empty">{t('No out of stock items')}</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </section>
                    </div>

                    {/* Stock Movements Audit Trail */}
                    <section className="card gap">
                        <div className="card-head">
                            <h2>📦 {t('Stock Movement History')}</h2>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th>{t('Date')}</th>
                                    <th>{t('Product')}</th>
                                    <th>{t('Reason')}</th>
                                    <th style={{ textAlign: 'right' }}>{t('Change')}</th>
                                    <th style={{ textAlign: 'right' }}>{t('Balance After')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(report.stock_movements || []).map((m) => (
                                    <tr key={m.id}>
                                        <td>{m.date}</td>
                                        <td><strong>{m.product_name}</strong></td>
                                        <td><span className="badge">{m.reason}</span></td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, color: m.change > 0 ? '#16a34a' : '#ef4444' }}>
                                            {m.change > 0 ? `+${m.change}` : m.change}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>{m.balance_after}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>
                </>
            )}

            {/* TAB 3: FINANCIAL REPORTS */}
            {activeTab === 'financial' && (
                <>
                    <div className="grid-2">
                        {/* Income Statement */}
                        <section className="card">
                            <div className="card-head">
                                <h2>💳 {t('Income Statement (Profit & Loss)')}</h2>
                                <span className="muted">{res?.label}</span>
                            </div>
                            <table className="statement">
                                <tbody>
                                    <tr>
                                        <td>{t('Gross Sales')}</td>
                                        <td style={{ textAlign: 'right' }}><strong>{money(report.income_statement?.gross_sales_cents || 0)}</strong></td>
                                    </tr>
                                    <tr>
                                        <td style={{ color: '#ef4444' }}>↳ {t('Less: Sales Returns & Refunds')}</td>
                                        <td style={{ textAlign: 'right', color: '#ef4444' }}>- {money(report.income_statement?.sales_return_cents || 0)}</td>
                                    </tr>
                                    <tr>
                                        <td>↳ {t('Less: Sales Tax Collected')}</td>
                                        <td style={{ textAlign: 'right' }}>- {money(report.income_statement?.sales_tax_cents || 0)}</td>
                                    </tr>
                                    <tr style={{ background: 'var(--card-head)', fontWeight: 700 }}>
                                        <td>{t('Net Sales Revenue')}</td>
                                        <td style={{ textAlign: 'right' }}>{money(report.income_statement?.net_sales_cents || 0)}</td>
                                    </tr>
                                    <tr>
                                        <td>{t('Cost of Goods Sold (COGS)')}</td>
                                        <td style={{ textAlign: 'right', color: '#ef4444' }}>- {money(report.income_statement?.cost_of_goods_sold_cents || 0)}</td>
                                    </tr>
                                    <tr style={{ background: 'var(--card-head)', fontWeight: 800 }}>
                                        <td>{t('Gross Profit')}</td>
                                        <td style={{ textAlign: 'right', color: '#16a34a' }}>
                                            {money(report.income_statement?.gross_profit_cents || 0)} ({report.income_statement?.gross_margin_percent || 0}%)
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>{t('Operating Expenses')}</td>
                                        <td style={{ textAlign: 'right', color: '#ef4444' }}>- {money(report.income_statement?.operating_expenses_cents || 0)}</td>
                                    </tr>
                                    <tr>
                                        <td>{t('Employee Salaries & Payroll')}</td>
                                        <td style={{ textAlign: 'right', color: '#ef4444' }}>- {money(report.income_statement?.salary_costs_cents || 0)}</td>
                                    </tr>
                                    <tr style={{ background: 'var(--blue)', color: '#fff', fontWeight: 800 }}>
                                        <td>{t('Net Profit')}</td>
                                        <td style={{ textAlign: 'right', fontSize: '16px' }}>
                                            {money(report.income_statement?.net_profit_cents || 0)} ({report.income_statement?.net_margin_percent || 0}%)
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </section>

                        {/* Balance Summary & Expenses by Category */}
                        <div>
                            <section className="card" style={{ marginBottom: '20px' }}>
                                <div className="card-head">
                                    <h2>⚖️ {t('Accounts Balances Summary')}</h2>
                                </div>
                                <table>
                                    <tbody>
                                        <tr>
                                            <td>{t('Total Customer Receivables (Outstanding Dues)')}</td>
                                            <td style={{ textAlign: 'right', color: '#f59e0b', fontWeight: 700 }}>
                                                {money(report.balance_summary?.customer_receivables_cents || 0)}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>{t('Total Supplier Payables (Purchase Dues)')}</td>
                                            <td style={{ textAlign: 'right', color: '#ef4444', fontWeight: 700 }}>
                                                {money(report.balance_summary?.supplier_payables_cents || 0)}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </section>

                            <section className="card">
                                <div className="card-head">
                                    <h2>📑 {t('Expenses by Category')}</h2>
                                </div>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>{t('Category')}</th>
                                            <th style={{ textAlign: 'right' }}>{t('Amount')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(report.expense_categories || []).map((ec) => (
                                            <tr key={ec.name}>
                                                <td>{ec.name}</td>
                                                <td style={{ textAlign: 'right' }}><strong>{money(ec.amount_cents)}</strong></td>
                                            </tr>
                                        ))}
                                        {(!report.expense_categories || report.expense_categories.length === 0) && (
                                            <tr><td colSpan="2" className="empty">{t('No expenses recorded in this period')}</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </section>
                        </div>
                    </div>
                </>
            )}

            {/* TAB 4: STAFF REPORTS */}
            {activeTab === 'staff' && (
                <>
                    <section className="card gap">
                        <div className="card-head">
                            <h2>👥 {t('Staff Performance Analytics')}</h2>
                            <span className="muted">{res?.label}</span>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>{t('Staff Member')}</th>
                                        <th>{t('Role')}</th>
                                        <th>{t('Status')}</th>
                                        <th style={{ textAlign: 'right' }}>{t('Transactions')}</th>
                                        <th style={{ textAlign: 'right' }}>{t('Total Revenue')}</th>
                                        <th style={{ textAlign: 'right' }}>{t('Avg Ticket')}</th>
                                        <th style={{ textAlign: 'right' }}>{t('Discounts')}</th>
                                        <th style={{ textAlign: 'right' }}>{t('Returns')}</th>
                                        <th>{t('Last Active')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(report.staff_members || []).map((s) => (
                                        <tr key={s.id}>
                                            <td>
                                                <strong>{s.name}</strong>
                                                <div className="muted" style={{ fontSize: '11px' }}>{s.email}</div>
                                            </td>
                                            <td><span className="badge">{s.role_title}</span></td>
                                            <td><span className={`badge ${s.is_active ? 'ok' : 'bad'}`}>{s.is_active ? 'Active' : 'Inactive'}</span></td>
                                            <td style={{ textAlign: 'right' }}>{s.transactions_count}</td>
                                            <td style={{ textAlign: 'right' }}><strong style={{ color: '#2563eb' }}>{money(s.total_sales_cents)}</strong></td>
                                            <td style={{ textAlign: 'right' }}>{money(s.average_sale_cents)}</td>
                                            <td style={{ textAlign: 'right' }}>{money(s.discounts_given_cents)}</td>
                                            <td style={{ textAlign: 'right', color: s.returns_total_cents > 0 ? '#ef4444' : 'inherit' }}>
                                                {money(s.returns_total_cents)} ({s.returns_count})
                                            </td>
                                            <td>{s.last_login_at || t('Never')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Audit Trail History */}
                    <section className="card gap">
                        <div className="card-head">
                            <h2>🛡️ {t('Staff & RBAC Audit History')}</h2>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th>{t('Timestamp')}</th>
                                    <th>{t('Actor')}</th>
                                    <th>{t('Action')}</th>
                                    <th>{t('Target')}</th>
                                    <th>{t('IP Address')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(report.recent_audits || []).map((log) => (
                                    <tr key={log.id}>
                                        <td>{log.date}</td>
                                        <td><strong>{log.actor}</strong></td>
                                        <td><span className="badge ok">{log.action}</span></td>
                                        <td>{log.target}</td>
                                        <td><code>{log.ip || '127.0.0.1'}</code></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>
                </>
            )}

            {/* TAB 5: CUSTOMER & SUPPLIER REPORTS */}
            {activeTab === 'parties' && (
                <>
                    <div className="grid-2">
                        {/* Customer Receivables */}
                        <section className="card">
                            <div className="card-head">
                                <div>
                                    <h2>👤 {t('Customer Receivables (Outstanding Dues)')}</h2>
                                    <span className="muted">{t('Total Due')}: {money(report.total_customer_due_cents || 0)}</span>
                                </div>
                                <Link to="/customer">{t('Manage Customers →')}</Link>
                            </div>
                            <table>
                                <thead>
                                    <tr>
                                        <th>{t('Customer')}</th>
                                        <th style={{ textAlign: 'right' }}>{t('Orders')}</th>
                                        <th style={{ textAlign: 'right' }}>{t('Total Bought')}</th>
                                        <th style={{ textAlign: 'right' }}>{t('Outstanding Due')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(report.customers || []).map((c) => (
                                        <tr key={c.id}>
                                            <td>
                                                <strong>{c.name}</strong>
                                                <div className="muted" style={{ fontSize: '11px' }}>{c.phone}</div>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>{c.orders_count}</td>
                                            <td style={{ textAlign: 'right' }}>{money(c.total_purchased_cents)}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 700, color: '#ef4444' }}>
                                                {money(c.outstanding_due_cents)}
                                            </td>
                                        </tr>
                                    ))}
                                    {(!report.customers || report.customers.length === 0) && (
                                        <tr><td colSpan="4" className="empty">{t('No customer balances found')}</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </section>

                        {/* Supplier Payables */}
                        <section className="card">
                            <div className="card-head">
                                <div>
                                    <h2>🏢 {t('Supplier Payables (Outstanding Dues)')}</h2>
                                    <span className="muted">{t('Total Payable')}: {money(report.total_supplier_payable_cents || 0)}</span>
                                </div>
                                <Link to="/supplier">{t('Manage Suppliers →')}</Link>
                            </div>
                            <table>
                                <thead>
                                    <tr>
                                        <th>{t('Supplier')}</th>
                                        <th style={{ textAlign: 'right' }}>{t('Purchases')}</th>
                                        <th style={{ textAlign: 'right' }}>{t('Total Purchased')}</th>
                                        <th style={{ textAlign: 'right' }}>{t('Outstanding Payable')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(report.suppliers || []).map((s) => (
                                        <tr key={s.id}>
                                            <td>
                                                <strong>{s.name}</strong>
                                                <div className="muted" style={{ fontSize: '11px' }}>{s.phone}</div>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>{s.orders_count}</td>
                                            <td style={{ textAlign: 'right' }}>{money(s.total_purchased_cents)}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 700, color: '#ef4444' }}>
                                                {money(s.outstanding_payable_cents)}
                                            </td>
                                        </tr>
                                    ))}
                                    {(!report.suppliers || report.suppliers.length === 0) && (
                                        <tr><td colSpan="4" className="empty">{t('No supplier balances found')}</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </section>
                    </div>
                </>
            )}
        </div>
    );
}
