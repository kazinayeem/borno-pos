import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { money } from '../api';
import { useT } from '../i18n';
import { useGetProductFormQuery, useSaveProductMutation } from '../services/bornoposApi';

const blankDetails = {
    generic_name: '', strength: '', dosage_form: '', manufacturer: '', prescription_required: false,
    model: '', color: '', storage: '', ram: '', warranty_months: '', pack_size: '', weight: '', wholesale: '', style: '',
};

const empty = {
    name: '', slug: '', type: 'standard', code: '', barcode: '', brand_id: '', category_id: '', unit_id: '',
    warehouse_id: '', supplier_id: '', tax_id: '', tax_method: 'exclusive', cost: '', price: '', promo_price: '',
    has_promo: false, alert_qty: 0, near_expiry_days: 30, opening_stock: '', description: '',
    is_active: true, featured_in_pos: true, has_variant: false, has_batch: false, has_serial: false,
    details: blankDetails,
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
    const [ingredients, setIngredients] = useState([]);
    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState('');
    const [message, setMessage] = useState('');
    const [tab, setTab] = useState('general');

    useEffect(() => {
        if (!data) return;
        if (data.product?.id) {
            setForm({
                ...empty,
                ...data.product,
                details: { ...blankDetails, ...(data.product.details || {}) },
                variants: undefined,
                ingredients: undefined,
            });
            setVariants(data.product.variants || []);
            setIngredients(data.product.ingredients || []);
            setPreview(data.product.image || '');
            return;
        }
        setForm((current) => (current.name ? current : {
            ...empty,
            has_batch: data.lookups?.business_type === 'pharmacy',
            has_serial: data.lookups?.business_type === 'electronics',
        }));
    }, [data]);

    const lookups = data?.lookups || { categories: [], brands: [], units: [], warehouses: [], taxes: [], suppliers: [], products: [] };
    const business = lookups.business_type || 'all_in_one';
    const modules = lookups.modules || {};
    const moduleOn = (key) => modules[key] !== false;
    const showBatch = !!form.has_batch || (business === 'pharmacy' && moduleOn('batch'));
    const showSerial = !!form.has_serial || (business === 'electronics' && moduleOn('serial'));
    const showVariants = !!form.has_variant || ((business === 'electronics') && moduleOn('variants') && !!form.has_variant);
    const showWarranty = !!form.has_serial || business === 'electronics' || (form.details?.warranty_months && moduleOn('warranty'));
    const showRecipe = form.type === 'combo' || form.type === 'ingredient' || (business === 'restaurant' && moduleOn('recipe'));
    const tabs = [
        ['general', 'General'],
        ['pricing', 'Pricing and tax'],
        ['inventory', 'Inventory'],
        ...(showBatch ? [['batch', 'Batch and expiry']] : []),
        ...(showSerial ? [['serial', 'Serial numbers']] : []),
        ...(form.has_variant ? [['variants', 'Variants']] : []),
        ...(showWarranty ? [['warranty', 'Warranty']] : []),
        ...(showRecipe ? [['recipe', 'Recipe']] : []),
        ['extra', 'Additional'],
    ];
    const active = tabs.some(([key]) => key === tab) ? tab : 'general';

    function set(name, value) {
        setForm((current) => ({ ...current, [name]: value }));
    }

    function setDetail(name, value) {
        setForm((current) => ({ ...current, details: { ...current.details, [name]: value } }));
    }

    async function submit(event) {
        event.preventDefault();
        setMessage('');
        if (!form.name || !form.code || !form.category_id || !form.brand_id || !form.unit_id || form.cost === '' || form.price === '') {
            setTab(!form.cost || !form.price ? 'pricing' : 'general');
            setMessage('Name, code, category, brand, unit, cost, and selling price are required.');
            return;
        }
        const body = new FormData();
        ['name', 'slug', 'type', 'code', 'barcode', 'brand_id', 'category_id', 'unit_id', 'tax_method', 'cost', 'price', 'promo_price', 'alert_qty', 'near_expiry_days', 'description'].forEach((key) => {
            body.append(key, form[key] ?? '');
        });
        if (!id && form.opening_stock !== '') body.append('opening_stock', form.opening_stock);
        if (form.warehouse_id) body.append('warehouse_id', form.warehouse_id);
        if (form.supplier_id) body.append('supplier_id', form.supplier_id);
        if (form.tax_id) body.append('tax_id', form.tax_id);
        ['is_active', 'featured_in_pos', 'has_variant', 'has_batch', 'has_serial', 'has_promo'].forEach((key) => body.append(key, form[key] ? '1' : '0'));
        Object.entries(form.details || {}).forEach(([key, value]) => {
            if (key === 'wholesale_cents') return;
            body.append(`details[${key}]`, value === true ? '1' : value === false ? '0' : (value ?? ''));
        });
        if (image) body.append('image', image);
        variants.forEach((variant, index) => {
            if (variant.id) body.append(`variants[${index}][id]`, variant.id);
            ['name', 'sku', 'barcode', 'price', 'stock_qty', 'size', 'color', 'style'].forEach((key) => {
                body.append(`variants[${index}][${key}]`, variant[key] ?? '');
            });
        });
        body.append('ingredients_present', '1');
        ingredients.forEach((row, index) => {
            if (!row.ingredient_id) return;
            body.append(`ingredients[${index}][ingredient_id]`, row.ingredient_id);
            body.append(`ingredients[${index}][qty]`, row.qty || 1);
        });
        const result = await save({ id, body });
        if (result.error) {
            setMessage(errorsOf(result.error) || 'The product could not be saved.');
            return;
        }
        navigate(`/products/${result.data.product.id}`);
    }

    function variantChange(index, key, value) {
        setVariants((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row));
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
                {isFetching && <p className="muted wide">{t('Loading')}</p>}
                {isError && <p className="error wide">The product could not be loaded.</p>}
                {message && <p className="error wide">{message}</p>}
                <div className="tabs" role="tablist">
                    {tabs.map(([key, label]) => (
                        <button type="button" key={key} className={`chip ${active === key ? 'active' : ''}`} aria-selected={active === key} onClick={() => setTab(key)}>{label}</button>
                    ))}
                </div>

                {active === 'general' && (
                    <>
                        <label>Name<input disabled={readOnly} value={form.name} onChange={(event) => set('name', event.target.value)} /></label>
                        <label>Code / SKU<input disabled={readOnly} value={form.code} onChange={(event) => set('code', event.target.value)} /></label>
                        <label>Barcode<input disabled={readOnly} value={form.barcode || ''} onChange={(event) => set('barcode', event.target.value)} /></label>
                        <label>Slug<input disabled={readOnly} value={form.slug || ''} placeholder="Filled from the name when left blank" onChange={(event) => set('slug', event.target.value)} /></label>
                        <label>Type
                            <select disabled={readOnly} value={form.type} onChange={(event) => set('type', event.target.value)}>
                                {['standard', 'combo', 'ingredient', 'service', 'digital'].map((type) => <option key={type} value={type}>{type}</option>)}
                            </select>
                        </label>
                        <label>Category
                            <select disabled={readOnly} value={form.category_id || ''} onChange={(event) => set('category_id', event.target.value)}>
                                <option value="">Choose</option>
                                {lookups.categories.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                            </select>
                        </label>
                        <label>Brand
                            <select disabled={readOnly} value={form.brand_id || ''} onChange={(event) => set('brand_id', event.target.value)}>
                                <option value="">Choose</option>
                                {lookups.brands.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                            </select>
                        </label>
                        <label>Unit
                            <select disabled={readOnly} value={form.unit_id || ''} onChange={(event) => set('unit_id', event.target.value)}>
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
                        <label>Supplier
                            <select disabled={readOnly} value={form.supplier_id || ''} onChange={(event) => set('supplier_id', event.target.value)}>
                                <option value="">None</option>
                                {(lookups.suppliers || []).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                            </select>
                        </label>
                        <label className="wide">Description<textarea disabled={readOnly} value={form.description || ''} onChange={(event) => set('description', event.target.value)} /></label>
                        <label className="check"><input disabled={readOnly} type="checkbox" checked={!!form.is_active} onChange={(event) => set('is_active', event.target.checked)} /> Active</label>
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
                    </>
                )}

                {active === 'pricing' && (
                    <>
                        <label>Purchase cost<input disabled={readOnly} value={form.cost} onChange={(event) => set('cost', event.target.value)} /></label>
                        <label>Selling price<input disabled={readOnly} value={form.price} onChange={(event) => set('price', event.target.value)} /></label>
                        <label className="check"><input disabled={readOnly} type="checkbox" checked={!!form.has_promo} onChange={(event) => set('has_promo', event.target.checked)} /> Sale price</label>
                        {form.has_promo && <label>Sale price<input disabled={readOnly} value={form.promo_price || ''} onChange={(event) => set('promo_price', event.target.value)} /></label>}
                        <label>Tax
                            <select disabled={readOnly} value={form.tax_id || ''} onChange={(event) => set('tax_id', event.target.value)}>
                                <option value="">None</option>
                                {lookups.taxes.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                            </select>
                        </label>
                        <label>Tax method
                            <select disabled={readOnly} value={form.tax_method || 'exclusive'} onChange={(event) => set('tax_method', event.target.value)}>
                                <option value="exclusive">Exclusive</option>
                                <option value="inclusive">Inclusive</option>
                            </select>
                        </label>
                        {(business === 'grocery' || business === 'all_in_one') && (
                            <label>Wholesale price<input disabled={readOnly} value={form.details?.wholesale || ''} onChange={(event) => setDetail('wholesale', event.target.value)} /></label>
                        )}
                    </>
                )}

                {active === 'inventory' && (
                    <>
                        <label>Low-stock alert<input disabled={readOnly} type="number" min="0" value={form.alert_qty ?? 0} onChange={(event) => set('alert_qty', event.target.value)} /></label>
                        {readOnly && <label>Stock<input disabled value={form.stock_qty ?? 0} /></label>}
                        {!id && !readOnly && <label>Opening stock<input type="number" min="0" value={form.opening_stock} onChange={(event) => set('opening_stock', event.target.value)} /></label>}
                        <label className="check"><input disabled={readOnly} type="checkbox" checked={!!form.featured_in_pos} onChange={(event) => set('featured_in_pos', event.target.checked)} /> Show in POS</label>
                        {(moduleOn('batch') || form.has_batch) && <label className="check"><input disabled={readOnly} type="checkbox" checked={!!form.has_batch} onChange={(event) => set('has_batch', event.target.checked)} /> Batch and expiry</label>}
                        {(moduleOn('serial') || form.has_serial) && <label className="check"><input disabled={readOnly} type="checkbox" checked={!!form.has_serial} onChange={(event) => set('has_serial', event.target.checked)} /> Serial or IMEI</label>}
                        {(moduleOn('variants') || form.has_variant) && <label className="check"><input disabled={readOnly} type="checkbox" checked={!!form.has_variant} onChange={(event) => set('has_variant', event.target.checked)} /> Variants</label>}
                        <p className="muted wide">Changing the type keeps what you already typed. Batch, serial, and variant tracking cannot be combined in ways that would count the same unit twice. Services and digital products do not track stock.</p>
                    </>
                )}

                {active === 'batch' && (
                    <>
                        <label>Near-expiry days<input disabled={readOnly} type="number" min="1" value={form.near_expiry_days ?? 30} onChange={(event) => set('near_expiry_days', event.target.value)} /></label>
                        <p className="muted wide">Batches are created when you receive a purchase. Sales suggest the earliest unexpired batch and will not sell an expired one or more than that batch has.</p>
                        {(business === 'pharmacy' || business === 'all_in_one') && (
                            <>
                                <label>Generic name<input disabled={readOnly} value={form.details?.generic_name || ''} onChange={(event) => setDetail('generic_name', event.target.value)} /></label>
                                <label>Strength<input disabled={readOnly} value={form.details?.strength || ''} onChange={(event) => setDetail('strength', event.target.value)} /></label>
                                <label>Dosage form<input disabled={readOnly} value={form.details?.dosage_form || ''} onChange={(event) => setDetail('dosage_form', event.target.value)} /></label>
                                <label>Manufacturer<input disabled={readOnly} value={form.details?.manufacturer || ''} onChange={(event) => setDetail('manufacturer', event.target.value)} /></label>
                                <label className="check"><input disabled={readOnly} type="checkbox" checked={!!form.details?.prescription_required} onChange={(event) => setDetail('prescription_required', event.target.checked)} /> Prescription required</label>
                            </>
                        )}
                    </>
                )}

                {active === 'serial' && (
                    <p className="muted wide">Enter each serial number or IMEI when the unit is purchased. An IMEI is checked as a 15-digit number. A normal serial is not treated as an IMEI. Each identifier can exist once in this shop.</p>
                )}

                {active === 'variants' && (
                    <div className="wide">
                        {variants.map((variant, index) => (
                            <div className="line variant-line" key={variant.id || index}>
                                <input disabled={readOnly} placeholder="Name" value={variant.name || ''} onChange={(event) => variantChange(index, 'name', event.target.value)} />
                                <input disabled={readOnly} placeholder="SKU" value={variant.sku || ''} onChange={(event) => variantChange(index, 'sku', event.target.value)} />
                                <input disabled={readOnly} placeholder="Barcode" value={variant.barcode || ''} onChange={(event) => variantChange(index, 'barcode', event.target.value)} />
                                <input disabled={readOnly} placeholder="Size" value={variant.size || ''} onChange={(event) => variantChange(index, 'size', event.target.value)} />
                                <input disabled={readOnly} placeholder="Color" value={variant.color || ''} onChange={(event) => variantChange(index, 'color', event.target.value)} />
                                <input disabled={readOnly} placeholder="Style" value={variant.style || ''} onChange={(event) => variantChange(index, 'style', event.target.value)} />
                                <input disabled={readOnly} placeholder="Price" value={variant.price || ''} onChange={(event) => variantChange(index, 'price', event.target.value)} />
                                <input disabled={readOnly} placeholder="Stock" type="number" value={variant.stock_qty || 0} onChange={(event) => variantChange(index, 'stock_qty', event.target.value)} />
                            </div>
                        ))}
                        {!readOnly && <button className="btn" type="button" onClick={() => setVariants((rows) => rows.concat([{ name: '', sku: '', barcode: '', price: '', stock_qty: 0, size: '', color: '', style: '' }]))}>Add variant</button>}
                        <p className="muted">On a new product, variant quantities become the opening stock. Later purchases add to the product total.</p>
                    </div>
                )}

                {active === 'warranty' && (
                    <>
                        <label>Warranty months<input disabled={readOnly} type="number" min="0" value={form.details?.warranty_months || ''} onChange={(event) => setDetail('warranty_months', event.target.value)} /></label>
                        <p className="muted wide">Warranty starts when the unit is sold. Service notes are recorded on the sale.</p>
                        {(business === 'electronics' || business === 'all_in_one') && (
                            <>
                                <label>Model<input disabled={readOnly} value={form.details?.model || ''} onChange={(event) => setDetail('model', event.target.value)} /></label>
                                <label>Storage<input disabled={readOnly} value={form.details?.storage || ''} onChange={(event) => setDetail('storage', event.target.value)} /></label>
                                <label>RAM<input disabled={readOnly} value={form.details?.ram || ''} onChange={(event) => setDetail('ram', event.target.value)} /></label>
                            </>
                        )}
                    </>
                )}

                {active === 'recipe' && (
                    <div className="wide">
                        <p className="muted">A menu item or bundle deducts these ingredient quantities. The bundle itself is not a second stock pile.</p>
                        {ingredients.map((row, index) => (
                            <div className="line" key={index}>
                                <select disabled={readOnly} value={row.ingredient_id || ''} onChange={(event) => setIngredients((rows) => rows.map((item, itemIndex) => itemIndex === index ? { ...item, ingredient_id: event.target.value } : item))}>
                                    <option value="">Ingredient</option>
                                    {(lookups.products || []).filter((item) => String(item.id) !== String(id) && item.type !== 'combo').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                                </select>
                                <input disabled={readOnly} type="number" min="1" value={row.qty || 1} onChange={(event) => setIngredients((rows) => rows.map((item, itemIndex) => itemIndex === index ? { ...item, qty: event.target.value } : item))} />
                            </div>
                        ))}
                        {!readOnly && <button className="btn" type="button" onClick={() => setIngredients((rows) => rows.concat([{ ingredient_id: '', qty: 1 }]))}>Add ingredient</button>}
                    </div>
                )}

                {active === 'extra' && (
                    <>
                        <label>Pack size<input disabled={readOnly} value={form.details?.pack_size || ''} onChange={(event) => setDetail('pack_size', event.target.value)} /></label>
                        <label>Weight<input disabled={readOnly} value={form.details?.weight || ''} onChange={(event) => setDetail('weight', event.target.value)} /></label>
                        <label>Color<input disabled={readOnly} value={form.details?.color || ''} onChange={(event) => setDetail('color', event.target.value)} /></label>
                        <label>Style<input disabled={readOnly} value={form.details?.style || ''} onChange={(event) => setDetail('style', event.target.value)} /></label>
                        <p className="muted wide">These details are optional. They stay in the form when you switch product type, and they are saved only if you keep them.</p>
                    </>
                )}

                {readOnly && active === 'pricing' && <p className="muted wide">Selling price {money(Math.round(Number(form.price || 0) * 100))} · Cost {money(Math.round(Number(form.cost || 0) * 100))}</p>}
                {!readOnly && (
                    <div className="wide actions" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                        <Link to="/products" className="btn">{t('Cancel')}</Link>
                        <button className="btn primary" type="submit" disabled={saveState.isLoading}>
                            {saveState.isLoading ? t('Loading') : t('Save product')}
                        </button>
                    </div>
                )}
            </form>
        </>
    );
}
