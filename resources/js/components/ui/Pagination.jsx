import React from 'react';
import { useT } from '../../i18n';

/**
 * Reusable URL-synced Pagination Component
 */
export function Pagination({
    currentPage = 1,
    lastPage = 1,
    total = 0,
    from = 0,
    to = 0,
    perPage = 10,
    onPageChange,
    onPerPageChange,
    perPageOptions = [10, 25, 50, 100],
    showPerPage = true,
}) {
    const t = useT();

    if (total <= 0 && lastPage <= 1) {
        return null;
    }

    // Generate smart pagination page numbers
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
                            onChange={(e) => onPerPageChange(Number(e.target.value))}
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
                    {t('Showing {from} to {to} of {total} entries', {
                        from: from || (currentPage - 1) * perPage + 1,
                        to: to || Math.min(currentPage * perPage, total),
                        total,
                    })}
                </span>
            </div>

            {/* Page Buttons */}
            {lastPage > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                        type="button"
                        className="btn"
                        disabled={currentPage <= 1}
                        onClick={() => onPageChange(currentPage - 1)}
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
                                onClick={() => onPageChange(p)}
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
                        onClick={() => onPageChange(currentPage + 1)}
                        style={{ height: '32px', padding: '0 10px', fontSize: '12px' }}
                    >
                        {t('Next')}
                    </button>
                </div>
            )}
        </div>
    );
}
