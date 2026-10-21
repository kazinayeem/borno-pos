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

const methods = ['Cash', 'paystack', 'Razorpay', 'PayPal', 'stripe'];

export default function Pos() {
    const t = useT();
    const navigate = useNavigate();
    const { data, isFetching, refetch } = useGetPosQuery();
    const [checkout, checkoutState] = useCheckoutMutation();
    const [q, setQ] = useState('');
    const [category, setCategory] = useState('');
    const [brand, setBrand] = useState('');
    const [cart, setCart] = useState([]);
    const [picker, setPicker] = useState(null);
    const [customerId, setCustomerId] = useState('');
    const [discount, setDiscount] = useState('0');
    const [coupon, setCoupon] = useState('');
    const [paid, setPaid] = useState('');
    const [method, setMethod] = useState('Cash');
    const [message, setMessage] = useState('');

    const products = useMemo(() => (data?.products || []).filter((product) => {
        const text = `${product.name} ${product.code}`.toLowerCase();

        return (!q || text.includes(q.toLowerCase()))
            && (!category || String(product.category_id) === category)
            && (!brand || String(product.brand_id) === brand);
    }), [data, q, category, brand]);

    const counts = useMemo(() => {
        const categories = {};
        const brands = {};
        (data?.products || []).forEach((product) => {
            categories[product.category_id] = (categories[product.category_id] || 0) + 1;
            brands[product.brand_id] = (brands[product.brand_id] || 0) + 1;
        });

        return { categories, brands };
    }, [data]);

    const subtotal = cart.reduce((sum, line) => sum + line.price_cents * line.qty, 0);
    const tax = cart.reduce((sum, line) => {
        if (line.tax_method === 'inclusive' || !line.tax_bps) return sum;

        return sum + Math.floor(line.price_cents * line.qty * line.tax_bps / 10000);
    }, 0);
    const discountCents = Math.min(cents(discount), subtotal);
    const couponRow = (data?.coupons || []).find((row) => row.code.toLowerCase() === coupon.trim().toLowerCase());
    const couponBase = Math.max(0, subtotal - discountCents);
    const couponCents = !couponRow || couponBase <= 0
        ? 0
        : couponRow.type === 'percent'
            ? Math.min(couponBase, Math.floor(couponBase * Number(couponRow.value) / 10000))
            : Math.min(couponBase, Number(couponRow.value) || 0);
    const grand = Math.max(0, subtotal - discountCents - couponCents) + tax;
    const tendered = cents(paid);
    const change = method === 'Cash' ? Math.max(0, tendered - grand) : 0;
    const units = cart.reduce((sum, line) => sum + line.qty, 0);

    function add(product, variant = null) {
        const allocated = (product.variants || []).reduce((sum, row) => sum + Number(row.stock_qty || 0), 0);
        if (product.has_variant && allocated > 0 && !variant) {
            setPicker(product);
            return;
        }
        const stock = variant ? Number(variant.stock_qty) : Number(product.stock_qty);
        const unstocked = product.type === 'service' || product.type === 'digital';
        if (!unstocked && stock < 1) {
            setMessage(`${product.name} is out of stock.`);
            return;
        }
        setMessage('');
        setPicker(null);
        const key = product.has_serial ? `${product.id}:serial:${Date.now()}` : `${product.id}:${variant?.id || ''}`;
        const batches = (product.batches || []).filter((batch) => !batch.expired && batch.qty > 0);
        setCart((rows) => {
            const found = rows.find((row) => row.key === key);
            if (found && !product.has_serial) {
                return rows.map((row) => row.key === key ? { ...row, qty: Math.min(row.stock_qty, row.qty + 1) } : row);
            }

            return rows.concat({
                ...product,
                key,
                name: variant ? `${product.name} · ${variant.name}` : product.name,
                price_cents: variant?.price_cents > 0 ? variant.price_cents : product.price_cents,
                stock_qty: unstocked ? 9999 : stock,
                variant_id: variant?.id || null,
                batch_id: batches[0]?.id || '',
                batches,
                serial: '',
                qty: 1,
            });
        });
    }

    function setQty(key, value) {
        setCart((rows) => rows.map((row) => {
            if (row.key !== key) return row;
            const qty = Math.max(1, Math.min(row.has_serial ? 1 : row.stock_qty, Number(value) || 1));

            return { ...row, qty };
        }));
    }

    function patchLine(key, values) {
        setCart((rows) => rows.map((row) => row.key === key ? { ...row, ...values } : row));
    }

    async function submit(status) {
        setMessage('');
        const result = await checkout({
            items: cart.map((line) => ({
                product_id: line.id,
                qty: line.qty,
                serial: line.serial || null,
                batch_id: line.batch_id || null,
                product_variant_id: line.variant_id || null,
            })),
            customer_id: customerId || null,
            discount,
            coupon_code: coupon.trim() || null,
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
        setCoupon('');
        await refetch();
        if (status === 'completed') navigate(`/sales/${result.data.sale.id}`);
        else setMessage(result.data.message);
    }

    return (
        <div className="pos-shell">
            <aside className="card pos-side">
                <button type="button" className={`pos-filter ${!category && !brand ? 'on' : ''}`} onClick={() => { setCategory(''); setBrand(''); }}>
                    <span>{t('All Products')}</span>
                    <b>{data?.products?.length || 0}</b>
                </button>
                <h2>{t('Categories')}</h2>
                {(data?.categories || []).filter((row) => counts.categories[row.id]).map((row) => (
                    <button type="button" key={row.id} className={`pos-filter ${category === String(row.id) ? 'on' : ''}`} onClick={() => setCategory(String(row.id))}>
                        <span>{row.name}</span>
                        <b>{counts.categories[row.id]}</b>
                    </button>
                ))}
                <h2>{t('Brands')}</h2>
                {(data?.brands || []).filter((row) => counts.brands[row.id]).map((row) => (
                    <button type="button" key={row.id} className={`pos-filter ${brand === String(row.id) ? 'on' : ''}`} onClick={() => setBrand(String(row.id))}>
                        <span>{row.name}</span>
                        <b>{counts.brands[row.id]}</b>
                    </button>
                ))}
            </aside>
            <section className="card pos-catalog">
                <div className="toolbar">
                    <input value={q} placeholder={t('Search by name, code or barcode')} onChange={(event) => setQ(event.target.value)} />
                </div>
                <div className="product-tiles">
                    {isFetching && !data && <div className="skeleton-grid" aria-hidden="true">{Array.from({ length: 8 }, (_, index) => <span key={index} className="skeleton block" />)}</div>}
                    {products.map((product, index) => (
                        <button type="button" key={product.id} className="tile" onClick={() => add(product)} style={index < 12 ? { animationDelay: `${index * 25}ms` } : undefined}>
                            {product.image ? <img src={product.image} alt="" /> : <span className="thumb-fallback" />}
                            <strong>{product.name}</strong>
                            <span className="muted">{product.code}</span>
                            <em className={product.stock_qty > 0 ? 'in' : 'out'}>{t('In Stock')}: {product.stock_qty}</em>
                            <b>{money(product.price_cents)}</b>
                        </button>
                    ))}
                    {picker && (
                        <div className="card wide">
                            <strong>{picker.name}</strong>
                            <div className="tabs">
                                {picker.variants.map((variant) => (
                                    <button type="button" className="chip" key={variant.id} onClick={() => add(picker, variant)}>{variant.name} · {variant.stock_qty}</button>
                                ))}
                                <button type="button" className="btn" onClick={() => setPicker(null)}>Close</button>
                            </div>
                        </div>
                    )}
                    {!products.length && <p className="empty">{isFetching ? t('Loading') : t('No data found')}</p>}
                </div>
            </section>
            <aside className="card cart">
                <h2>{t('Cart')}</h2>
                {message && <p className={message.includes('saved') || message.includes('Draft') ? 'note flash' : 'error note'}>{message}</p>}
                <label>{t('Customer')}
                    <select value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
                        <option value="">{t('Walk-in')}</option>
                        {(data?.customers || []).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                    </select>
                </label>
                {cart.map((line) => (
                    <div key={line.key}>
                        <div className="line">
                            <span>{line.name}</span>
                            <input type="number" min="1" max={line.has_serial ? 1 : line.stock_qty} value={line.qty} onChange={(event) => setQty(line.key, event.target.value)} />
                            <b key={line.qty} className="pop">{money(line.price_cents * line.qty)}</b>
                            <button type="button" aria-label={t('Remove')} onClick={() => setCart((rows) => rows.filter((row) => row.key !== line.key))}>×</button>
                        </div>
                        {line.has_serial && <input placeholder="Serial or IMEI" value={line.serial} onChange={(event) => patchLine(line.key, { serial: event.target.value })} />}
                        {line.has_batch && line.batches?.length > 0 && (
                            <select value={line.batch_id} onChange={(event) => patchLine(line.key, { batch_id: event.target.value })}>
                                {line.batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.batch_no} · exp {batch.expiry_date || 'none'} · {batch.qty}</option>)}
                            </select>
                        )}
                    </div>
                ))}
                {!cart.length && <p className="empty">{t('No products added yet')}</p>}
                <p className="pos-total"><span>{t('Total Products')}</span><b>{units}</b></p>
                <p className="pos-total"><span>{t('Subtotal')}</span><b>{money(subtotal)}</b></p>
                <label>{t('Discount')}<input value={discount} inputMode="decimal" onChange={(event) => setDiscount(event.target.value)} /></label>
                <label>{t('Coupon')}<input value={coupon} placeholder="SAVE5" onChange={(event) => setCoupon(event.target.value)} /></label>
                {coupon.trim() && <p className="pos-total"><span>{t('Coupon')}</span><b>{couponCents ? `− ${money(couponCents)}` : t('Not applied')}</b></p>}
                <p className="pos-total"><span>{t('Tax')}</span><b>{money(tax)}</b></p>
                <h2 key={grand} className="pop pos-grand"><span>{t('Grand Total')}</span><b>{money(grand)}</b></h2>
                <div className="pos-methods">
                    {methods.map((name) => (
                        <button type="button" key={name} className={`chip ${method === name ? 'active' : ''}`} onClick={() => setMethod(name)}>{name}</button>
                    ))}
                </div>
                <p className="muted">{t('These names are recorded on the sale. BornoPos does not charge Paystack, Razorpay, PayPal, or Stripe.')}</p>
                {method === 'Cash' && (
                    <>
                        <label>{t('Cash received')}<input value={paid} inputMode="decimal" placeholder={(grand / 100).toFixed(2)} onChange={(event) => setPaid(event.target.value)} /></label>
                        <p className="pos-total"><span>{t('Change')}</span><b>{money(change)}</b></p>
                    </>
                )}
                <div className="actions">
                    <button className={`btn ${checkoutState.isLoading ? 'busy' : ''}`} type="button" disabled={!cart.length || checkoutState.isLoading} aria-busy={checkoutState.isLoading} onClick={() => submit('draft')}>{t('Save draft')}</button>
                    <button className={`btn primary ${checkoutState.isLoading ? 'busy' : ''}`} type="button" disabled={!cart.length || checkoutState.isLoading} aria-busy={checkoutState.isLoading} onClick={() => submit('completed')}>{t('Pay')}</button>
                </div>
            </aside>
        </div>
    );
}
