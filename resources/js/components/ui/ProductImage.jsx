import React, { useState, useEffect } from 'react';

/**
 * Determine the appropriate fallback illustration URL based on dosage form, category, and name.
 *
 * @param {string} [dosageForm]
 * @param {string} [category]
 * @param {string} [name]
 * @returns {string} Path to SVG illustration in /images/fallbacks/
 */
export function resolveDosageFallbackUrl(dosageForm = '', category = '', name = '') {
    const d = (dosageForm || '').toLowerCase().trim();
    const c = (category || '').toLowerCase().trim();
    const n = (name || '').toLowerCase().trim();

    // Eye & Ear Drops
    if (
        d.includes('eye') || d.includes('ear') || d.includes('drop') ||
        d.includes('ophthalmic') || d.includes('otic') || c.includes('eye') || c.includes('ear')
    ) {
        return '/images/fallbacks/drops.svg';
    }

    // Inhalers & Sprays
    if (
        d.includes('inhaler') || d.includes('spray') || d.includes('respirator') ||
        d.includes('nebuliser') || d.includes('respule') || d.includes('rotacap') ||
        c.includes('respiratory') && (d.includes('solution') || n.includes('spray'))
    ) {
        return '/images/fallbacks/inhaler.svg';
    }

    // Injections & Infusions
    if (
        d.includes('injection') || d.includes('infusion') || d.includes('iv') ||
        d.includes('im') || d.includes('vial') || d.includes('ampoule') ||
        d.includes('sc') || c.includes('injection')
    ) {
        return '/images/fallbacks/injection.svg';
    }

    // Capsules
    if (d.includes('capsule') || d.includes('softgel')) {
        return '/images/fallbacks/capsules.svg';
    }

    // Tablets & Dispersible Tablets
    if (
        d.includes('tablet') || d.includes('chewable') || d.includes('sublingual') ||
        d.includes('caplet') || d.includes('dispersible') || d.includes('effervescent') ||
        d.includes('mups') || d.includes('oros') || d.includes('flash') ||
        n.includes('tablet') || n.includes('tab')
    ) {
        return '/images/fallbacks/tablets.svg';
    }

    // Syrups, Suspensions & Liquids
    if (
        d.includes('syrup') || d.includes('suspension') || d.includes('liquid') ||
        d.includes('solution') || d.includes('elixir') || d.includes('linctus') ||
        d.includes('emulsion') || n.includes('syrup')
    ) {
        return '/images/fallbacks/syrup.svg';
    }

    // Creams, Ointments & Gels
    if (
        d.includes('cream') || d.includes('ointment') || d.includes('gel') ||
        d.includes('lotion') || d.includes('paste') || d.includes('balm') ||
        d.includes('rub') || c.includes('dermatological') || c.includes('skin')
    ) {
        return '/images/fallbacks/cream.svg';
    }

    // Suppositories & Pessaries
    if (d.includes('suppository') || d.includes('pessary') || d.includes('rectal') || d.includes('vaginal')) {
        return '/images/fallbacks/suppository.svg';
    }

    // Medical Devices & Surgical Supplies
    if (
        d.includes('device') || d.includes('strip') || c.includes('device') ||
        c.includes('first aid') || n.includes('thermometer') || n.includes('bandage') ||
        n.includes('gauze') || n.includes('cotton') || n.includes('mask')
    ) {
        return '/images/fallbacks/device.svg';
    }

    return '/images/fallbacks/general.svg';
}

/**
 * Reusable ProductImage component with progressive loading, error detection,
 * and automatic dosage-form fallback illustrations.
 *
 * @param {object} props
 * @param {object} [props.product] Product data object (can contain image, dosage_form, category, name, etc.)
 * @param {string} [props.src] Direct image URL override
 * @param {string} [props.dosageForm] Dosage form override
 * @param {string} [props.category] Category override
 * @param {string} [props.alt] Alt text
 * @param {string} [props.size] Preset size: 'sm' (36px), 'md' (72px), 'lg' (180px), 'xl' (220px), or 'auto'
 * @param {string} [props.className] Additional CSS classes
 * @param {object} [props.style] Custom style overrides
 * @param {boolean} [props.showFallbackBadge] Whether to display a subtle 'Illustration' label on fallback
 * @param {string} [props.objectFit] Image object-fit ('contain' | 'cover')
 */
export function ProductImage({
    product,
    src,
    dosageForm,
    category,
    alt,
    size = 'md',
    className = '',
    style = {},
    showFallbackBadge = false,
    objectFit = 'contain',
    ...rest
}) {
    const rawImage = src !== undefined ? src : (product?.image || null);
    const resolvedDosage = dosageForm || product?.dosage_form || '';
    const resolvedCategory = category || product?.category || product?.category_name || '';
    const resolvedName = alt || product?.name || 'Medicine product';

    const fallbackUrl = resolveDosageFallbackUrl(resolvedDosage, resolvedCategory, resolvedName);

    // Track loading & error status
    const [hasError, setHasError] = useState(false);
    const [isLoading, setIsLoading] = useState(!!rawImage);
    const [currentSrc, setCurrentSrc] = useState(rawImage);

    // Reset when product or src changes
    useEffect(() => {
        setHasError(!rawImage);
        setIsLoading(!!rawImage);
        setCurrentSrc(rawImage);
    }, [rawImage]);

    // Dimensions map for preset sizes
    const sizeDimensions = {
        sm: { width: '36px', height: '36px', borderRadius: '6px' },
        md: { width: '100%', height: '80px', borderRadius: '8px' },
        lg: { width: '100%', height: '180px', borderRadius: '10px' },
        xl: { width: '100%', height: '220px', borderRadius: '12px' },
        auto: {},
    };

    const containerStyle = {
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        backgroundColor: 'var(--card-head, #f8fafc)',
        flexShrink: 0,
        ...(sizeDimensions[size] || {}),
        ...style,
    };

    const imgStyle = {
        width: '100%',
        height: '100%',
        objectFit: objectFit,
        display: 'block',
        transition: 'opacity 0.2s ease',
        opacity: isLoading ? 0.3 : 1,
    };

    const isUsingFallback = hasError || !currentSrc;

    return (
        <div
            className={`bp-product-image-container ${className}`}
            style={containerStyle}
            title={isUsingFallback ? `${resolvedName} (Standard Formulation Illustration)` : resolvedName}
            {...rest}
        >
            {/* Loading shimmer placeholder */}
            {isLoading && (
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(90deg, rgba(226, 232, 240, 0.4) 25%, rgba(241, 245, 249, 0.8) 50%, rgba(226, 232, 240, 0.4) 75%)',
                        backgroundSize: '200% 100%',
                        animation: 'bp-shimmer 1.5s infinite linear',
                        zIndex: 1,
                    }}
                />
            )}

            {/* Display Real Image or Dosage Fallback */}
            <img
                src={isUsingFallback ? fallbackUrl : currentSrc}
                alt={resolvedName}
                loading="lazy"
                style={imgStyle}
                onLoad={() => setIsLoading(false)}
                onError={() => {
                    // Avoid infinite loop if fallback fails
                    if (!hasError) {
                        setHasError(true);
                        setIsLoading(false);
                    }
                }}
            />

            {/* Optional subtle pill badge indicating clinical formulation placeholder */}
            {showFallbackBadge && isUsingFallback && resolvedDosage && size !== 'sm' && (
                <span
                    style={{
                        position: 'absolute',
                        bottom: '4px',
                        left: '4px',
                        fontSize: '9.5px',
                        fontWeight: 700,
                        padding: '1px 5px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(15, 23, 42, 0.65)',
                        color: '#ffffff',
                        backdropFilter: 'blur(4px)',
                        pointerEvents: 'none',
                        zIndex: 2,
                    }}
                >
                    {resolvedDosage}
                </span>
            )}
        </div>
    );
}

export default ProductImage;
