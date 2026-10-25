import React from 'react';
import { TOUR_SECTIONS } from './tourSteps';

export default function TourTooltip({
    index,
    size,
    step,
    isLastStep,
    backProps,
    closeProps,
    primaryProps,
    skipProps,
    tooltipProps,
}) {
    const currentSection = TOUR_SECTIONS.find((s) => s.id === step.section);
    const progressPercent = Math.round(((index + 1) / size) * 100);

    return (
        <div
            {...tooltipProps}
            className="bornopos-tour-tooltip"
            style={{
                background: 'var(--card, #ffffff)',
                color: 'var(--text, #111827)',
                borderRadius: '16px',
                boxShadow: '0 20px 35px -10px rgba(0, 0, 0, 0.25), 0 1px 3px rgba(0, 0, 0, 0.1)',
                border: '1px solid var(--line, #e2e8f0)',
                maxWidth: '420px',
                width: 'calc(100vw - 32px)',
                overflow: 'hidden',
                fontFamily: 'inherit',
                position: 'relative',
                animation: 'bornoposTourFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
        >
            {/* Top Micro-Progress Bar */}
            <div
                style={{
                    height: '3px',
                    width: '100%',
                    background: 'var(--line, #f1f5f9)',
                    position: 'relative',
                }}
            >
                <div
                    style={{
                        height: '100%',
                        width: `${progressPercent}%`,
                        background: 'linear-gradient(90deg, #3b82f6 0%, #6366f1 100%)',
                        transition: 'width 0.3s ease',
                    }}
                />
            </div>

            {/* Header: Section Badge, Counter & Close */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px 8px',
                    borderBottom: '1px solid var(--line, #f1f5f9)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {currentSection && (
                        <span
                            style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                                color: '#4f46e5',
                                background: '#eef2ff',
                                padding: '2px 8px',
                                borderRadius: '999px',
                            }}
                        >
                            {currentSection.icon} {currentSection.title}
                        </span>
                    )}
                    <span
                        style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'var(--muted, #64748b)',
                        }}
                    >
                        {index + 1} of {size}
                    </span>
                </div>

                <button
                    {...closeProps}
                    type="button"
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--muted, #94a3b8)',
                        padding: '4px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        lineHeight: 1,
                        transition: 'color 0.15s ease',
                    }}
                    title="Close tour"
                >
                    ✕
                </button>
            </div>

            {/* Main Content Body */}
            <div style={{ padding: '16px 18px 18px' }}>
                {step.title && (
                    <h3
                        style={{
                            margin: '0 0 8px',
                            fontSize: '16px',
                            fontWeight: 800,
                            letterSpacing: '-0.01em',
                            color: 'var(--text, #0f172a)',
                        }}
                    >
                        {step.title}
                    </h3>
                )}

                <div
                    style={{
                        fontSize: '13.5px',
                        lineHeight: '1.55',
                        color: 'var(--muted-dark, #334155)',
                        margin: 0,
                    }}
                >
                    {step.content}
                </div>
            </div>

            {/* Footer Navigation Buttons */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 18px',
                    background: 'var(--bg, #f8fafc)',
                    borderTop: '1px solid var(--line, #e2e8f0)',
                    gap: '10px',
                }}
            >
                {/* Skip Tour Button */}
                <button
                    {...skipProps}
                    type="button"
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--muted, #64748b)',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: '6px 8px',
                        borderRadius: '6px',
                    }}
                >
                    Skip Tour
                </button>

                {/* Back & Next Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {index > 0 && (
                        <button
                            {...backProps}
                            type="button"
                            className="btn"
                            style={{
                                fontSize: '12.5px',
                                padding: '6px 14px',
                                borderRadius: '8px',
                            }}
                        >
                            ‹ Back
                        </button>
                    )}

                    <button
                        {...primaryProps}
                        type="button"
                        className="btn primary"
                        style={{
                            fontSize: '12.5px',
                            padding: '6px 16px',
                            borderRadius: '8px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                        }}
                    >
                        {isLastStep ? 'Finish Tour ✓' : 'Next ›'}
                    </button>
                </div>
            </div>
        </div>
    );
}
