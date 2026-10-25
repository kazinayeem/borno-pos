import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Universal Hook for URL-synchronized search, filters, pagination, and sorting.
 *
 * Provides:
 * - query, queryState, params (safe aliases to prevent 'undefined.page' crashes)
 * - page, perPage, search
 * - setPage, setPerPage, setSort, getSortIndicator, setQuery, resetFilters
 * - searchValue, onSearchChange, clearSearch
 *
 * @param {Object} defaultValues - Fallback default values for parameters
 * @param {Object} config - Configuration options (keys, debounceMs, etc.)
 */
export function useUrlQueryState(defaultValues = {}, config = {}) {
    const [searchParams, setSearchParams] = useSearchParams();

    // Stabilize defaultValues reference to prevent unnecessary effect/memo re-runs
    const defaultValuesRef = useRef(defaultValues);
    defaultValuesRef.current = defaultValues;
    const defaultValuesKey = JSON.stringify(defaultValues);

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
        const defaults = defaultValuesRef.current || {};
        const result = { ...defaults };

        searchParams.forEach((val, key) => {
            // Check alias normalization
            let targetKey = key;
            if (key === searchAlias && !(searchKey in defaults)) {
                targetKey = searchKey;
            } else if (key === sortDirAlias && !(sortDirKey in defaults)) {
                targetKey = sortDirKey;
            }

            // Parse numbers if default is number
            if (typeof defaults[targetKey] === 'number') {
                const num = parseInt(val, 10);
                result[targetKey] = isNaN(num) ? defaults[targetKey] : num;
            } else if (typeof defaults[targetKey] === 'boolean') {
                result[targetKey] = val === 'true' || val === '1';
            } else {
                result[targetKey] = val;
            }
        });

        // Always guarantee a safe, positive integer page number >= 1
        const rawPage = searchParams.get(pageKey) ?? result[pageKey] ?? defaults[pageKey] ?? 1;
        const parsedPage = parseInt(rawPage, 10);
        result[pageKey] = isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;

        // Always guarantee a safe, positive integer per_page
        const fallbackPerPage = typeof defaults[perPageKey] === 'number' ? defaults[perPageKey] : 15;
        const rawPerPage = searchParams.get(perPageKey) ?? result[perPageKey] ?? fallbackPerPage;
        const parsedPerPage = parseInt(rawPerPage, 10);
        result[perPageKey] = isNaN(parsedPerPage) || parsedPerPage < 1 ? fallbackPerPage : Math.min(100, parsedPerPage);

        // Support searchAlias if present
        if (searchParams.has(searchAlias) && !searchParams.has(searchKey)) {
            result[searchKey] = searchParams.get(searchAlias) || '';
        }

        // Support sortDirAlias if present
        if (searchParams.has(sortDirAlias) && !searchParams.has(sortDirKey)) {
            result[sortDirKey] = searchParams.get(sortDirAlias) || defaults[sortDirKey] || 'desc';
        }

        // Guarantee search string is always a defined string
        if (result[searchKey] === undefined) {
            result[searchKey] = defaults[searchKey] || '';
        }

        return result;
    }, [searchParams, defaultValuesKey, pageKey, perPageKey, searchKey, searchAlias, sortByKey, sortDirKey, sortDirAlias]);

    // Local search state for responsive typing
    const currentSearchFromUrl = query[searchKey] || query[searchAlias] || '';
    const [searchValue, setSearchValue] = useState(currentSearchFromUrl);

    // Keep local search value in sync when URL changes (e.g., Back/Forward navigation)
    useEffect(() => {
        setSearchValue(currentSearchFromUrl);
    }, [currentSearchFromUrl]);

    /**
     * Update URL search params
     */
    const setQuery = useCallback((updates, navOptions = {}) => {
        setSearchParams((prev) => {
            const defaults = defaultValuesRef.current || {};
            const next = new URLSearchParams(prev);

            // Determine if non-page filter or search is modified
            const isFilterChange = Object.keys(updates).some(
                (k) => k !== pageKey && k !== 'selectedId'
            );

            // If non-page filter changed and page was not explicitly set, reset to page 1
            if (isFilterChange && !(pageKey in updates)) {
                if (defaults[pageKey] === 1) {
                    next.delete(pageKey);
                } else {
                    next.set(pageKey, '1');
                }
            }

            Object.entries(updates).forEach(([k, v]) => {
                const isDefault = defaults[k] !== undefined && defaults[k] === v;
                if (v === '' || v === null || v === undefined || isDefault) {
                    next.delete(k);
                    if (k === searchKey) next.delete(searchAlias);
                    if (k === sortDirKey) next.delete(sortDirAlias);
                } else {
                    next.set(k, String(v));
                }
            });

            return next;
        }, { replace: navOptions.replace ?? false });
    }, [setSearchParams, pageKey, searchKey, searchAlias, sortDirKey, sortDirAlias]);

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

    // Pagination helpers with safe boundaries
    const setPage = useCallback((page) => {
        const p = Math.max(1, parseInt(page, 10) || 1);
        setQuery({ [pageKey]: p }, { replace: false });
    }, [pageKey, setQuery]);

    const setPerPage = useCallback((perPage) => {
        const defaults = defaultValuesRef.current || {};
        const pp = Math.max(1, Math.min(100, parseInt(perPage, 10) || defaults[perPageKey] || 15));
        setQuery({ [perPageKey]: pp, [pageKey]: 1 }, { replace: false });
    }, [perPageKey, pageKey, setQuery]);

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

    // Sort indicator helper for table headers
    const getSortIndicator = useCallback((column) => {
        const currentSort = query[sortByKey];
        const currentDir = query[sortDirKey] || 'desc';
        if (currentSort !== column) return ' ↕';
        return currentDir === 'asc' ? ' ▲' : ' ▼';
    }, [query, sortByKey, sortDirKey]);

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
        queryState: query, // Universal alias to prevent 'reading page of undefined'
        params: query,     // Universal alias for params destructuring
        page: query[pageKey],
        perPage: query[perPageKey],
        search: query[searchKey] || '',
        searchValue,
        onSearchChange,
        clearSearch,
        setQuery,
        setPage,
        setPerPage,
        setSort,
        getSortIndicator,
        resetFilters,
        searchParams,
    };
}
