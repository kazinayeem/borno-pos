import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { money } from '../api';
import { useT } from '../i18n';
import {
    useCancelPurchaseMutation,
    useCreateInstallmentMutation,
    useDeleteSaleMutation,
    useGetPurchaseFormQuery,
    useGetPurchaseQuery,
    useGetPurchasesQuery,
    useGetSaleQuery,
    useGetSalesQuery,
    usePayInstallmentMutation,
    useRecordServiceMutation,
    useReturnSaleMutation,
    useSavePurchaseMutation,
} from '../services/bornoposApi';

export function Records({ kind }) {
    const t = useT();
    const [page, setPage] = useState(1);
    const [q, setQ] = useState('');
    const [actionMsg, setActionMsg] = useState('');
    const sales = useGetSalesQuery({ drafts: kind === 'drafts', page, q }, { skip: kind === 'purchases' });
    const purchases = useGetPurchasesQuery({ page, q }, { skip: kind !== 'purchases' });
    const [deleteSale, deleteSaleState] = useDeleteSaleMutation();

    const payload = kind === 'purchases' ? purchases.data : sales.data;
    const rows = payload?.data || [];
    const meta = payload?.meta || { last_page: 1, from: 0, to: 0, total: 0 };
    const title = kind === 'purchases' ? 'Purchases' : (payload?.title || (kind === 'drafts' ? 'Drafts' : 'Sales'));

    async function handleDeleteDraft(id) {
        if (!window.confirm(t('Are you sure you want to delete this draft?'))) return;
        const res = await deleteSale(id);
        if (res.error) {
            setActionMsg(res.error.data?.message || t('Failed to delete draft.'));
        } else {
            setActionMsg(t('Draft deleted successfully.'));
        }
        setTimeout(() => setActionMsg(''), 3000);
    }

    return (
        <>
            <div className="page-title">
                <div>
                    <h1>{t(title)}</h1>
                    {kind === 'purchases' && <Link className="btn primary" to="/purchase/create">Add purchase</Link>}
                </div>
            </div>
            {actionMsg && <div className="status" style={{ marginBottom: '12px' }}>{actionMsg}</div>}
            <section className="card table-card" data-tour={kind === 'drafts' ? 'drafts-table' : (kind === 'purchases' ? 'purchases-table' : 'sales-table')}>
                <div className="toolbar"><input value={q} placeholder="Search" onChange={(event) => { setQ(event.target.value); setPage(1); }} /></div>
                <table className="grid">
                    <thead>
                        <tr>
                            <th>SL</th><th>{kind === 'purchases' ? 'Reference' : 'Invoice'}</th><th>{kind === 'purchases' ? 'Supplier' : 'Customer'}</th><th>Status</th><th>Total</th><th>Paid</th><th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length ? rows.map((row, index) => (
                            <tr key={row.id}>
                                <td>{(meta.from || 1) + index}</td>
                                <td>{row.invoice_no || row.reference}</td>
                                <td>{row.customer || row.supplier || '—'}</td>
                                <td className="cap">
                                    <span style={{
                                        display: 'inline-block',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        backgroundColor: row.status === 'cancelled' ? '#fee2e2' : (row.status === 'completed' || row.status === 'received' ? '#dcfce7' : '#f1f5f9'),
                                        color: row.status === 'cancelled' ? '#b91c1c' : (row.status === 'completed' || row.status === 'received' ? '#15803d' : '#475569')
                                    }}>
                                        {row.status}
                                    </span>
                                </td>
                                <td>{money(row.grand_cents)}</td>
                                <td>{money(row.paid_cents)}</td>
                                <td>
                                    {kind === 'drafts' ? (
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <a className="btn primary" href={`/pos?draft_id=${row.id}`}>{t('Resume')}</a>
                                            <button type="button" className="btn" style={{ color: '#ef4444' }} onClick={() => handleDeleteDraft(row.id)}>
                                                {t('Delete')}
                                            </button>
                                        </div>
                                    ) : (
                                        <Link className="btn" to={kind === 'purchases' ? `/purchase/${row.id}` : `/sales/${row.id}`}>{t('View')}</Link>
                                    )}
                                </td>
                            </tr>
                        )) : <tr><td className="empty" colSpan="7">{t('No data found')}</td></tr>}
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

export function SaleDetail() {
    const { id } = useParams();
    const { data, isFetching } = useGetSaleQuery(id);
    const [refund, refundState] = useReturnSaleMutation();
    const [schedule, scheduleState] = useCreateInstallmentMutation();
    const [pay, payState] = usePayInstallmentMutation();
    const [service, serviceState] = useRecordServiceMutation();
    const [message, setMessage] = useState('');
    const [count, setCount] = useState(3);
    const [firstDue, setFirstDue] = useState('');
    const [fee, setFee] = useState('');
    const [serviceNote, setServiceNote] = useState('');
    const sale = data?.sale;
    const [qty, setQty] = useState({});

    async function submit(event) {
        event.preventDefault();
        const items = (sale?.items || []).map((item) => ({ sale_item_id: item.id, qty: Number(qty[item.id] || 0) })).filter((item) => item.qty > 0);
        const result = await refund({ id, body: { items, note: 'Counter return' } });
        setMessage(result.error ? (result.error.data?.message || 'The return could not be saved.') : result.data.message);
    }

    async function saveSchedule(event) {
        event.preventDefault();
        const result = await schedule({ id, body: { count: Number(count), first_due: firstDue, fee: fee || 0 } });
        const bag = result.error?.data?.errors || {};
        setMessage(result.error ? (Object.values(bag).flat().join(' ') || result.error.data?.message || 'The schedule could not be saved.') : result.data.message);
    }

    async function payRow(installment) {
        const result = await pay({ id: installment.id, body: { amount: ((installment.amount_cents - installment.paid_cents) / 100).toFixed(2), payment_method: 'Cash' } });
        setMessage(result.error ? (result.error.data?.message || 'The payment could not be saved.') : result.data.message);
    }

    async function saveService(serialId) {
        const result = await service({ id: serialId, body: { note: serviceNote } });
        setMessage(result.error ? (result.error.data?.message || 'The service note could not be saved.') : result.data.message);
        if (!result.error) setServiceNote('');
    }

    if (!sale) return <p className="muted">{isFetching ? 'Loading' : 'Sale not found'}</p>;

    return (
        <>
            <div className="page-title">
                <div>
                    <h1>{sale.invoice_no}</h1>
                    <div className="crumbs">{sale.status} · {sale.customer?.name || 'Walk-in'}</div>
                </div>
                <a className="btn" href={`/sales/${sale.id}/print`} target="_blank" rel="noreferrer">Print</a>
            </div>
            {message && <p className="status">{message}</p>}
            <section className="card">
                <table className="grid">
                    <thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th><th>Return qty</th></tr></thead>
                    <tbody>
                        {sale.items.map((item) => (
                            <tr key={item.id}>
                                <td>{item.product?.image && <img className="thumb-sm" src={item.product.image} alt="" />} {item.product?.name}</td>
                                <td>{item.qty}</td>
                                <td>{money(item.price_cents)}</td>
                                <td>{money(item.subtotal_cents)}</td>
                                <td><input type="number" min="0" max={item.qty} value={qty[item.id] || 0} onChange={(event) => setQty({ ...qty, [item.id]: event.target.value })} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <h2>Total {money(sale.grand_cents)} · Paid {money(sale.paid_cents)}</h2>
                {sale.status === 'completed' && <button className="btn" type="button" disabled={refundState.isLoading} onClick={submit}>Save return</button>}
            </section>
            {sale.installment_plan && (
                <section className="card">
                    <h2>Payment schedule</h2>
                    <p className="muted">Down payment {money(sale.installment_plan.down_payment_cents)} · Financed {money(sale.installment_plan.financed_cents)}{sale.installment_plan.fee_cents > 0 ? ` · Fee ${money(sale.installment_plan.fee_cents)}` : ''}. This is a schedule for this sale, not a loan or credit approval.</p>
                    <table className="grid">
                        <thead><tr><th>#</th><th>Due</th><th>Amount</th><th>Paid</th><th></th></tr></thead>
                        <tbody>
                            {sale.installment_plan.installments.map((row) => (
                                <tr key={row.id}>
                                    <td>{row.sequence}</td>
                                    <td>{String(row.due_on).slice(0, 10)}</td>
                                    <td>{money(row.amount_cents)}</td>
                                    <td>{money(row.paid_cents)}</td>
                                    <td>{row.status !== 'paid' && <button type="button" className="btn" disabled={payState.isLoading} onClick={() => payRow(row)}>Record payment</button>}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
            )}
            {sale.status === 'completed' && !sale.installment_plan && sale.customer_id && sale.paid_cents < sale.grand_cents && (
                <form className="card form-grid" onSubmit={saveSchedule}>
                    <h2 className="wide">Installments</h2>
                    <p className="muted wide">Split the remaining balance. A fee is added only when you enter one. BornoPos does not approve credit.</p>
                    <label>Count<input type="number" min="1" max="24" value={count} onChange={(event) => setCount(event.target.value)} /></label>
                    <label>First due date<input type="date" required value={firstDue} onChange={(event) => setFirstDue(event.target.value)} /></label>
                    <label>Fee<input value={fee} placeholder="0.00" onChange={(event) => setFee(event.target.value)} /></label>
                    <button className="btn primary" type="submit" disabled={scheduleState.isLoading}>Save schedule</button>
                </form>
            )}
            {sale.items.some((item) => item.serial_unit) && (
                <section className="card">
                    <h2>Warranty service</h2>
                    {sale.items.filter((item) => item.serial_unit).map((item) => (
                        <div key={item.id}>
                            <p>{item.product?.name} · {item.serial} · {item.serial_unit.status}{item.serial_unit.warranty_ends_on ? ` · warranty until ${item.serial_unit.warranty_ends_on}` : ''}</p>
                            <ul>{(item.serial_unit.events || []).map((event) => <li key={event.id}>{event.kind}{event.note ? ` · ${event.note}` : ''}</li>)}</ul>
                            <label>Service note<input value={serviceNote} onChange={(event) => setServiceNote(event.target.value)} /></label>
                            <button type="button" className="btn" disabled={serviceState.isLoading || !serviceNote} onClick={() => saveService(item.serial_unit.id)}>Save note</button>
                        </div>
                    ))}
                </section>
            )}
        </>
    );
}

export { PurchaseForm } from './PurchaseForm';


export function PurchaseDetail() {
    const { id } = useParams();
    const t = useT();
    const { data, isFetching } = useGetPurchaseQuery(id);
    const [cancelPurchase, cancelState] = useCancelPurchaseMutation();
    const [message, setMessage] = useState('');
    const purchase = data?.purchase;

    if (!purchase) return <p className="muted">{isFetching ? 'Loading...' : 'Purchase not found'}</p>;

    async function handleCancel() {
        const reason = window.prompt(t('Enter reason for cancelling / reversing this purchase:'), 'Purchase cancelled by manager');
        if (reason === null) return;
        const res = await cancelPurchase({ id: purchase.id, reason: reason || 'Purchase cancelled' });
        if (res.error) {
            setMessage(res.error.data?.message || t('Could not cancel purchase. Check available stock.'));
        } else {
            setMessage(t('Purchase cancelled and stock/ledger successfully reversed.'));
        }
    }

    const isCancelled = purchase.status === 'cancelled';

    return (
        <section>
            <div className="page-title">
                <div>
                    <h1>{purchase.reference}</h1>
                    <div className="crumbs">
                        <span style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            backgroundColor: isCancelled ? '#fee2e2' : '#dcfce7',
                            color: isCancelled ? '#b91c1c' : '#15803d',
                            marginRight: '8px'
                        }}>
                            {purchase.status.toUpperCase()}
                        </span>
                        {purchase.supplier?.name || 'Unknown Supplier'}
                        {purchase.warehouse ? ` · Warehouse: ${purchase.warehouse.name}` : ''}
                        {purchase.purchased_on ? ` · Date: ${purchase.purchased_on}` : ''}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn" type="button" onClick={() => window.print()}>
                        {t('Print')}
                    </button>
                    {!isCancelled && (
                        <button
                            className="btn"
                            type="button"
                            disabled={cancelState.isLoading}
                            style={{ backgroundColor: '#fee2e2', color: '#b91c1c', borderColor: '#fca5a5' }}
                            onClick={handleCancel}
                        >
                            {cancelState.isLoading ? t('Cancelling...') : t('Cancel / Reverse Purchase')}
                        </button>
                    )}
                </div>
            </div>

            {message && <div className="status" style={{ marginBottom: '16px' }}>{message}</div>}

            <section className="card">
                <table className="grid">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Product</th>
                            <th>Qty</th>
                            <th>Cost</th>
                            <th>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(purchase.items || []).map((item, idx) => (
                            <tr key={item.id}>
                                <td>{idx + 1}</td>
                                <td>
                                    <strong>{item.product?.name}</strong>
                                    {item.batch_no && (
                                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                            Batch: {item.batch_no} {item.expires_on ? `| Exp: ${item.expires_on}` : ''}
                                        </div>
                                    )}
                                </td>
                                <td>{item.qty}</td>
                                <td>{money(item.cost_cents)}</td>
                                <td>{money((item.qty * item.cost_cents))}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ minWidth: '280px', lineHeight: '1.8' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>{t('Total Amount')}:</span>
                            <strong>{money(purchase.grand_cents)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                            <span>{t('Amount Paid')}:</span>
                            <strong>{money(purchase.paid_cents)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: purchase.grand_cents > purchase.paid_cents ? '#dc2626' : 'inherit', borderTop: '1px solid #e2e8f0', paddingTop: '4px' }}>
                            <span>{t('Balance Due')}:</span>
                            <strong>{money(Math.max(0, purchase.grand_cents - purchase.paid_cents))}</strong>
                        </div>
                    </div>
                </div>
            </section>
        </section>
    );
}
