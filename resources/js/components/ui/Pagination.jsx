import React from 'react';
import { useT } from '../../i18n';

/**
 * Universal, resilient URL-synced Pagination Component.
 * Supports:
 * - `<Pagination meta={data.meta} onPageChange={setPage} onPerPageChange={setPerPage} />`
 * - `<Pagination currentPage={meta.current_page} lastPage={meta.last_page} total={meta.total} ... />`
 * - `<Pagination page={query.page} perPage={query.per_page} ... />`
 */
export function Pagination(props) {
    const t = useT();

    const meta = props.meta || {};

    const currentPage = Math.max(
        1,
        Number(props.currentPage ?? props.page ?? meta.current_page ?? meta.currentPage ?? meta.page ?? 1) || 1
    );
    const lastPage = Math.max(
        1,
        Number(props.lastPage ?? meta.last_page ?? meta.lastPage ?? 1) || 1
    );
    const total = Math.max(
        0,
        Number(props.total ?? meta.total ?? 0) || 0
    );
    const perPage = Math.max(
        1,
        Number(props.perPage ?? props.per_page ?? meta.per_page ?? meta.perPage ?? 10) || 10
    );
    const from = Number(
        props.from ?? meta.from ?? (total > 0 ? (currentPage - 1) * perPage + 1 : 0)
    ) || 0;
    const to = Number(
        props.to ?? meta.to ?? Math.min(currentPage * perPage, total)
    ) || 0;

    const onPageChange = props.onPageChange;
    const onPerPageChange = props.onPerPageChange;
    const perPageOptions = props.perPageOptions || [10, 15, 25, 50, 100];
    const showPerPage = props.showPerPage ?? true;

    // Do not render empty pagination if there are 0 records and no subsequent pages
    if (total <= 0 && lastPage <= 1) {
        return null;
    }

    const handlePageChange = (targetPage) => {
        const p = Math.max(1, Math.min(lastPage, targetPage));
        if (typeof onPageChange === 'function') {
            onPageChange(p);
        }
    };

    const handlePerPageChange = (targetPerPage) => {
        const pp = Math.max(1, Math.min(100, targetPerPage));
        if (typeof onPerPageChange === 'function') {
            onPerPageChange(pp);
        }
    };

    // Generate smart pagination page numbers with ellipsis
    const getPageNumbers = () => {
        const delta = 2;
        const range = [];
        const rangeWithDots = [];
        let l;

        for (let i = 1; i <= lastPage; i++) {
            if (i === 1 || i === lastPage || (i >= currentPage - delta && i <= currentPage + delta)) {
                range.push(i);
            }
        }

        for (const i of range) {
            if (l) {
                if (i - l === 2) {
                    rangeWithDots.push(l + 1);
                } else if (i - l !== 1) {
                    rangeWithDots.push('...');
                }
            }
            rangeWithDots.push(i);
            l = i;
        }

        return rangeWithDots;
    };

    const pages = getPageNumbers();

    return (
        <div
            className="pagination-bar"
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                padding: '14px 16px',
                borderTop: '1px solid var(--border)',
                fontSize: '13px',
                color: 'var(--muted)',
            }}
        >
            {/* Info and Page Size selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                {showPerPage && onPerPageChange && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{t('Rows per page:')}</span>
                        <select
                            value={perPage}
                            onChange={(e) => handlePerPageChange(Number(e.target.value))}
                            style={{
                                height: '32px',
                                padding: '0 24px 0 8px',
                                borderRadius: '8px',
                                fontSize: '13px',
                                width: 'auto',
                            }}
                        >
                            {perPageOptions.map((opt) => (
                                <option key={opt} value={opt}>
                                    {opt}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
                <span>
                    {total > 0 ? (
                        t('Showing {from} to {to} of {total} entries', {
                            from,
                            to,
                            total,
                        })
                    ) : (
                        t('No entries to display')
                    )}
                </span>
            </div>

            {/* Page Buttons */}
            {lastPage > 1 && (
                <>
                    {/* Desktop Full Page Number Navigation */}
                    <div className="pagination-pages-desktop" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                            type="button"
                            className="btn"
                            disabled={currentPage <= 1}
                            onClick={() => handlePageChange(currentPage - 1)}
                            style={{ height: '32px', padding: '0 10px', fontSize: '12px' }}
                        >
                            {t('Previous')}
                        </button>

                        {pages.map((p, idx) => {
                            if (p === '...') {
                                return (
                                    <span key={`dots-${idx}`} style={{ padding: '0 6px', color: 'var(--muted)' }}>
                                        …
                                    </span>
                                );
                            }

                            const isCurrent = p === currentPage;
                            return (
                                <button
                                    key={`page-${p}`}
                                    type="button"
                                    className={`btn ${isCurrent ? 'primary' : ''}`}
                                    onClick={() => handlePageChange(p)}
                                    style={{
                                        height: '32px',
                                        minWidth: '32px',
                                        padding: '0 8px',
                                        fontSize: '12px',
                                        fontWeight: isCurrent ? 700 : 500,
                                    }}
                                >
                                    {p}
                                </button>
                            );
                        })}

                        <button
                            type="button"
                            className="btn"
                            disabled={currentPage >= lastPage}
                            onClick={() => handlePageChange(currentPage + 1)}
                            style={{ height: '32px', padding: '0 10px', fontSize: '12px' }}
                        >
                            {t('Next')}
                        </button>
                    </div>

                    {/* Mobile Compact Page Navigation */}
                    <div className="pagination-pages-mobile" style={{ alignItems: 'center', gap: '8px' }}>
                        <button
                            type="button"
                            className="btn"
                            disabled={currentPage <= 1}
                            onClick={() => handlePageChange(currentPage - 1)}
                            style={{ height: '36px', padding: '0 12px', fontSize: '13px' }}
                        >
                            ← {t('Prev')}
                        </button>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                            {currentPage} / {lastPage}
                        </span>
                        <button
                            type="button"
                            className="btn"
                            disabled={currentPage >= lastPage}
                            onClick={() => handlePageChange(currentPage + 1)}
                            style={{ height: '36px', padding: '0 12px', fontSize: '13px' }}
                        >
                            {t('Next')} →
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
export default Pagination;
