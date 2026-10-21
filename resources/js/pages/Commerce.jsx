import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { money } from '../api';
import { useT } from '../i18n';
import {
    useGetPurchaseFormQuery,
    useGetPurchaseQuery,
    useGetPurchasesQuery,
    useGetSaleQuery,
    useGetSalesQuery,
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
    const [message, setMessage] = useState('');
    const sale = data?.sale;
    const [qty, setQty] = useState({});

    async function submit(event) {
        event.preventDefault();
        const items = (sale?.items || []).map((item) => ({ sale_item_id: item.id, qty: Number(qty[item.id] || 0) })).filter((item) => item.qty > 0);
        const result = await refund({ id, body: { items, note: 'Counter return' } });
        setMessage(result.error ? (result.error.data?.message || 'The return could not be saved.') : result.data.message);
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
    const [lines, setLines] = useState([{ product_id: '', qty: 1, cost: '' }]);
    const [message, setMessage] = useState('');

    function chooseProduct(index, productId) {
        const product = (data?.products || []).find((row) => String(row.id) === String(productId));
        setLines((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, product_id: productId, cost: product ? (product.cost_cents / 100).toFixed(2) : row.cost } : row));
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
                {lines.map((line, index) => (
                    <div className="line" key={index}>
                        <select value={line.product_id} onChange={(event) => chooseProduct(index, event.target.value)}>
                            <option value="">Product</option>
                            {(data?.products || []).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                        </select>
                        <input type="number" min="1" value={line.qty} onChange={(event) => setLines((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, qty: Number(event.target.value) } : row))} />
                        <input value={line.cost} onChange={(event) => setLines((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, cost: event.target.value } : row))} />
                    </div>
                ))}
                <button className="btn" type="button" onClick={() => setLines((rows) => rows.concat([{ product_id: '', qty: 1, cost: '' }]))}>Add line</button>
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
