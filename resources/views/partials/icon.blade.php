<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
@switch($name)
    @case('box')<path d="M3 7.5 12 3l9 4.5M3 7.5V17l9 4 9-4V7.5M12 12v9M3 7.5l9 4.5 9-4.5"/>@break
    @case('cart')<circle cx="9" cy="20" r="1"/><circle cx="17" cy="20" r="1"/><path d="M3 4h2l2.2 11h11.3l2-7H7"/>@break
    @case('wallet')<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 14h2"/>@break
    @case('tag')<path d="M20 13.5 12.5 21a2 2 0 0 1-2.8 0L3 14.3V4h10.3z"/><circle cx="8" cy="9" r="1"/>@break
    @case('receipt')<path d="M6 3h12v18l-2-1.2L14 21l-2-1.2L10 21l-2-1.2L6 21z"/><path d="M9 8h6M9 12h6"/>@break
    @case('users')<path d="M16 20v-1a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v1"/><circle cx="10" cy="8" r="3"/><path d="M20 20v-1a3 3 0 0 0-2.2-2.9M16 5.1a3 3 0 0 1 0 5.8"/>@break
    @case('user')<circle cx="12" cy="8" r="3"/><path d="M5 20v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1"/>@break
    @case('chart')<path d="M4 19V5M4 19h16"/><path d="M8 15l3-4 3 2 4-6"/>@break
    @case('card')<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/>@break
    @case('shop')<path d="M4 10 6 4h12l2 6"/><path d="M4 10h16v9H4z"/><path d="M9 19v-5h6v5"/>@break
    @case('gear')<circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/>@break
    @case('compass')<circle cx="12" cy="12" r="9"/><path d="m14.5 9.5-1.2 4.8-4.8 1.2 1.2-4.8z"/>@break
    @case('search')<circle cx="11" cy="11" r="6"/><path d="m20 20-3.5-3.5"/>@break
    @default<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/>
@endswitch
</svg>
