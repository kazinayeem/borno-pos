import React, { forwardRef } from 'react';

/**
 * Standard Form Label with optional required indicator.
 */
export function FormLabel({ children, required, htmlFor, className = '', style }) {
    if (!children) return null;

    return (
        <label
            htmlFor={htmlFor}
            className={`bp-form-label ${className}`}
            style={{
                display: 'block',
                fontSize: '12.5px',
                fontWeight: 700,
                color: 'var(--text-heading, #0f172a)',
                marginBottom: '5px',
                letterSpacing: '-0.01em',
                ...style,
            }}
        >
            {children}
            {required && (
                <span
                    style={{
                        color: '#ef4444',
                        marginLeft: '3px',
                        fontWeight: 800,
                    }}
                    title="Required"
                >
                    *
                </span>
            )}
        </label>
    );
}

/**
 * FormField wrapper providing standardized spacing, label, hint, and validation error.
 */
export function FormField({
    label,
    required,
    hint,
    error,
    id,
    children,
    className = '',
    style,
}) {
    return (
        <div
            className={`bp-form-field ${error ? 'has-error' : ''} ${className}`}
            style={{
                display: 'flex',
                flexDirection: 'column',
                marginBottom: '14px',
                ...style,
            }}
        >
            {label && (
                <FormLabel htmlFor={id} required={required}>
                    {label}
                </FormLabel>
            )}
            {children}
            {hint && !error && (
                <span
                    className="bp-field-hint"
                    style={{
                        fontSize: '11.5px',
                        color: 'var(--muted, #64748b)',
                        marginTop: '4px',
                        lineHeight: 1.3,
                    }}
                >
                    {hint}
                </span>
            )}
            {error && (
                <span
                    className="bp-field-error"
                    style={{
                        fontSize: '11.5px',
                        color: '#ef4444',
                        fontWeight: 600,
                        marginTop: '4px',
                        lineHeight: 1.3,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                    }}
                >
                    ⚠️ {error}
                </span>
            )}
        </div>
    );
}

/**
 * Standard TextInput matching BornoPos visual design language.
 */
export const TextInput = forwardRef(function TextInput(
    {
        label,
        error,
        hint,
        required,
        icon,
        rightElement,
        size = 'md', // 'sm', 'md', 'lg'
        className = '',
        style,
        id,
        disabled,
        readOnly,
        ...props
    },
    ref
) {
    const heightMap = {
        sm: '34px',
        md: '40px',
        lg: '46px',
    };

    const fontSizeMap = {
        sm: '12.5px',
        md: '13.5px',
        lg: '14.5px',
    };

    const inputNode = (
        <div
            style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                width: '100%',
            }}
        >
            {icon && (
                <span
                    style={{
                        position: 'absolute',
                        left: '12px',
                        color: 'var(--muted, #94a3b8)',
                        pointerEvents: 'none',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                    }}
                >
                    {icon}
                </span>
            )}
            <input
                ref={ref}
                id={id}
                disabled={disabled}
                readOnly={readOnly}
                className={`bp-input ${error ? 'is-invalid' : ''} ${className}`}
                style={{
                    width: '100%',
                    height: heightMap[size] || heightMap.md,
                    paddingLeft: icon ? '36px' : '12px',
                    paddingRight: rightElement ? '38px' : '12px',
                    fontSize: fontSizeMap[size] || fontSizeMap.md,
                    fontFamily: 'inherit',
                    borderRadius: '10px',
                    border: `1px solid ${error ? '#ef4444' : 'var(--line, #e2e8f0)'}`,
                    backgroundColor: disabled ? 'var(--bg, #f8fafc)' : 'var(--card, #ffffff)',
                    color: 'var(--text, #1e293b)',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                    opacity: disabled ? 0.7 : 1,
                    cursor: disabled ? 'not-allowed' : 'text',
                    ...style,
                }}
                {...props}
            />
            {rightElement && (
                <div
                    style={{
                        position: 'absolute',
                        right: '8px',
                        display: 'flex',
                        alignItems: 'center',
                    }}
                >
                    {rightElement}
                </div>
            )}
        </div>
    );

    if (label || error || hint) {
        return (
            <FormField label={label} required={required} hint={hint} error={error} id={id}>
                {inputNode}
            </FormField>
        );
    }

    return inputNode;
});

/**
 * Standard SearchInput with search icon and 1-click clear button.
 */
export const SearchInput = forwardRef(function SearchInput(
    {
        value,
        onChange,
        onClear,
        placeholder = 'Search...',
        size = 'md',
        className = '',
        style,
        disabled,
        ...props
    },
    ref
) {
    const handleClear = () => {
        if (onClear) {
            onClear();
        } else if (onChange) {
            onChange({ target: { value: '' } });
        }
    };

    return (
        <TextInput
            ref={ref}
            type="search"
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            size={size}
            className={`bp-search-input ${className}`}
            icon="🔍"
            rightElement={
                value ? (
                    <button
                        type="button"
                        onClick={handleClear}
                        style={{
                            background: 'transparent',
                            border: 0,
                            color: 'var(--muted, #94a3b8)',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            borderRadius: '4px',
                        }}
                        title="Clear search"
                        aria-label="Clear search"
                    >
                        ✕
                    </button>
                ) : null
            }
            style={style}
            {...props}
        />
    );
});

/**
 * Standard SelectInput with custom chevron icon and uniform height.
 */
export const SelectInput = forwardRef(function SelectInput(
    {
        label,
        options = [],
        value,
        onChange,
        error,
        hint,
        required,
        placeholder = 'Choose...',
        size = 'md',
        className = '',
        style,
        id,
        disabled,
        children,
        ...props
    },
    ref
) {
    const heightMap = {
        sm: '34px',
        md: '40px',
        lg: '46px',
    };

    const fontSizeMap = {
        sm: '12.5px',
        md: '13.5px',
        lg: '14.5px',
    };

    const selectNode = (
        <div style={{ position: 'relative', width: '100%' }}>
            <select
                ref={ref}
                id={id}
                value={value}
                onChange={onChange}
                disabled={disabled}
                className={`bp-select ${error ? 'is-invalid' : ''} ${className}`}
                style={{
                    width: '100%',
                    height: heightMap[size] || heightMap.md,
                    padding: '0 34px 0 12px',
                    fontSize: fontSizeMap[size] || fontSizeMap.md,
                    fontFamily: 'inherit',
                    borderRadius: '10px',
                    border: `1px solid ${error ? '#ef4444' : 'var(--line, #e2e8f0)'}`,
                    backgroundColor: disabled ? 'var(--bg, #f8fafc)' : 'var(--card, #ffffff)',
                    color: 'var(--text, #1e293b)',
                    outline: 'none',
                    boxSizing: 'border-box',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                    opacity: disabled ? 0.7 : 1,
                    ...style,
                }}
                {...props}
            >
                {placeholder && <option value="">{placeholder}</option>}
                {options.map((opt) => {
                    const optVal = typeof opt === 'object' ? opt.value : opt;
                    const optLabel = typeof opt === 'object' ? opt.label : opt;
                    return (
                        <option key={optVal} value={optVal}>
                            {optLabel}
                        </option>
                    );
                })}
                {children}
            </select>
            {/* Custom SVG Chevron Arrow */}
            <div
                style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    color: 'var(--muted, #64748b)',
                    display: 'flex',
                    alignItems: 'center',
                }}
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </div>
        </div>
    );

    if (label || error || hint) {
        return (
            <FormField label={label} required={required} hint={hint} error={error} id={id}>
                {selectNode}
            </FormField>
        );
    }

    return selectNode;
});

/**
 * Standard DateInput with unified height, border, and calendar icon.
 */
export const DateInput = forwardRef(function DateInput(
    {
        label,
        value,
        onChange,
        error,
        hint,
        required,
        size = 'md',
        className = '',
        style,
        id,
        disabled,
        ...props
    },
    ref
) {
    return (
        <TextInput
            ref={ref}
            type="date"
            label={label}
            value={value}
            onChange={onChange}
            error={error}
            hint={hint}
            required={required}
            size={size}
            id={id}
            disabled={disabled}
            className={`bp-date-input ${className}`}
            style={{
                colorScheme: 'light dark',
                ...style,
            }}
            {...props}
        />
    );
});

/**
 * Standard Textarea with matching rounded borders and focus ring.
 */
export const Textarea = forwardRef(function Textarea(
    {
        label,
        value,
        onChange,
        error,
        hint,
        required,
        rows = 3,
        className = '',
        style,
        id,
        disabled,
        ...props
    },
    ref
) {
    const textareaNode = (
        <textarea
            ref={ref}
            id={id}
            rows={rows}
            value={value}
            onChange={onChange}
            disabled={disabled}
            className={`bp-textarea ${error ? 'is-invalid' : ''} ${className}`}
            style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '13.5px',
                fontFamily: 'inherit',
                borderRadius: '10px',
                border: `1px solid ${error ? '#ef4444' : 'var(--line, #e2e8f0)'}`,
                backgroundColor: disabled ? 'var(--bg, #f8fafc)' : 'var(--card, #ffffff)',
                color: 'var(--text, #1e293b)',
                outline: 'none',
                boxSizing: 'border-box',
                resize: 'vertical',
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                opacity: disabled ? 0.7 : 1,
                ...style,
            }}
            {...props}
        />
    );

    if (label || error || hint) {
        return (
            <FormField label={label} required={required} hint={hint} error={error} id={id}>
                {textareaNode}
            </FormField>
        );
    }

    return textareaNode;
});

/**
 * Standard Checkbox with accessible label and theme accent.
 */
export const Checkbox = forwardRef(function Checkbox(
    {
        label,
        checked,
        onChange,
        disabled,
        hint,
        id,
        className = '',
        style,
        ...props
    },
    ref
) {
    return (
        <label
            htmlFor={id}
            className={`bp-checkbox-label ${disabled ? 'is-disabled' : ''} ${className}`}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontSize: '13.5px',
                fontWeight: 600,
                color: 'var(--text, #1e293b)',
                userSelect: 'none',
                opacity: disabled ? 0.6 : 1,
                ...style,
            }}
        >
            <input
                ref={ref}
                id={id}
                type="checkbox"
                checked={checked}
                onChange={onChange}
                disabled={disabled}
                className="bp-checkbox"
                style={{
                    width: '17px',
                    height: '17px',
                    borderRadius: '4px',
                    accentColor: 'var(--blue, #2f80ed)',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    margin: 0,
                }}
                {...props}
            />
            <div>
                <span>{label}</span>
                {hint && (
                    <div style={{ fontSize: '11px', color: 'var(--muted, #64748b)', fontWeight: 400 }}>
                        {hint}
                    </div>
                )}
            </div>
        </label>
    );
});

/**
 * Standard RadioGroup with pill/chip styling or vertical options.
 */
export function RadioGroup({
    name,
    options = [],
    value,
    onChange,
    layout = 'horizontal', // 'horizontal' | 'vertical' | 'pills'
    className = '',
    style,
}) {
    if (layout === 'pills') {
        return (
            <div
                className={`bp-radio-pills ${className}`}
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px',
                    ...style,
                }}
            >
                {options.map((opt) => {
                    const optVal = typeof opt === 'object' ? opt.value : opt;
                    const optLabel = typeof opt === 'object' ? opt.label : opt;
                    const isSelected = value === optVal;
                    return (
                        <button
                            key={optVal}
                            type="button"
                            className={`chip ${isSelected ? 'active' : ''}`}
                            onClick={() => onChange && onChange(optVal)}
                            style={{
                                border: '1px solid',
                                borderColor: isSelected ? 'var(--blue, #2f80ed)' : 'var(--line, #e2e8f0)',
                                background: isSelected ? 'var(--blue, #2f80ed)' : 'var(--card, #ffffff)',
                                color: isSelected ? '#ffffff' : 'var(--text, #1e293b)',
                                padding: '6px 14px',
                                borderRadius: '999px',
                                fontSize: '12.5px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                            }}
                        >
                            {optLabel}
                        </button>
                    );
                })}
            </div>
        );
    }

    return (
        <div
            className={`bp-radio-group ${className}`}
            style={{
                display: 'flex',
                flexDirection: layout === 'vertical' ? 'column' : 'row',
                flexWrap: 'wrap',
                gap: layout === 'vertical' ? '8px' : '16px',
                ...style,
            }}
        >
            {options.map((opt) => {
                const optVal = typeof opt === 'object' ? opt.value : opt;
                const optLabel = typeof opt === 'object' ? opt.label : opt;
                return (
                    <label
                        key={optVal}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        <input
                            type="radio"
                            name={name}
                            value={optVal}
                            checked={value === optVal}
                            onChange={(e) => onChange && onChange(e.target.value)}
                            style={{ accentColor: 'var(--blue, #2f80ed)' }}
                        />
                        {optLabel}
                    </label>
                );
            })}
        </div>
    );
}

/**
 * Primary Blue Button for Add, Save, Submit, etc.
 */
export const PrimaryButton = forwardRef(function PrimaryButton(
    {
        children,
        icon,
        loading,
        size = 'md',
        className = '',
        style,
        disabled,
        type = 'button',
        ...props
    },
    ref
) {
    const heightMap = { sm: '34px', md: '40px', lg: '46px' };
    const padMap = { sm: '0 12px', md: '0 16px', lg: '0 22px' };
    const fontMap = { sm: '12.5px', md: '13.5px', lg: '14.5px' };

    return (
        <button
            ref={ref}
            type={type}
            disabled={disabled || loading}
            aria-busy={loading}
            className={`btn primary bp-primary-btn ${loading ? 'busy' : ''} ${className}`}
            style={{
                height: heightMap[size] || heightMap.md,
                padding: padMap[size] || padMap.md,
                fontSize: fontMap[size] || fontMap.md,
                fontWeight: 700,
                borderRadius: '10px',
                background: 'var(--blue, #2f80ed)',
                color: '#ffffff',
                border: '1px solid transparent',
                cursor: disabled || loading ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '7px',
                boxShadow: '0 2px 6px rgba(47, 128, 237, 0.25)',
                transition: 'all 0.15s ease',
                opacity: disabled || loading ? 0.65 : 1,
                ...style,
            }}
            {...props}
        >
            {loading ? (
                <span className="bp-btn-spinner" style={{ animation: 'spin 1s linear infinite' }}>
                    ⌛
                </span>
            ) : icon ? (
                <span>{icon}</span>
            ) : null}
            {children}
        </button>
    );
});

/**
 * Secondary Neutral Button for Cancel, Reset, Back, etc.
 */
export const SecondaryButton = forwardRef(function SecondaryButton(
    {
        children,
        icon,
        size = 'md',
        className = '',
        style,
        type = 'button',
        ...props
    },
    ref
) {
    const heightMap = { sm: '34px', md: '40px', lg: '46px' };
    const padMap = { sm: '0 12px', md: '0 16px', lg: '0 20px' };
    const fontMap = { sm: '12.5px', md: '13.5px', lg: '14.5px' };

    return (
        <button
            ref={ref}
            type={type}
            className={`btn bp-secondary-btn ${className}`}
            style={{
                height: heightMap[size] || heightMap.md,
                padding: padMap[size] || padMap.md,
                fontSize: fontMap[size] || fontMap.md,
                fontWeight: 600,
                borderRadius: '10px',
                background: 'var(--card, #ffffff)',
                color: 'var(--text, #1e293b)',
                border: '1px solid var(--line, #e2e8f0)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
                ...style,
            }}
            {...props}
        >
            {icon && <span>{icon}</span>}
            {children}
        </button>
    );
});

/**
 * Standard Icon Button with circular or rounded box styling.
 */
export const IconButton = forwardRef(function IconButton(
    {
        icon,
        tooltip,
        variant = 'default', // 'default', 'primary', 'danger'
        size = 'md', // 'sm': 32px, 'md': 38px, 'lg': 44px
        round = false,
        className = '',
        style,
        type = 'button',
        ...props
    },
    ref
) {
    const sizeMap = { sm: '32px', md: '38px', lg: '44px' };
    const wh = sizeMap[size] || sizeMap.md;

    const bgMap = {
        default: 'var(--card, #ffffff)',
        primary: 'var(--blue, #2f80ed)',
        danger: '#fee2e2',
    };

    const colorMap = {
        default: 'var(--text, #1e293b)',
        primary: '#ffffff',
        danger: '#dc2626',
    };

    const borderMap = {
        default: '1px solid var(--line, #e2e8f0)',
        primary: '1px solid transparent',
        danger: '1px solid #fca5a5',
    };

    return (
        <button
            ref={ref}
            type={type}
            title={tooltip}
            aria-label={tooltip}
            className={`icon-btn bp-icon-btn ${className}`}
            style={{
                width: wh,
                height: wh,
                padding: 0,
                borderRadius: round ? '999px' : '10px',
                background: bgMap[variant] || bgMap.default,
                color: colorMap[variant] || colorMap.default,
                border: borderMap[variant] || borderMap.default,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: size === 'sm' ? '13px' : '15px',
                transition: 'all 0.15s ease',
                ...style,
            }}
            {...props}
        >
            {icon}
        </button>
    );
});

/**
 * Standard FormActions container for Save, Cancel, and Reset action buttons.
 */
export function FormActions({
    children,
    align = 'right', // 'right', 'left', 'between', 'center'
    className = '',
    style,
}) {
    const justifyMap = {
        right: 'flex-end',
        left: 'flex-start',
        between: 'space-between',
        center: 'center',
    };

    return (
        <div
            className={`bp-form-actions ${className}`}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: justifyMap[align] || 'flex-end',
                gap: '10px',
                marginTop: '20px',
                paddingTop: '16px',
                borderTop: '1px solid var(--line, #f1f5f9)',
                ...style,
            }}
        >
            {children}
        </div>
    );
}

/**
 * Standard FilterPanel for search, date pickers, dropdowns, and preset chips.
 */
export function FilterPanel({
    title = 'Filter Criteria',
    icon = '🎯',
    onReset,
    onClose,
    children,
    actions,
    className = '',
    style,
}) {
    return (
        <div
            className={`card bp-filter-panel ${className}`}
            style={{
                padding: '16px 20px',
                marginBottom: '18px',
                background: 'var(--card-head, #f8fafc)',
                border: '1px solid var(--line, #e2e8f0)',
                borderRadius: '14px',
                ...style,
            }}
        >
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '14px',
                    flexWrap: 'wrap',
                    gap: '10px',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '14px' }}>
                    <span>{icon}</span>
                    <span>{title}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {actions}
                    {onReset && (
                        <SecondaryButton size="sm" onClick={onReset}>
                            Reset
                        </SecondaryButton>
                    )}
                    {onClose && (
                        <SecondaryButton size="sm" onClick={onClose}>
                            Close
                        </SecondaryButton>
                    )}
                </div>
            </div>
            {children}
        </div>
    );
}

/**
 * Standard DateRangePicker with inline From/To inputs and preset chips.
 */
export function DateRangePicker({
    from,
    to,
    onFromChange,
    onToChange,
    presets = [],
    activePreset,
    onPresetSelect,
    className = '',
    style,
}) {
    return (
        <div className={`bp-date-range-picker ${className}`} style={{ display: 'flex', flexDirection: 'column', gap: '10px', ...style }}>
            {presets.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {presets.map(([key, label]) => {
                        const isActive = activePreset === key;
                        return (
                            <button
                                key={key}
                                type="button"
                                className={`chip ${isActive ? 'active' : ''}`}
                                onClick={() => onPresetSelect && onPresetSelect(key)}
                                style={{
                                    border: '1px solid',
                                    borderColor: isActive ? 'var(--blue, #2f80ed)' : 'var(--line, #e2e8f0)',
                                    background: isActive ? 'var(--blue, #2f80ed)' : 'var(--card, #ffffff)',
                                    color: isActive ? '#ffffff' : 'var(--text, #1e293b)',
                                    padding: '5px 12px',
                                    borderRadius: '999px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                }}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>
            )}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <DateInput
                    value={from}
                    onChange={(e) => onFromChange && onFromChange(e.target.value)}
                    size="sm"
                    placeholder="From Date"
                    style={{ minWidth: '135px' }}
                />
                <span style={{ color: 'var(--muted, #94a3b8)', fontSize: '13px' }}>—</span>
                <DateInput
                    value={to}
                    onChange={(e) => onToChange && onToChange(e.target.value)}
                    size="sm"
                    placeholder="To Date"
                    style={{ minWidth: '135px' }}
                />
            </div>
        </div>
    );
}
