export function Icon({ name }) {
    const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
    return (
        <svg className="ico" viewBox="0 0 24 24" aria-hidden="true" {...common}>
            {name === 'box' && <path d="M3 7.5 12 3l9 4.5M3 7.5V17l9 4 9-4V7.5M12 12v9M3 7.5l9 4.5 9-4.5" />}
            {name === 'cart' && (<><circle cx="9" cy="20" r="1" /><circle cx="17" cy="20" r="1" /><path d="M3 4h2l2.2 11h11.3l2-7H7" /></>)}
            {name === 'wallet' && (<><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M16 14h2" /></>)}
            {name === 'tag' && (<><path d="M20 13.5 12.5 21a2 2 0 0 1-2.8 0L3 14.3V4h10.3z" /><circle cx="8" cy="9" r="1" /></>)}
            {name === 'receipt' && (<><path d="M6 3h12v18l-2-1.2L14 21l-2-1.2L10 21l-2-1.2L6 21z" /><path d="M9 8h6M9 12h6" /></>)}
            {name === 'users' && (<><path d="M16 20v-1a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v1" /><circle cx="10" cy="8" r="3" /><path d="M20 20v-1a3 3 0 0 0-2.2-2.9M16 5.1a3 3 0 0 1 0 5.8" /></>)}
            {name === 'chart' && (<><path d="M4 19V5M4 19h16" /><path d="M8 15l3-4 3 2 4-6" /></>)}
            {name === 'card' && (<><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18" /></>)}
            {name === 'shop' && (<><path d="M4 10 6 4h12l2 6" /><path d="M4 10h16v9H4z" /><path d="M9 19v-5h6v5" /></>)}
            {name === 'gear' && (<><circle cx="12" cy="12" r="3" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" /></>)}
            {name === 'search' && (<><circle cx="11" cy="11" r="6" /><path d="m20 20-3.5-3.5" /></>)}
            {name === 'grid' && (<><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" /></>)}
        </svg>
    );
}

export function Logo() {
    return (
        <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">
            <rect width="36" height="36" rx="10" fill="#2F6FED" />
            <path d="M10 13h13l-1.2 8.2a2 2 0 0 1-2 1.7H14a2 2 0 0 1-2-1.6L10 13Z" stroke="white" strokeWidth="1.8" />
            <path d="M10 13 8.8 9H7" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="15" cy="26" r="1.4" fill="white" />
            <circle cx="21" cy="26" r="1.4" fill="white" />
        </svg>
    );
}
