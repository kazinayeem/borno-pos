import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Universal Hook for URL-synchronized search, filters, pagination, and sorting.
 *
 * @param {Object} defaultValues - Fallback default values for parameters
 * @param {Object} config - Configuration options (keys, debounceMs, etc.)
 */
export function useUrlQueryState(defaultValues = {}, config = {}) {
    const [searchParams, setSearchParams] = useSearchParams();

    const {
        debounceMs = 300,
        pageKey = 'page',
        perPageKey = 'per_page',
        searchKey = 'search',
        searchAlias = 'q',
        sortByKey = 'sort_by',
        sortDirKey = 'sort_dir',
        sortDirAlias = 'sort_direction',
    } = config;

    // Parse current values from searchParams against defaultValues
    const query = useMemo(() => {
        const result = { ...defaultValues };

        searchParams.forEach((val, key) => {
            // Check alias normalization
            let targetKey = key;
            if (key === searchAlias && !(searchKey in defaultValues)) {
                targetKey = searchKey;
            } else if (key === sortDirAlias && !(sortDirKey in defaultValues)) {
                targetKey = sortDirKey;
            }

            // Parse numbers if default is number
            if (typeof defaultValues[targetKey] === 'number') {
                const num = parseInt(val, 10);
                result[targetKey] = isNaN(num) ? defaultValues[targetKey] : num;
            } else if (typeof defaultValues[targetKey] === 'boolean') {
                result[targetKey] = val === 'true' || val === '1';
            } else {
                result[targetKey] = val;
            }
        });

        // Ensure page is at least 1
        if (typeof result[pageKey] === 'number' && result[pageKey] < 1) {
            result[pageKey] = 1;
        }

        // Support searchAlias if present
        if (searchParams.has(searchAlias) && !searchParams.has(searchKey)) {
            result[searchKey] = searchParams.get(searchAlias) || '';
        }

        // Support sortDirAlias if present
        if (searchParams.has(sortDirAlias) && !searchParams.has(sortDirKey)) {
            result[sortDirKey] = searchParams.get(sortDirAlias) || defaultValues[sortDirKey] || 'desc';
        }

        return result;
    }, [searchParams, defaultValues, pageKey, perPageKey, searchKey, searchAlias, sortByKey, sortDirKey, sortDirAlias]);

    // Local search state for responsive, non-laggy typing
    const currentSearchFromUrl = query[searchKey] || query[searchAlias] || '';
    const [searchValue, setSearchValue] = useState(currentSearchFromUrl);

    // Keep local search value in sync when URL changes from outside (e.g., Back/Forward navigation)
    useEffect(() => {
        setSearchValue(currentSearchFromUrl);
    }, [currentSearchFromUrl]);

    /**
     * Update URL search params
     */
    const setQuery = useCallback((updates, navOptions = {}) => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);

            // Determine if non-page filter or search is modified
            const isFilterChange = Object.keys(updates).some(
                (k) => k !== pageKey && k !== 'selectedId'
            );

            // If non-page filter changed and page was not explicitly set, reset to page 1
            if (isFilterChange && !(pageKey in updates)) {
                if (defaultValues[pageKey] === 1) {
                    next.delete(pageKey);
                } else {
                    next.set(pageKey, '1');
                }
            }

            Object.entries(updates).forEach(([k, v]) => {
                const isDefault = defaultValues[k] !== undefined && defaultValues[k] === v;
                if (v === '' || v === null || v === undefined || isDefault) {
                    next.delete(k);
                    // Also delete alias if exists
                    if (k === searchKey) next.delete(searchAlias);
                    if (k === sortDirKey) next.delete(sortDirAlias);
                } else {
                    next.set(k, String(v));
                }
            });

            return next;
        }, { replace: navOptions.replace ?? false });
    }, [setSearchParams, pageKey, defaultValues, searchKey, searchAlias, sortDirKey, sortDirAlias]);

    // Debounced search synchronization
    const debounceTimerRef = useRef(null);

    const onSearchChange = useCallback((value) => {
        setSearchValue(value);

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
            setQuery({ [searchKey]: value.trim() }, { replace: true });
        }, debounceMs);
    }, [debounceMs, searchKey, setQuery]);

    // Clear search immediately
    const clearSearch = useCallback(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        setSearchValue('');
        setQuery({ [searchKey]: '' }, { replace: true });
    }, [searchKey, setQuery]);

    // Pagination helpers
    const setPage = useCallback((page) => {
        const p = Math.max(1, parseInt(page, 10) || 1);
        setQuery({ [pageKey]: p }, { replace: false });
    }, [pageKey, setQuery]);

    const setPerPage = useCallback((perPage) => {
        const pp = parseInt(perPage, 10) || defaultValues[perPageKey] || 10;
        setQuery({ [perPageKey]: pp, [pageKey]: 1 }, { replace: false });
    }, [perPageKey, pageKey, defaultValues, setQuery]);

    // Sorting helper (toggles asc/desc or sets new sort column)
    const setSort = useCallback((column, defaultDir = 'asc') => {
        const currentSort = query[sortByKey];
        const currentDir = query[sortDirKey] || 'desc';

        if (currentSort === column) {
            const nextDir = currentDir === 'asc' ? 'desc' : 'asc';
            setQuery({ [sortByKey]: column, [sortDirKey]: nextDir }, { replace: false });
        } else {
            setQuery({ [sortByKey]: column, [sortDirKey]: defaultDir }, { replace: false });
        }
    }, [query, sortByKey, sortDirKey, setQuery]);

    // Reset filters
    const resetFilters = useCallback((keepKeys = []) => {
        setSearchParams((prev) => {
            const next = new URLSearchParams();
            keepKeys.forEach((k) => {
                if (prev.has(k)) {
                    next.set(k, prev.get(k));
                }
            });
            return next;
        }, { replace: true });
        setSearchValue('');
    }, [setSearchParams]);

    return {
        query,
        searchValue,
        onSearchChange,
        clearSearch,
        setQuery,
        setPage,
        setPerPage,
        setSort,
        resetFilters,
        searchParams,
    };
}
