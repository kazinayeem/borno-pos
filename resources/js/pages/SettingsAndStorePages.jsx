import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useTranslation } from '../i18n';

export function GeneralSettingsPage() {
    const { t } = useTranslation();
    const [shopName, setShopName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [invoiceFooter, setInvoiceFooter] = useState('');
    const [currencySymbol, setCurrencySymbol] = useState('৳');
    const [currencyCode, setCurrencyCode] = useState('BDT');
    const [currencies, setCurrencies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);

    useEffect(() => {
        let mounted = true;
        api('/settings/general-settings')
            .then((data) => {
                if (!mounted) return;
                const s = data.store || {};
                setShopName(s.name || '');
                setPhone(s.phone || '');
                setAddress(s.address || '');
                setCurrencySymbol(s.currency_symbol || '৳');
                setCurrencyCode(s.currency_code || 'BDT');
                setInvoiceFooter((data.settings && data.settings.invoice_footer) || '');
                setCurrencies(data.currencies || []);
                setLoading(false);
            })
            .catch((err) => {
                if (!mounted) return;
                setErrorMsg(err.message || t('Failed to load settings.'));
                setLoading(false);
            });
        return () => { mounted = false; };
    }, [t]);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setStatus(null);
        setErrorMsg(null);
        try {
            const res = await api('/settings/general-settings', {
                method: 'POST',
                body: JSON.stringify({
                    shop_name: shopName,
                    phone,
                    address,
                    invoice_footer: invoiceFooter,
                    currency_symbol: currencySymbol,
                    currency_code: currencyCode,
                }),
            });
            setStatus(res.message || t('General settings saved.'));
        } catch (err) {
            setErrorMsg(err.message || t('Failed to save settings.'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className="card" style={{ maxWidth: '840px', margin: '0 auto' }}>
            <div className="section-title">
                <h2>{t('General Settings')}</h2>
                <p className="muted">{t('Configure your business details, default currency, and invoice messages.')}</p>
            </div>

            {status && (
                <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#166534', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px' }}>
                    {status}
                </div>
            )}
            {errorMsg && (
                <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px' }}>
                    {errorMsg}
                </div>
            )}

            {loading ? (
                <div style={{ padding: '32px', textAlign: 'center' }} className="muted">{t('Loading settings...')}</div>
            ) : (
                <form onSubmit={handleSave} className="grid" style={{ gap: '16px' }}>
                    <div className="field">
                        <label>{t('Shop Name')} *</label>
                        <input
                            type="text"
                            required
                            value={shopName}
                            onChange={(e) => setShopName(e.target.value)}
                        />
                    </div>
                    <div className="field">
                        <label>{t('Phone')}</label>
                        <input
                            type="text"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                        />
                    </div>
                    <div className="field">
                        <label>{t('Address')}</label>
                        <textarea
                            rows="2"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-2" style={{ gap: '16px' }}>
                        <div className="field">
                            <label>{t('Currency Code')}</label>
                            <input
                                type="text"
                                value={currencyCode}
                                onChange={(e) => setCurrencyCode(e.target.value)}
                                placeholder="BDT, USD, etc."
                            />
                        </div>
                        <div className="field">
                            <label>{t('Currency Symbol')} *</label>
                            <input
                                type="text"
                                required
                                value={currencySymbol}
                                onChange={(e) => setCurrencySymbol(e.target.value)}
                                placeholder="৳, $, etc."
                            />
                        </div>
                    </div>
                    <div className="field">
                        <label>{t('Invoice Footer Message')}</label>
                        <textarea
                            rows="3"
                            value={invoiceFooter}
                            onChange={(e) => setInvoiceFooter(e.target.value)}
                            placeholder={t('Thank you for shopping with us!')}
                        />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                        <button type="submit" className="btn primary" disabled={saving}>
                            {saving ? t('Saving...') : t('Save Settings')}
                        </button>
                    </div>
                </form>
            )}
        </section>
    );
}

export function BusinessModulesPage() {
    const { t } = useTranslation();
    const [modules, setModules] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);

    useEffect(() => {
        let mounted = true;
        api('/settings/business-modules')
            .then((data) => {
                if (!mounted) return;
                setModules(data.modules || {});
                setLoading(false);
            })
            .catch((err) => {
                if (!mounted) return;
                setErrorMsg(err.message || t('Failed to load modules.'));
                setLoading(false);
            });
        return () => { mounted = false; };
    }, [t]);

    const handleToggle = (key) => {
        setModules((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setStatus(null);
        setErrorMsg(null);
        try {
            const res = await api('/settings/business-modules', {
                method: 'POST',
                body: JSON.stringify(modules),
            });
            setStatus(res.message || t('Business modules updated.'));
        } catch (err) {
            setErrorMsg(err.message || t('Failed to update modules.'));
        } finally {
            setSaving(false);
        }
    };

    const moduleLabels = {
        dashboard: t('Dashboard & Analytics'),
        pos: t('Point of Sale (POS)'),
        sales: t('Sales & Orders'),
        purchases: t('Purchases & Supplier Orders'),
        products: t('Product & Inventory Management'),
        accounting: t('Accounts & Cash Management'),
        hrm: t('HRM & Staff Attendance'),
        reports: t('Reports & Financial Statements'),
        people: t('Customers & Suppliers'),
        settings: t('Store Settings & Configuration'),
        stock_count: t('Stock Counting / Audit'),
        installments: t('Installment Sales & Payments'),
        barcode: t('Barcode Generator & Printing'),
    };

    return (
        <section className="card" style={{ maxWidth: '840px', margin: '0 auto' }}>
            <div className="section-title">
                <h2>{t('Business Modules')}</h2>
                <p className="muted">{t('Enable or disable business modules for this store.')}</p>
            </div>

            {status && (
                <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#166534', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px' }}>
                    {status}
                </div>
            )}
            {errorMsg && (
                <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px' }}>
                    {errorMsg}
                </div>
            )}

            {loading ? (
                <div style={{ padding: '32px', textAlign: 'center' }} className="muted">{t('Loading modules...')}</div>
            ) : (
                <form onSubmit={handleSave}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                        {Object.keys(modules).map((key) => (
                            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', cursor: 'pointer', background: modules[key] ? 'rgba(79, 70, 229, 0.04)' : 'transparent' }}>
                                <input
                                    type="checkbox"
                                    checked={!!modules[key]}
                                    onChange={() => handleToggle(key)}
                                />
                                <span style={{ fontWeight: 600, fontSize: '14px' }}>{moduleLabels[key] || key}</span>
                            </label>
                        ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="submit" className="btn primary" disabled={saving}>
                            {saving ? t('Saving...') : t('Save Modules')}
                        </button>
                    </div>
                </form>
            )}
        </section>
    );
}

export function PaymentGatewayPage() {
    const { t } = useTranslation();
    const [gateways, setGateways] = useState({});
    const [names, setNames] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);

    useEffect(() => {
        let mounted = true;
        api('/shop-payment-gateway')
            .then((data) => {
                if (!mounted) return;
                setGateways(data.gateways || {});
                setNames(data.names || { cash: 'Cash', paystack: 'Paystack', razorpay: 'Razorpay', paypal: 'PayPal', stripe: 'Stripe' });
                setLoading(false);
            })
            .catch((err) => {
                if (!mounted) return;
                setErrorMsg(err.message || t('Failed to load payment gateway settings.'));
                setLoading(false);
            });
        return () => { mounted = false; };
    }, [t]);

    const handleToggle = (key) => {
        setGateways((prev) => ({
            ...prev,
            [key]: {
                ...(prev[key] || {}),
                enabled: !(prev[key]?.enabled),
            },
        }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setStatus(null);
        setErrorMsg(null);
        try {
            const payload = {};
            Object.keys(names).forEach((name) => {
                payload[`${name}_enabled`] = !!gateways[name]?.enabled;
            });
            const res = await api('/shop-payment-gateway', {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            setStatus(res.message || t('Payment methods saved.'));
        } catch (err) {
            setErrorMsg(err.message || t('Failed to save payment methods.'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className="card" style={{ maxWidth: '840px', margin: '0 auto' }}>
            <div className="section-title">
                <h2>{t('Payment Gateway Settings')}</h2>
                <p className="muted">{t('Select available payment channels for in-store and invoice payments.')}</p>
            </div>

            {status && (
                <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#166534', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px' }}>
                    {status}
                </div>
            )}
            {errorMsg && (
                <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px' }}>
                    {errorMsg}
                </div>
            )}

            {loading ? (
                <div style={{ padding: '32px', textAlign: 'center' }} className="muted">{t('Loading payment settings...')}</div>
            ) : (
                <form onSubmit={handleSave}>
                    <div style={{ display: 'grid', gap: '14px', marginBottom: '24px' }}>
                        {Object.keys(names).map((key) => {
                            const isEnabled = !!gateways[key]?.enabled;
                            return (
                                <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '15px' }}>{names[key] || key}</div>
                                        <div className="muted" style={{ fontSize: '13px', marginTop: '2px' }}>
                                            {gateways[key]?.note || t('Store-level payment record channel.')}
                                        </div>
                                    </div>
                                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input
                                            type="checkbox"
                                            checked={isEnabled}
                                            onChange={() => handleToggle(key)}
                                        />
                                        <span style={{ fontSize: '14px', fontWeight: 600 }}>{isEnabled ? t('Enabled') : t('Disabled')}</span>
                                    </label>
                                </div>
                            );
                        })}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="submit" className="btn primary" disabled={saving}>
                            {saving ? t('Saving...') : t('Save Payment Channels')}
                        </button>
                    </div>
                </form>
            )}
        </section>
    );
}

export function StoresPage() {
    const { t } = useTranslation();
    const [stores, setStores] = useState([]);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadData = (page = 1) => {
        setLoading(true);
        api(`/stores?page=${page}`)
            .then((data) => {
                setStores(data.stores || []);
                setMeta(data.meta || null);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    };

    useEffect(() => { loadData(); }, []);

    return (
        <section className="card">
            <div className="table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                    <h2>{t('Stores & Branches')}</h2>
                    <p className="muted">{t('Manage multi-store locations and active branches.')}</p>
                </div>
                <Link to="/stores/create" className="btn primary">+ {t('Create Store')}</Link>
            </div>

            {loading ? (
                <div style={{ padding: '32px', textAlign: 'center' }} className="muted">{t('Loading stores...')}</div>
            ) : stores.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center' }} className="muted">{t('No stores found.')}</div>
            ) : (
                <div className="table-responsive">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>{t('Store Name')}</th>
                                <th>{t('Business Type')}</th>
                                <th>{t('Phone')}</th>
                                <th>{t('Email')}</th>
                                <th>{t('Currency')}</th>
                                <th>{t('Status')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stores.map((s) => (
                                <tr key={s.id}>
                                    <td style={{ fontWeight: 600 }}>
                                        {s.name}
                                        {s.is_current && (
                                            <span style={{ marginLeft: '8px', background: '#dcfce7', color: '#166534', fontSize: '11px', padding: '2px 6px', borderRadius: '4px' }}>
                                                {t('Current')}
                                            </span>
                                        )}
                                    </td>
                                    <td><span style={{ textTransform: 'capitalize' }}>{(s.business_type || '').replace('_', ' ')}</span></td>
                                    <td>{s.phone || '—'}</td>
                                    <td>{s.email || '—'}</td>
                                    <td>{s.currency_code} ({s.currency_symbol})</td>
                                    <td>
                                        <span style={{ color: '#16a34a', fontWeight: 600 }}>● {t('Active')}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}

export function StoreCreatePage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [businessType, setBusinessType] = useState('all_in_one');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [businessTypes, setBusinessTypes] = useState(['all_in_one', 'grocery', 'pharmacy', 'electronics', 'restaurant']);
    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);

    useEffect(() => {
        api('/stores/create')
            .then((data) => {
                if (data.business_types) setBusinessTypes(data.business_types);
            })
            .catch(() => {});
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setErrorMsg(null);
        try {
            await api('/stores', {
                method: 'POST',
                body: JSON.stringify({ name, business_type: businessType, email, phone, address }),
            });
            navigate('/stores');
        } catch (err) {
            setErrorMsg(err.message || t('Failed to create store.'));
            setSaving(false);
        }
    };

    return (
        <section className="card" style={{ maxWidth: '640px', margin: '0 auto' }}>
            <div className="section-title">
                <h2>{t('Create New Store')}</h2>
                <p className="muted">{t('Add a branch or store to your BornoPos account.')}</p>
            </div>

            {errorMsg && (
                <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px' }}>
                    {errorMsg}
                </div>
            )}

            <form onSubmit={handleSave} className="grid" style={{ gap: '16px' }}>
                <div className="field">
                    <label>{t('Store / Branch Name')} *</label>
                    <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t('e.g. Dhanmondi Outlet')}
                    />
                </div>
                <div className="field">
                    <label>{t('Business Type')} *</label>
                    <select value={businessType} onChange={(e) => setBusinessType(e.target.value)}>
                        {businessTypes.map((type) => (
                            <option key={type} value={type}>
                                {type.replace('_', ' ').toUpperCase()}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="field">
                    <label>{t('Phone')}</label>
                    <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                    />
                </div>
                <div className="field">
                    <label>{t('Email')}</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>
                <div className="field">
                    <label>{t('Address')}</label>
                    <textarea
                        rows="2"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                    />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                    <Link to="/stores" className="btn secondary">{t('Cancel')}</Link>
                    <button type="submit" className="btn primary" disabled={saving}>
                        {saving ? t('Saving...') : t('Create Store')}
                    </button>
                </div>
            </form>
        </section>
    );
}

export function SubscriptionPurchasePage() {
    const { t } = useTranslation();
    const [plans, setPlans] = useState([]);
    const [current, setCurrent] = useState([]);
    const [loading, setLoading] = useState(true);
    const [buyingId, setBuyingId] = useState(null);
    const [status, setStatus] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);

    const loadData = () => {
        setLoading(true);
        api('/subscription-purchase')
            .then((data) => {
                setPlans(data.plans || []);
                setCurrent(data.current || []);
            })
            .catch((err) => setErrorMsg(err.message || t('Failed to load subscription plans.')))
            .finally(() => setLoading(false));
    };

    useEffect(() => { loadData(); }, [t]);

    const handleSubscribe = async (planId) => {
        setBuyingId(planId);
        setStatus(null);
        setErrorMsg(null);
        try {
            const res = await api('/subscription-purchase', {
                method: 'POST',
                body: JSON.stringify({ plan_id: planId }),
            });
            setStatus(res.message || t('Subscription request placed.'));
            loadData();
        } catch (err) {
            setErrorMsg(err.message || t('Failed to subscribe.'));
        } finally {
            setBuyingId(null);
        }
    };

    return (
        <section className="card">
            <div className="section-title">
                <h2>{t('Subscription Plans')}</h2>
                <p className="muted">{t('Upgrade or change your BornoPos subscription tier.')}</p>
            </div>

            {status && (
                <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#166534', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px' }}>
                    {status}
                </div>
            )}
            {errorMsg && (
                <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px' }}>
                    {errorMsg}
                </div>
            )}

            {loading ? (
                <div style={{ padding: '32px', textAlign: 'center' }} className="muted">{t('Loading plans...')}</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', margin: '24px 0' }}>
                    {plans.map((p) => (
                        <div key={p.id} style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <div>
                                <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>{p.name}</h3>
                                <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--primary, #4f46e5)', marginBottom: '16px' }}>
                                    ৳{(p.price_cents / 100).toFixed(2)}
                                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#6b7280' }}> / {p.billing_interval}</span>
                                </div>
                                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0', fontSize: '13px' }}>
                                    {(p.features || []).map((f, i) => (
                                        <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                            <span style={{ color: '#16a34a' }}>✓</span> {f}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <button
                                type="button"
                                className="btn primary"
                                style={{ width: '100%' }}
                                disabled={buyingId === p.id}
                                onClick={() => handleSubscribe(p.id)}
                            >
                                {buyingId === p.id ? t('Processing...') : t('Select Plan')}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {current.length > 0 && (
                <div style={{ marginTop: '32px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>{t('Recent Subscription Invoices')}</h3>
                    <div className="table-responsive">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>{t('Plan')}</th>
                                    <th>{t('Amount')}</th>
                                    <th>{t('Status')}</th>
                                    <th>{t('Payment')}</th>
                                    <th>{t('Period')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {current.map((c) => (
                                    <tr key={c.id}>
                                        <td style={{ fontWeight: 600 }}>{c.plan_name || 'Standard'}</td>
                                        <td>৳{(c.amount_cents / 100).toFixed(2)}</td>
                                        <td><span style={{ textTransform: 'capitalize' }}>{c.status}</span></td>
                                        <td><span style={{ textTransform: 'capitalize' }}>{c.payment_status}</span></td>
                                        <td>{c.starts_on || '—'} {c.ends_on ? `to ${c.ends_on}` : ''}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </section>
    );
}

export function SubscriptionReportPage() {
    const { t } = useTranslation();
    const [rows, setRows] = useState([]);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadData = (page = 1) => {
        setLoading(true);
        api(`/subscription/report?page=${page}`)
            .then((data) => {
                setRows(data.rows || []);
                setMeta(data.meta || null);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    };

    useEffect(() => { loadData(); }, []);

    return (
        <section className="card">
            <div className="section-title">
                <h2>{t('Subscription History & Reports')}</h2>
                <p className="muted">{t('Audit records of plan renewals and invoices.')}</p>
            </div>

            {loading ? (
                <div style={{ padding: '32px', textAlign: 'center' }} className="muted">{t('Loading subscription history...')}</div>
            ) : rows.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center' }} className="muted">{t('No subscription records found.')}</div>
            ) : (
                <div className="table-responsive">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>{t('Store')}</th>
                                <th>{t('Plan')}</th>
                                <th>{t('Amount')}</th>
                                <th>{t('Status')}</th>
                                <th>{t('Payment')}</th>
                                <th>{t('Valid Period')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r) => (
                                <tr key={r.id}>
                                    <td style={{ fontWeight: 600 }}>{r.store_name || 'My Store'}</td>
                                    <td>{r.plan_name || '—'}</td>
                                    <td>৳{(r.amount_cents / 100).toFixed(2)}</td>
                                    <td><span style={{ textTransform: 'capitalize' }}>{r.status}</span></td>
                                    <td><span style={{ textTransform: 'capitalize' }}>{r.payment_status}</span></td>
                                    <td>{r.starts_on || '—'} {r.ends_on ? `to ${r.ends_on}` : ''}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
