import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { money } from '../api';
import { useT } from '../i18n';
import {
    useCreateInstallmentMutation,
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
    const sales = useGetSalesQuery({ drafts: kind === 'drafts', page, q }, { skip: kind === 'purchases' });
    const purchases = useGetPurchasesQuery({ page, q }, { skip: kind !== 'purchases' });
    const payload = kind === 'purchases' ? purchases.data : sales.data;
    const rows = payload?.data || [];
    const meta = payload?.meta || { last_page: 1, from: 0, to: 0, total: 0 };
    const title = kind === 'purchases' ? 'Purchases' : (payload?.title || (kind === 'drafts' ? 'Drafts' : 'Sales'));

    return (
        <>
            <div className="page-title">
                <div>
                    <h1>{t(title)}</h1>
                    {kind === 'purchases' && <Link className="btn primary" to="/purchase/create">Add purchase</Link>}
                </div>
            </div>
            <section className="card table-card">
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
                                <td className="cap">{row.status}</td>
                                <td>{money(row.grand_cents)}</td>
                                <td>{money(row.paid_cents)}</td>
                                <td><Link className="btn" to={kind === 'purchases' ? `/purchase/${row.id}` : `/sales/${row.id}`}>{t('View')}</Link></td>
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

export function PurchaseForm() {
    const navigate = useNavigate();
    const { data } = useGetPurchaseFormQuery();
    const [save, saveState] = useSavePurchaseMutation();
    const [warehouseId, setWarehouseId] = useState('');
    const [supplierId, setSupplierId] = useState('');
    const [paid, setPaid] = useState('0');
    const [lines, setLines] = useState([{ product_id: '', qty: 1, cost: '', batch_no: '', expiry_date: '', manufactured_on: '', serial: '', identifier_kind: 'serial' }]);
    const [message, setMessage] = useState('');

    function chooseProduct(index, productId) {
        const product = (data?.products || []).find((row) => String(row.id) === String(productId));
        setLines((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, product_id: productId, cost: product ? (product.cost_cents / 100).toFixed(2) : row.cost, identifier_kind: product?.has_serial ? row.identifier_kind : 'serial' } : row));
    }

    async function submit(event) {
        event.preventDefault();
        const result = await save({
            warehouse_id: warehouseId,
            supplier_id: supplierId,
            purchased_on: new Date().toISOString().slice(0, 10),
            payment_method: 'Cash',
            amount_paid: paid,
            items: lines.filter((line) => line.product_id),
        });
        if (result.error) {
            const bag = result.error.data?.errors || {};
            setMessage(Object.values(bag).flat().join(' ') || result.error.data?.message || 'The purchase could not be saved.');
            return;
        }
        navigate(`/purchase/${result.data.purchase.id}`);
    }

    return (
        <form className="card form-grid" onSubmit={submit}>
            <h1 className="wide">Add purchase</h1>
            {message && <p className="error wide">{message}</p>}
            <label>Warehouse
                <select required value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)}>
                    <option value="">Choose</option>
                    {(data?.warehouses || []).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                </select>
            </label>
            <label>Supplier
                <select required value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
                    <option value="">Choose</option>
                    {(data?.suppliers || []).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                </select>
            </label>
            <label>Amount paid<input value={paid} onChange={(event) => setPaid(event.target.value)} /></label>
            <div className="wide">
                {lines.map((line, index) => {
                    const product = (data?.products || []).find((row) => String(row.id) === String(line.product_id));
                    return (
                        <div key={index} className="wide">
                            <div className="line">
                                <select value={line.product_id} onChange={(event) => chooseProduct(index, event.target.value)}>
                                    <option value="">Product</option>
                                    {(data?.products || []).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                                </select>
                                <input type="number" min="1" value={line.qty} onChange={(event) => setLines((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, qty: Number(event.target.value) } : row))} />
                                <input value={line.cost} onChange={(event) => setLines((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, cost: event.target.value } : row))} />
                            </div>
                            {!!product?.has_batch && (
                                <div className="line">
                                    <input placeholder="Batch number" value={line.batch_no} onChange={(event) => setLines((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, batch_no: event.target.value } : row))} />
                                    <input type="date" value={line.manufactured_on} onChange={(event) => setLines((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, manufactured_on: event.target.value } : row))} />
                                    <input type="date" value={line.expiry_date} onChange={(event) => setLines((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, expiry_date: event.target.value } : row))} />
                                </div>
                            )}
                            {!!product?.has_serial && (
                                <div className="line">
                                    <select value={line.identifier_kind} onChange={(event) => setLines((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, identifier_kind: event.target.value } : row))}>
                                        <option value="serial">Serial</option>
                                        <option value="imei">IMEI</option>
                                    </select>
                                    <input placeholder="One identifier per unit, separated by commas" value={line.serial} onChange={(event) => setLines((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, serial: event.target.value } : row))} />
                                </div>
                            )}
                        </div>
                    );
                })}
                <button className="btn" type="button" onClick={() => setLines((rows) => rows.concat([{ product_id: '', qty: 1, cost: '', batch_no: '', expiry_date: '', manufactured_on: '', serial: '', identifier_kind: 'serial' }]))}>Add line</button>
            </div>
            <button className="btn primary" type="submit" disabled={saveState.isLoading}>Save purchase</button>
        </form>
    );
}

export function PurchaseDetail() {
    const { id } = useParams();
    const { data, isFetching } = useGetPurchaseQuery(id);
    const purchase = data?.purchase;
    if (!purchase) return <p className="muted">{isFetching ? 'Loading' : 'Purchase not found'}</p>;

    return (
        <section className="card">
            <h1>{purchase.reference}</h1>
            <p>{purchase.supplier?.name} · {purchase.status}</p>
            <table className="grid">
                <thead><tr><th>Product</th><th>Qty</th><th>Cost</th></tr></thead>
                <tbody>
                    {(purchase.items || []).map((item) => (
                        <tr key={item.id}><td>{item.product?.name}</td><td>{item.qty}</td><td>{money(item.cost_cents)}</td></tr>
                    ))}
                </tbody>
            </table>
            <h2>Total {money(purchase.grand_cents)} · Paid {money(purchase.paid_cents)}</h2>
        </section>
    );
}
