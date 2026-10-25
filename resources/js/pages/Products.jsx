import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { money } from '../api';
import { useT } from '../i18n';
import { useDeleteProductMutation, useGetProductsQuery } from '../services/bornoposApi';
import { useUrlQueryState } from '../hooks/useUrlQueryState';
import { Pagination } from '../components/ui/Pagination';
import { Modal, ConfirmModal } from '../components/ui';

export default function Products() {
    const t = useT();
    const navigate = useNavigate();
    const [viewingProduct, setViewingProduct] = useState(null);
    const [deletingProduct, setDeletingProduct] = useState(null);
    const [deleteError, setDeleteError] = useState(null);

    const {
        params,
        setQuery,
        setPage,
        setPerPage,
        setSort,
        getSortIndicator,
        resetFilters,
    } = useUrlQueryState({
        search: '',
        category_id: '',
        brand_id: '',
        status: '',
        page: 1,
        per_page: 10,
        sort_by: '',
        sort_dir: 'desc',
    });

    const { data: payload, isFetching, isError } = useGetProductsQuery(params);
    const [remove, removeState] = useDeleteProductMutation();
    const data = payload?.data || [];
    const meta = payload?.meta || { current_page: params.page, last_page: 1, from: 0, to: 0, total: 0 };
    const categories = payload?.categories || [];
    const brands = payload?.brands || [];

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

    async function handleConfirmDelete() {
        if (!deletingProduct) return;
        setDeleteError(null);
        const result = await remove(deletingProduct.id);
        if (result.error) {
            setDeleteError(result.error.data?.message || t('The product could not be deleted.'));
        } else {
            setDeletingProduct(null);
        }
    }

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
                    <input
                        value={params.search}
                        placeholder={t('Search products by name, code, brand...')}
                        onChange={(event) => setQuery({ search: event.target.value })}
                    />
                    <select
                        value={params.category_id}
                        onChange={(event) => setQuery({ category_id: event.target.value })}
                    >
                        <option value="">{t('All Categories')}</option>
                        {categories.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                    </select>
                    <select
                        value={params.brand_id}
                        onChange={(event) => setQuery({ brand_id: event.target.value })}
                    >
                        <option value="">{t('All Brands')}</option>
                        {brands.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                    </select>
                    <select
                        value={params.status}
                        onChange={(event) => setQuery({ status: event.target.value })}
                    >
                        <option value="">{t('All Status')}</option>
                        <option value="active">{t('Active')}</option>
                        <option value="inactive">{t('Inactive')}</option>
                    </select>
                    <button
                        className="btn"
                        type="button"
                        onClick={() => resetFilters()}
                    >
                        {t('Reset')}
                    </button>
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
                            <th>{t('SL')}</th>
                            <th>{t('Image')}</th>
                            <th onClick={() => setSort('name')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                {t('Name')} {getSortIndicator('name')}
                            </th>
                            <th onClick={() => setSort('code')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                {t('Code')} {getSortIndicator('code')}
                            </th>
                            <th>{t('Brand')}</th>
                            <th>{t('Category')}</th>
                            <th>{t('Product Type')}</th>
                            <th onClick={() => setSort('cost_cents')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                {t('Unit Purchase Price')} {getSortIndicator('cost_cents')}
                            </th>
                            <th onClick={() => setSort('price_cents')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                {t('Selling Price')} {getSortIndicator('price_cents')}
                            </th>
                            <th onClick={() => setSort('stock_qty')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                {t('Current stock')} {getSortIndicator('stock_qty')}
                            </th>
                            <th>{t('Action')}</th>
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
                                    <button className="btn" type="button" onClick={() => setViewingProduct(row)} title={t('Quick View')}>
                                        {t('View')}
                                    </button>
                                    <Link className="btn" to={`/products/${row.id}/edit`}>{t('Edit')}</Link>
                                    <button className="btn" type="button" disabled={removeState.isLoading} onClick={() => setDeletingProduct(row)}>
                                        {t('Delete')}
                                    </button>
                                </td>
                            </tr>
                        )) : <tr><td className="empty" colSpan="11">{isFetching ? t('Loading') : t('No data found')}</td></tr>}
                    </tbody>
                </table>
                <Pagination
                    currentPage={meta.current_page || params.page}
                    lastPage={meta.last_page || 1}
                    total={meta.total || 0}
                    from={meta.from || 0}
                    to={meta.to || 0}
                    perPage={params.per_page}
                    onPageChange={setPage}
                    onPerPageChange={setPerPage}
                    perPageOptions={[10, 25, 50, 100]}
                />
            </section>

            {/* Quick View Product Details Modal */}
            <Modal
                isOpen={viewingProduct !== null}
                onClose={() => setViewingProduct(null)}
                title={viewingProduct?.name || t('Product Details')}
                subtitle={`${t('Code')}: ${viewingProduct?.code || '—'}`}
                size="md"
                footer={(
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <Link
                            to={`/products/${viewingProduct?.id}/edit`}
                            className="btn primary"
                            onClick={() => setViewingProduct(null)}
                        >
                            ✏️ {t('Edit Product')}
                        </Link>
                        <button type="button" className="btn" onClick={() => setViewingProduct(null)}>
                            {t('Close')}
                        </button>
                    </div>
                )}
            >
                {viewingProduct && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {viewingProduct.image && (
                            <div style={{ textAlign: 'center', background: 'var(--bg, #f8fafc)', padding: '12px', borderRadius: '8px' }}>
                                <img
                                    src={viewingProduct.image}
                                    alt={viewingProduct.name}
                                    style={{ maxHeight: '180px', objectFit: 'contain', borderRadius: '6px' }}
                                />
                            </div>
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                            <div style={{ padding: '8px 12px', background: 'var(--bg, #f8fafc)', borderRadius: '6px' }}>
                                <div style={{ color: 'var(--muted, #64748b)', fontSize: '11px' }}>{t('Category')}</div>
                                <div style={{ fontWeight: 600 }}>{viewingProduct.category || '—'}</div>
                            </div>
                            <div style={{ padding: '8px 12px', background: 'var(--bg, #f8fafc)', borderRadius: '6px' }}>
                                <div style={{ color: 'var(--muted, #64748b)', fontSize: '11px' }}>{t('Brand')}</div>
                                <div style={{ fontWeight: 600 }}>{viewingProduct.brand || '—'}</div>
                            </div>
                            <div style={{ padding: '8px 12px', background: 'var(--bg, #f8fafc)', borderRadius: '6px' }}>
                                <div style={{ color: 'var(--muted, #64748b)', fontSize: '11px' }}>{t('Product Type')}</div>
                                <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{viewingProduct.type}</div>
                            </div>
                            <div style={{ padding: '8px 12px', background: 'var(--bg, #f8fafc)', borderRadius: '6px' }}>
                                <div style={{ color: 'var(--muted, #64748b)', fontSize: '11px' }}>{t('Current Stock')}</div>
                                <div style={{ fontWeight: 700, color: Number(viewingProduct.stock_qty) > 0 ? '#16a34a' : '#ef4444' }}>
                                    {viewingProduct.stock_qty} {viewingProduct.unit || ''}
                                </div>
                            </div>
                            <div style={{ padding: '8px 12px', background: 'var(--bg, #f8fafc)', borderRadius: '6px' }}>
                                <div style={{ color: 'var(--muted, #64748b)', fontSize: '11px' }}>{t('Cost Price')}</div>
                                <div style={{ fontWeight: 600 }}>{money(viewingProduct.cost_cents)}</div>
                            </div>
                            <div style={{ padding: '8px 12px', background: 'var(--bg, #f8fafc)', borderRadius: '6px' }}>
                                <div style={{ color: 'var(--muted, #64748b)', fontSize: '11px' }}>{t('Selling Price')}</div>
                                <div style={{ fontWeight: 700, color: 'var(--primary, #2563eb)' }}>{money(viewingProduct.price_cents)}</div>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Confirm Delete Product Dialog */}
            <ConfirmModal
                isOpen={deletingProduct !== null}
                onClose={() => { setDeletingProduct(null); setDeleteError(null); }}
                onConfirm={handleConfirmDelete}
                title={t('Delete Product')}
                message={deletingProduct ? `${t('Are you sure you want to permanently delete')} "${deletingProduct.name}"?` : ''}
                confirmText={t('Delete Product')}
                isLoading={removeState.isLoading}
                errorMessage={deleteError}
            />
        </>
    );
}
