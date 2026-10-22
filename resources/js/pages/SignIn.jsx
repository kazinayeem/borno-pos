import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../icons';
import { Popover, motion } from '../motion';
import { languages, useT } from '../i18n';
import { clearStatus, login } from '../slices/sessionSlice';
import { changeLocale, closeMenus, toggleMenu, toggleTheme } from '../slices/uiSlice';

const demos = [
    ['All In One', 'allinone@bornopos.test'],
    ['Super Shop/Grocery', 'grocery@bornopos.test'],
    ['Pharmacy', 'pharmacy@bornopos.test'],
    ['Electronics/Hardware or Mobile Shop', 'electronics@bornopos.test'],
    ['Restaurant', 'restaurant@bornopos.test'],
    ['Super Admin or SAAS', 'superadmin@bornopos.test'],
];

export default function SignIn() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const t = useT();
    const { error, pending, status } = useSelector((state) => state.session);
    const ui = useSelector((state) => state.ui);
    const current = languages.find((item) => item.id === ui.locale) || languages[0];
    const [loginValue, setLoginValue] = useState('');
    const [password, setPassword] = useState('');
    const [show, setShow] = useState(false);
    const [remember, setRemember] = useState(true);

    useEffect(() => {
        function onKey(event) {
            if (event.key === 'Escape') dispatch(closeMenus());
        }
        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, [dispatch]);

    async function submit(event) {
        event.preventDefault();
        const result = await dispatch(login({ login: loginValue, password, remember }));
        if (login.fulfilled.match(result)) {
            const target = result.payload.redirect || '/store-dashboard';
            const path = target.startsWith('http') ? new URL(target).pathname : target;
            navigate(path);
        }
    }

    return (
        <div className="guest">
            <div className="auth-top" onClick={(event) => event.stopPropagation()}>
                <Link className="brand-lock" to="/">
                    <Logo />
                    <div>BornoPos<small>{t('Powering Your Business')}</small></div>
                </Link>
                <div className="auth-tools">
                    <span>{t('Version')} {window.BornoPos?.version}</span>
                    <button className="icon-btn round" type="button" title={ui.theme === 'dark' ? t('Light') : t('Dark')} onClick={() => dispatch(toggleTheme())}>{ui.theme === 'dark' ? '☀' : '☾'}</button>
                    <div className={`menu ${ui.langOpen ? 'open' : ''}`}>
                        <button className="lang" type="button" onClick={(event) => { event.stopPropagation(); dispatch(toggleMenu('lang')); }}><span className="flag">{current.flag}</span> {current.label}</button>
                        <Popover open={ui.langOpen} onClick={(event) => event.stopPropagation()}>
                            {languages.map((item) => (
                                <button type="button" key={item.id} onClick={() => dispatch(changeLocale(item.id))}>{item.flag} {item.label}</button>
                            ))}
                        </Popover>
                    </div>
                </div>
            </div>
            <div className="login-wrap" onClick={() => dispatch(closeMenus())}>
                <motion.section className="login-copy" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
                    <h1>{t('Smart POS')}<br />{t('for a Smarter Business')}</h1>
                    <p className="muted">{t('Manage sales, inventory, customers and more — all in one place.')}</p>
                    <div className="features">
                        <div className="feature"><div className="bubble blue">🛒</div><b>{t('Easy Sales')}</b><span>{t('Fast & Simple')}</span></div>
                        <div className="feature"><div className="bubble green">▣</div><b>{t('Inventory')}</b><span>{t('Real-time Stock')}</span></div>
                        <div className="feature"><div className="bubble purple">📊</div><b>{t('Reports')}</b><span>{t('Insightful Analytics')}</span></div>
                        <div className="feature"><div className="bubble peach">☺</div><b>{t('Multi-User')}</b><span>{t('Role Based Access')}</span></div>
                    </div>
                    <p className="script">{t('Sell Faster,')}<br />{t('Grow Bigger!')}<i /></p>
                    <svg viewBox="0 0 680 220" className="terminal" role="img" aria-label="Point of sale counter">
                        <rect x="36" y="150" width="140" height="54" rx="8" fill="#1f2937" />
                        <rect x="48" y="160" width="86" height="24" rx="3" fill="#f8fafc" />
                        <text x="54" y="176" fontSize="11" fontFamily="ui-monospace,monospace" fill="#111827">|||| ||| ||||</text>
                        <rect x="210" y="28" width="270" height="150" rx="10" fill="#111827" />
                        <rect x="222" y="40" width="246" height="116" rx="4" fill="#f8fbff" />
                        <rect x="234" y="52" width="64" height="90" rx="4" fill="#e8eef8" />
                        <rect x="308" y="52" width="146" height="16" rx="4" fill="#dbeafe" />
                        <rect x="308" y="76" width="146" height="40" rx="4" fill="#fff" stroke="#e5e7eb" />
                        <rect x="308" y="124" width="68" height="16" rx="8" fill="#2f80ed" />
                        <rect x="286" y="178" width="118" height="8" fill="#111827" />
                        <rect x="246" y="188" width="198" height="10" rx="3" fill="#1f2937" />
                        <rect x="510" y="78" width="110" height="24" rx="8" fill="#111827" />
                        <rect x="598" y="62" width="26" height="86" rx="8" fill="#1f2937" />
                    </svg>
                </motion.section>
                <motion.section className="login-card" initial={{ opacity: 0, y: 28, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}>
                    <div className="center">
                        <Logo />
                        <div className="wordmark">BornoPos</div>
                        <h1>{t('Welcome Back')}</h1>
                        <p className="muted">{t('Sign in to your account to continue')}</p>
                    </div>
                    {status && <div className="flash note">{status} <button type="button" onClick={() => dispatch(clearStatus())} aria-label="Dismiss">×</button></div>}
                    {error && <div className="errors note">{error}</div>}
                    <form onSubmit={submit}>
                        <label className="field">{t('Email or Username')}
                            <span className="input-ico"><i>👤</i><input value={loginValue} onChange={(event) => setLoginValue(event.target.value)} placeholder={t('Enter your email or username')} required autoFocus /></span>
                        </label>
                        <label className="field">{t('Password')}
                            <span className="input-ico"><i>🔒</i>
                                <input type={show ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={t('Enter your password')} required />
                                <button type="button" className="eye" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setShow((value) => !value); }}>👁</button>
                            </span>
                        </label>
                        <label className="remember"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /> {t('Remember me')}</label>
                        <button className={`signin-btn ${pending ? 'busy' : ''}`} type="submit" disabled={pending} aria-busy={pending}>{pending ? t('Signing in…') : t('Sign In')}</button>
                    </form>
                    <div className="or"><span>{t('or')}</span></div>
                    <div className="demo">
                        <div className="demo-head"><strong>{t('Demo Access')}</strong><span>{t('In the above button demo and local purpose')}</span></div>
                        <div className="demo-grid">
                            {demos.map(([label, email]) => (
                                <button key={email} type="button" onClick={() => { setLoginValue(email); setPassword(window.BornoPos?.demoPassword || ''); }}>{label}</button>
                            ))}
                        </div>
                    </div>
                    <p className="center foot">{t('Register yourself as a shop owner')} <a href="/signup">{t('Sign Up')}</a></p>
                    <p className="muted center">© {new Date().getFullYear()} BornoPos. {t('All rights reserved.')}</p>
                </motion.section>
            </div>
        </div>
    );
}
