import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, getCurrencySymbol, money } from '../api';
import { useT } from '../i18n';
import { useGetPurchaseFormQuery, useSavePurchaseMutation } from '../services/bornoposApi';

export function PurchaseForm() {
    const t = useT();
    const navigate = useNavigate();
    const currency = getCurrencySymbol();

    // Data fetching
    const { data, isLoading } = useGetPurchaseFormQuery();
    const [savePurchase, { isLoading: isSaving }] = useSavePurchaseMutation();

    // Master Info State
    const [warehouseId, setWarehouseId] = useState('');
    const [supplierId, setSupplierId] = useState('');
    const [purchasedOn, setPurchasedOn] = useState(() => new Date().toISOString().slice(0, 10));
    const [reference, setReference] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [note, setNote] = useState('');

    // Summary & Charges
    const [tax, setTax] = useState('0');
    const [discount, setDiscount] = useState('0');
    const [shipping, setShipping] = useState('0');
    const [paid, setPaid] = useState('0');
    const [autoSyncPaid, setAutoSyncPaid] = useState(true);

    // Purchase Lines
    const [lines, setLines] = useState([]);

    // Live Product Search
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearchingLive, setIsSearchingLive] = useState(false);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const [highlightIndex, setHighlightIndex] = useState(0);
    const searchInputRef = useRef(null);
    const dropdownRef = useRef(null);

    // Quick Add Supplier Modal State
    const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
    const [newSupplier, setNewSupplier] = useState({ name: '', company: '', phone: '', email: '', address: '' });
    const [isSavingSupplier, setIsSavingSupplier] = useState(false);
    const [supplierModalError, setSupplierModalError] = useState('');
    const [localSuppliers, setLocalSuppliers] = useState([]);

    // Notification / Error banners
    const [errorMessage, setErrorMessage] = useState('');
    const [successNotice, setSuccessNotice] = useState('');

    // Initialize defaults when API data loads
    useEffect(() => {
        if (data) {
            if (data.warehouses?.length && !warehouseId) {
                setWarehouseId(String(data.warehouses[0].id));
            }
            if (data.suppliers?.length) {
                setLocalSuppliers(data.suppliers);
                if (!supplierId) {
                    setSupplierId(String(data.suppliers[0].id));
                }
            }
            if (data.suggested_reference && !reference) {
                setReference(data.suggested_reference);
            }
            if (data.payment_methods?.length && !paymentMethod) {
                setPaymentMethod(data.payment_methods[0]);
            }
        }
    }, [data]);

    // Handle outside click for search dropdown
    useEffect(() => {
        function handleClickOutside(e) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target) && !searchInputRef.current?.contains(e.target)) {
                setShowSearchDropdown(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter products locally & fallback to remote search
    useEffect(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) {
            setSearchResults([]);
            setShowSearchDropdown(false);
            return;
        }

        const allProducts = data?.products || [];
        const localMatches = allProducts.filter((p) => {
            const nameMatch = (p.name || '').toLowerCase().includes(query);
            const codeMatch = (p.code || '').toLowerCase().includes(query);
            const barcodeMatch = (p.barcode || '').toLowerCase().includes(query);
            const genericMatch = (p.generic_name || '').toLowerCase().includes(query);
            return nameMatch || codeMatch || barcodeMatch || genericMatch;
        });

        if (localMatches.length > 0) {
            setSearchResults(localMatches.slice(0, 15));
            setShowSearchDropdown(true);
            setHighlightIndex(0);
        } else {
            // Live query server if local list is limited
            const timer = setTimeout(async () => {
                try {
                    setIsSearchingLive(true);
                    const res = await api(`/purchase/create?q=${encodeURIComponent(query)}`);
                    if (res?.products?.length) {
                        setSearchResults(res.products.slice(0, 15));
                        setShowSearchDropdown(true);
                        setHighlightIndex(0);
                    } else {
                        setSearchResults([]);
                        setShowSearchDropdown(false);
                    }
                } catch {
                    setSearchResults([]);
                } finally {
                    setIsSearchingLive(false);
                }
            }, 250);

            return () => clearTimeout(timer);
        }
    }, [searchQuery, data?.products]);

    // Add product to purchase order
    function addProduct(product) {
        if (!product) return;

        setLines((prev) => {
            const existingIndex = prev.findIndex((l) => String(l.product_id) === String(product.id));
            if (existingIndex >= 0) {
                // Increment quantity
                const next = [...prev];
                next[existingIndex] = {
                    ...next[existingIndex],
                    qty: Number(next[existingIndex].qty || 0) + 1,
                };
                return next;
            }

            // New line
            const unitCost = product.cost_cents ? (product.cost_cents / 100).toFixed(2) : '0.00';
            const retailPrice = product.price_cents ? (product.price_cents / 100).toFixed(2) : '0.00';

            return [
                ...prev,
                {
                    product_id: product.id,
                    name: product.name,
                    code: product.code || '',
                    barcode: product.barcode || '',
                    generic_name: product.generic_name || '',
                    strength: product.strength || '',
                    dosage_form: product.dosage_form || '',
                    stock_qty: product.stock_qty || 0,
                    has_batch: Boolean(product.has_batch),
                    has_serial: Boolean(product.has_serial),
                    qty: 1,
                    cost: unitCost,
                    retail_price: retailPrice,
                    batch_no: '',
                    expiry_date: '',
                    manufactured_on: '',
                    serial: '',
                    identifier_kind: 'serial',
                },
            ];
        });

        setSearchQuery('');
        setShowSearchDropdown(false);
        searchInputRef.current?.focus();

        setSuccessNotice(`Added "${product.name}" to purchase`);
        setTimeout(() => setSuccessNotice(''), 2500);
    }

    // Handle Barcode Scanner / Enter key in search box
    function handleSearchKeyDown(e) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (searchResults.length > 0) {
                setHighlightIndex((prev) => (prev + 1) % searchResults.length);
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (searchResults.length > 0) {
                setHighlightIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const term = searchQuery.trim().toLowerCase();
            if (!term) return;

            // 1. Check exact barcode or code match first (ideal for barcode scanners)
            const exact = (data?.products || []).find(
                (p) => (p.barcode && p.barcode.toLowerCase() === term) || (p.code && p.code.toLowerCase() === term)
            );

            if (exact) {
                addProduct(exact);
                return;
            }

            // 2. Select currently highlighted item in dropdown
            if (searchResults.length > 0 && searchResults[highlightIndex]) {
                addProduct(searchResults[highlightIndex]);
            }
        } else if (e.key === 'Escape') {
            setShowSearchDropdown(false);
        }
    }

    // Line Updates
    function updateLine(index, key, value) {
        setLines((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], [key]: value };
            return next;
        });
    }

    function removeLine(index) {
        setLines((prev) => prev.filter((_, i) => i !== index));
    }

    function changeQty(index, delta) {
        setLines((prev) => {
            const next = [...prev];
            const current = Number(next[index].qty || 0);
            const updated = Math.max(1, current + delta);
            next[index] = { ...next[index], qty: updated };
            return next;
        });
    }

    // Financial calculations
    const subtotal = useMemo(() => {
        return lines.reduce((acc, row) => {
            const c = parseFloat(row.cost) || 0;
            const q = parseInt(row.qty, 10) || 0;
            return acc + c * q;
        }, 0);
    }, [lines]);

    const grandTotal = useMemo(() => {
        const tVal = parseFloat(tax) || 0;
        const sVal = parseFloat(shipping) || 0;
        const dVal = parseFloat(discount) || 0;
        return Math.max(0, subtotal + tVal + sVal - dVal);
    }, [subtotal, tax, shipping, discount]);

    const paidAmount = useMemo(() => {
        return parseFloat(paid) || 0;
    }, [paid]);

    const dueAmount = useMemo(() => {
        return Math.max(0, grandTotal - paidAmount);
    }, [grandTotal, paidAmount]);

    // Keep paid synced to grandTotal if user hasn't explicitly customized it
    useEffect(() => {
        if (autoSyncPaid) {
            setPaid(grandTotal > 0 ? grandTotal.toFixed(2) : '0');
        }
    }, [grandTotal, autoSyncPaid]);

    // Payment shortcuts
    function handlePayFull() {
        setAutoSyncPaid(true);
        setPaid(grandTotal.toFixed(2));
    }

    function handlePayZero() {
        setAutoSyncPaid(false);
        setPaid('0.00');
    }

    function handlePayHalf() {
        setAutoSyncPaid(false);
        setPaid((grandTotal / 2).toFixed(2));
    }

    // Submit Purchase Order
    async function handleSubmit(e) {
        e.preventDefault();
        setErrorMessage('');

        if (!warehouseId) {
            setErrorMessage('Please select a destination warehouse.');
            return;
        }

        if (!supplierId) {
            setErrorMessage('Please select a supplier.');
            return;
        }

        const validLines = lines.filter((l) => l.product_id && Number(l.qty) > 0);
        if (validLines.length === 0) {
            setErrorMessage('Please add at least one product with quantity greater than zero.');
            return;
        }

        // Prepare payload matching PurchaseController::store
        const payload = {
            warehouse_id: Number(warehouseId),
            supplier_id: Number(supplierId),
            reference: reference.trim() || undefined,
            purchased_on: purchasedOn,
            payment_method: paymentMethod || 'Cash',
            tax: parseFloat(tax) || 0,
            discount: parseFloat(discount) || 0,
            shipping: parseFloat(shipping) || 0,
            amount_paid: parseFloat(paid) || 0,
            note: note.trim() || undefined,
            items: validLines.map((l) => ({
                product_id: Number(l.product_id),
                qty: Number(l.qty),
                cost: l.cost,
                batch_no: l.has_batch && l.batch_no ? l.batch_no.trim() : undefined,
                expiry_date: l.has_batch && l.expiry_date ? l.expiry_date : undefined,
                manufactured_on: l.has_batch && l.manufactured_on ? l.manufactured_on : undefined,
                serial: l.has_serial && l.serial ? l.serial.trim() : undefined,
                identifier_kind: l.identifier_kind || 'serial',
            })),
        };

        const result = await savePurchase(payload);

        if (result.error) {
            const bag = result.error.data?.errors || {};
            const errText = Object.values(bag).flat().join(' ') || result.error.data?.message || 'Failed to save purchase order.';
            setErrorMessage(errText);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        const newPurchaseId = result.data?.purchase?.id;
        if (newPurchaseId) {
            navigate(`/purchase/${newPurchaseId}`);
        } else {
            navigate('/purchase/list');
        }
    }

    // Quick Add Supplier
    async function handleSaveNewSupplier(e) {
        e.preventDefault();
        setSupplierModalError('');

        if (!newSupplier.name.trim()) {
            setSupplierModalError('Supplier name is required.');
            return;
        }

        try {
            setIsSavingSupplier(true);
            const res = await api('/supplier', {
                method: 'POST',
                body: newSupplier,
            });

            if (res?.row) {
                const created = res.row;
                setLocalSuppliers((prev) => [created, ...prev]);
                setSupplierId(String(created.id));
                setIsSupplierModalOpen(false);
                setNewSupplier({ name: '', company: '', phone: '', email: '', address: '' });
                setSuccessNotice(`Supplier "${created.name}" created and selected!`);
                setTimeout(() => setSuccessNotice(''), 3000);
            }
        } catch (err) {
            setSupplierModalError(err.payload?.message || err.message || 'Could not save supplier.');
        } finally {
            setIsSavingSupplier(false);
        }
    }

    return (
        <div className="purchase-view-wrapper" style={{ paddingBottom: '60px' }}>
            {/* Top Navigation & Header */}
            <div className="page-title" style={{ marginBottom: '18px' }}>
                <div>
                    <div className="crumbs" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px', fontSize: '13px' }}>
                        <Link to="/purchase/list" style={{ color: 'var(--muted)', textDecoration: 'none' }}>
                            {t('Purchases')}
                        </Link>
                        <span>/</span>
                        <span style={{ color: 'var(--text)', fontWeight: 600 }}>{t('New Purchase Order')}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                            {t('Add Purchase / Stock Inflow')}
                        </h1>
                        <span className="badge ok" style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '999px' }}>
                            ⚡ Direct Receive & Stock In
                        </span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <Link to="/purchase/list" className="btn" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span>←</span> {t('Back to Purchases')}
                    </Link>
                </div>
            </div>

            {/* Notification Alerts */}
            {errorMessage && (
                <div className="card" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '14px 18px', borderRadius: '14px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '20px' }}>⚠️</span>
                    <div style={{ flex: 1, fontWeight: 600, fontSize: '14px' }}>{errorMessage}</div>
                    <button type="button" onClick={() => setErrorMessage('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', fontSize: '16px' }}>✕</button>
                </div>
            )}

            {successNotice && (
                <div className="card" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '12px 18px', borderRadius: '14px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span>✅</span>
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>{successNotice}</span>
                </div>
            )}

            <form onSubmit={handleSubmit}>
                {/* 2-Column Responsive Layout */}
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2.3fr) minmax(320px, 1fr)', gap: '20px', alignItems: 'start' }}>
                    {/* Left Column: Master Details, Product Search, Items Table */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        {/* 1. Master Purchase Information Card */}
                        <div className="card" style={{ padding: '20px', borderRadius: '18px', border: '1px solid var(--line)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--line)', paddingBottom: '10px' }}>
                                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>🏢</span> {t('Order & Supplier Details')}
                                </h3>
                                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Step 1: Set Origin & Destination</span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                                {/* Warehouse */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--muted)', marginBottom: '6px' }}>
                                        {t('Warehouse / Branch')} <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <select
                                        required
                                        value={warehouseId}
                                        onChange={(e) => setWarehouseId(e.target.value)}
                                        style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '10px', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--text)', fontSize: '13px' }}
                                    >
                                        <option value="">{t('Select Warehouse')}</option>
                                        {(data?.warehouses || []).map((w) => (
                                            <option key={w.id} value={w.id}>
                                                {w.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Supplier with Quick Add */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                        <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)' }}>
                                            {t('Supplier')} <span style={{ color: '#ef4444' }}>*</span>
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setIsSupplierModalOpen(true)}
                                            style={{ background: 'none', border: 'none', color: 'var(--blue)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                                        >
                                            + {t('Quick Add')}
                                        </button>
                                    </div>
                                    <select
                                        required
                                        value={supplierId}
                                        onChange={(e) => setSupplierId(e.target.value)}
                                        style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '10px', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--text)', fontSize: '13px' }}
                                    >
                                        <option value="">{t('Select Supplier')}</option>
                                        {localSuppliers.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.name} {s.company ? `(${s.company})` : ''} {s.phone ? `· ${s.phone}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Purchase Date */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--muted)', marginBottom: '6px' }}>
                                        {t('Purchase Date')} <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={purchasedOn}
                                        onChange={(e) => setPurchasedOn(e.target.value)}
                                        style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '10px', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--text)', fontSize: '13px' }}
                                    />
                                </div>

                                {/* Reference / Invoice # */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--muted)', marginBottom: '6px' }}>
                                        {t('Reference / Invoice No')}
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. PO-20261024 or BILL-9821"
                                        value={reference}
                                        onChange={(e) => setReference(e.target.value)}
                                        style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '10px', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--text)', fontSize: '13px' }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 2. Interactive Product Search & Fast Entry Bar */}
                        <div className="card" style={{ padding: '20px', borderRadius: '18px', border: '1px solid var(--line)', position: 'relative' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <label style={{ fontSize: '14px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>🔍</span> {t('Add Products / Medicines')}
                                    <span style={{ fontSize: '11px', background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: '999px', fontWeight: 600 }}>
                                        Barcode Scanner Ready 📷
                                    </span>
                                </label>
                                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                                    Press <kbd style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '11px' }}>Enter</kbd> or click to add
                                </span>
                            </div>

                            {/* Live Search Input with Barcode support */}
                            <div style={{ position: 'relative' }}>
                                <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg)', borderRadius: '12px', border: '2px solid var(--line)', padding: '0 14px', height: '50px', transition: 'border-color 0.2s' }}>
                                    <span style={{ fontSize: '18px', marginRight: '10px', opacity: 0.6 }}>🔍</span>
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={handleSearchKeyDown}
                                        placeholder={t('Type product name, medicine generic, brand, SKU or scan barcode...')}
                                        style={{ width: '100%', height: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', color: 'var(--text)', fontWeight: 500 }}
                                    />
                                    {isSearchingLive && (
                                        <span style={{ fontSize: '12px', color: 'var(--muted)', fontStyle: 'italic', marginRight: '8px' }}>Searching...</span>
                                    )}
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => { setSearchQuery(''); setShowSearchDropdown(false); }}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '16px', padding: '4px' }}
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>

                                {/* Autocomplete Search Dropdown */}
                                {showSearchDropdown && searchResults.length > 0 && (
                                    <div
                                        ref={dropdownRef}
                                        style={{
                                            position: 'absolute',
                                            top: '56px',
                                            left: 0,
                                            right: 0,
                                            background: 'var(--card)',
                                            border: '1px solid var(--line)',
                                            borderRadius: '14px',
                                            boxShadow: '0 14px 35px rgba(15,23,42,0.12)',
                                            maxHeight: '340px',
                                            overflowY: 'auto',
                                            zIndex: 50,
                                            padding: '6px',
                                        }}
                                    >
                                        <div style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            Found {searchResults.length} Products
                                        </div>
                                        {searchResults.map((product, idx) => {
                                            const isHighlighted = idx === highlightIndex;
                                            return (
                                                <div
                                                    key={product.id}
                                                    onClick={() => addProduct(product)}
                                                    onMouseEnter={() => setHighlightIndex(idx)}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        padding: '10px 14px',
                                                        borderRadius: '10px',
                                                        cursor: 'pointer',
                                                        background: isHighlighted ? 'rgba(47,128,237,0.08)' : 'transparent',
                                                        transition: 'background 0.15s',
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                        <div style={{ fontWeight: 700, fontSize: '14px', color: isHighlighted ? 'var(--blue)' : 'var(--text)' }}>
                                                            {product.name}
                                                        </div>
                                                        <div style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                            {product.code && <span>SKU: {product.code}</span>}
                                                            {product.barcode && <span>• Barcode: {product.barcode}</span>}
                                                            {product.generic_name && (
                                                                <span style={{ color: '#059669', fontWeight: 500 }}>• {product.generic_name}</span>
                                                            )}
                                                            {product.strength && <span>• {product.strength}</span>}
                                                        </div>
                                                    </div>

                                                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end' }}>
                                                        <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text)' }}>
                                                            Cost: {money(product.cost_cents || 0)}
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                                                                Stock: <strong>{product.stock_qty || 0}</strong>
                                                            </span>
                                                            {product.has_batch ? (
                                                                <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: '#fef3c7', color: '#92400e', fontWeight: 600 }}>
                                                                    Batch
                                                                </span>
                                                            ) : null}
                                                            {product.has_serial ? (
                                                                <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: '#e0e7ff', color: '#3730a3', fontWeight: 600 }}>
                                                                    Serial
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 3. Interactive Purchase Items Table */}
                        <div className="card" style={{ padding: '0', borderRadius: '18px', border: '1px solid var(--line)', overflow: 'hidden' }}>
                            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.01)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>
                                        📦 {t('Purchased Items')} ({lines.length})
                                    </h3>
                                    <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                                        {lines.reduce((acc, row) => acc + (parseInt(row.qty, 10) || 0), 0)} Total Units
                                    </span>
                                </div>
                                {lines.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setLines([])}
                                        style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                                    >
                                        Clear All Items
                                    </button>
                                )}
                            </div>

                            {lines.length === 0 ? (
                                <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--muted)' }}>
                                    <div style={{ fontSize: '42px', marginBottom: '12px' }}>🛒</div>
                                    <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
                                        No items in this purchase order yet
                                    </h4>
                                    <p style={{ margin: '0 0 16px 0', fontSize: '13px', maxWidth: '400px', marginInline: 'auto' }}>
                                        Scan barcode or search products using the bar above to add items, batch details, and purchase cost.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => searchInputRef.current?.focus()}
                                        className="btn primary"
                                        style={{ fontSize: '13px' }}
                                    >
                                        + Search Products
                                    </button>
                                </div>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                        <thead>
                                            <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--line)' }}>
                                                <th style={{ width: '40px', padding: '12px', textAlign: 'center', color: 'var(--muted)', fontWeight: 600 }}>#</th>
                                                <th style={{ padding: '12px', textAlign: 'left', color: 'var(--muted)', fontWeight: 600 }}>Product & Specs</th>
                                                <th style={{ width: '120px', padding: '12px', textAlign: 'center', color: 'var(--muted)', fontWeight: 600 }}>Unit Cost ({currency})</th>
                                                <th style={{ width: '140px', padding: '12px', textAlign: 'center', color: 'var(--muted)', fontWeight: 600 }}>Quantity</th>
                                                <th style={{ padding: '12px', textAlign: 'left', color: 'var(--muted)', fontWeight: 600 }}>Batch / Expiry / Serial</th>
                                                <th style={{ width: '110px', padding: '12px', textAlign: 'right', color: 'var(--muted)', fontWeight: 600 }}>Subtotal</th>
                                                <th style={{ width: '50px', padding: '12px', textAlign: 'center', color: 'var(--muted)', fontWeight: 600 }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {lines.map((line, idx) => {
                                                const lineSubtotal = (parseFloat(line.cost) || 0) * (parseInt(line.qty, 10) || 0);
                                                return (
                                                    <tr key={idx} style={{ borderBottom: '1px solid var(--line)', transition: 'background 0.15s' }}>
                                                        {/* Row number */}
                                                        <td style={{ padding: '14px 12px', textAlign: 'center', color: 'var(--muted)', fontWeight: 600 }}>
                                                            {idx + 1}
                                                        </td>

                                                        {/* Product details */}
                                                        <td style={{ padding: '14px 12px' }}>
                                                            <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)', marginBottom: '2px' }}>
                                                                {line.name}
                                                            </div>
                                                            <div style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                                                                {line.code && <span>SKU: {line.code}</span>}
                                                                {line.generic_name && (
                                                                    <span style={{ color: '#059669', fontWeight: 500 }}>• {line.generic_name}</span>
                                                                )}
                                                                {line.strength && <span>• {line.strength}</span>}
                                                                <span style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px', fontSize: '11px', color: '#475569' }}>
                                                                    Stock: {line.stock_qty}
                                                                </span>
                                                            </div>
                                                        </td>

                                                        {/* Unit Cost Input */}
                                                        <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                value={line.cost}
                                                                onChange={(e) => updateLine(idx, 'cost', e.target.value)}
                                                                style={{
                                                                    width: '100px',
                                                                    height: '36px',
                                                                    textAlign: 'center',
                                                                    padding: '0 8px',
                                                                    borderRadius: '8px',
                                                                    border: '1px solid var(--line)',
                                                                    background: 'var(--card)',
                                                                    color: 'var(--text)',
                                                                    fontWeight: 700,
                                                                    fontSize: '13px',
                                                                }}
                                                            />
                                                            {parseFloat(line.retail_price) > 0 && (
                                                                <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '2px' }}>
                                                                    Retail: {currency} {line.retail_price}
                                                                </div>
                                                            )}
                                                        </td>

                                                        {/* Quantity with + / - steppers */}
                                                        <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                                                            <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid var(--line)', borderRadius: '8px', overflow: 'hidden', background: 'var(--card)' }}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => changeQty(idx, -1)}
                                                                    style={{ width: '28px', height: '34px', background: 'var(--bg)', border: 'none', cursor: 'pointer', fontWeight: 800, color: 'var(--text)' }}
                                                                >
                                                                    -
                                                                </button>
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    value={line.qty}
                                                                    onChange={(e) => updateLine(idx, 'qty', e.target.value)}
                                                                    style={{ width: '45px', height: '34px', padding: '0', textAlign: 'center', border: 'none', outline: 'none', background: 'transparent', fontWeight: 700, fontSize: '13px', color: 'var(--text)' }}
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => changeQty(idx, 1)}
                                                                    style={{ width: '28px', height: '34px', background: 'var(--bg)', border: 'none', cursor: 'pointer', fontWeight: 800, color: 'var(--text)' }}
                                                                >
                                                                    +
                                                                </button>
                                                            </div>
                                                        </td>

                                                        {/* Batch / Expiry / Serial details */}
                                                        <td style={{ padding: '14px 12px' }}>
                                                            {line.has_batch && (
                                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: line.has_serial ? '6px' : '0' }}>
                                                                    <div>
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Batch No"
                                                                            value={line.batch_no}
                                                                            onChange={(e) => updateLine(idx, 'batch_no', e.target.value)}
                                                                            style={{ width: '100%', height: '32px', fontSize: '12px', padding: '0 8px', borderRadius: '6px', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--text)' }}
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <input
                                                                            type="date"
                                                                            title="Expiry Date"
                                                                            value={line.expiry_date}
                                                                            onChange={(e) => updateLine(idx, 'expiry_date', e.target.value)}
                                                                            style={{ width: '100%', height: '32px', fontSize: '12px', padding: '0 8px', borderRadius: '6px', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--text)' }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {line.has_serial && (
                                                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                                    <select
                                                                        value={line.identifier_kind}
                                                                        onChange={(e) => updateLine(idx, 'identifier_kind', e.target.value)}
                                                                        style={{ height: '32px', fontSize: '11px', borderRadius: '6px', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--text)' }}
                                                                    >
                                                                        <option value="serial">Serial</option>
                                                                        <option value="imei">IMEI</option>
                                                                    </select>
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Comma separated serials/IMEIs"
                                                                        value={line.serial}
                                                                        onChange={(e) => updateLine(idx, 'serial', e.target.value)}
                                                                        style={{ flex: 1, height: '32px', fontSize: '12px', padding: '0 8px', borderRadius: '6px', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--text)' }}
                                                                    />
                                                                </div>
                                                            )}

                                                            {!line.has_batch && !line.has_serial && (
                                                                <span style={{ fontSize: '12px', color: 'var(--muted)', fontStyle: 'italic' }}>
                                                                    Standard inventory
                                                                </span>
                                                            )}
                                                        </td>

                                                        {/* Line Subtotal */}
                                                        <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: 800, fontSize: '14px', color: 'var(--text)' }}>
                                                            {currency} {lineSubtotal.toFixed(2)}
                                                        </td>

                                                        {/* Remove action */}
                                                        <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeLine(idx)}
                                                                title="Remove line"
                                                                style={{ background: 'none', border: 'none', color: '#94a3b8', hover: { color: '#ef4444' }, cursor: 'pointer', fontSize: '16px', padding: '4px' }}
                                                            >
                                                                🗑️
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* 4. Notes & Remarks Card */}
                        <div className="card" style={{ padding: '18px 20px', borderRadius: '18px', border: '1px solid var(--line)' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--text)' }}>
                                📝 {t('Purchase Note / Internal Remarks')}
                            </label>
                            <textarea
                                rows="2"
                                placeholder={t('Add supplier notes, freight details, payment terms, or reference notes...')}
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--text)', fontSize: '13px', outline: 'none', resize: 'vertical' }}
                            />
                        </div>
                    </div>

                    {/* Right Column: Order Summary, Financial Breakdown, Payment, and Final Action */}
                    <div style={{ position: 'sticky', top: '88px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        <div className="card" style={{ padding: '22px', borderRadius: '20px', border: '1px solid var(--line)', boxShadow: '0 10px 30px rgba(15,23,42,0.05)' }}>
                            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 800, borderBottom: '1px solid var(--line)', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>🧾 {t('Purchase Summary')}</span>
                                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)' }}>
                                    {lines.length} items
                                </span>
                            </h3>

                            {/* Charges Breakdown */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--muted)' }}>
                                    <span>{t('Items Subtotal')}</span>
                                    <span style={{ fontWeight: 700, color: 'var(--text)' }}>{currency} {subtotal.toFixed(2)}</span>
                                </div>

                                {/* Order Tax */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                                    <span style={{ color: 'var(--muted)' }}>{t('Order Tax (+)')}</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={tax}
                                        onChange={(e) => setTax(e.target.value)}
                                        style={{ width: '100px', height: '32px', textAlign: 'right', padding: '0 8px', borderRadius: '6px', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--text)', fontSize: '13px', fontWeight: 600 }}
                                    />
                                </div>

                                {/* Shipping / Freight */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                                    <span style={{ color: 'var(--muted)' }}>{t('Shipping / Freight (+)')}</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={shipping}
                                        onChange={(e) => setShipping(e.target.value)}
                                        style={{ width: '100px', height: '32px', textAlign: 'right', padding: '0 8px', borderRadius: '6px', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--text)', fontSize: '13px', fontWeight: 600 }}
                                    />
                                </div>

                                {/* Discount */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                                    <span style={{ color: 'var(--muted)' }}>{t('Discount (-)')}</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={discount}
                                        onChange={(e) => setDiscount(e.target.value)}
                                        style={{ width: '100px', height: '32px', textAlign: 'right', padding: '0 8px', borderRadius: '6px', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--text)', fontSize: '13px', fontWeight: 600 }}
                                    />
                                </div>
                            </div>

                            {/* Net Grand Total Callout */}
                            <div style={{ background: 'var(--bg)', borderRadius: '14px', padding: '14px 16px', border: '1px solid var(--line)', marginBottom: '18px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
                                    {t('Net Grand Total')}
                                </div>
                                <div style={{ fontSize: '26px', fontWeight: 900, color: 'var(--blue)', letterSpacing: '-0.02em' }}>
                                    {currency} {grandTotal.toFixed(2)}
                                </div>
                            </div>

                            {/* Payment Section */}
                            <div style={{ borderTop: '1px solid var(--line)', paddingTop: '16px', marginBottom: '18px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                                        💳 {t('Payment & Settlement')}
                                    </label>
                                    {/* Status Badge */}
                                    {grandTotal === 0 ? (
                                        <span className="badge" style={{ background: '#f1f5f9', color: '#64748b' }}>Zero Total</span>
                                    ) : dueAmount === 0 ? (
                                        <span className="badge ok" style={{ fontSize: '11px' }}>Paid in Full</span>
                                    ) : paidAmount > 0 ? (
                                        <span className="badge" style={{ background: '#fef3c7', color: '#b45309', fontSize: '11px' }}>Partial Paid</span>
                                    ) : (
                                        <span className="badge bad" style={{ fontSize: '11px' }}>Full Due</span>
                                    )}
                                </div>

                                {/* Payment Method Dropdown */}
                                <div style={{ marginBottom: '12px' }}>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px' }}>
                                        {t('Payment Method')}
                                    </label>
                                    <select
                                        value={paymentMethod}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                        style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--text)', fontSize: '13px', fontWeight: 600 }}
                                    >
                                        {(data?.payment_methods || ['Cash', 'Bank Transfer', 'bKash', 'Nagad', 'Rocket', 'Card', 'Cheque']).map((m) => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Amount Paid Input */}
                                <div style={{ marginBottom: '10px' }}>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px' }}>
                                        {t('Amount Paid')} ({currency})
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={paid}
                                        onChange={(e) => {
                                            setAutoSyncPaid(false);
                                            setPaid(e.target.value);
                                        }}
                                        style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--text)', fontSize: '16px', fontWeight: 800 }}
                                    />
                                </div>

                                {/* Quick Shortcuts */}
                                <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
                                    <button
                                        type="button"
                                        onClick={handlePayFull}
                                        style={{ flex: 1, padding: '6px 8px', fontSize: '11px', fontWeight: 700, borderRadius: '6px', border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#166534', cursor: 'pointer' }}
                                    >
                                        Pay Full
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handlePayHalf}
                                        style={{ flex: 1, padding: '6px 8px', fontSize: '11px', fontWeight: 700, borderRadius: '6px', border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer' }}
                                    >
                                        50%
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handlePayZero}
                                        style={{ flex: 1, padding: '6px 8px', fontSize: '11px', fontWeight: 700, borderRadius: '6px', border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b', cursor: 'pointer' }}
                                    >
                                        Zero (Due)
                                    </button>
                                </div>

                                {/* Remaining Due Indicator */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: dueAmount > 0 ? '#fff1f2' : '#f0fdf4', borderRadius: '8px', border: `1px solid ${dueAmount > 0 ? '#fecaca' : '#bbf7d0'}` }}>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: dueAmount > 0 ? '#be123c' : '#15803d' }}>
                                        {dueAmount > 0 ? 'Remaining Due:' : 'Status:'}
                                    </span>
                                    <span style={{ fontSize: '14px', fontWeight: 900, color: dueAmount > 0 ? '#be123c' : '#15803d' }}>
                                        {dueAmount > 0 ? `${currency} ${dueAmount.toFixed(2)}` : 'Fully Settled'}
                                    </span>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <button
                                    type="submit"
                                    disabled={isSaving || lines.length === 0}
                                    className="btn primary"
                                    style={{
                                        width: '100%',
                                        height: '48px',
                                        borderRadius: '12px',
                                        fontSize: '15px',
                                        fontWeight: 800,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        boxShadow: '0 8px 20px rgba(47,128,237,0.3)',
                                        cursor: isSaving || lines.length === 0 ? 'not-allowed' : 'pointer',
                                        opacity: isSaving || lines.length === 0 ? 0.6 : 1,
                                    }}
                                >
                                    {isSaving ? 'Saving Purchase...' : '⚡ Save & Receive Purchase'}
                                </button>

                                <Link
                                    to="/purchase/list"
                                    className="btn"
                                    style={{ width: '100%', height: '40px', borderRadius: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
                                >
                                    {t('Cancel')}
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </form>

            {/* Quick Add Supplier Modal */}
            {isSupplierModalOpen && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(15,23,42,0.5)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 100,
                        padding: '16px',
                    }}
                >
                    <div
                        className="card"
                        style={{
                            width: '100%',
                            maxWidth: '480px',
                            borderRadius: '20px',
                            padding: '24px',
                            background: 'var(--card)',
                            boxShadow: '0 20px 45px rgba(0,0,0,0.2)',
                            position: 'relative',
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>
                                ➕ {t('Quick Add Supplier')}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsSupplierModalOpen(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--muted)' }}
                            >
                                ✕
                            </button>
                        </div>

                        {supplierModalError && (
                            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', marginBottom: '14px' }}>
                                {supplierModalError}
                            </div>
                        )}

                        <form onSubmit={handleSaveNewSupplier} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px' }}>
                                    {t('Supplier Name')} <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g. Beximco Pharma Distributors"
                                    value={newSupplier.name}
                                    onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                                    style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)', fontSize: '13px' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px' }}>
                                        {t('Company')}
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Company name"
                                        value={newSupplier.company}
                                        onChange={(e) => setNewSupplier({ ...newSupplier, company: e.target.value })}
                                        style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)', fontSize: '13px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px' }}>
                                        {t('Phone')}
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 01700000000"
                                        value={newSupplier.phone}
                                        onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                                        style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)', fontSize: '13px' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px' }}>
                                    {t('Email')}
                                </label>
                                <input
                                    type="email"
                                    placeholder="supplier@example.com"
                                    value={newSupplier.email}
                                    onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                                    style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)', fontSize: '13px' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px' }}>
                                    {t('Address')}
                                </label>
                                <input
                                    type="text"
                                    placeholder="Dhaka, Bangladesh"
                                    value={newSupplier.address}
                                    onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                                    style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)', fontSize: '13px' }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsSupplierModalOpen(false)}
                                    className="btn"
                                    style={{ fontSize: '13px' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingSupplier}
                                    className="btn primary"
                                    style={{ fontSize: '13px' }}
                                >
                                    {isSavingSupplier ? 'Saving...' : 'Save & Select Supplier'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
