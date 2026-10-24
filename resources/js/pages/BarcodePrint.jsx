import { useMemo, useState, useRef } from 'react';
import { money } from '../api';
import { code128Bars } from '../code128';
import { useT } from '../i18n';
import { useGetBarcodeQuery } from '../services/bornoposApi';

const LABEL_SIZES = {
    standard: { label: 'Standard (50 x 30 mm)', width: '50mm', height: '30mm', barHeight: 46 },
    compact: { label: 'Compact (40 x 25 mm)', width: '40mm', height: '25mm', barHeight: 36 },
    shelf: { label: 'Shelf / Large (60 x 40 mm)', width: '60mm', height: '40mm', barHeight: 56 },
    sheet30: { label: 'A4 Sheet (70 x 37 mm)', width: '70mm', height: '37mm', barHeight: 48 },
};

function Label({ product, sizeKey = 'standard' }) {
    const code = product.barcode || product.code || '';
    const drawn = code128Bars(code);
    const size = LABEL_SIZES[sizeKey] || LABEL_SIZES.standard;

    return (
        <article className={`barcode-label label-${sizeKey}`} style={{ width: size.width, minHeight: size.height }}>
            <strong title={product.name}>{product.name}</strong>
            {drawn ? (
                <svg className="barcode" viewBox={`0 0 ${drawn.width} ${size.barHeight}`} role="img" aria-label={code}>
                    {drawn.bars.map((bar) => <rect key={`${bar.x}-${bar.width}`} x={bar.x} y="0" width={bar.width} height={size.barHeight} fill="#111827" />)}
                </svg>
            ) : <p className="muted">This code cannot be printed.</p>}
            <b>{code}</b>
            <span>{money(product.price_cents)}</span>
        </article>
    );
}

export default function BarcodePrint() {
    const t = useT();
    const { data, isFetching, error } = useGetBarcodeQuery();
    const [q, setQ] = useState('');
    const [picked, setPicked] = useState({});
    const [labelSize, setLabelSize] = useState('standard');
    const [scannerCode, setScannerCode] = useState('');
    const [scanFeedback, setScanFeedback] = useState('');
    const searchInputRef = useRef(null);

    const products = data?.products || [];
    const matches = useMemo(() => products.filter((product) => {
        const text = `${product.name} ${product.code} ${product.barcode || ''}`.toLowerCase();

        return text.includes(q.trim().toLowerCase());
    }).slice(0, 12), [products, q]);

    const labels = products.flatMap((product) => {
        const copies = picked[product.id] || 0;

        return Array.from({ length: copies }, (_, index) => ({ ...product, key: `${product.id}-${index}` }));
    });

    function add(product, qty = 1) {
        setPicked((rows) => ({ ...rows, [product.id]: Math.min(100, (rows[product.id] || 0) + qty) }));
        setQ('');
    }

    function setCopies(id, value) {
        const copies = Math.max(0, Math.min(100, Number(value) || 0));
        setPicked((rows) => {
            if (copies === 0) {
                const next = { ...rows };
                delete next[id];
                return next;
            }
            return { ...rows, [id]: copies };
        });
    }

    function clearAll() {
        setPicked({});
    }

    function addOneToAll() {
        setPicked((rows) => {
            const next = { ...rows };
            Object.keys(next).forEach((id) => {
                next[id] = Math.min(100, next[id] + 1);
            });
            return next;
        });
    }

    function handleScannerSubmit(e) {
        e.preventDefault();
        const code = scannerCode.trim().toLowerCase();
        if (!code) return;

        const found = products.find((p) =>
            (p.code && p.code.toLowerCase() === code) ||
            (p.barcode && p.barcode.toLowerCase() === code)
        );

        if (found) {
            add(found, 1);
            setScanFeedback(`+1 added: ${found.name}`);
            setScannerCode('');
        } else {
            setScanFeedback(`Product not found for: ${code}`);
        }
        setTimeout(() => setScanFeedback(''), 3000);
    }

    return (
        <section>
            <div className="page-title no-print">
                <div>
                    <h1>{t('Print Barcode')}</h1>
                    <p className="muted">{t('Search or scan a product, choose how many labels, select label size, then print.')}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {labels.length > 0 && (
                        <button className="btn" type="button" onClick={clearAll}>{t('Clear All')}</button>
                    )}
                    <button className="btn primary" type="button" disabled={!labels.length} onClick={() => window.print()}>
                        {t('Print')} ({labels.length})
                    </button>
                </div>
            </div>

            {error && <p className="error note no-print">{error.data?.message || t('Could not load products.')}</p>}

            <section className="card no-print" style={{ marginBottom: '16px' }}>
                <div className="toolbar" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ flex: 1, minWidth: '240px' }}>
                        <input
                            ref={searchInputRef}
                            value={q}
                            placeholder={t('Search products by name, code, or barcode')}
                            onChange={(event) => setQ(event.target.value)}
                        />
                    </div>

                    <form onSubmit={handleScannerSubmit} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <input
                            value={scannerCode}
                            placeholder={t('Scan barcode or enter code + Enter')}
                            onChange={(e) => setScannerCode(e.target.value)}
                            style={{ width: '220px' }}
                        />
                        <button type="submit" className="btn">{t('Scan')}</button>
                    </form>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t('Label Size')}:</label>
                        <select value={labelSize} onChange={(e) => setLabelSize(e.target.value)}>
                            {Object.entries(LABEL_SIZES).map(([key, item]) => (
                                <option key={key} value={key}>{item.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {scanFeedback && (
                    <div style={{ padding: '6px 12px', marginTop: '8px', borderRadius: '4px', background: '#ecfdf5', color: '#065f46', fontSize: '0.85rem' }}>
                        {scanFeedback}
                    </div>
                )}

                {isFetching && !data && <div className="loading-bar" />}

                {q && !isFetching && (
                    <div className="barcode-matches">
                        {matches.map((product) => (
                            <button type="button" key={product.id} onClick={() => add(product)}>
                                <b>{product.name}</b>
                                <span>{product.barcode || product.code}</span>
                            </button>
                        ))}
                        {!matches.length && <p className="empty">{t('No data found')}</p>}
                    </div>
                )}

                <div className="barcode-picked" style={{ marginTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t('Selected for Printing')} ({labels.length} total labels)</span>
                        {Object.keys(picked).length > 0 && (
                            <button type="button" className="btn" style={{ padding: '2px 8px', fontSize: '0.8rem' }} onClick={addOneToAll}>
                                +1 to all
                            </button>
                        )}
                    </div>
                    {products.filter((product) => picked[product.id]).map((product) => (
                        <label key={product.id}>
                            <span>
                                {product.name}
                                <small>{product.barcode || product.code} · {money(product.price_cents)}</small>
                            </span>
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={picked[product.id]}
                                    onChange={(event) => setCopies(product.id, event.target.value)}
                                />
                                <button type="button" className="btn" style={{ padding: '2px 6px', fontSize: '0.75rem' }} onClick={() => setCopies(product.id, 0)}>
                                    ✕
                                </button>
                            </div>
                        </label>
                    ))}
                    {!labels.length && <p className="empty">{t('No labels picked yet. Search or scan above to select products.')}</p>}
                </div>
            </section>

            <div className={`barcode-sheet sheet-${labelSize}`}>
                {labels.map((product) => <Label key={product.key} product={product} sizeKey={labelSize} />)}
            </div>
        </section>
    );
}
