import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Icon, Logo } from '../icons';
import { adminNav, shopNav } from '../nav';
import { languages, useT } from '../i18n';
import { AnimatePresence, PageTransition, Popover, motion } from '../motion';
import { logout } from '../slices/sessionSlice';
import { changeLocale, closeMenus, closeSidebar, toggleMenu, toggleNarrow, toggleSidebar, toggleTheme } from '../slices/uiSlice';
import GlobalSearch from '../components/GlobalSearch';

function Item({ item, path }) {
    const t = useT();
    const active = item.href
        ? path === item.href
        : item.match?.some((prefix) => path === prefix || path.startsWith(prefix));

    if (!item.children) {
        const className = active ? 'active' : '';
        const inner = (<><Icon name={item.icon} /><span>{t(item.label)}</span></>);
        return item.spa
            ? <Link className={className} to={item.href}>{inner}</Link>
            : <a className={className} href={item.href}>{inner}</a>;
    }

    return (
        <details open={active || undefined}>
            <summary className={active ? 'active' : ''}>
                <Icon name={item.icon} /><span>{t(item.label)}</span>
            </summary>
            <div className="sub">
                {item.children.map(([label, href, spa]) => {
                    const on = path === href || path.startsWith(`${href}/`);
                    return spa
                        ? <Link key={href} className={on ? 'active' : ''} to={href}>{t(label)}</Link>
                        : <a key={href} className={on ? 'active' : ''} href={href}>{t(label)}</a>;
                })}
            </div>
        </details>
    );
}

export default function Shell({ children }) {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const user = useSelector((state) => state.session.user);
    const ui = useSelector((state) => state.ui);
    const t = useT();
    const current = languages.find((item) => item.id === ui.locale) || languages[0];
    const rawItems = user?.role === 'super_admin' ? adminNav : shopNav;
    const isOwner = user?.role === 'super_admin' || user?.role === 'owner';
    const userPerms = Array.isArray(user?.permissions) ? user.permissions : [];

    const items = rawItems.map((item) => {
        if (isOwner) return item;
        if (item.permission && !userPerms.includes(item.permission) && !item.children) {
            return null;
        }
        if (item.children) {
            const allowed = item.children.filter((child) => {
                const childPerm = child[3];
                return !childPerm || userPerms.includes(childPerm);
            });
            if (allowed.length === 0) return null;
            return { ...item, children: allowed };
        }
        return item;
    }).filter(Boolean);

    const role = (user?.role || '').replace('_', ' ');

    useEffect(() => {
        dispatch(closeSidebar());
    }, [location.pathname, dispatch]);

    useEffect(() => {
        function onKey(event) {
            if (event.key === 'Escape') {
                dispatch(closeMenus());
                dispatch(closeSidebar());
            }
        }
        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, [dispatch]);

    function toggleNav(event) {
        event.stopPropagation();
        if (window.matchMedia('(max-width: 860px)').matches) dispatch(toggleSidebar());
        else dispatch(toggleNarrow());
    }

    return (
        <div className={`app ${ui.theme} ${ui.narrow ? 'nav-narrow' : ''}`}>
            <AnimatePresence>
                {ui.sidebar && (
                    <motion.button
                        key="backdrop"
                        className="backdrop"
                        type="button"
                        aria-label="Close menu"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={(event) => { event.stopPropagation(); dispatch(closeSidebar()); }}
                    />
                )}
            </AnimatePresence>
            <aside className={`sidebar ${ui.sidebar ? 'open' : ''}`}>
                <Link className="brand" to={user?.role === 'super_admin' ? '/dashboard' : '/store-dashboard'}>
                    <Logo />
                    <div><strong>BornoPos</strong><span>{t('Powering Your Business')}</span></div>
                </Link>
                <nav className="nav">
                    {items.map((item) => <Item key={item.label} item={item} path={location.pathname} />)}
                    <a href="/tour"><Icon name="chart" /><span>{t('Take a Tour')}</span></a>
                </nav>
                {user?.role !== 'super_admin' && (
                    <div className="upgrade">
                        <strong><span className="crown">♛</span> {t('BornoPos Pro')}</strong>
                        <p>{t('Unlock more features for your business')}</p>
                        <a href="/subscription-purchase">{t('Upgrade Now →')}</a>
                    </div>
                )}
                <div className="side-tools">
                    <a href="/tour" title="Tour">⌘</a>
                    <a href={user?.role === 'super_admin' ? '/user/profile' : '/settings/general-settings'} title="Settings">⚙</a>
                    <a href="/user/profile" title="Profile">☺</a>
                    <button type="button" title="Logout" onClick={(event) => { event.stopPropagation(); dispatch(logout()).then(() => navigate('/signin')); }}>↪</button>
                </div>
            </aside>
            <div className="main" onClick={() => { dispatch(closeMenus()); dispatch(closeSidebar()); }}>
                <header className="topbar" onClick={(event) => event.stopPropagation()}>
                    <button className="icon-btn" type="button" aria-label="Menu" aria-expanded={ui.sidebar || ui.narrow} onClick={toggleNav}>☰</button>
                    <GlobalSearch />
                    {user?.role !== 'super_admin' && (isOwner || userPerms.includes('pos.view')) && <Link className="pos-btn" to="/pos"><Icon name="cart" /> {t('POS')}</Link>}
                    <button className="icon-btn round" type="button" title={ui.theme === 'dark' ? t('Light') : t('Dark')} onClick={(event) => { event.stopPropagation(); dispatch(toggleTheme()); }}>{ui.theme === 'dark' ? '☀' : '☾'}</button>
                    <div className={`menu ${ui.noticeOpen ? 'open' : ''}`}>
                        <button className="icon-btn round" type="button" aria-label="Notifications" aria-expanded={ui.noticeOpen} onClick={(event) => { event.stopPropagation(); dispatch(toggleMenu('notice')); }}>🔔</button>
                        <Popover open={ui.noticeOpen}><div className="muted">{t('No notifications')}</div></Popover>
                    </div>
                    <div className={`menu ${ui.langOpen ? 'open' : ''}`}>
                        <button className="lang" type="button" aria-expanded={ui.langOpen} onClick={(event) => { event.stopPropagation(); dispatch(toggleMenu('lang')); }}><span className="flag">{current.flag}</span> {current.label}</button>
                        <Popover open={ui.langOpen} onClick={(event) => event.stopPropagation()}>
                            {languages.map((item) => (
                                <button type="button" key={item.id} className={item.id === ui.locale ? 'on' : ''} onClick={() => dispatch(changeLocale(item.id))}>{item.flag} {item.label}</button>
                            ))}
                        </Popover>
                    </div>
                    <div className={`menu ${ui.userOpen ? 'open' : ''}`}>
                        <button className="user-chip" type="button" aria-expanded={ui.userOpen} onClick={(event) => { event.stopPropagation(); dispatch(toggleMenu('user')); }}>
                            <span className="avatar">{(user?.name || 'A').slice(0, 1).toUpperCase()}</span>
                            <span className="who"><b>{user?.name}</b><small>{t(user?.role_title || user?.role || role)}</small></span>
                        </button>
                        <Popover open={ui.userOpen}>
                            <a href="/user/profile">{t('Profile')}</a>
                            <button type="button" onClick={() => dispatch(logout()).then(() => navigate('/signin'))}>{t('Logout')}</button>
                        </Popover>
                    </div>
                </header>
                <PageTransition key={location.pathname} className="content">{children}</PageTransition>
                <footer className="app-foot">
                    <span>© {new Date().getFullYear()} BornoPos</span>
                    <span>{window.BornoPos?.phone} · {window.BornoPos?.email}</span>
                    <span>v{window.BornoPos?.version}</span>
                </footer>
            </div>
        </div>
    );
}
