import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { api, getCurrencyCode, getCurrencySymbol, money, setCurrency } from '../api';
import { Logo } from '../icons';
import { motion, AnimatePresence } from '../motion';
import { useT } from '../i18n';
import { toggleTheme } from '../slices/uiSlice';
import { useCheckoutMutation, useGetPosQuery } from '../services/bornoposApi';

function cents(value) {
    const number = Number(String(value || '0').replace(/,/g, ''));
    if (!Number.isFinite(number)) return 0;

    return Math.round(number * 100);
}

const methods = ['Cash', 'paystack', 'Razorpay', 'PayPal', 'stripe'];

function uid() {
    return globalThis.crypto?.randomUUID?.() || `pos-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function blankOrder(number) {
    return {
        id: uid(),
        number,
        cart: [],
        customerId: '',
        discount: '0',
        coupon: '',
        paid: '',
        method: 'Cash',
        message: '',
        idempotency: uid(),
    };
}

export default function Pos() {
    const t = useT();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const uiTheme = useSelector((state) => state.ui?.theme) || (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    const { data, isFetching, refetch } = useGetPosQuery();
    const [checkout, checkoutState] = useCheckoutMutation();
    const [q, setQ] = useState('');
    const [category, setCategory] = useState('');
    const [brand, setBrand] = useState('');
    const [picker, setPicker] = useState(null);
    const [paidNotice, setPaidNotice] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [currentTime, setCurrentTime] = useState(() => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    const [activeCurrencySymbol, setActiveCurrencySymbol] = useState(() => getCurrencySymbol());

    // Print & Receipt Popup Modal State
    const [printModalSale, setPrintModalSale] = useState(null);
    const [printFormat, setPrintFormat] = useState('pos'); // 'pos' or 'a4'

    // Customer search & quick add state
    const [customCustomers, setCustomCustomers] = useState([]);
    const [customerSearch, setCustomerSearch] = useState('');
    const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [savingCustomer, setSavingCustomer] = useState(false);
    const [customerModalError, setCustomerModalError] = useState('');
    const [newCustomerForm, setNewCustomerForm] = useState({ phone: '', name: '', email: '', address: '' });
    const custDropdownRef = useRef(null);

    // Keyboard Shortcuts & Input Refs for Super Fast POS Ordering
    const [showShortcutsModal, setShowShortcutsModal] = useState(false);
    const searchInputRef = useRef(null);
    const custSearchInputRef = useRef(null);
    const discountInputRef = useRef(null);
    const paidInputRef = useRef(null);

    // Extra discount & coupon fold state
    const [showDiscounts, setShowDiscounts] = useState(false);

    const [session, setSession] = useState(() => {
        const order = blankOrder(1);

        return { orders: [order], activeId: order.id, next: 2 };
    });
    const active = session.orders.find((order) => order.id === session.activeId) || session.orders[0];
    const cart = active.cart;
    const customerId = active.customerId;
    const discount = active.discount;
    const coupon = active.coupon;
    const paid = active.paid;
    const method = active.method;
    const message = active.message;

    // Keep live clock running
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    // Sync currency from backend data & window events
    useEffect(() => {
        if (data?.currency_symbol) {
            setCurrency(data.currency_symbol, data.currency_code);
            setActiveCurrencySymbol(data.currency_symbol);
        }
    }, [data]);

    useEffect(() => {
        function onCurrencyChanged(e) {
            setActiveCurrencySymbol(e.detail?.symbol || getCurrencySymbol());
        }
        window.addEventListener('bornopos-currency-changed', onCurrencyChanged);

        return () => window.removeEventListener('bornopos-currency-changed', onCurrencyChanged);
    }, []);

    // Track fullscreen state change (e.g. user presses Esc)
    useEffect(() => {
        function onFsChange() {
            setIsFullscreen(!!document.fullscreenElement);
        }
        document.addEventListener('fullscreenchange', onFsChange);

        return () => document.removeEventListener('fullscreenchange', onFsChange);
    }, []);

    // Close customer dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event) {
            if (custDropdownRef.current && !custDropdownRef.current.contains(event.target)) {
                setCustomerDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);

        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {
                setIsFullscreen(true);
            });
        } else {
            document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {
                setIsFullscreen(false);
            });
        }
    }

    const allCustomers = useMemo(() => {
        const list = [...customCustomers, ...(data?.customers || [])];
        const seen = new Set();

        return list.filter((c) => {
            if (seen.has(c.id)) return false;
            seen.add(c.id);

            return true;
        });
    }, [customCustomers, data]);

    const selectedCustomer = useMemo(() => (
        allCustomers.find((c) => String(c.id) === String(customerId)) || null
    ), [allCustomers, customerId]);

    const filteredCustomers = useMemo(() => {
        const qTrim = customerSearch.trim().toLowerCase();
        if (!qTrim) return allCustomers.slice(0, 15);

        return allCustomers.filter((c) => (
            (c.phone && c.phone.toLowerCase().includes(qTrim))
            || (c.name && c.name.toLowerCase().includes(qTrim))
        )).slice(0, 15);
    }, [allCustomers, customerSearch]);

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
            patchOrder((order) => ({ ...order, message: `${product.name} is out of stock.` }));
            return;
        }
        setPicker(null);
        const key = product.has_serial ? `${product.id}:serial:${Date.now()}` : `${product.id}:${variant?.id || ''}`;
        const batches = (product.batches || []).filter((batch) => !batch.expired && batch.qty > 0);
        const line = {
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
        };
        patchOrder((order) => {
            const found = order.cart.find((row) => row.key === key);
            const cart = found && !product.has_serial
                ? order.cart.map((row) => row.key === key ? { ...row, qty: Math.min(row.stock_qty, row.qty + 1) } : row)
                : order.cart.concat(line);

            return { ...order, cart, message: '' };
        });
    }

    function patchOrder(updater) {
        setSession((current) => ({
            ...current,
            orders: current.orders.map((order) => order.id === current.activeId ? updater(order) : order),
        }));
    }

    function setQty(key, value) {
        patchOrder((order) => ({
            ...order,
            cart: order.cart.map((row) => {
                if (row.key !== key) return row;
                const qty = Math.max(1, Math.min(row.has_serial ? 1 : row.stock_qty, Number(value) || 1));

                return { ...row, qty };
            }),
        }));
    }

    function stepQty(key, delta) {
        patchOrder((order) => ({
            ...order,
            cart: order.cart.map((row) => {
                if (row.key !== key) return row;
                const target = row.qty + delta;
                if (target <= 0) return null;
                const qty = Math.min(row.has_serial ? 1 : row.stock_qty, target);

                return { ...row, qty };
            }).filter(Boolean),
        }));
    }

    function patchLine(key, values) {
        patchOrder((order) => ({
            ...order,
            cart: order.cart.map((row) => row.key === key ? { ...row, ...values } : row),
        }));
    }

    function openOrder() {
        setPicker(null);
        setSession((current) => {
            if (current.orders.length >= 8) return current;
            const order = blankOrder(current.next);

            return { orders: current.orders.concat(order), activeId: order.id, next: current.next + 1 };
        });
    }

    function selectOrder(id) {
        setPicker(null);
        setSession((current) => ({ ...current, activeId: id }));
    }

    function closeOrder(id) {
        setPicker(null);
        setSession((current) => {
            const orders = current.orders.filter((order) => order.id !== id);
            if (orders.length === 0) {
                const order = blankOrder(current.next);

                return { orders: [order], activeId: order.id, next: current.next + 1 };
            }

            return { ...current, orders, activeId: current.activeId === id ? orders[orders.length - 1].id : current.activeId };
        });
    }

    function openAddCustomerModal(phonePreset = '') {
        setNewCustomerForm({
            phone: phonePreset || (customerSearch.match(/^\+?[0-9\- ]+$/) ? customerSearch.trim() : ''),
            name: '',
            email: '',
            address: '',
        });
        setCustomerModalError('');
        setShowCustomerModal(true);
        setCustomerDropdownOpen(false);
    }

    async function handleSaveCustomer(e) {
        e.preventDefault();
        if (!newCustomerForm.name.trim()) {
            setCustomerModalError(t('Customer name is required.'));
            return;
        }
        setSavingCustomer(true);
        setCustomerModalError('');
        try {
            const res = await api('/customer', {
                method: 'POST',
                body: newCustomerForm,
            });
            const created = res.row;
            if (created) {
                setCustomCustomers((prev) => [created, ...prev]);
                patchOrder((order) => ({ ...order, customerId: String(created.id) }));
                setShowCustomerModal(false);
                setCustomerDropdownOpen(false);
                setCustomerSearch('');
            }
        } catch (err) {
            const bag = err.payload?.errors || {};
            setCustomerModalError(Object.values(bag).flat().join(' ') || err.message || t('Could not save customer.'));
        } finally {
            setSavingCustomer(false);
        }
    }

    function handlePrint(format = printFormat) {
        if (!printModalSale) return;
        const url = `/sales/${printModalSale.id}/print?format=${format}&auto=1`;
        window.open(url, '_blank', 'width=900,height=900,scrollbars=yes,status=no,location=no');
    }

    async function submit(status) {
        const orderId = active.id;
        const orderNumber = active.number;
        patchOrder((order) => ({ ...order, message: '' }));
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
            idempotency_key: active.idempotency,
        });
        if (result.error) {
            const bag = result.error.data?.errors || {};
            setSession((current) => ({
                ...current,
                orders: current.orders.map((order) => order.id === orderId ? { ...order, message: Object.values(bag).flat().join(' ') || result.error.data?.message || 'The sale could not be saved.' } : order),
            }));
            return;
        }
        await refetch();
        if (status === 'completed') {
            setPaidNotice({ id: result.data.sale.id, invoice: result.data.sale.invoice_no, number: orderNumber });
            setPrintModalSale(result.data.sale);
            closeOrder(orderId);
            return;
        }
        setSession((current) => ({
            ...current,
            orders: current.orders.map((order) => order.id === orderId ? {
                ...order,
                cart: [],
                customerId: '',
                discount: '0',
                coupon: '',
                paid: '',
                method: 'Cash',
                message: result.data.message,
                idempotency: uid(),
            } : order),
        }));
    }

    // Keep refs synchronized for the global keyboard shortcuts listener
    const activeRef = useRef(active);
    activeRef.current = active;
    const ordersRef = useRef(session.orders);
    ordersRef.current = session.orders;
    const checkoutLoadingRef = useRef(checkoutState.isLoading);
    checkoutLoadingRef.current = checkoutState.isLoading;
    const printModalSaleRef = useRef(printModalSale);
    printModalSaleRef.current = printModalSale;
    const printFormatRef = useRef(printFormat);
    printFormatRef.current = printFormat;
    const showCustomerModalRef = useRef(showCustomerModal);
    showCustomerModalRef.current = showCustomerModal;
    const showShortcutsModalRef = useRef(showShortcutsModal);
    showShortcutsModalRef.current = showShortcutsModal;
    const customerDropdownOpenRef = useRef(customerDropdownOpen);
    customerDropdownOpenRef.current = customerDropdownOpen;
    const qRef = useRef(q);
    qRef.current = q;
    const productsRef = useRef(products);
    productsRef.current = products;

    // Fast Barcode Scanner and Search Enter Handler
    function handleSearchKeyDown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const term = q.trim().toLowerCase();
            if (!term) return;

            // 1. Exact match by barcode, code, or sku
            const exact = (data?.products || []).find((p) => {
                const codeMatch = p.code && String(p.code).toLowerCase() === term;
                const barcodeMatch = p.barcode && String(p.barcode).toLowerCase() === term;
                const skuMatch = p.sku && String(p.sku).toLowerCase() === term;
                return barcodeMatch || codeMatch || skuMatch;
            });

            if (exact) {
                add(exact);
                setQ('');
                return;
            }

            // 2. Pick top matching product from current search list
            if (products.length > 0) {
                add(products[0]);
                setQ('');
            }
        }
    }

    // Global Keyboard Shortcuts for Super Fast Cashier Flow
    useEffect(() => {
        function handleGlobalKeyDown(e) {
            const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName);
            const key = e.key;

            // F1: Focus Product / Barcode Search
            if (key === 'F1') {
                e.preventDefault();
                searchInputRef.current?.focus();
                searchInputRef.current?.select?.();
                return;
            }

            // F2: Focus Customer Search
            if (key === 'F2') {
                e.preventDefault();
                custSearchInputRef.current?.focus();
                custSearchInputRef.current?.select?.();
                setCustomerDropdownOpen(true);
                return;
            }

            // F3 or Alt+C: Add Customer Modal
            if (key === 'F3' || (e.altKey && (key === 'c' || key === 'C'))) {
                e.preventDefault();
                openAddCustomerModal();
                return;
            }

            // F4 or Alt+D: Toggle Discount / Coupon & Focus discount
            if (key === 'F4' || (e.altKey && (key === 'd' || key === 'D'))) {
                e.preventDefault();
                setShowDiscounts((prev) => {
                    const next = !prev;
                    if (next) {
                        setTimeout(() => discountInputRef.current?.focus(), 60);
                    }
                    return next;
                });
                return;
            }

            // F8 or Alt+X: Clear Active Cart
            if (key === 'F8' || (e.altKey && (key === 'x' || key === 'X'))) {
                e.preventDefault();
                if (activeRef.current?.cart?.length > 0) {
                    patchOrder((order) => ({ ...order, cart: [] }));
                }
                return;
            }

            // F9 or (Ctrl/Cmd + Enter) or Alt+P: Super Fast Complete & Pay
            if (key === 'F9' || ((e.ctrlKey || e.metaKey) && key === 'Enter') || (e.altKey && (key === 'p' || key === 'P'))) {
                e.preventDefault();
                if (activeRef.current?.cart?.length > 0 && !checkoutLoadingRef.current) {
                    submit('completed');
                }
                return;
            }

            // Alt+S: Save Draft
            if (e.altKey && (key === 's' || key === 'S')) {
                e.preventDefault();
                if (activeRef.current?.cart?.length > 0 && !checkoutLoadingRef.current) {
                    submit('draft');
                }
                return;
            }

            // Alt+N: New Order Tab
            if (e.altKey && (key === 'n' || key === 'N')) {
                e.preventDefault();
                openOrder();
                return;
            }

            // Alt+W: Close Current Order Tab
            if (e.altKey && (key === 'w' || key === 'W')) {
                e.preventDefault();
                closeOrder(activeRef.current.id);
                return;
            }

            // Alt+1 .. Alt+8: Direct Switch to Order Tabs
            if (e.altKey && /^[1-8]$/.test(key)) {
                const index = Number(key) - 1;
                if (ordersRef.current[index]) {
                    e.preventDefault();
                    selectOrder(ordersRef.current[index].id);
                }
                return;
            }

            // Alt+M: Cycle Payment Method
            if (e.altKey && (key === 'm' || key === 'M')) {
                e.preventDefault();
                const currMethod = activeRef.current?.method || 'Cash';
                const currIdx = methods.indexOf(currMethod);
                const nextMethod = methods[(currIdx + 1) % methods.length];
                patchOrder((order) => ({ ...order, method: nextMethod }));
                return;
            }

            // F11: Toggle Fullscreen
            if (key === 'F11') {
                e.preventDefault();
                toggleFullscreen();
                return;
            }

            // F10 or ?: Open/close keyboard shortcuts cheat sheet
            if (key === 'F10' || (!isInput && key === '?')) {
                e.preventDefault();
                setShowShortcutsModal((prev) => !prev);
                return;
            }

            // In Print Modal shortcuts:
            if (printModalSaleRef.current) {
                if (key === 'p' || key === 'P' || key === 'Enter') {
                    if (!isInput) {
                        e.preventDefault();
                        handlePrint(printFormatRef.current);
                        return;
                    }
                }
                if (key === '1' && !isInput) {
                    e.preventDefault();
                    setPrintFormat('pos');
                    return;
                }
                if (key === '2' && !isInput) {
                    e.preventDefault();
                    setPrintFormat('a4');
                    return;
                }
            }

            // Escape: Dismiss active modals or clear search
            if (key === 'Escape') {
                if (showShortcutsModalRef.current) {
                    e.preventDefault();
                    setShowShortcutsModal(false);
                    return;
                }
                if (printModalSaleRef.current) {
                    e.preventDefault();
                    setPrintModalSale(null);
                    return;
                }
                if (showCustomerModalRef.current) {
                    e.preventDefault();
                    setShowCustomerModal(false);
                    return;
                }
                if (customerDropdownOpenRef.current) {
                    e.preventDefault();
                    setCustomerDropdownOpen(false);
                    return;
                }
                if (qRef.current) {
                    setQ('');
                    return;
                }
            }

            // '/' Shortcut when not typing in an input
            if (!isInput && key === '/') {
                e.preventDefault();
                searchInputRef.current?.focus();
                searchInputRef.current?.select?.();
            }
        }

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, []);

    const shopName = data?.store?.name || window.BornoPos?.store?.name || 'BornoPos';
    const activeCurrencyCode = data?.currency_code || window.BornoPos?.currency_code || 'BDT';

    return (
        <div className={`pos-container ${isFullscreen ? 'is-fullscreen' : ''}`}>
            {paidNotice && (
                <div className="note flash" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0, padding: '8px 14px' }}>
                    <span>
                        🎉 {t('Order')} #{paidNotice.number} {t('paid')}. <Link to={`/sales/${paidNotice.id}`}><b>{paidNotice.invoice}</b></Link>
                    </span>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                            type="button"
                            className="btn primary"
                            style={{ padding: '3px 10px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => {
                                if (printModalSale) {
                                    setPrintModalSale({ ...printModalSale });
                                } else {
                                    window.open(`/sales/${paidNotice.id}/print?format=pos&auto=1`, '_blank', 'width=900,height=900');
                                }
                            }}
                        >
                            🖨️ {t('Print Receipt')}
                        </button>
                        <button type="button" className="btn" style={{ padding: '3px 8px', fontSize: '11px' }} onClick={() => setPaidNotice(null)}>Dismiss</button>
                    </div>
                </div>
            )}

            {/* Top Navigation Bar with Orders, Live Clock & Fullscreen Toggle */}
            <header className="pos-top-bar">
                <div className="pos-top-left">
                    <div className="pos-brand-pill">
                        <span style={{ fontSize: '18px' }}>🏬</span>
                        <span>{shopName}</span>
                    </div>
                    <span className="pos-clock">⏱ {currentTime}</span>
                    <span className="pos-currency-tag" title="Active Store Currency">
                        {activeCurrencyCode} ({activeCurrencySymbol})
                    </span>
                </div>

                <div className="pos-top-center">
                    <div className="pos-orders" role="tablist">
                        {session.orders.map((order) => {
                            const count = order.cart.reduce((sum, line) => sum + line.qty, 0);

                            return (
                                <div key={order.id} className={`order-tab ${order.id === active.id ? 'on' : ''}`}>
                                    <button type="button" role="tab" aria-selected={order.id === active.id} onClick={() => selectOrder(order.id)}>
                                        {t('Order')} #{order.number}{count > 0 ? ` · ${count}` : ''}
                                    </button>
                                    <button type="button" className="x" aria-label={`${t('Close')} ${t('Order')} ${order.number}`} onClick={() => closeOrder(order.id)}>×</button>
                                </div>
                            );
                        })}
                        <button type="button" className="btn" style={{ padding: '4px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={openOrder} disabled={session.orders.length >= 8} title="New Order (Alt+N)">
                            <span>+ {t('New order')}</span>
                            <kbd className="pos-kbd-badge">Alt+N</kbd>
                        </button>
                    </div>
                </div>

                <div className="pos-top-right">
                    <button
                        type="button"
                        className="btn"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '6px 12px' }}
                        onClick={() => setShowShortcutsModal(true)}
                        title="Keyboard Shortcuts Cheat Sheet (F10 or ?)"
                    >
                        <span>⌨️</span>
                        <b>{t('Shortcuts')}</b>
                        <kbd className="pos-kbd-badge">F10</kbd>
                    </button>
                    <button
                        type="button"
                        className="icon-btn round theme-toggle-btn"
                        style={{ width: '36px', height: '36px', fontSize: '15px' }}
                        title={uiTheme === 'dark' ? t('Light') : t('Dark')}
                        onClick={() => dispatch(toggleTheme())}
                    >
                        {uiTheme === 'dark' ? '☀' : '☾'}
                    </button>
                    <button
                        type="button"
                        className={`btn ${isFullscreen ? 'primary' : ''}`}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '6px 12px' }}
                        onClick={toggleFullscreen}
                        title="Toggle full screen mode (F11)"
                    >
                        <span>{isFullscreen ? '🗗' : '⛶'}</span>
                        <b>{isFullscreen ? t('Exit Fullscreen') : t('Fullscreen')}</b>
                        <kbd className={isFullscreen ? 'pos-kbd-badge-light' : 'pos-kbd-badge'}>F11</kbd>
                    </button>
                    <button
                        type="button"
                        className="btn"
                        style={{ fontSize: '12px', padding: '6px 10px' }}
                        onClick={() => navigate('/store-dashboard')}
                        title="Back to Dashboard"
                    >
                        ← {t('Dashboard')}
                    </button>
                </div>
            </header>

            {/* Main 3-Column One-Page POS Shell */}
            <div className="pos-shell">
                {/* 1. Left Column: Categories and Brands */}
                <aside className="card pos-side">
                    <button type="button" className={`pos-filter ${!category && !brand ? 'on' : ''}`} onClick={() => { setCategory(''); setBrand(''); }}>
                        <span>📂 {t('All Products')}</span>
                        <b>{data?.products?.length || 0}</b>
                    </button>
                    <div className="pos-side-scroll">
                        <h2>{t('Categories')}</h2>
                        {(data?.categories || []).filter((row) => counts.categories[row.id]).map((row) => (
                            <button type="button" key={row.id} className={`pos-filter ${category === String(row.id) ? 'on' : ''}`} onClick={() => { setCategory(String(row.id)); setBrand(''); }}>
                                <span>{row.name}</span>
                                <b>{counts.categories[row.id]}</b>
                            </button>
                        ))}
                        <h2>{t('Brands')}</h2>
                        {(data?.brands || []).filter((row) => counts.brands[row.id]).map((row) => (
                            <button type="button" key={row.id} className={`pos-filter ${brand === String(row.id) ? 'on' : ''}`} onClick={() => { setBrand(String(row.id)); setCategory(''); }}>
                                <span>{row.name}</span>
                                <b>{counts.brands[row.id]}</b>
                            </button>
                        ))}
                    </div>
                </aside>

                {/* 2. Middle Column: Product Catalog & Search */}
                <section className="card pos-catalog">
                    <div className="pos-catalog-head">
                        <div className="pos-search-bar" style={{ position: 'relative' }}>
                            <input
                                ref={searchInputRef}
                                value={q}
                                placeholder={t('Search product or scan barcode (F1 or /)...')}
                                onChange={(event) => setQ(event.target.value)}
                                onKeyDown={handleSearchKeyDown}
                                autoFocus
                            />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', position: 'absolute', right: q ? '44px' : '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                <kbd className="pos-kbd-badge" title="Press F1 to focus search">F1</kbd>
                            </div>
                            {q && (
                                <button type="button" className="btn" style={{ padding: '8px 12px' }} onClick={() => setQ('')} title="Clear search (Esc)">
                                    ✕
                                </button>
                            )}
                        </div>
                        {/* Quick category pill row */}
                        <div className="pos-category-pills">
                            <button type="button" className={`pos-cat-pill ${!category ? 'active' : ''}`} onClick={() => setCategory('')}>
                                {t('All')} ({data?.products?.length || 0})
                            </button>
                            {(data?.categories || []).slice(0, 10).map((cat) => (
                                <button key={cat.id} type="button" className={`pos-cat-pill ${category === String(cat.id) ? 'active' : ''}`} onClick={() => setCategory(String(cat.id))}>
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="product-tiles">
                        {isFetching && !data && (
                            <div className="skeleton-grid" aria-hidden="true">
                                {Array.from({ length: 12 }, (_, index) => <span key={index} className="skeleton block" style={{ height: '140px', borderRadius: '12px' }} />)}
                            </div>
                        )}
                        {products.map((product, index) => (
                            <motion.button
                                type="button"
                                key={product.id}
                                className="tile"
                                onClick={() => add(product)}
                                initial={{ opacity: 0, scale: 0.96 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.2, delay: Math.min(index, 10) * 0.02 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                {product.image ? (
                                    <img src={product.image} alt={product.name} loading="lazy" />
                                ) : (
                                    <div className="thumb-fallback" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                                        📦
                                    </div>
                                )}
                                <strong>{product.name}</strong>
                                <span className="muted" style={{ fontSize: '11px' }}>{product.code}</span>
                                <em className={product.stock_qty > 0 ? 'in' : 'out'}>
                                    {product.stock_qty > 0 ? `${t('Stock')}: ${product.stock_qty}` : t('Out of stock')}
                                </em>
                                <b>{money(product.price_cents)}</b>
                            </motion.button>
                        ))}
                        {picker && (
                            <div className="card wide" style={{ gridColumn: '1 / -1', background: 'var(--card)', border: '2px solid var(--blue)', padding: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <strong>Select variant for: {picker.name}</strong>
                                    <button type="button" className="btn" style={{ padding: '2px 8px' }} onClick={() => setPicker(null)}>✕</button>
                                </div>
                                <div className="tabs" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {picker.variants.map((variant) => (
                                        <button type="button" className="chip active" key={variant.id} onClick={() => add(picker, variant)}>
                                            {variant.name} · {money(variant.price_cents)} · ({variant.stock_qty} left)
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {!products.length && (
                            <div className="empty" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 10px' }}>
                                <p style={{ fontSize: '32px', margin: '0 0 10px' }}>🔍</p>
                                <p>{isFetching ? t('Loading products…') : t('No products found matching your search.')}</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* 3. Right Column: Cart & Checkout (Sticky bottom & Customer search by phone) */}
                <aside className="card cart">
                    <div className="cart-head">
                        <div className="cart-title-row">
                            <h2>🛒 {t('Cart')} · {t('Order')} #{active.number}</h2>
                            {cart.length > 0 && (
                                <button
                                    type="button"
                                    className="btn"
                                    style={{ padding: '2px 8px', fontSize: '11px', color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                    onClick={() => patchOrder((order) => ({ ...order, cart: [] }))}
                                    title="Clear cart (F8 or Alt+X)"
                                >
                                    <span>{t('Clear')}</span>
                                    <kbd className="pos-kbd-badge" style={{ color: '#ef4444', borderColor: '#fca5a5' }}>F8</kbd>
                                </button>
                            )}
                        </div>

                        {message && (
                            <div className={message.includes('saved') || message.includes('Draft') ? 'note flash' : 'error note'} style={{ margin: '4px 0', padding: '6px 10px', fontSize: '12px' }}>
                                {message}
                            </div>
                        )}

                        {/* Customer Search & Selection Box (Supports Phone Number) */}
                        <div className="pos-cust-box" ref={custDropdownRef}>
                            {selectedCustomer ? (
                                <div className="pos-cust-active">
                                    <div className="pos-cust-info">
                                        <span style={{ fontSize: '14px' }}>👤</span>
                                        <b>{selectedCustomer.name}</b>
                                        {selectedCustomer.phone && (
                                            <span>📞 {selectedCustomer.phone}</span>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        className="x"
                                        style={{ border: 0, background: 'transparent', cursor: 'pointer', fontSize: '16px', color: '#64748b', padding: '2px 6px' }}
                                        title="Switch customer"
                                        onClick={() => {
                                            patchOrder((order) => ({ ...order, customerId: '' }));
                                            setCustomerSearch('');
                                        }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <div className="pos-cust-search-row">
                                        <input
                                            ref={custSearchInputRef}
                                            value={customerSearch}
                                            placeholder={t('Search customer by phone or name (F2)…')}
                                            onFocus={() => setCustomerDropdownOpen(true)}
                                            onChange={(e) => {
                                                setCustomerSearch(e.target.value);
                                                setCustomerDropdownOpen(true);
                                            }}
                                        />
                                        <button
                                            type="button"
                                            className="btn primary"
                                            style={{ padding: '0 10px', fontSize: '12px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                            onClick={() => openAddCustomerModal(customerSearch)}
                                            title="Add new customer (F3 or Alt+C)"
                                        >
                                            <span>+ {t('Add')}</span>
                                            <kbd className="pos-kbd-badge-light">F3</kbd>
                                        </button>
                                    </div>

                                    {/* Dropdown suggestions */}
                                    {customerDropdownOpen && (
                                        <div className="pos-cust-dropdown">
                                            <button
                                                type="button"
                                                className="pos-cust-item"
                                                onClick={() => {
                                                    patchOrder((order) => ({ ...order, customerId: '' }));
                                                    setCustomerDropdownOpen(false);
                                                }}
                                            >
                                                <span>🚶‍♂️ {t('Walk-in Customer')}</span>
                                                <small>{t('Default')}</small>
                                            </button>

                                            {filteredCustomers.map((cust) => (
                                                <button
                                                    key={cust.id}
                                                    type="button"
                                                    className="pos-cust-item"
                                                    onClick={() => {
                                                        patchOrder((order) => ({ ...order, customerId: String(cust.id) }));
                                                        setCustomerDropdownOpen(false);
                                                        setCustomerSearch('');
                                                    }}
                                                >
                                                    <div>
                                                        <b>{cust.name}</b>
                                                        {cust.phone && <div style={{ fontSize: '11px', color: '#64748b' }}>📞 {cust.phone}</div>}
                                                    </div>
                                                    {cust.phone && <small>{cust.phone}</small>}
                                                </button>
                                            ))}

                                            {customerSearch.trim() && (
                                                <button
                                                    type="button"
                                                    className="pos-cust-item"
                                                    style={{ background: 'rgba(47, 128, 237, 0.06)', color: 'var(--blue)', fontWeight: 700 }}
                                                    onClick={() => openAddCustomerModal(customerSearch)}
                                                >
                                                    <span>➕ Add new customer: "{customerSearch}"</span>
                                                    <small>Instant</small>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Scrollable Cart Items List */}
                    <div className="cart-items-scroll">
                        {cart.map((line) => (
                            <div key={line.key} className="pos-cart-line">
                                <div className="pos-line-main">
                                    <div className="pos-line-info">
                                        <strong>{line.name}</strong>
                                        <small className="muted">{money(line.price_cents)} each</small>
                                    </div>

                                    {/* Quantity Stepper */}
                                    <div className="pos-qty-stepper">
                                        <button
                                            type="button"
                                            className="pos-qty-btn"
                                            onClick={() => stepQty(line.key, -1)}
                                            aria-label="Decrease quantity"
                                        >
                                            −
                                        </button>
                                        <input
                                            className="pos-qty-input"
                                            type="number"
                                            min="1"
                                            max={line.has_serial ? 1 : line.stock_qty}
                                            value={line.qty}
                                            onChange={(event) => setQty(line.key, event.target.value)}
                                        />
                                        <button
                                            type="button"
                                            className="pos-qty-btn"
                                            onClick={() => stepQty(line.key, 1)}
                                            disabled={!line.has_serial && line.qty >= line.stock_qty}
                                            aria-label="Increase quantity"
                                        >
                                            +
                                        </button>
                                    </div>

                                    <div className="pos-line-price">
                                        {money(line.price_cents * line.qty)}
                                    </div>

                                    <button
                                        type="button"
                                        className="pos-del-btn"
                                        aria-label={t('Remove')}
                                        onClick={() => patchOrder((order) => ({ ...order, cart: order.cart.filter((row) => row.key !== line.key) }))}
                                    >
                                        ×
                                    </button>
                                </div>

                                {line.has_serial && (
                                    <input
                                        placeholder="Serial or IMEI number"
                                        value={line.serial}
                                        style={{ fontSize: '11px', padding: '4px 8px', marginTop: '4px' }}
                                        onChange={(event) => patchLine(line.key, { serial: event.target.value })}
                                    />
                                )}
                                {line.has_batch && line.batches?.length > 0 && (
                                    <select
                                        value={line.batch_id}
                                        style={{ fontSize: '11px', padding: '4px 8px', marginTop: '4px' }}
                                        onChange={(event) => patchLine(line.key, { batch_id: event.target.value })}
                                    >
                                        {line.batches.map((batch) => (
                                            <option key={batch.id} value={batch.id}>
                                                Batch: {batch.batch_no} · exp: {batch.expiry_date || 'none'} ({batch.qty})
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        ))}

                        {!cart.length && (
                            <div className="empty" style={{ margin: 'auto', textAlign: 'center', padding: '24px 0', opacity: 0.7 }}>
                                <p style={{ fontSize: '30px', margin: '0 0 6px' }}>🛒</p>
                                <p style={{ fontSize: '13px', margin: 0 }}>{t('No products added yet')}</p>
                                <small className="muted">{t('Tap any item in the catalog to add to cart')}</small>
                            </div>
                        )}
                    </div>

                    {/* Fixed / Sticky Cart Footer (Always reachable) */}
                    <footer className="cart-footer">
                        {/* Collapsible Discount & Coupon bar */}
                        <div className="pos-extra-toggle">
                            <button
                                type="button"
                                className={showDiscounts || discount !== '0' || coupon ? 'active' : ''}
                                onClick={() => setShowDiscounts(!showDiscounts)}
                                title="Discount / Coupon (F4 or Alt+D)"
                                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                            >
                                <span>🏷️ {discount !== '0' || coupon ? `${t('Discount')}/${t('Coupon')} Active` : `+ ${t('Add Discount / Coupon')}`}</span>
                                <kbd className="pos-kbd-badge">F4</kbd>
                            </button>
                        </div>

                        {showDiscounts && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: 'var(--bg)', padding: '6px 8px', borderRadius: '8px', border: '1px solid var(--line)' }}>
                                <label style={{ margin: 0, fontSize: '11px' }}>
                                    {t('Discount')}
                                    <input
                                        ref={discountInputRef}
                                        value={discount}
                                        inputMode="decimal"
                                        style={{ padding: '4px 6px', fontSize: '12px' }}
                                        onChange={(event) => patchOrder((order) => ({ ...order, discount: event.target.value }))}
                                    />
                                </label>
                                <label style={{ margin: 0, fontSize: '11px' }}>
                                    {t('Coupon')}
                                    <input
                                        value={coupon}
                                        placeholder="SAVE10"
                                        style={{ padding: '4px 6px', fontSize: '12px' }}
                                        onChange={(event) => patchOrder((order) => ({ ...order, coupon: event.target.value }))}
                                    />
                                </label>
                            </div>
                        )}

                        {/* Totals Breakdown */}
                        <div className="pos-totals-list">
                            <p className="pos-total">
                                <span>{t('Total Items')} ({units})</span>
                                <b>{money(subtotal)}</b>
                            </p>
                            {discountCents > 0 && (
                                <p className="pos-total" style={{ color: '#16a34a' }}>
                                    <span>{t('Discount')}</span>
                                    <b>− {money(discountCents)}</b>
                                </p>
                            )}
                            {coupon.trim() && (
                                <p className="pos-total" style={{ color: '#16a34a' }}>
                                    <span>{t('Coupon')}</span>
                                    <b>{couponCents ? `− ${money(couponCents)}` : t('Not applied')}</b>
                                </p>
                            )}
                            {tax > 0 && (
                                <p className="pos-total">
                                    <span>{t('Tax')}</span>
                                    <b>{money(tax)}</b>
                                </p>
                            )}
                        </div>

                        {/* Grand Total Bar */}
                        <div className="pos-grand-box">
                            <span>{t('Grand Total')}</span>
                            <b>{money(grand)}</b>
                        </div>

                        {/* Payment Methods */}
                        <div className="pos-methods">
                            {methods.map((name) => (
                                <button
                                    type="button"
                                    key={name}
                                    className={`chip ${method === name ? 'active' : ''}`}
                                    onClick={() => patchOrder((order) => ({ ...order, method: name }))}
                                    title="Switch Payment Method (Alt+M)"
                                >
                                    {name}
                                </button>
                            ))}
                        </div>

                        {/* Cash calculator if cash method is active */}
                        {method === 'Cash' && (
                            <div className="pos-cash-calc">
                                <span>💵 {t('Received')}:</span>
                                <input
                                    ref={paidInputRef}
                                    value={paid}
                                    inputMode="decimal"
                                    placeholder={(grand / 100).toFixed(2)}
                                    onChange={(event) => patchOrder((order) => ({ ...order, paid: event.target.value }))}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            submit('completed');
                                        }
                                    }}
                                    title="Type amount & press Enter to Pay"
                                />
                                <span style={{ marginLeft: 'auto', fontWeight: 700, color: change > 0 ? '#16a34a' : 'inherit' }}>
                                    {t('Change')}: {money(change)}
                                </span>
                            </div>
                        )}

                        {/* Action buttons: Draft and Pay */}
                        <div className="pos-actions">
                            <button
                                className={`btn ${checkoutState.isLoading ? 'busy' : ''}`}
                                type="button"
                                disabled={!cart.length || checkoutState.isLoading}
                                aria-busy={checkoutState.isLoading}
                                onClick={() => submit('draft')}
                                title="Save as Draft (Alt+S)"
                                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                            >
                                <span>💾 {t('Save Draft')}</span>
                                <kbd className="pos-kbd-badge">Alt+S</kbd>
                            </button>
                            <button
                                className={`pos-pay-btn ${checkoutState.isLoading ? 'busy' : ''}`}
                                type="button"
                                disabled={!cart.length || checkoutState.isLoading}
                                aria-busy={checkoutState.isLoading}
                                onClick={() => submit('completed')}
                                title="Complete & Pay (F9 or Ctrl+Enter)"
                                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                            >
                                <span>{checkoutState.isLoading ? t('Processing…') : `✓ ${t('Pay')} ${money(grand)}`}</span>
                                <kbd className="pos-kbd-badge-light">F9</kbd>
                            </button>
                        </div>
                    </footer>
                </aside>
            </div>

            {/* Quick Add Customer Modal */}
            <AnimatePresence>
                {showCustomerModal && (
                    <motion.div
                        className="pos-modal-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowCustomerModal(false)}
                    >
                        <motion.div
                            className="pos-modal"
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3>👤 {t('Add Customer by Number')}</h3>
                            {customerModalError && <p className="error note" style={{ margin: 0 }}>{customerModalError}</p>}
                            <form onSubmit={handleSaveCustomer}>
                                <div className="field">
                                    <label>📱 {t('Phone / Mobile Number')} *</label>
                                    <input
                                        required
                                        type="tel"
                                        placeholder="e.g. 01700000000"
                                        value={newCustomerForm.phone}
                                        onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                                        autoFocus
                                    />
                                </div>
                                <div className="field" style={{ marginTop: '8px' }}>
                                    <label>👤 {t('Customer Name')} *</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="e.g. Mohammad Ali"
                                        value={newCustomerForm.name}
                                        onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
                                    />
                                </div>
                                <div className="field" style={{ marginTop: '8px' }}>
                                    <label>✉️ {t('Email')} ({t('Optional')})</label>
                                    <input
                                        type="email"
                                        placeholder="e.g. customer@example.com"
                                        value={newCustomerForm.email}
                                        onChange={(e) => setNewCustomerForm({ ...newCustomerForm, email: e.target.value })}
                                    />
                                </div>
                                <div className="field" style={{ marginTop: '8px' }}>
                                    <label>📍 {t('Address')} ({t('Optional')})</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Road 4, Dhanmondi, Dhaka"
                                        value={newCustomerForm.address}
                                        onChange={(e) => setNewCustomerForm({ ...newCustomerForm, address: e.target.value })}
                                    />
                                </div>

                                <div className="pos-modal-actions">
                                    <button
                                        type="button"
                                        className="btn"
                                        onClick={() => setShowCustomerModal(false)}
                                    >
                                        {t('Cancel')}
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn primary"
                                        disabled={savingCustomer}
                                    >
                                        {savingCustomer ? t('Saving…') : `✓ ${t('Save & Select Customer')}`}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Order Completed / Receipt & Invoice Print Popup Modal */}
            <AnimatePresence>
                {printModalSale && (
                    <motion.div
                        className="pos-modal-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setPrintModalSale(null)}
                    >
                        <motion.div
                            className="pos-print-modal"
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="pos-print-head">
                                <div className="pos-print-head-title">
                                    <h3>🎉 {t('Order Completed!')}</h3>
                                    <p>Invoice #{printModalSale.invoice_no} · {money(printModalSale.grand_cents)} {t('paid')}</p>
                                </div>

                                {/* Format Tabs: POS Receipt vs A4 Invoice */}
                                <div className="pos-format-tabs">
                                    <button
                                        type="button"
                                        className={`pos-format-tab ${printFormat === 'pos' ? 'active' : ''}`}
                                        onClick={() => setPrintFormat('pos')}
                                    >
                                        🧾 POS (80mm)
                                    </button>
                                    <button
                                        type="button"
                                        className={`pos-format-tab ${printFormat === 'a4' ? 'active' : ''}`}
                                        onClick={() => setPrintFormat('a4')}
                                    >
                                        📄 A4 Invoice
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    className="btn"
                                    style={{ padding: '4px 8px' }}
                                    onClick={() => setPrintModalSale(null)}
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Live Interactive Preview */}
                            <div className="pos-preview-scroll">
                                {printFormat === 'pos' ? (
                                    /* Thermal 80mm Receipt Preview */
                                    <div className="preview-thermal-paper">
                                        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                                            {printModalSale.store?.logo ? (
                                                <img
                                                    src={printModalSale.store.logo}
                                                    alt="Logo"
                                                    style={{ maxHeight: '42px', maxWidth: '120px', objectFit: 'contain', margin: '0 auto 4px', display: 'block' }}
                                                />
                                            ) : (
                                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4px' }}>
                                                    <Logo />
                                                </div>
                                            )}
                                            <h2>{printModalSale.store?.name || shopName}</h2>
                                            {printModalSale.store?.address && <div style={{ fontSize: '10px', color: '#64748b' }}>{printModalSale.store.address}</div>}
                                            {printModalSale.store?.phone && <div style={{ fontSize: '10px', color: '#64748b' }}>Tel: {printModalSale.store.phone}</div>}
                                        </div>

                                        <div style={{ borderTop: '1px dashed #64748b', margin: '6px 0' }} />

                                        <div style={{ fontSize: '10.5px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span>Invoice No:</span>
                                                <strong>#{printModalSale.invoice_no}</strong>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span>Date & Time:</span>
                                                <span>{printModalSale.sold_at}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span>Cashier:</span>
                                                <span>{printModalSale.cashier || 'Admin'}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span>Customer:</span>
                                                <strong>{printModalSale.customer?.name || t('Walk-in Customer')}</strong>
                                            </div>
                                            {printModalSale.customer?.phone && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span>Phone:</span>
                                                    <span>{printModalSale.customer.phone}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ borderTop: '1px dashed #64748b', margin: '6px 0' }} />

                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
                                            <thead>
                                                <tr style={{ borderBottom: '1px dashed #64748b' }}>
                                                    <th style={{ textAlign: 'left', padding: '3px 0' }}>Item</th>
                                                    <th style={{ textAlign: 'center', width: '32px' }}>Qty</th>
                                                    <th style={{ textAlign: 'right', width: '52px' }}>Price</th>
                                                    <th style={{ textAlign: 'right' }}>Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {printModalSale.items?.map((item) => (
                                                    <tr key={item.id || item.name} style={{ verticalAlign: 'top' }}>
                                                        <td style={{ padding: '3px 0' }}>
                                                            {item.name}
                                                            {item.serial && <div style={{ fontSize: '9px', color: '#64748b' }}>S/N: {item.serial}</div>}
                                                        </td>
                                                        <td style={{ textAlign: 'center', padding: '3px 0' }}>{item.qty}</td>
                                                        <td style={{ textAlign: 'right', padding: '3px 0' }}>{money(item.price_cents)}</td>
                                                        <td style={{ textAlign: 'right', padding: '3px 0' }}>{money(item.subtotal_cents)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>

                                        <div style={{ borderTop: '1px dashed #64748b', margin: '6px 0' }} />

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span>Subtotal:</span>
                                                <span>{money(printModalSale.subtotal_cents)}</span>
                                            </div>
                                            {printModalSale.discount_cents > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                                                    <span>Discount:</span>
                                                    <span>− {money(printModalSale.discount_cents)}</span>
                                                </div>
                                            )}
                                            {printModalSale.coupon_discount_cents > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                                                    <span>Coupon:</span>
                                                    <span>− {money(printModalSale.coupon_discount_cents)}</span>
                                                </div>
                                            )}
                                            {printModalSale.tax_cents > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span>Tax:</span>
                                                    <span>{money(printModalSale.tax_cents)}</span>
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 800, borderTop: '1px dashed #0f172a', borderBottom: '1px dashed #0f172a', padding: '4px 0', margin: '4px 0' }}>
                                                <span>GRAND TOTAL:</span>
                                                <span>{money(printModalSale.grand_cents)}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span>Paid ({printModalSale.payment_method}):</span>
                                                <span>{money(printModalSale.paid_cents)}</span>
                                            </div>
                                            {printModalSale.change_cents > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: 700 }}>
                                                    <span>Change Return:</span>
                                                    <span>{money(printModalSale.change_cents)}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ textAlign: 'center', margin: '10px 0 4px' }}>
                                            <div style={{ fontSize: '10px', letterSpacing: '2px' }}>* {printModalSale.invoice_no} *</div>
                                        </div>

                                        <div style={{ textAlign: 'center', fontSize: '9.5px', color: '#64748b', marginTop: '6px' }}>
                                            {printModalSale.store?.invoice_footer || 'Thank you for shopping with us!'}
                                        </div>
                                    </div>
                                ) : (
                                    /* Corporate A4 Invoice Preview */
                                    <div className="preview-a4-paper">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #2563eb', paddingBottom: '14px', marginBottom: '16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                {printModalSale.store?.logo ? (
                                                    <img src={printModalSale.store.logo} alt="Logo" style={{ maxHeight: '48px', objectFit: 'contain' }} />
                                                ) : (
                                                    <Logo />
                                                )}
                                                <div>
                                                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>{printModalSale.store?.name || shopName}</h2>
                                                    {printModalSale.store?.address && <div style={{ fontSize: '11px', color: '#64748b' }}>{printModalSale.store.address}</div>}
                                                    {printModalSale.store?.phone && <div style={{ fontSize: '11px', color: '#64748b' }}>Phone: {printModalSale.store.phone}</div>}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '20px', fontWeight: 900, color: '#2563eb', letterSpacing: '-0.5px' }}>INVOICE</div>
                                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>#{printModalSale.invoice_no}</div>
                                                <div style={{ fontSize: '11px', color: '#64748b' }}>Date: {printModalSale.sold_at}</div>
                                                <span style={{ display: 'inline-block', background: '#dcfce7', color: '#15803d', fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '12px', marginTop: '4px' }}>
                                                    PAID
                                                </span>
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                                            <div>
                                                <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Billed To</div>
                                                <strong style={{ fontSize: '13px' }}>{printModalSale.customer?.name || t('Walk-in Customer')}</strong>
                                                {printModalSale.customer?.phone && <div style={{ fontSize: '11.5px', color: '#475569' }}>📞 {printModalSale.customer.phone}</div>}
                                                {printModalSale.customer?.address && <div style={{ fontSize: '11.5px', color: '#475569' }}>📍 {printModalSale.customer.address}</div>}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Payment Info</div>
                                                <div style={{ fontSize: '12px' }}>Method: <b>{printModalSale.payment_method}</b></div>
                                                <div style={{ fontSize: '12px' }}>Cashier: <b>{printModalSale.cashier || 'Admin'}</b></div>
                                            </div>
                                        </div>

                                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '11.5px' }}>
                                            <thead>
                                                <tr style={{ background: '#f1f5f9' }}>
                                                    <th style={{ textAlign: 'left', padding: '8px 10px', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>Description</th>
                                                    <th style={{ textAlign: 'right', padding: '8px 10px', width: '80px', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>Price</th>
                                                    <th style={{ textAlign: 'center', padding: '8px 10px', width: '50px', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>Qty</th>
                                                    <th style={{ textAlign: 'right', padding: '8px 10px', width: '90px', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {printModalSale.items?.map((item) => (
                                                    <tr key={item.id || item.name} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                        <td style={{ padding: '8px 10px' }}>
                                                            <b>{item.name}</b>
                                                            {item.code && <span style={{ fontSize: '10.5px', color: '#64748b', marginLeft: '6px' }}>[{item.code}]</span>}
                                                            {item.serial && <div style={{ fontSize: '10.5px', color: '#2563eb' }}>Serial: {item.serial}</div>}
                                                        </td>
                                                        <td style={{ textAlign: 'right', padding: '8px 10px' }}>{money(item.price_cents)}</td>
                                                        <td style={{ textAlign: 'center', padding: '8px 10px' }}>{item.qty}</td>
                                                        <td style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 600 }}>{money(item.subtotal_cents)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>

                                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                            <div style={{ width: '240px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span>Subtotal:</span>
                                                    <span>{money(printModalSale.subtotal_cents)}</span>
                                                </div>
                                                {printModalSale.discount_cents > 0 && (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                                                        <span>Discount:</span>
                                                        <span>− {money(printModalSale.discount_cents)}</span>
                                                    </div>
                                                )}
                                                {printModalSale.tax_cents > 0 && (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <span>Tax:</span>
                                                        <span>{money(printModalSale.tax_cents)}</span>
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #cbd5e1', paddingTop: '6px', marginTop: '4px', fontWeight: 800, fontSize: '14px', color: '#2563eb' }}>
                                                    <span>Grand Total:</span>
                                                    <span>{money(printModalSale.grand_cents)}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: 700 }}>
                                                    <span>Amount Paid:</span>
                                                    <span>{money(printModalSale.paid_cents)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Modal Actions */}
                            <div className="pos-print-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--muted)' }}>
                                    <span>Hotkeys:</span>
                                    <kbd className="pos-kbd-badge">Enter</kbd> / <kbd className="pos-kbd-badge">P</kbd> Print · <kbd className="pos-kbd-badge">1</kbd> POS · <kbd className="pos-kbd-badge">2</kbd> A4 · <kbd className="pos-kbd-badge">Esc</kbd> Close
                                </div>
                                <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                                    <button
                                        type="button"
                                        className="btn"
                                        onClick={() => setPrintModalSale(null)}
                                    >
                                        ✕ {t('Close / Next Customer')}
                                    </button>
                                    <button
                                        type="button"
                                        className="btn"
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                        onClick={() => handlePrint(printFormat)}
                                        title="Print / Save as PDF"
                                    >
                                        <span>📥</span> {t('Print / Save PDF')}
                                    </button>
                                    <button
                                        type="button"
                                        className="pos-pay-btn"
                                        style={{ padding: '8px 18px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                        onClick={() => handlePrint(printFormat)}
                                    >
                                        <span>🖨️</span> {t('Print Now')} ({printFormat.toUpperCase()})
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Keyboard Shortcuts Cheat Sheet Modal */}
            <AnimatePresence>
                {showShortcutsModal && (
                    <motion.div
                        className="pos-modal-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowShortcutsModal(false)}
                    >
                        <motion.div
                            className="pos-shortcuts-modal"
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="pos-shortcuts-head">
                                <h3>⌨️ {t('POS Keyboard Shortcuts')}</h3>
                                <button type="button" className="btn" style={{ padding: '4px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={() => setShowShortcutsModal(false)}>
                                    <span>✕ {t('Close')}</span>
                                    <kbd className="pos-kbd-badge">Esc</kbd>
                                </button>
                            </div>
                            <div className="pos-shortcuts-body">
                                <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
                                    {t('Process customer sales at super fast speed without touching the mouse.')}
                                </p>
                                <div className="pos-shortcuts-grid">
                                    <div className="pos-shortcut-group">
                                        <h4>🔍 {t('Search & Barcode')}</h4>
                                        <div className="pos-shortcut-row">
                                            <span>{t('Focus Search / Scanner')}</span>
                                            <div><kbd>F1</kbd> or <kbd>/</kbd></div>
                                        </div>
                                        <div className="pos-shortcut-row">
                                            <span>{t('Barcode Scan / Auto-Add')}</span>
                                            <div><kbd>Enter</kbd></div>
                                        </div>
                                        <div className="pos-shortcut-row">
                                            <span>{t('Clear Search Query')}</span>
                                            <div><kbd>Esc</kbd></div>
                                        </div>
                                    </div>

                                    <div className="pos-shortcut-group">
                                        <h4>👤 {t('Customer')}</h4>
                                        <div className="pos-shortcut-row">
                                            <span>{t('Search Customer by Phone')}</span>
                                            <div><kbd>F2</kbd></div>
                                        </div>
                                        <div className="pos-shortcut-row">
                                            <span>{t('Quick Add Customer')}</span>
                                            <div><kbd>F3</kbd> or <kbd>Alt</kbd>+<kbd>C</kbd></div>
                                        </div>
                                        <div className="pos-shortcut-row">
                                            <span>{t('Close Suggestions')}</span>
                                            <div><kbd>Esc</kbd></div>
                                        </div>
                                    </div>

                                    <div className="pos-shortcut-group">
                                        <h4>💳 {t('Checkout & Payment')}</h4>
                                        <div className="pos-shortcut-row">
                                            <span>{t('Complete & Pay Now')}</span>
                                            <div><kbd>F9</kbd> or <kbd>Ctrl</kbd>+<kbd>↵</kbd></div>
                                        </div>
                                        <div className="pos-shortcut-row">
                                            <span>{t('Save as Draft')}</span>
                                            <div><kbd>Alt</kbd>+<kbd>S</kbd></div>
                                        </div>
                                        <div className="pos-shortcut-row">
                                            <span>{t('Cycle Payment Method')}</span>
                                            <div><kbd>Alt</kbd>+<kbd>M</kbd></div>
                                        </div>
                                        <div className="pos-shortcut-row">
                                            <span>{t('Discount & Coupon')}</span>
                                            <div><kbd>F4</kbd> or <kbd>Alt</kbd>+<kbd>D</kbd></div>
                                        </div>
                                        <div className="pos-shortcut-row">
                                            <span>{t('Cash Received & Pay')}</span>
                                            <div><kbd>Amount</kbd> + <kbd>Enter</kbd></div>
                                        </div>
                                    </div>

                                    <div className="pos-shortcut-group">
                                        <h4>🛒 {t('Orders & Cart')}</h4>
                                        <div className="pos-shortcut-row">
                                            <span>{t('New Order Tab')}</span>
                                            <div><kbd>Alt</kbd>+<kbd>N</kbd></div>
                                        </div>
                                        <div className="pos-shortcut-row">
                                            <span>{t('Switch Order Tab')}</span>
                                            <div><kbd>Alt</kbd>+<kbd>1-8</kbd></div>
                                        </div>
                                        <div className="pos-shortcut-row">
                                            <span>{t('Close Active Tab')}</span>
                                            <div><kbd>Alt</kbd>+<kbd>W</kbd></div>
                                        </div>
                                        <div className="pos-shortcut-row">
                                            <span>{t('Clear Active Cart')}</span>
                                            <div><kbd>F8</kbd> or <kbd>Alt</kbd>+<kbd>X</kbd></div>
                                        </div>
                                    </div>

                                    <div className="pos-shortcut-group" style={{ gridColumn: '1 / -1' }}>
                                        <h4>🖨️ {t('Print & Navigation')}</h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                            <div className="pos-shortcut-row">
                                                <span>{t('Toggle Fullscreen')}</span>
                                                <div><kbd>F11</kbd></div>
                                            </div>
                                            <div className="pos-shortcut-row">
                                                <span>{t('Print Receipt / Invoice')}</span>
                                                <div><kbd>P</kbd> or <kbd>Enter</kbd></div>
                                            </div>
                                            <div className="pos-shortcut-row">
                                                <span>{t('Switch Thermal / A4')}</span>
                                                <div><kbd>1</kbd> or <kbd>2</kbd></div>
                                            </div>
                                            <div className="pos-shortcut-row">
                                                <span>{t('Shortcuts Cheat Sheet')}</span>
                                                <div><kbd>F10</kbd> or <kbd>?</kbd></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
