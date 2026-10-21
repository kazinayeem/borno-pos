import { useMemo, useState } from 'react';
import { money } from '../api';
import { code128Bars } from '../code128';
import { useT } from '../i18n';
import { useGetBarcodeQuery } from '../services/bornoposApi';

function Label({ product }) {
    const drawn = code128Bars(product.code);

    return (
        <article className="barcode-label">
            <strong>{product.name}</strong>
            {drawn ? (
                <svg className="barcode" viewBox={`0 0 ${drawn.width} 56`} role="img" aria-label={product.code}>
                    {drawn.bars.map((bar) => <rect key={`${bar.x}-${bar.width}`} x={bar.x} y="0" width={bar.width} height="56" fill="#111827" />)}
                </svg>
            ) : <p className="muted">This code cannot be printed as a barcode.</p>}
            <b>{product.code}</b>
            <span>{money(product.price_cents)}</span>
        </article>
    );
}

export default function BarcodePrint() {
    const t = useT();
    const { data, isFetching, error } = useGetBarcodeQuery();
    const [q, setQ] = useState('');
    const [picked, setPicked] = useState({});

    const products = data?.products || [];
    const matches = useMemo(() => products.filter((product) => {
        const text = `${product.name} ${product.code}`.toLowerCase();

        return text.includes(q.trim().toLowerCase());
    }).slice(0, 12), [products, q]);

    const labels = products.flatMap((product) => {
        const copies = picked[product.id] || 0;

        return Array.from({ length: copies }, (_, index) => ({ ...product, key: `${product.id}-${index}` }));
    });

    function add(product) {
        setPicked((rows) => ({ ...rows, [product.id]: Math.min(48, (rows[product.id] || 0) + 1) }));
        setQ('');
    }

    function setCopies(id, value) {
        const copies = Math.max(0, Math.min(48, Number(value) || 0));
        setPicked((rows) => ({ ...rows, [id]: copies }));
    }

    return (
        <section>
            <div className="page-title no-print">
                <div>
                    <h1>{t('Print Barcode')}</h1>
                    <p className="muted">{t('Search a product, choose how many labels, then print.')}</p>
                </div>
                <button className="btn primary" type="button" disabled={!labels.length} onClick={() => window.print()}>{t('Print')}</button>
            </div>
            {error && <p className="error note no-print">{error.data?.message || t('Could not load products.')}</p>}
            <section className="card no-print">
                <div className="toolbar">
                    <input value={q} placeholder={t('Search by name or code')} onChange={(event) => setQ(event.target.value)} />
                </div>
                {isFetching && !data && <div className="loading-bar" />}
                {q && !isFetching && (
                    <div className="barcode-matches">
                        {matches.map((product) => (
                            <button type="button" key={product.id} onClick={() => add(product)}>
                                <b>{product.name}</b>
                                <span>{product.code}</span>
                            </button>
                        ))}
                        {!matches.length && <p className="empty">{t('No data found')}</p>}
                    </div>
                )}
                <div className="barcode-picked">
                    {products.filter((product) => picked[product.id]).map((product) => (
                        <label key={product.id}>
                            <span>{product.name}<small>{product.code}</small></span>
                            <input type="number" min="0" max="48" value={picked[product.id]} onChange={(event) => setCopies(product.id, event.target.value)} />
                        </label>
                    ))}
                    {!labels.length && <p className="empty">{t('No labels yet')}</p>}
                </div>
            </section>
            <div className="barcode-sheet">
                {labels.map((product) => <Label key={product.key} product={product} />)}
            </div>
        </section>
    );
}
