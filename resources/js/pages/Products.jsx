import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { money } from '../api';
import { useT } from '../i18n';
import { useDeleteProductMutation, useGetProductsQuery } from '../services/bornoposApi';

export default function Products() {
    const t = useT();
    const navigate = useNavigate();
    const [filters, setFilters] = useState({ q: '', category_id: '', brand_id: '', status: '', page: 1, per_page: 10 });
    const { data: payload, isFetching, isError } = useGetProductsQuery(filters);
    const [remove, removeState] = useDeleteProductMutation();
    const data = payload?.data || [];
    const meta = payload?.meta || { current_page: 1, last_page: 1, from: 0, to: 0, total: 0 };
    const categories = payload?.categories || [];
    const brands = payload?.brands || [];

    function update(next) {
        setFilters((current) => ({ ...current, ...next, page: next.page ?? 1 }));
    }

    function exportCsv() {
        const lines = [['Name', 'Code', 'Brand', 'Category', 'Type', 'Cost', 'Price', 'Stock'], ...data.map((row) => [
            row.name, row.code, row.brand, row.category, row.type, (row.cost_cents / 100).toFixed(2), (row.price_cents / 100).toFixed(2), row.stock_qty,
        ])];
        const blob = new Blob([lines.map((line) => line.join(',')).join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'products.csv';
        link.click();
        URL.revokeObjectURL(url);
    }

    async function destroy(row) {
        if (!window.confirm(`Delete ${row.name}?`)) return;
        const result = await remove(row.id);
        if (result.error) window.alert(result.error.data?.message || 'The product could not be deleted.');
    }

    const pages = Array.from({ length: meta.last_page }, (_, index) => index + 1).slice(Math.max(0, meta.current_page - 3), meta.current_page + 2);

    return (
        <>
            <div className="page-title">
                <div>
                    <h1>{t('Products')}</h1>
                    <div className="crumbs">{t('Dashboard')} &gt; {t('Products')}</div>
                </div>
                <div className="actions">
                    <button className="btn" type="button" onClick={exportCsv}>{t('Export')}</button>
                    <button className="btn primary" data-tour="add-product-btn" type="button" onClick={() => navigate('/products/create')}>{t('+ Add Product')}</button>
                </div>
            </div>
            <section className="card table-card" data-tour="products-view">
                <div className="toolbar" data-tour="products-filter">
                    <input value={filters.q} placeholder={t('Search products by name, code, brand...')} onChange={(event) => update({ q: event.target.value })} />
                    <select value={filters.category_id} onChange={(event) => update({ category_id: event.target.value })}>
                        <option value="">{t('All Categories')}</option>
                        {categories.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                    </select>
                    <select value={filters.brand_id} onChange={(event) => update({ brand_id: event.target.value })}>
                        <option value="">{t('All Brands')}</option>
                        {brands.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                    </select>
                    <select value={filters.status} onChange={(event) => update({ status: event.target.value })}>
                        <option value="">{t('All Status')}</option>
                        <option value="active">{t('Active')}</option>
                        <option value="inactive">{t('Inactive')}</option>
                    </select>
                    <button className="btn" type="button" onClick={() => update({ q: '', category_id: '', brand_id: '', status: '' })}>{t('Reset')}</button>
                </div>
                {isFetching && <div className="loading-bar" />}
                {isError && <p className="error note">The product list could not be loaded.</p>}
                {!payload && isFetching && (
                    <div className="skeleton-rows" aria-hidden="true">
                        {Array.from({ length: 6 }, (_, index) => <span key={index} className="skeleton block" />)}
                    </div>
                )}
                <table className="grid" data-tour="products-table">
                    <thead>
                        <tr>
                            <th>{t('SL')}</th><th>{t('Image')}</th><th>{t('Name')}</th><th>{t('Code')}</th><th>{t('Brand')}</th><th>{t('Category')}</th><th>{t('Product Type')}</th><th>{t('Unit Purchase Price')}</th><th>{t('Selling Price')}</th><th>{t('Current stock')}</th><th>{t('Action')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.length ? data.map((row, index) => (
                            <tr key={row.id}>
                                <td>{(meta.from || 1) + index}</td>
                                <td>{row.image ? <img className="thumb-sm" src={row.image} alt="" /> : <span className="thumb-sm ph" />}</td>
                                <td>{row.name}</td>
                                <td>{row.code}</td>
                                <td>{row.brand || '—'}</td>
                                <td>{row.category || '—'}</td>
                                <td className="cap">{row.type}</td>
                                <td>{money(row.cost_cents)}</td>
                                <td>{money(row.price_cents)}</td>
                                <td><span className={`stock ${Number(row.stock_qty) > 0 ? 'in' : 'out'}`}>{row.stock_qty}</span> {row.unit}</td>
                                <td className="row-actions">
                                    <Link className="btn" to={`/products/${row.id}`}>{t('View')}</Link>
                                    <Link className="btn" to={`/products/${row.id}/edit`}>{t('Edit')}</Link>
                                    <button className="btn" type="button" disabled={removeState.isLoading} onClick={() => destroy(row)}>{t('Delete')}</button>
                                </td>
                            </tr>
                        )) : <tr><td className="empty" colSpan="11">{isFetching ? t('Loading') : t('No data found')}</td></tr>}
                    </tbody>
                </table>
                <div className="pager">
                    <label>{t('Show {n} entries')}
                        <select value={filters.per_page} onChange={(event) => update({ per_page: event.target.value })}>
                            {[10, 25, 50].map((size) => <option key={size} value={size}>{size}</option>)}
                        </select>
                        {t('entries')}
                    </label>
                    <span>{t('Showing {from} to {to} of {total} entries', { from: meta.from || 0, to: meta.to || 0, total: meta.total })}</span>
                    <div className="pages">
                        <button type="button" disabled={meta.current_page <= 1} onClick={() => update({ page: meta.current_page - 1 })}>‹</button>
                        {pages.map((page) => <button type="button" key={page} className={page === meta.current_page ? 'on' : ''} onClick={() => update({ page })}>{page}</button>)}
                        <button type="button" disabled={meta.current_page >= meta.last_page} onClick={() => update({ page: meta.current_page + 1 })}>›</button>
                    </div>
                </div>
            </section>
        </>
    );
}
