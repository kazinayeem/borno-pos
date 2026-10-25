export function csrf() {
    const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);

    return match ? decodeURIComponent(match[1]) : '';
}

export async function api(url, { method = 'GET', body, headers = {} } = {}) {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    const reqHeaders = {
        Accept: 'application/json',
        'X-XSRF-TOKEN': csrf(),
        'X-Requested-With': 'XMLHttpRequest',
        ...headers,
    };
    if (!isFormData) {
        reqHeaders['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
        method,
        credentials: 'same-origin',
        headers: reqHeaders,
        body: body ? (isFormData || typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(data.message || 'Request failed');
        error.payload = data;
        error.status = response.status;
        throw error;
    }

    return data;
}

export function getCurrencySymbol() {
    return window.BornoPos?.currency_symbol || '$';
}

export function getCurrencyCode() {
    return window.BornoPos?.currency_code || 'USD';
}

export function setCurrency(symbol, code) {
    if (!window.BornoPos) window.BornoPos = {};
    if (symbol) window.BornoPos.currency_symbol = symbol;
    if (code) window.BornoPos.currency_code = code;
    window.dispatchEvent(new CustomEvent('bornopos-currency-changed', { detail: { symbol, code } }));
}

export function money(cents, symbol = getCurrencySymbol()) {
    const value = Number(cents) || 0;
    const negative = value < 0;
    const formatted = (Math.abs(value) / 100).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    return `${negative ? '-' : ''}${symbol} ${formatted}`;
}
