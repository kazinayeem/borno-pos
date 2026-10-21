import { useState } from 'react';
import { Link } from 'react-router-dom';
import { money } from '../api';
import { useGetBatchesQuery } from '../services/bornoposApi';

const filters = [
    ['', 'All'],
    ['soon', 'Expiring soon'],
    ['expired', 'Expired'],
];

export default function Batches() {
    const [status, setStatus] = useState('');
    const [page, setPage] = useState(1);
    const { data, isFetching, isError } = useGetBatchesQuery({ status, page });

    return (
        <>
            <div className="page-title">
                <div>
                    <h1>Batches</h1>
                    <div className="crumbs">Stock still on hand, with expiry status from each product’s near-expiry window.</div>
                </div>
            </div>
            <section className="card">
                <div className="tabs">
                    {filters.map(([value, label]) => (
                        <button type="button" key={label} className={`chip ${status === value ? 'active' : ''}`} onClick={() => { setStatus(value); setPage(1); }}>{label}</button>
                    ))}
                </div>
                {isError && <p className="error">The batch list could not be loaded.</p>}
                <table className="grid">
                    <thead><tr><th>Product</th><th>Batch</th><th>Qty</th><th>Manufactured</th><th>Expiry</th><th>Cost</th><th>Status</th></tr></thead>
                    <tbody>
                        {(data?.data || []).map((row) => (
                            <tr key={row.id}>
                                <td>{row.product_id ? <Link to={`/products/${row.product_id}`}>{row.product}</Link> : row.product}</td>
                                <td>{row.batch_no}</td>
                                <td>{row.qty}</td>
                                <td>{row.manufactured_on || '—'}</td>
                                <td>{row.expiry_date || '—'}</td>
                                <td>{money(row.cost_cents || 0)}</td>
                                <td>{row.status}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {isFetching && <p className="muted">Loading</p>}
                {!isFetching && !(data?.data || []).length && <p className="empty">No batches in this view.</p>}
                <div className="actions">
                    <button type="button" className="btn" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button>
                    <button type="button" className="btn" disabled={!data?.meta || page >= data.meta.last_page} onClick={() => setPage((current) => current + 1)}>Next</button>
                </div>
            </section>
        </>
    );
}
