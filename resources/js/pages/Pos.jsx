import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { money } from '../api';
import { useT } from '../i18n';
import { useCheckoutMutation, useGetPosQuery } from '../services/bornoposApi';

function cents(value) {
    const number = Number(String(value || '0').replace(/,/g, ''));
    if (!Number.isFinite(number)) return 0;

    return Math.round(number * 100);
}

export default function Pos() {
    const t = useT();
    const navigate = useNavigate();
    const { data, isFetching, refetch } = useGetPosQuery();
    const [checkout, checkoutState] = useCheckoutMutation();
    const [q, setQ] = useState('');
    const [category, setCategory] = useState('');
    const [cart, setCart] = useState([]);
    const [customerId, setCustomerId] = useState('');
    const [discount, setDiscount] = useState('0');
    const [paid, setPaid] = useState('');
    const [method, setMethod] = useState('Cash');
    const [message, setMessage] = useState('');

    const products = useMemo(() => (data?.products || []).filter((product) => {
        const text = `${product.name} ${product.code}`.toLowerCase();
        return (!q || text.includes(q.toLowerCase())) && (!category || String(product.category_id) === category);
    }), [data, q, category]);

    const subtotal = cart.reduce((sum, line) => sum + line.price_cents * line.qty, 0);
    const tax = cart.reduce((sum, line) => {
        if (line.tax_method === 'inclusive' || !line.tax_bps) return sum;

        return sum + Math.floor(line.price_cents * line.qty * line.tax_bps / 10000);
    }, 0);
    const grand = Math.max(0, subtotal - cents(discount)) + tax;

    function add(product) {
        setCart((rows) => {
            const found = rows.find((row) => row.id === product.id);
            if (found) return rows.map((row) => row.id === product.id ? { ...row, qty: row.qty + 1 } : row);

            return rows.concat({ ...product, qty: 1 });
        });
    }

    async function submit(status) {
        setMessage('');
        const result = await checkout({
            items: cart.map((line) => ({ product_id: line.id, qty: line.qty })),
            customer_id: customerId || null,
            discount,
            payment_method: method,
            amount_paid: paid || (grand / 100).toFixed(2),
            status,
            idempotency_key: data?.idempotency,
        });
        if (result.error) {
            const bag = result.error.data?.errors || {};
            setMessage(Object.values(bag).flat().join(' ') || result.error.data?.message || 'The sale could not be saved.');
            return;
        }
        setCart([]);
        setPaid('');
        await refetch();
        if (status === 'completed') navigate(`/sales/${result.data.sale.id}`);
        else setMessage(result.data.message);
    }

    return (
        <div className="pos">
            <section className="card">
                <div className="toolbar">
                    <input value={q} placeholder={t('Search products by name, code, brand...')} onChange={(event) => setQ(event.target.value)} />
                    <select value={category} onChange={(event) => setCategory(event.target.value)}>
                        <option value="">{t('All Categories')}</option>
                        {(data?.categories || []).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                    </select>
                </div>
                <div className="product-tiles">
                    {products.map((product) => (
                        <button type="button" key={product.id} className="tile" onClick={() => add(product)}>
                            {product.image && <img src={product.image} alt="" />}
                            <strong>{product.name}</strong>
                            <span>{product.code}</span>
                            <b>{money(product.price_cents)}</b>
                            <em className={product.stock_qty > 0 ? 'in' : 'out'}>{product.stock_qty}</em>
                        </button>
                    ))}
                    {!products.length && <p className="empty">{isFetching ? t('Loading') : t('No data found')}</p>}
                </div>
            </section>
            <aside className="card cart">
                <h2>Cart</h2>
                {message && <p className="error">{message}</p>}
                {cart.map((line) => (
                    <div className="line" key={line.id}>
                        <span>{line.name}</span>
                        <input type="number" min="1" value={line.qty} onChange={(event) => setCart((rows) => rows.map((row) => row.id === line.id ? { ...row, qty: Math.max(1, Number(event.target.value) || 1) } : row))} />
                        <b>{money(line.price_cents * line.qty)}</b>
                        <button type="button" onClick={() => setCart((rows) => rows.filter((row) => row.id !== line.id))}>×</button>
                    </div>
                ))}
                <label>Customer
                    <select value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
                        <option value="">Walk-in</option>
                        {(data?.customers || []).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                    </select>
                </label>
                <label>Discount<input value={discount} onChange={(event) => setDiscount(event.target.value)} /></label>
                <label>Payment
                    <select value={method} onChange={(event) => setMethod(event.target.value)}>
                        {['Cash', 'paystack', 'Razorpay', 'PayPal', 'stripe'].map((name) => <option key={name}>{name}</option>)}
                    </select>
                </label>
                <label>Amount paid<input value={paid} placeholder={(grand / 100).toFixed(2)} onChange={(event) => setPaid(event.target.value)} /></label>
                <p>Subtotal {money(subtotal)}</p>
                <p>Tax {money(tax)}</p>
                <h2>Total {money(grand)}</h2>
                <div className="actions">
                    <button className="btn" type="button" disabled={!cart.length || checkoutState.isLoading} onClick={() => submit('draft')}>Save draft</button>
                    <button className="btn primary" type="button" disabled={!cart.length || checkoutState.isLoading} onClick={() => submit('completed')}>Pay</button>
                </div>
            </aside>
        </div>
    );
}
