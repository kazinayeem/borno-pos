import { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { api, money } from '../api';
import { useTranslation } from '../i18n';
import { Pagination, SearchInput, Modal } from '../components/ui';
import { useUrlQueryState } from '../hooks/useUrlQueryState';
import SuperAdminShopManagement from './SuperAdminShopManagement';

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
        <section className="card" style={{ maxWidth: '840px', margin: '0 auto' }} data-tour="general-settings-form">
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
        <section className="card" style={{ maxWidth: '840px', margin: '0 auto' }} data-tour="business-modules-form">
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

function SuperAdminPaymentGateways() {
    const { t } = useTranslation();
    const [bkash, setBkash] = useState({
        enabled: true,
        account_number: '01712345678',
        account_type: 'Merchant',
        instructions: '',
    });
    const [nagad, setNagad] = useState({
        enabled: true,
        account_number: '01812345678',
        account_type: 'Merchant',
        instructions: '',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);

    useEffect(() => {
        let mounted = true;
        api('/api/admin/payment-settings')
            .then((data) => {
                if (!mounted) return;
                const gw = data.gateways || {};
                if (gw.bkash) setBkash(gw.bkash);
                if (gw.nagad) setNagad(gw.nagad);
                setLoading(false);
            })
            .catch((err) => {
                if (!mounted) return;
                setErrorMsg(err.message || t('Failed to load manual payment settings.'));
                setLoading(false);
            });
        return () => { mounted = false; };
    }, [t]);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setStatus(null);
        setErrorMsg(null);

        const phoneRegex = /^(\+8801|01)[3-9]\d{8}$/;
        if (!phoneRegex.test(bkash.account_number)) {
            setErrorMsg(t('Invalid bKash account number format. Please provide a valid Bangladeshi phone number (e.g. 01712345678).'));
            setSaving(false);
            return;
        }
        if (!phoneRegex.test(nagad.account_number)) {
            setErrorMsg(t('Invalid Nagad account number format. Please provide a valid Bangladeshi phone number (e.g. 01812345678).'));
            setSaving(false);
            return;
        }

        try {
            const res = await api('/api/admin/payment-settings', {
                method: 'POST',
                body: JSON.stringify({ bkash, nagad }),
            });
            setStatus(res.message || t('Payment settings updated successfully.'));
        } catch (err) {
            setErrorMsg(err.message || t('Failed to save payment settings.'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className="card" style={{ maxWidth: '840px', margin: '0 auto' }}>
            <div className="section-title">
                <h2>{t('Manual Payment Gateway Settings (bKash & Nagad)')}</h2>
                <p className="muted">{t('Configure receiving merchant or personal numbers and step-by-step instructions shown to tenants when purchasing subscriptions.')}</p>
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
                <form onSubmit={handleSave} className="grid" style={{ gap: '24px' }}>
                    {/* bKash Config */}
                    <div style={{ border: '1px solid #fbcfe8', borderRadius: '12px', padding: '20px', background: '#fdf2f8' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '20px' }}>📱</span>
                                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#be185d', margin: 0 }}>bKash Configuration</h3>
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={bkash.enabled}
                                    onChange={(e) => setBkash({ ...bkash, enabled: e.target.checked })}
                                />
                                <span style={{ fontWeight: 600, fontSize: '13px' }}>{bkash.enabled ? t('Active') : t('Disabled')}</span>
                            </label>
                        </div>

                        <div className="grid grid-2" style={{ gap: '14px', marginBottom: '14px' }}>
                            <div className="field">
                                <label style={{ color: '#831843' }}>{t('bKash Receiving Number')} *</label>
                                <input
                                    type="text"
                                    required
                                    value={bkash.account_number}
                                    onChange={(e) => setBkash({ ...bkash, account_number: e.target.value })}
                                    placeholder="01712345678"
                                />
                            </div>
                            <div className="field">
                                <label style={{ color: '#831843' }}>{t('Account Type')} *</label>
                                <select
                                    value={bkash.account_type}
                                    onChange={(e) => setBkash({ ...bkash, account_type: e.target.value })}
                                >
                                    <option value="Merchant">{t('Merchant')}</option>
                                    <option value="Personal">{t('Personal')}</option>
                                    <option value="Agent">{t('Agent')}</option>
                                </select>
                            </div>
                        </div>

                        <div className="field">
                            <label style={{ color: '#831843' }}>{t('Public Payment Instructions')} *</label>
                            <textarea
                                rows="3"
                                value={bkash.instructions}
                                onChange={(e) => setBkash({ ...bkash, instructions: e.target.value })}
                                placeholder={t('Step-by-step payment instructions for shop owners...')}
                            />
                        </div>
                    </div>

                    {/* Nagad Config */}
                    <div style={{ border: '1px solid #fed7aa', borderRadius: '12px', padding: '20px', background: '#fff7ed' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '20px' }}>📲</span>
                                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#c2410c', margin: 0 }}>Nagad Configuration</h3>
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={nagad.enabled}
                                    onChange={(e) => setNagad({ ...nagad, enabled: e.target.checked })}
                                />
                                <span style={{ fontWeight: 600, fontSize: '13px' }}>{nagad.enabled ? t('Active') : t('Disabled')}</span>
                            </label>
                        </div>

                        <div className="grid grid-2" style={{ gap: '14px', marginBottom: '14px' }}>
                            <div className="field">
                                <label style={{ color: '#9a3412' }}>{t('Nagad Receiving Number')} *</label>
                                <input
                                    type="text"
                                    required
                                    value={nagad.account_number}
                                    onChange={(e) => setNagad({ ...nagad, account_number: e.target.value })}
                                    placeholder="01812345678"
                                />
                            </div>
                            <div className="field">
                                <label style={{ color: '#9a3412' }}>{t('Account Type')} *</label>
                                <select
                                    value={nagad.account_type}
                                    onChange={(e) => setNagad({ ...nagad, account_type: e.target.value })}
                                >
                                    <option value="Merchant">{t('Merchant')}</option>
                                    <option value="Personal">{t('Personal')}</option>
                                    <option value="Agent">{t('Agent')}</option>
                                </select>
                            </div>
                        </div>

                        <div className="field">
                            <label style={{ color: '#9a3412' }}>{t('Public Payment Instructions')} *</label>
                            <textarea
                                rows="3"
                                value={nagad.instructions}
                                onChange={(e) => setNagad({ ...nagad, instructions: e.target.value })}
                                placeholder={t('Step-by-step payment instructions for shop owners...')}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                        <button type="submit" className="btn primary" disabled={saving}>
                            {saving ? t('Saving Settings...') : t('Save Payment Settings')}
                        </button>
                    </div>
                </form>
            )}
        </section>
    );
}

export function PaymentGatewayPage() {
    const user = useSelector((state) => state.session.user);
    if (user?.role === 'super_admin' || user?.role === 'admin') {
        return <SuperAdminPaymentGateways />;
    }

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
    const user = useSelector((state) => state.session.user);
    if (user?.role === 'super_admin' || user?.role === 'admin') {
        return <SuperAdminShopManagement />;
    }

    const { t } = useTranslation();
    const [stores, setStores] = useState([]);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [storeForm, setStoreForm] = useState({
        name: '',
        business_type: 'all_in_one',
        email: '',
        phone: '',
        address: '',
    });
    const [businessTypes, setBusinessTypes] = useState(['all_in_one', 'grocery', 'pharmacy', 'electronics', 'restaurant']);
    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);

    const { queryState, setQuery, setPage, setPerPage } = useUrlQueryState({
        search: '',
        page: 1,
        per_page: 12,
    });

    const loadData = () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (queryState.page) params.set('page', queryState.page);
        if (queryState.per_page) params.set('per_page', queryState.per_page);
        if (queryState.search) params.set('search', queryState.search);

        api(`/stores?${params.toString()}`)
            .then((data) => {
                setStores(data.stores || data.data || []);
                setMeta(data.meta || null);
            })
            .catch((err) => {
                setErrorMsg(err.message || 'Failed to load stores.');
            })
            .finally(() => setLoading(false));
    };

    const openCreateModal = () => {
        setStoreForm({ name: '', business_type: 'all_in_one', email: '', phone: '', address: '' });
        setErrorMsg(null);
        setIsCreating(true);
        api('/stores/create')
            .then((data) => {
                if (data.business_types) setBusinessTypes(data.business_types);
            })
            .catch(() => {});
    };

    const handleCreateStore = async (e) => {
        e.preventDefault();
        setSaving(true);
        setErrorMsg(null);
        try {
            await api('/stores', {
                method: 'POST',
                body: JSON.stringify(storeForm),
            });
            setIsCreating(false);
            loadData();
        } catch (err) {
            setErrorMsg(err.message || t('Failed to create store.'));
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [queryState.page, queryState.per_page, queryState.search]);

    return (
        <section className="card">
            <div className="table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                    <h2>{t('Stores & Branches')}</h2>
                    <p className="muted">{t('Manage multi-store locations and active branches.')}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <SearchInput
                        value={queryState.search}
                        onChange={(val) => setQuery({ search: val, page: 1 })}
                        placeholder={t('Search stores...')}
                        style={{ width: '240px' }}
                    />
                    <button type="button" className="btn primary" onClick={openCreateModal}>
                        + {t('Create Store')}
                    </button>
                </div>
            </div>

            {loading ? (
                <div style={{ padding: '32px', textAlign: 'center' }} className="muted">{t('Loading stores...')}</div>
            ) : stores.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center' }} className="muted">{t('No stores found.')}</div>
            ) : (
                <>
                    <div className="table-responsive" data-tour="stores-table">
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
                    {meta && (
                        <Pagination
                            meta={meta}
                            page={queryState.page}
                            perPage={queryState.per_page}
                            onPageChange={setPage}
                            onPerPageChange={setPerPage}
                        />
                    )}
                </>
            )}

            <Modal
                isOpen={isCreating}
                onClose={() => setIsCreating(false)}
                title={t('Create New Store')}
                subtitle={t('Add a branch or store to your BornoPos account.')}
                size="md"
            >
                {errorMsg && (
                    <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '13px' }}>
                        {errorMsg}
                    </div>
                )}
                <form onSubmit={handleCreateStore} className="grid" style={{ gap: '14px' }}>
                    <div className="field">
                        <label>{t('Store / Branch Name')} *</label>
                        <input
                            type="text"
                            required
                            value={storeForm.name}
                            onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                            placeholder={t('e.g. Dhanmondi Outlet')}
                        />
                    </div>
                    <div className="field">
                        <label>{t('Business Type')} *</label>
                        <select value={storeForm.business_type} onChange={(e) => setStoreForm({ ...storeForm, business_type: e.target.value })}>
                            {businessTypes.map((type) => (
                                <option key={type} value={type}>
                                    {type.replace('_', ' ').toUpperCase()}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-2" style={{ gap: '12px' }}>
                        <div className="field">
                            <label>{t('Email Address')}</label>
                            <input
                                type="email"
                                value={storeForm.email}
                                onChange={(e) => setStoreForm({ ...storeForm, email: e.target.value })}
                                placeholder={t('branch@example.com')}
                            />
                        </div>
                        <div className="field">
                            <label>{t('Phone')}</label>
                            <input
                                type="text"
                                value={storeForm.phone}
                                onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })}
                                placeholder={t('+88017...')}
                            />
                        </div>
                    </div>
                    <div className="field">
                        <label>{t('Address')}</label>
                        <textarea
                            rows="2"
                            value={storeForm.address}
                            onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                            placeholder={t('Physical branch street address')}
                        />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                        <button type="button" className="btn" onClick={() => setIsCreating(false)}>
                            {t('Cancel')}
                        </button>
                        <button type="submit" className="btn primary" disabled={saving}>
                            {saving ? t('Creating...') : t('Create Store')}
                        </button>
                    </div>
                </form>
            </Modal>
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
    const user = useSelector((state) => state.session.user);
    const [plans, setPlans] = useState([]);
    const [gateways, setGateways] = useState({});
    const [shop, setShop] = useState(null);
    const [payments, setPayments] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);

    const [selectedPlan, setSelectedPlan] = useState(null);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedGateway, setSelectedGateway] = useState('bkash');
    const [copied, setCopied] = useState(false);

    const [trxId, setTrxId] = useState('');
    const [senderPhone, setSenderPhone] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [screenshotFile, setScreenshotFile] = useState(null);
    const [notes, setNotes] = useState('');

    const [submitting, setSubmitting] = useState(false);
    const [statusMsg, setStatusMsg] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);

    const loadData = () => {
        setLoading(true);
        setFetchError(null);
        api('/api/subscription/checkout-info')
            .then((data) => {
                setPlans(data.plans || []);
                setGateways(data.gateways || {});
                setShop(data.shop || null);
                setPayments(data.payments || []);
                setInvoices(data.invoices || []);
            })
            .catch((err) => {
                const msg = err.payload?.message || err.message || t('Failed to load subscription information.');
                setFetchError(msg);
                setErrorMsg(msg);
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => { loadData(); }, [t]);

    const handleActivateFreePlan = async (plan) => {
        if (!shop && user?.role !== 'super_admin') {
            setErrorMsg(t('No active shop associated with your account.'));
            return;
        }

        setSubmitting(true);
        setStatusMsg(null);
        setErrorMsg(null);

        try {
            const data = await api('/subscription-purchase', {
                method: 'POST',
                body: { plan_id: plan.id, store_id: shop?.id },
            });
            setStatusMsg(data.message || t('Free plan activated successfully!'));
            loadData();
        } catch (err) {
            setErrorMsg(err.payload?.message || err.message || t('Failed to activate free plan.'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleSelectPlan = (plan) => {
        if (plan.price_cents === 0) {
            handleActivateFreePlan(plan);
            return;
        }

        if (!shop) {
            setStatusMsg(t('Administrator Preview Mode: As a Super Admin, manage or assign plans directly in Subscription Plans.'));
            return;
        }

        setSelectedPlan(plan);
        setStatusMsg(null);
        setErrorMsg(null);
        setTrxId('');
        setSenderPhone(shop?.phone || '');
        setScreenshotFile(null);
        setNotes('');

        const availableGws = Object.keys(gateways);
        if (availableGws.length > 0 && !gateways[selectedGateway]) {
            setSelectedGateway(availableGws[0]);
        }
        setPaymentModalOpen(true);
    };

    const handleCopyNumber = (num) => {
        if (!num) return;
        navigator.clipboard?.writeText(num);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSubmitPayment = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setStatusMsg(null);
        setErrorMsg(null);

        if (!trxId.trim()) {
            setErrorMsg(t('Please enter the Transaction ID (TrxID) from your payment SMS or mobile banking app.'));
            setSubmitting(false);
            return;
        }

        const formData = new FormData();
        formData.append('plan_id', selectedPlan.id);
        formData.append('payment_method', selectedGateway);
        formData.append('amount_cents', selectedPlan.price_cents);
        formData.append('transaction_id', trxId.trim());
        formData.append('sender_phone', senderPhone.trim());
        formData.append('payment_date', paymentDate);
        if (notes.trim()) formData.append('notes', notes.trim());
        if (screenshotFile) formData.append('screenshot', screenshotFile);
        if (shop?.id) formData.append('store_id', shop.id);

        try {
            const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            const res = await fetch('/api/subscription/submit-payment', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    ...(token ? { 'X-CSRF-TOKEN': token } : {}),
                },
                body: formData,
            });

            const data = await res.json();
            if (!res.ok) {
                const firstErr = data.errors ? Object.values(data.errors)[0]?.[0] : null;
                throw new Error(firstErr || data.message || t('Failed to submit payment request.'));
            }

            setStatusMsg(data.message || t('Payment request submitted successfully! Your account will be activated once our team verifies the transaction.'));
            setPaymentModalOpen(false);
            loadData();
        } catch (err) {
            setErrorMsg(err.message || t('Failed to submit payment.'));
        } finally {
            setSubmitting(false);
        }
    };

    const activeGatewayInfo = gateways[selectedGateway] || {};
    const currentPlan = plans.find((p) => p.id === shop?.active_plan_id);

    return (
        <section className="card" style={{ maxWidth: '1240px', margin: '0 auto', padding: '24px 28px' }}>
            {/* Page Header */}
            <div className="section-title" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '28px' }}>💳</span>
                    <div>
                        <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>{t('Subscription Plans & Billing')}</h2>
                        <p className="muted" style={{ margin: '4px 0 0 0', fontSize: '13px' }}>
                            {t('Choose a tier tailored to your pharmacy scale. Transparent pricing with automated renewal and instant manual bKash/Nagad verification.')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Notification Alerts */}
            {statusMsg && (
                <div style={{
                    background: '#f0fdf4',
                    border: '1px solid #86efac',
                    color: '#166534',
                    padding: '14px 18px',
                    borderRadius: '10px',
                    marginBottom: '20px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                }}>
                    <span style={{ fontSize: '18px' }}>✓</span>
                    <span>{statusMsg}</span>
                </div>
            )}
            {errorMsg && (
                <div style={{
                    background: '#fef2f2',
                    border: '1px solid #fca5a5',
                    color: '#991b1b',
                    padding: '14px 18px',
                    borderRadius: '10px',
                    marginBottom: '20px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '18px' }}>⚠️</span>
                        <span>{errorMsg}</span>
                    </div>
                    {fetchError && (
                        <button type="button" className="btn sm" onClick={loadData}>
                            ↺ {t('Retry Loading')}
                        </button>
                    )}
                </div>
            )}

            {/* Super Admin Preview Notice */}
            {!shop && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    color: '#1e40af',
                    padding: '16px 20px',
                    borderRadius: '12px',
                    marginBottom: '24px',
                    flexWrap: 'wrap',
                    gap: '12px',
                }}>
                    <div>
                        <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 800, color: '#1e40af' }}>
                            🛡️ {t('System Administrator Preview')}
                        </div>
                        <div style={{ fontSize: '13px', marginTop: '4px', color: '#1d4ed8' }}>
                            {t('You are previewing subscription pricing and manual payment workflows as a Super Admin. To manage pricing tiers, quotas, or verify incoming tenant payments, use the SaaS admin consoles.')}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Link to="/subscription-plans" className="btn sm primary">
                            {t('Manage Plans')}
                        </Link>
                        <Link to="/payment-verifications" className="btn sm">
                            {t('Verify Payments')}
                        </Link>
                    </div>
                </div>
            )}

            {/* Current Subscription Status Card */}
            {shop && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: shop.is_expired ? '#fef2f2' : shop.is_suspended ? '#fff1f2' : shop.subscription_status === 'payment_pending' ? '#fffbeb' : '#f0fdf4',
                    border: `1px solid ${shop.is_expired ? '#fecaca' : shop.is_suspended ? '#fecdd3' : shop.subscription_status === 'payment_pending' ? '#fde68a' : '#bbf7d0'}`,
                    padding: '18px 22px',
                    borderRadius: '12px',
                    marginBottom: '28px',
                    flexWrap: 'wrap',
                    gap: '14px',
                }}>
                    <div>
                        <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 800, color: '#4b5563', letterSpacing: '0.5px' }}>
                            {t('Current Subscription for {name}', { name: shop.name })}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                            <span className={`badge ${shop.is_suspended ? 'danger' : shop.is_expired ? 'danger' : shop.subscription_status === 'payment_pending' ? 'warning' : 'success'}`} style={{ fontSize: '13px', padding: '4px 12px', textTransform: 'uppercase', fontWeight: 800 }}>
                                {shop.subscription_status?.replace('_', ' ').toUpperCase()}
                            </span>
                            {currentPlan && (
                                <span style={{ fontSize: '14px', fontWeight: 700, color: '#1f2937' }}>
                                    {currentPlan.name}
                                </span>
                            )}
                            {shop.subscription_expires_at && (
                                <span style={{ fontSize: '13px', color: '#4b5563' }}>
                                    · {shop.is_expired ? t('Expired on') : t('Valid until')}: <strong>{shop.subscription_expires_at}</strong>
                                </span>
                            )}
                        </div>
                    </div>
                    {shop.is_expired && (
                        <div style={{ fontSize: '13px', color: '#991b1b', fontWeight: 600 }}>
                            ⚠️ {t('Your subscription has expired. Please select a plan below to renew your access.')}
                        </div>
                    )}
                    {shop.subscription_status === 'payment_pending' && (
                        <div style={{ fontSize: '13px', color: '#92400e', fontWeight: 600 }}>
                            ⏳ {t('A payment verification request is pending administrative review.')}
                        </div>
                    )}
                </div>
            )}

            {/* Plan Display States: Loading Skeleton, Empty State, or Loaded Grid */}
            {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '24px', margin: '20px 0' }}>
                    {[1, 2, 3].map((skeleton) => (
                        <div
                            key={skeleton}
                            style={{
                                border: '1px solid var(--border, #e5e7eb)',
                                borderRadius: '16px',
                                padding: '24px',
                                background: 'var(--card-bg, #fff)',
                                minHeight: '380px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                            }}
                        >
                            <div>
                                <div style={{ height: '24px', width: '55%', background: '#e5e7eb', borderRadius: '6px', marginBottom: '12px' }} />
                                <div style={{ height: '14px', width: '85%', background: '#f3f4f6', borderRadius: '4px', marginBottom: '18px' }} />
                                <div style={{ height: '36px', width: '45%', background: '#e5e7eb', borderRadius: '8px', marginBottom: '20px' }} />
                                <div style={{ height: '70px', background: '#f9fafb', borderRadius: '8px', marginBottom: '18px' }} />
                                <div style={{ height: '14px', width: '90%', background: '#f3f4f6', borderRadius: '4px', marginBottom: '8px' }} />
                                <div style={{ height: '14px', width: '80%', background: '#f3f4f6', borderRadius: '4px' }} />
                            </div>
                            <div style={{ height: '42px', background: '#e5e7eb', borderRadius: '8px' }} />
                        </div>
                    ))}
                </div>
            ) : plans.length === 0 ? (
                <div style={{
                    padding: '64px 24px',
                    textAlign: 'center',
                    background: '#f9fafb',
                    borderRadius: '16px',
                    border: '1px dashed #d1d5db',
                    margin: '24px 0',
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>
                        {t('No Subscription Plans Available')}
                    </h3>
                    <p className="muted" style={{ maxWidth: '440px', margin: '0 auto 20px auto', fontSize: '14px' }}>
                        {t('There are currently no active subscription plans published by the platform. Please check back shortly or contact customer support.')}
                    </p>
                    <button type="button" className="btn" onClick={loadData}>
                        ↺ {t('Refresh Plans')}
                    </button>
                </div>
            ) : (
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
                        gap: '24px',
                        margin: '24px 0',
                        alignItems: 'stretch',
                    }}
                    data-tour="subscription-plans"
                >
                    {plans.map((p) => {
                        const isCurrent = shop?.active_plan_id === p.id && !shop?.is_expired;
                        const isFeatured = p.is_featured;
                        const currentPrice = currentPlan?.price_cents || 0;
                        const isUpgrade = currentPlan && p.price_cents > currentPrice;

                        return (
                            <div
                                key={p.id}
                                style={{
                                    border: isCurrent
                                        ? '2px solid var(--primary, #4f46e5)'
                                        : isFeatured
                                            ? '2px solid #6366f1'
                                            : '1px solid var(--border, #e5e7eb)',
                                    borderRadius: '16px',
                                    padding: '26px 24px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    background: isCurrent
                                        ? 'rgba(79, 70, 229, 0.03)'
                                        : isFeatured
                                            ? 'linear-gradient(180deg, rgba(99, 102, 241, 0.02) 0%, #ffffff 100%)'
                                            : 'var(--card-bg, #fff)',
                                    boxShadow: isFeatured ? '0 10px 25px -5px rgba(99, 102, 241, 0.1)' : '0 1px 3px rgba(0,0,0,0.05)',
                                    position: 'relative',
                                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                }}
                            >
                                {/* Featured / Active Top Ribbon */}
                                {isCurrent ? (
                                    <div style={{
                                        position: 'absolute',
                                        top: '-12px',
                                        right: '20px',
                                        background: 'var(--primary, #4f46e5)',
                                        color: '#fff',
                                        fontSize: '11px',
                                        fontWeight: 800,
                                        padding: '3px 10px',
                                        borderRadius: '10px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                    }}>
                                        ✓ {t('Active Plan')}
                                    </div>
                                ) : isFeatured ? (
                                    <div style={{
                                        position: 'absolute',
                                        top: '-12px',
                                        right: '20px',
                                        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                        color: '#fff',
                                        fontSize: '11px',
                                        fontWeight: 800,
                                        padding: '3px 10px',
                                        borderRadius: '10px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                        boxShadow: '0 2px 4px rgba(79, 70, 229, 0.3)',
                                    }}>
                                        ★ {t('Most Popular')}
                                    </div>
                                ) : null}

                                <div>
                                    {/* Plan Title & Description */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                        <div>
                                            <h3 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#111827' }}>
                                                {p.name}
                                            </h3>
                                            {p.slug && (
                                                <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#6b7280', textTransform: 'uppercase' }}>
                                                    {p.slug}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {p.description && (
                                        <p style={{ fontSize: '13px', color: '#4b5563', margin: '6px 0 16px 0', lineHeight: 1.5, minHeight: '38px' }}>
                                            {p.description}
                                        </p>
                                    )}

                                    {/* Price Header */}
                                    <div style={{ margin: '14px 0 18px 0' }}>
                                        <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--primary, #4f46e5)', lineHeight: 1 }}>
                                            {money(p.price_cents)}
                                            <span style={{ fontSize: '13px', fontWeight: 500, color: '#6b7280', marginLeft: '6px' }}>
                                                / {p.duration_days} {t('days')}
                                            </span>
                                        </div>
                                        {p.trial_days > 0 && (
                                            <div style={{ fontSize: '12px', color: '#2563eb', fontWeight: 700, marginTop: '6px' }}>
                                                🎁 {p.trial_days} {t('Days Free Trial Included')}
                                            </div>
                                        )}
                                    </div>

                                    {/* Limits Quotas Box */}
                                    <div style={{
                                        background: '#f9fafb',
                                        border: '1px solid #f3f4f6',
                                        borderRadius: '10px',
                                        padding: '14px 16px',
                                        fontSize: '12px',
                                        marginBottom: '20px',
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <span style={{ color: '#4b5563', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                🏬 {t('Max Stores')}:
                                            </span>
                                            <strong style={{ color: '#111827' }}>{p.max_stores}</strong>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <span style={{ color: '#4b5563', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                👥 {t('Max Staff / Users')}:
                                            </span>
                                            <strong style={{ color: '#111827' }}>{p.max_users}</strong>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ color: '#4b5563', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                💊 {t('Max Products')}:
                                            </span>
                                            <strong style={{ color: '#111827' }}>{p.max_products?.toLocaleString()}</strong>
                                        </div>
                                    </div>

                                    {/* Features Checklist */}
                                    <div style={{ marginBottom: '24px' }}>
                                        <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 800, color: '#6b7280', marginBottom: '10px', letterSpacing: '0.5px' }}>
                                            {t('Included Features')}
                                        </div>
                                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '13px' }}>
                                            {(p.features || []).map((feature, i) => (
                                                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px', color: '#374151', lineHeight: 1.4 }}>
                                                    <span style={{ color: '#16a34a', fontWeight: 'bold', flexShrink: 0 }}>✓</span>
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                {/* Action Button */}
                                <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border, #f3f4f6)' }}>
                                    <button
                                        type="button"
                                        className={`btn ${isCurrent ? 'secondary' : 'primary'}`}
                                        style={{
                                            width: '100%',
                                            padding: '12px 16px',
                                            fontWeight: 700,
                                            fontSize: '14px',
                                            borderRadius: '8px',
                                        }}
                                        disabled={isCurrent || submitting}
                                        onClick={() => {
                                            if (p.price_cents === 0) {
                                                handleActivateFreePlan(p);
                                            } else {
                                                handleSelectPlan(p);
                                            }
                                        }}
                                    >
                                        {isCurrent
                                            ? t('Current Active Plan')
                                            : p.price_cents === 0
                                                ? t('Activate Free Plan')
                                                : isUpgrade
                                                    ? t('Upgrade to {name} →', { name: p.name })
                                                    : t('Select Plan & Pay →')}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Payment Submission Modal */}
            {selectedPlan && (
                <Modal
                    isOpen={paymentModalOpen}
                    onClose={() => setPaymentModalOpen(false)}
                    title={t('Purchase Subscription — {name}', { name: selectedPlan.name })}
                    subtitle={`${money(selectedPlan.price_cents)} · ${selectedPlan.duration_days} ${t('Days Access')}`}
                    size="md"
                >
                    <form onSubmit={handleSubmitPayment} className="grid" style={{ gap: '16px' }}>
                        {/* Server Validated Purchase Summary */}
                        <div style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '10px',
                            padding: '16px',
                        }}>
                            <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 800, color: '#64748b', marginBottom: '8px' }}>
                                {t('Purchase Summary')}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
                                <span className="muted">{t('Selected Tier')}:</span>
                                <strong>{selectedPlan.name}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
                                <span className="muted">{t('Validity Duration')}:</span>
                                <span>{selectedPlan.duration_days} {t('Days')}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
                                <span className="muted">{t('Taxes & Fees')}:</span>
                                <span>{t('0% (Included)')}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #cbd5e1' }}>
                                <span style={{ fontWeight: 800, fontSize: '14px' }}>{t('Total Payable Amount')}:</span>
                                <strong style={{ fontSize: '20px', color: '#16a34a' }}>
                                    {money(selectedPlan.price_cents)}
                                </strong>
                            </div>
                        </div>

                        {/* Gateway Selector */}
                        <div>
                            <label style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px', display: 'block' }}>
                                {t('Choose Payment Method')} *
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                {Object.keys(gateways).length > 0 ? (
                                    Object.keys(gateways).map((gw) => {
                                        const isAvailable = gateways[gw] && gateways[gw].account_number;
                                        const isSelected = selectedGateway === gw;
                                        return (
                                            <div
                                                key={gw}
                                                onClick={() => isAvailable && setSelectedGateway(gw)}
                                                style={{
                                                    border: `2px solid ${isSelected ? (gw === 'bkash' ? '#d11e5f' : '#f7931e') : 'var(--border)'}`,
                                                    borderRadius: '10px',
                                                    padding: '14px',
                                                    cursor: isAvailable ? 'pointer' : 'not-allowed',
                                                    opacity: isAvailable ? 1 : 0.4,
                                                    background: isSelected ? (gw === 'bkash' ? '#fdf2f8' : '#fff7ed') : 'transparent',
                                                    textAlign: 'center',
                                                    transition: 'all 0.15s ease',
                                                }}
                                            >
                                                <div style={{ fontSize: '20px', marginBottom: '4px' }}>{gw === 'bkash' ? '📱' : '📲'}</div>
                                                <div style={{ fontWeight: 800, textTransform: 'uppercase', color: gw === 'bkash' ? '#d11e5f' : '#f7931e' }}>
                                                    {gw}
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#6b7280' }}>
                                                    {gateways[gw]?.account_type || t('Merchant Payment')}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="muted">{t('No payment gateways currently configured.')}</div>
                                )}
                            </div>
                        </div>

                        {/* Instructions Box with Copy Number Button */}
                        <div style={{
                            border: `1px solid ${selectedGateway === 'bkash' ? '#fbcfe8' : '#fed7aa'}`,
                            background: selectedGateway === 'bkash' ? '#fdf2f8' : '#fff7ed',
                            borderRadius: '10px',
                            padding: '16px',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: selectedGateway === 'bkash' ? '#9d174d' : '#9a3412' }}>
                                    {selectedGateway?.toUpperCase()} {t('Receiving Number')} ({activeGatewayInfo.account_type || 'Merchant'}):
                                </span>
                                <button
                                    type="button"
                                    className="btn sm"
                                    onClick={() => handleCopyNumber(activeGatewayInfo.account_number)}
                                    style={{ fontSize: '11px', padding: '2px 8px' }}
                                >
                                    {copied ? `✓ ${t('Copied!')}` : t('Copy Number')}
                                </button>
                            </div>
                            <div style={{ fontSize: '20px', fontWeight: 900, fontFamily: 'monospace', color: '#111827', marginBottom: '10px' }}>
                                {activeGatewayInfo.account_number || t('Number not configured')}
                            </div>
                            {activeGatewayInfo.instructions && (
                                <div style={{ fontSize: '12px', color: '#374151', whiteSpace: 'pre-line', lineHeight: 1.5, borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '8px' }}>
                                    {activeGatewayInfo.instructions}
                                </div>
                            )}
                        </div>

                        {/* Form Inputs */}
                        <div className="grid grid-2" style={{ gap: '12px' }}>
                            <div className="field">
                                <label>{t('Amount Paid (BDT)')} *</label>
                                <input
                                    type="text"
                                    readOnly
                                    value={money(selectedPlan.price_cents)}
                                    style={{ background: '#f3f4f6', fontWeight: 700, color: '#16a34a' }}
                                />
                            </div>
                            <div className="field">
                                <label>{t('Transaction ID (TrxID)')} *</label>
                                <input
                                    type="text"
                                    required
                                    value={trxId}
                                    onChange={(e) => setTrxId(e.target.value.toUpperCase())}
                                    placeholder={t('e.g. 9J4K2L8N1')}
                                    style={{ fontFamily: 'monospace', fontWeight: 700 }}
                                />
                            </div>
                        </div>

                        <div className="grid grid-2" style={{ gap: '12px' }}>
                            <div className="field">
                                <label>{t('Sender Phone Number')} *</label>
                                <input
                                    type="text"
                                    required
                                    value={senderPhone}
                                    onChange={(e) => setSenderPhone(e.target.value)}
                                    placeholder="017..."
                                />
                            </div>
                            <div className="field">
                                <label>{t('Payment Date')} *</label>
                                <input
                                    type="date"
                                    required
                                    value={paymentDate}
                                    onChange={(e) => setPaymentDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="field">
                            <label>{t('Payment Receipt Screenshot (Optional)')}</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setScreenshotFile(e.target.files[0] || null)}
                            />
                            <div style={{ fontSize: '11px', color: '#6b7280' }}>
                                {t('Upload a photo or screenshot of the payment confirmation SMS / app receipt (Max: 5MB).')}
                            </div>
                        </div>

                        <div className="field">
                            <label>{t('Additional Notes (Optional)')}</label>
                            <input
                                type="text"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder={t('Any details to help our team verify your payment...')}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                            <button type="button" className="btn" onClick={() => setPaymentModalOpen(false)}>
                                {t('Cancel')}
                            </button>
                            <button type="submit" className="btn primary" disabled={submitting}>
                                {submitting ? t('Submitting Payment...') : t('Submit Payment for Verification')}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* My Payment Verification Submissions Table */}
            {payments.length > 0 && (
                <div style={{ marginTop: '48px', paddingTop: '28px', borderTop: '1px solid var(--border, #e5e7eb)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0 }}>
                            📋 {t('My Payment Verification History')}
                        </h3>
                        <span className="muted" style={{ fontSize: '12px' }}>
                            {t('{count} submissions recorded', { count: payments.length })}
                        </span>
                    </div>
                    <div className="table-responsive">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>{t('TrxID')}</th>
                                    <th>{t('Gateway')}</th>
                                    <th>{t('Amount')}</th>
                                    <th>{t('Sender Phone')}</th>
                                    <th>{t('Submitted At')}</th>
                                    <th>{t('Verification Status')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.map((p) => (
                                    <tr key={p.id}>
                                        <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{p.transaction_id}</td>
                                        <td><span style={{ textTransform: 'uppercase', fontWeight: 700 }}>{p.payment_method}</span></td>
                                        <td style={{ fontWeight: 700, color: '#16a34a' }}>{money(p.amount_cents)}</td>
                                        <td>{p.sender_phone || '—'}</td>
                                        <td style={{ fontSize: '12px' }}>{p.created_at}</td>
                                        <td>
                                            <span className={`badge ${p.status === 'approved' ? 'success' : p.status === 'rejected' ? 'danger' : 'warning'}`} style={{ padding: '4px 10px', fontSize: '12px' }}>
                                                {p.status === 'pending' ? t('Pending Review') : p.status === 'approved' ? t('Approved') : t('Rejected')}
                                            </span>
                                            {p.rejection_reason && (
                                                <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px' }}>
                                                    <strong>{t('Reason')}:</strong> {p.rejection_reason}
                                                </div>
                                            )}
                                        </td>
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

    const { queryState, setQuery, setPage, setPerPage } = useUrlQueryState({
        search: '',
        page: 1,
        per_page: 15,
    });

    const loadData = () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (queryState.page) params.set('page', queryState.page);
        if (queryState.per_page) params.set('per_page', queryState.per_page);
        if (queryState.search) params.set('search', queryState.search);

        api(`/subscription/report?${params.toString()}`)
            .then((data) => {
                setRows(data.rows || data.data || []);
                setMeta(data.meta || null);
            })
            .catch((err) => {
                setRows([]);
                setMeta(null);
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadData();
    }, [queryState.page, queryState.per_page, queryState.search]);

    return (
        <section className="card">
            <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                    <h2>{t('Subscription History & Reports')}</h2>
                    <p className="muted">{t('Audit records of plan renewals and invoices.')}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <SearchInput
                        value={queryState.search}
                        onChange={(val) => setQuery({ search: val, page: 1 })}
                        placeholder={t('Search subscriptions...')}
                        style={{ width: '240px' }}
                    />
                </div>
            </div>

            {loading ? (
                <div style={{ padding: '32px', textAlign: 'center' }} className="muted">{t('Loading subscription history...')}</div>
            ) : rows.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center' }} className="muted">{t('No subscription records found.')}</div>
            ) : (
                <>
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
                    {meta && (
                        <Pagination
                            meta={meta}
                            page={queryState.page}
                            perPage={queryState.per_page}
                            onPageChange={setPage}
                            onPerPageChange={setPerPage}
                        />
                    )}
                </>
            )}
        </section>
    );
}
