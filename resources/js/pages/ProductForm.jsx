import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { money } from '../api';
import { useT } from '../i18n';
import { useGetProductFormQuery, useSaveProductMutation } from '../services/bornoposApi';

const empty = {
    name: '', type: 'standard', code: '', brand_id: '', category_id: '', unit_id: '', warehouse_id: '', tax_id: '',
    tax_method: 'exclusive', cost: '', price: '', alert_qty: 0, description: '', is_active: true, featured_in_pos: true, has_variant: false,
};

function errorsOf(error) {
    const bag = error?.data?.errors || {};
    return Object.values(bag).flat().join(' ') || error?.data?.message || '';
}

export default function ProductForm({ readOnly = false }) {
    const t = useT();
    const navigate = useNavigate();
    const { id } = useParams();
    const mode = readOnly ? 'view' : (id ? 'edit' : 'create');
    const { data, isFetching, isError } = useGetProductFormQuery({ id, mode });
    const [save, saveState] = useSaveProductMutation();
    const [form, setForm] = useState(empty);
    const [variants, setVariants] = useState([]);
    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!data?.product) return;
        setForm({ ...empty, ...data.product, variants: undefined });
        setVariants(data.product.variants || []);
        setPreview(data.product.image || '');
    }, [data]);

    const lookups = data?.lookups || { categories: [], brands: [], units: [], warehouses: [], taxes: [] };

    function set(name, value) {
        setForm((current) => ({ ...current, [name]: value }));
    }

    async function submit(event) {
        event.preventDefault();
        setMessage('');
        const body = new FormData();
        ['name', 'type', 'code', 'brand_id', 'category_id', 'unit_id', 'tax_method', 'cost', 'price', 'alert_qty', 'description'].forEach((key) => {
            body.append(key, form[key] ?? '');
        });
        if (form.warehouse_id) body.append('warehouse_id', form.warehouse_id);
        if (form.tax_id) body.append('tax_id', form.tax_id);
        body.append('is_active', form.is_active ? '1' : '0');
        body.append('featured_in_pos', form.featured_in_pos ? '1' : '0');
        body.append('has_variant', form.has_variant ? '1' : '0');
        if (image) body.append('image', image);
        variants.forEach((variant, index) => {
            if (variant.id) body.append(`variants[${index}][id]`, variant.id);
            body.append(`variants[${index}][name]`, variant.name || '');
            body.append(`variants[${index}][sku]`, variant.sku || '');
            body.append(`variants[${index}][price]`, variant.price || '0');
            body.append(`variants[${index}][stock_qty]`, variant.stock_qty || 0);
        });
        const result = await save({ id, body });
        if (result.error) {
            setMessage(errorsOf(result.error) || 'The product could not be saved.');
            return;
        }
        navigate(`/products/${result.data.product.id}`);
    }

    return (
        <>
            <div className="page-title">
                <div>
                    <h1>{readOnly ? form.name || t('Product') : (id ? t('Edit') : t('+ Add Product'))}</h1>
                    <div className="crumbs"><Link to="/products">{t('Products')}</Link> &gt; {form.code || t('New')}</div>
                </div>
                {readOnly && id && <Link className="btn primary" to={`/products/${id}/edit`}>{t('Edit')}</Link>}
            </div>
            <form className="card form-grid" onSubmit={submit}>
                {isFetching && <p className="muted">{t('Loading')}</p>}
                {isError && <p className="error">The product could not be loaded.</p>}
                {message && <p className="error">{message}</p>}
                {readOnly && form.image && <img className="product-photo" src={form.image} alt="" />}
                <label>Name<input required disabled={readOnly} value={form.name} onChange={(event) => set('name', event.target.value)} /></label>
                <label>Code<input required disabled={readOnly} value={form.code} onChange={(event) => set('code', event.target.value)} /></label>
                <label>Type
                    <select disabled={readOnly} value={form.type} onChange={(event) => set('type', event.target.value)}>
                        {['standard', 'combo', 'digital', 'service'].map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                </label>
                <label>Category
                    <select required disabled={readOnly} value={form.category_id || ''} onChange={(event) => set('category_id', event.target.value)}>
                        <option value="">Choose</option>
                        {lookups.categories.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                    </select>
                </label>
                <label>Brand
                    <select required disabled={readOnly} value={form.brand_id || ''} onChange={(event) => set('brand_id', event.target.value)}>
                        <option value="">Choose</option>
                        {lookups.brands.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                    </select>
                </label>
                <label>Unit
                    <select required disabled={readOnly} value={form.unit_id || ''} onChange={(event) => set('unit_id', event.target.value)}>
                        <option value="">Choose</option>
                        {lookups.units.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                    </select>
                </label>
                <label>Warehouse
                    <select disabled={readOnly} value={form.warehouse_id || ''} onChange={(event) => set('warehouse_id', event.target.value)}>
                        <option value="">Choose</option>
                        {lookups.warehouses.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                    </select>
                </label>
                <label>Tax
                    <select disabled={readOnly} value={form.tax_id || ''} onChange={(event) => set('tax_id', event.target.value)}>
                        <option value="">None</option>
                        {lookups.taxes.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                    </select>
                </label>
                <label>Cost<input required disabled={readOnly} value={form.cost} onChange={(event) => set('cost', event.target.value)} /></label>
                <label>Price<input required disabled={readOnly} value={form.price} onChange={(event) => set('price', event.target.value)} /></label>
                <label>Alert quantity<input disabled={readOnly} type="number" min="0" value={form.alert_qty ?? 0} onChange={(event) => set('alert_qty', event.target.value)} /></label>
                {readOnly && <label>Stock<input disabled value={form.stock_qty ?? 0} /></label>}
                <label className="wide">Description<textarea disabled={readOnly} value={form.description || ''} onChange={(event) => set('description', event.target.value)} /></label>
                <label className="check"><input disabled={readOnly} type="checkbox" checked={!!form.is_active} onChange={(event) => set('is_active', event.target.checked)} /> Active</label>
                <label className="check"><input disabled={readOnly} type="checkbox" checked={!!form.featured_in_pos} onChange={(event) => set('featured_in_pos', event.target.checked)} /> Show in POS</label>
                <label className="check"><input disabled={readOnly} type="checkbox" checked={!!form.has_variant} onChange={(event) => set('has_variant', event.target.checked)} /> Has variants</label>
                {!readOnly && (
                    <label>Image
                        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => {
                            const file = event.target.files?.[0] || null;
                            setImage(file);
                            setPreview(file ? URL.createObjectURL(file) : (data?.product?.image || ''));
                        }} />
                    </label>
                )}
                {preview && <img className="product-photo" src={preview} alt="" />}
                {form.has_variant && (
                    <div className="wide">
                        <h2>Variants</h2>
                        {variants.map((variant, index) => (
                            <div className="line" key={variant.id || index}>
                                <input disabled={readOnly} placeholder="Name" value={variant.name || ''} onChange={(event) => setVariants((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, name: event.target.value } : row))} />
                                <input disabled={readOnly} placeholder="SKU" value={variant.sku || ''} onChange={(event) => setVariants((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, sku: event.target.value } : row))} />
                                <input disabled={readOnly} placeholder="Price" value={variant.price || ''} onChange={(event) => setVariants((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, price: event.target.value } : row))} />
                                <input disabled={readOnly} placeholder="Stock" type="number" value={variant.stock_qty || 0} onChange={(event) => setVariants((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, stock_qty: event.target.value } : row))} />
                            </div>
                        ))}
                        {!readOnly && <button className="btn" type="button" onClick={() => setVariants((rows) => rows.concat([{ name: '', sku: '', price: '', stock_qty: 0 }]))}>Add variant</button>}
                    </div>
                )}
                {readOnly && <p className="muted">Selling price {money(Math.round(Number(form.price || 0) * 100))} · Cost {money(Math.round(Number(form.cost || 0) * 100))}</p>}
                {!readOnly && <div className="wide actions"><button className="btn primary" type="submit" disabled={saveState.isLoading}>{saveState.isLoading ? t('Loading') : 'Save product'}</button></div>}
            </form>
        </>
    );
}
