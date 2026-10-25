import React, { useEffect } from 'react';

const sizeMap = {
    sm: '440px',
    md: '560px',
    lg: '740px',
    xl: '920px',
    full: '1100px',
};

/**
 * Standard Accessible Modal Component matching BornoPos theme.
 */
export function Modal({
    isOpen,
    onClose,
    title,
    subtitle,
    icon,
    children,
    footer,
    size = 'md',
    maxWidth,
    className = '',
}) {
    const computedMaxWidth = maxWidth || sizeMap[size] || '560px';

    useEffect(() => {
        function handleKeyDown(e) {
            if (e.key === 'Escape' && isOpen) {
                onClose && onClose();
            }
        }
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleKeyDown);
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="modal-backdrop bp-modal-backdrop"
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.65)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
                animation: 'bpFadeIn 0.15s ease-out',
            }}
        >
            <div
                className={`card modal bp-modal ${className}`}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                style={{
                    width: '100%',
                    maxWidth: computedMaxWidth,
                    background: 'var(--card, #ffffff)',
                    color: 'var(--text, #1e293b)',
                    borderRadius: '16px',
                    boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.25), 0 1px 3px rgba(0, 0, 0, 0.1)',
                    border: '1px solid var(--line, #e2e8f0)',
                    overflow: 'hidden',
                    maxHeight: 'calc(100vh - 32px)',
                    display: 'flex',
                    flexDirection: 'column',
                    animation: 'bpScaleUp 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
            >
                {/* Modal Header */}
                <div
                    style={{
                        padding: '16px 20px',
                        borderBottom: '1px solid var(--line, #f1f5f9)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'var(--card-head, #f8fafc)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {icon && <span style={{ fontSize: '20px', lineHeight: 1 }}>{icon}</span>}
                        <div>
                            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-heading, #0f172a)' }}>
                                {title}
                            </h2>
                            {subtitle && (
                                <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--muted, #64748b)' }}>
                                    {subtitle}
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 0,
                            cursor: 'pointer',
                            fontSize: '18px',
                            color: 'var(--muted, #94a3b8)',
                            padding: '4px 6px',
                            borderRadius: '6px',
                            lineHeight: 1,
                        }}
                        title="Close (Esc)"
                    >
                        ✕
                    </button>
                </div>

                {/* Modal Body */}
                <div
                    style={{
                        padding: '20px',
                        overflowY: 'auto',
                        flex: 1,
                    }}
                >
                    {children}
                </div>

                {/* Optional Modal Footer */}
                {footer && (
                    <div
                        style={{
                            padding: '12px 20px',
                            borderTop: '1px solid var(--line, #f1f5f9)',
                            background: 'var(--card-head, #f8fafc)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: '8px',
                        }}
                    >
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Standard confirmation dialog to replace raw window.confirm calls.
 */
export function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
    isLoading = false,
}) {
    if (!isOpen) return null;

    const isDanger = variant === 'danger';

    return (
        <Modal
            isOpen={isOpen}
            onClose={isLoading ? undefined : onClose}
            title={title}
            icon={isDanger ? '⚠️' : 'ℹ️'}
            size="sm"
            footer={
                <>
                    <button
                        type="button"
                        className="btn"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        className={`btn ${isDanger ? 'danger' : 'primary'}`}
                        style={isDanger ? { background: '#ef4444', borderColor: '#ef4444', color: '#fff' } : {}}
                        onClick={onConfirm}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Processing...' : confirmText}
                    </button>
                </>
            }
        >
            <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, color: 'var(--text, #334155)' }}>
                {message}
            </p>
        </Modal>
    );
}
