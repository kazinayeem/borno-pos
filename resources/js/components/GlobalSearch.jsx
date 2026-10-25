import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../icons';
import { useT } from '../i18n';

export default function GlobalSearch() {
    const t = useT();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [type, setType] = useState('all');
    const [results, setResults] = useState([]);
    const [categories, setCategories] = useState({ all: 'All' });
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef(null);
    const dropdownRef = useRef(null);

    // Global keyboard shortcut: Command+K or Ctrl+K
    useEffect(() => {
        function handleKeyDown(event) {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                setOpen(true);
                setTimeout(() => inputRef.current?.focus(), 50);
            }
            if (event.key === 'Escape') {
                setOpen(false);
            }
        }
        window.addEventListener('keydown', handleKeyDown);

        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Debounced search query
    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            setLoading(false);

            return undefined;
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=${encodeURIComponent(type)}`, {
                    headers: { Accept: 'application/json' },
                });
                if (res.ok) {
                    const json = await res.json();
                    setResults(json.results || []);
                    if (json.categories) setCategories(json.categories);
                    setSelectedIndex(0);
                }
            } catch (err) {
                // Ignore search fetch errors
            } finally {
                setLoading(false);
            }
        }, 220);

        return () => clearTimeout(timer);
    }, [query, type]);

    // Handle item selection
    function handleSelect(item) {
        setOpen(false);
        setQuery('');
        if (item.url) {
            navigate(item.url);
        }
    }

    // Keyboard navigation within search
    function handleInputKeyDown(event) {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setSelectedIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
        } else if (event.key === 'Enter') {
            event.preventDefault();
            if (results[selectedIndex]) {
                handleSelect(results[selectedIndex]);
            }
        }
    }

    return (
        <div className="search" style={{ position: 'relative' }} ref={dropdownRef}>
            <Icon name="search" />
            <input
                ref={inputRef}
                name="q"
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    if (!open) setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={handleInputKeyDown}
                placeholder={t('Search products, SKUs, invoices, customers...')}
                autoComplete="off"
            />
            <kbd onClick={() => inputRef.current?.focus()}>⌘K</kbd>

            {open && (
                <>
                    <div
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 80,
                        }}
                        onClick={() => setOpen(false)}
                    />
                    <div
                        className="global-search-dropdown"
                        style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            marginTop: '8px',
                            background: 'var(--card)',
                            border: '1px solid var(--border)',
                            borderRadius: '14px',
                            boxShadow: '0 16px 36px rgba(0, 0, 0, 0.16)',
                            zIndex: 90,
                            maxHeight: '440px',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Category Filter Pills */}
                        <div
                            style={{
                                display: 'flex',
                                gap: '6px',
                                padding: '10px 14px',
                                borderBottom: '1px solid var(--border)',
                                overflowX: 'auto',
                                background: 'var(--card-head)',
                            }}
                        >
                            {Object.entries(categories).map(([key, label]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setType(key)}
                                    style={{
                                        padding: '4px 10px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        borderRadius: '20px',
                                        border: '1px solid',
                                        borderColor: type === key ? 'var(--blue)' : 'var(--border)',
                                        background: type === key ? 'var(--blue)' : 'transparent',
                                        color: type === key ? '#fff' : 'var(--muted)',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                        transition: 'all 0.12s ease',
                                    }}
                                >
                                    {t(label)}
                                </button>
                            ))}
                        </div>

                        {/* Search Results List */}
                        <div style={{ overflowY: 'auto', padding: '6px 0', flex: 1 }}>
                            {loading && (
                                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
                                    {t('Searching...')}
                                </div>
                            )}

                            {!loading && query.trim() && results.length === 0 && (
                                <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
                                    <strong style={{ fontSize: '14px', display: 'block', marginBottom: '4px' }}>
                                        {t('No results found for "{q}"', { q: query })}
                                    </strong>
                                    <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                                        {t('Try searching with another keyword or selecting "All".')}
                                    </span>
                                </div>
                            )}

                            {!loading && !query.trim() && (
                                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
                                    <div style={{ marginBottom: '6px', fontWeight: 600 }}>{t('Quick Search')}</div>
                                    <span style={{ fontSize: '12px' }}>
                                        {t('Type to search products, barcodes, invoice numbers, customers, suppliers, staff, and reports.')}
                                    </span>
                                </div>
                            )}

                            {!loading && results.map((item, index) => {
                                const active = index === selectedIndex;

                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => handleSelect(item)}
                                        onMouseEnter={() => setSelectedIndex(index)}
                                        style={{
                                            padding: '10px 16px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            background: active ? 'var(--card-head)' : 'transparent',
                                            borderLeft: active ? '3px solid var(--blue)' : '3px solid transparent',
                                            cursor: 'pointer',
                                            transition: 'background 0.1s ease',
                                        }}
                                    >
                                        <span style={{ fontSize: '18px', width: '24px', textAlign: 'center' }}>
                                            {item.icon}
                                        </span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <strong style={{ fontSize: '13px', color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {item.title}
                                                </strong>
                                                <span
                                                    style={{
                                                        fontSize: '10px',
                                                        fontWeight: 700,
                                                        textTransform: 'uppercase',
                                                        padding: '1px 6px',
                                                        borderRadius: '4px',
                                                        background: 'var(--border)',
                                                        color: 'var(--muted)',
                                                    }}
                                                >
                                                    {item.badge}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {item.subtitle}
                                            </div>
                                        </div>
                                        <span style={{ fontSize: '12px', color: 'var(--muted)', opacity: active ? 1 : 0 }}>
                                            ↵
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Dropdown Footer */}
                        <div
                            style={{
                                padding: '8px 16px',
                                borderTop: '1px solid var(--border)',
                                background: 'var(--card-head)',
                                fontSize: '11px',
                                color: 'var(--muted)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}
                        >
                            <span>
                                {t('Use')} <kbd style={{ padding: '2px 5px', fontSize: '10px', borderRadius: '3px', background: 'var(--border)' }}>↑</kbd> <kbd style={{ padding: '2px 5px', fontSize: '10px', borderRadius: '3px', background: 'var(--border)' }}>↓</kbd> {t('to navigate')} · <kbd style={{ padding: '2px 5px', fontSize: '10px', borderRadius: '3px', background: 'var(--border)' }}>↵</kbd> {t('to select')}
                            </span>
                            <span>{results.length > 0 && t('{count} results', { count: results.length })}</span>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
