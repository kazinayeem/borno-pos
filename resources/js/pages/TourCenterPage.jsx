import { useTour } from '../tour/TourContext';
import { useT } from '../i18n';
import { Link } from 'react-router-dom';

export default function TourCenterPage() {
    const t = useT();
    const {
        isRunning,
        stepIndex,
        steps,
        sections,
        isCompleted,
        hasSavedProgress,
        progressPercent,
        startTour,
        resumeTour,
        restartTour,
        goToStep,
    } = useTour();

    const currentStep = steps[stepIndex] || steps[0];

    return (
        <div className="tour-center-page" style={{ maxWidth: '1080px', margin: '0 auto', paddingBottom: '60px' }}>
            {/* Top Breadcrumb Header */}
            <div className="page-title" style={{ marginBottom: '24px' }}>
                <div>
                    <div className="crumbs" style={{ display: 'flex', gap: '8px', fontSize: '13px', color: 'var(--muted)', marginBottom: '6px' }}>
                        <Link to="/store-dashboard" style={{ color: 'var(--muted)', textDecoration: 'none' }}>
                            {t('Dashboard')}
                        </Link>
                        <span>/</span>
                        <span style={{ color: 'var(--text)', fontWeight: 600 }}>{t('Guided Tour Center')}</span>
                    </div>
                    <h1 style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-0.02em', margin: 0 }}>
                        {t('Welcome to BornoPos')} 🚀
                    </h1>
                </div>
            </div>

            {/* Main Welcome Hero Card */}
            <section
                className="card"
                style={{
                    padding: '32px',
                    borderRadius: '20px',
                    marginBottom: '24px',
                    position: 'relative',
                    overflow: 'hidden',
                    background: 'var(--card, #ffffff)',
                    border: '1px solid var(--line, #e2e8f0)',
                }}
            >
                <div style={{ maxWidth: '780px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '999px', background: '#e0e7ff', color: '#4338ca', fontSize: '12px', fontWeight: 700, marginBottom: '14px' }}>
                        <span>✨</span> Complete Interactive Walkthrough
                    </div>
                    <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 10px', color: 'var(--text, #0f172a)' }}>
                        {t('Master Your Pharmacy & Retail Management System')}
                    </h2>
                    <p style={{ fontSize: '14.5px', lineHeight: '1.6', color: 'var(--muted-dark, #475569)', margin: '0 0 24px' }}>
                        {t('Explore every core module from first-to-last: high-speed POS checkout, batch and expiration tracking, multi-warehouse stock inflow, double-entry accounting, staff RBAC permissions, and comprehensive financial reports. The tour automatically navigates across pages while tracking your progress.')}
                    </p>

                    {/* Progress Bar & Status */}
                    <div style={{ marginBottom: '24px', background: 'var(--bg, #f8fafc)', padding: '16px', borderRadius: '14px', border: '1px solid var(--line, #e2e8f0)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '13px' }}>
                            <span style={{ fontWeight: 700 }}>
                                {isCompleted ? '🎉 Walkthrough 100% Completed' : (hasSavedProgress ? `Tour in progress (Step ${stepIndex + 1} of ${steps.length})` : 'Ready to start (Step 1 of ' + steps.length + ')')}
                            </span>
                            <span style={{ fontWeight: 700, color: isCompleted ? '#16a34a' : '#4f46e5' }}>
                                {isCompleted ? '100%' : `${progressPercent}%`}
                            </span>
                        </div>
                        <div style={{ height: '8px', width: '100%', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                            <div
                                style={{
                                    height: '100%',
                                    width: isCompleted ? '100%' : `${progressPercent}%`,
                                    background: isCompleted ? '#16a34a' : 'linear-gradient(90deg, #3b82f6 0%, #6366f1 100%)',
                                    borderRadius: '999px',
                                    transition: 'width 0.4s ease',
                                }}
                            />
                        </div>
                    </div>

                    {/* Dynamic Action Controls */}
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {hasSavedProgress && !isCompleted ? (
                            <>
                                <button
                                    type="button"
                                    className="btn primary"
                                    onClick={resumeTour}
                                    style={{ padding: '12px 24px', fontSize: '14px', fontWeight: 800, borderRadius: '10px' }}
                                >
                                    ▶ {t('Resume Tour from Step {n}', { n: stepIndex + 1 })}: {currentStep?.title || ''}
                                </button>
                                <button
                                    type="button"
                                    className="btn"
                                    onClick={restartTour}
                                    style={{ padding: '12px 20px', fontSize: '14px', borderRadius: '10px' }}
                                >
                                    ↺ {t('Restart from Beginning')}
                                </button>
                            </>
                        ) : isCompleted ? (
                            <>
                                <button
                                    type="button"
                                    className="btn primary"
                                    onClick={restartTour}
                                    style={{ padding: '12px 24px', fontSize: '14px', fontWeight: 800, borderRadius: '10px' }}
                                >
                                    ↺ {t('Replay Tour from Beginning')}
                                </button>
                                <Link
                                    to="/store-dashboard"
                                    className="btn"
                                    style={{ padding: '12px 20px', fontSize: '14px', borderRadius: '10px', textDecoration: 'none' }}
                                >
                                    {t('Return to Dashboard')} →
                                </Link>
                            </>
                        ) : (
                            <button
                                type="button"
                                className="btn primary"
                                onClick={() => startTour(true)}
                                style={{ padding: '14px 28px', fontSize: '15px', fontWeight: 800, borderRadius: '12px', boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)' }}
                            >
                                🚀 {t('Start Full Website Tour (Step 1)')}
                            </button>
                        )}
                    </div>
                </div>
            </section>

            {/* Quick Metrics Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                <div className="card" style={{ padding: '18px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                        📚
                    </div>
                    <div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>TOTAL SECTIONS</div>
                        <div style={{ fontSize: '18px', fontWeight: 800 }}>13 Core Modules</div>
                    </div>
                </div>

                <div className="card" style={{ padding: '18px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                        ⏱️
                    </div>
                    <div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>ESTIMATED DURATION</div>
                        <div style={{ fontSize: '18px', fontWeight: 800 }}>~8 to 10 Minutes</div>
                    </div>
                </div>

                <div className="card" style={{ padding: '18px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                        🧭
                    </div>
                    <div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>ROUTING & SYNC</div>
                        <div style={{ fontSize: '18px', fontWeight: 800 }}>Multi-Page Continuous</div>
                    </div>
                </div>

                <div className="card" style={{ padding: '18px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#fae8ff', color: '#86198f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                        🛡️
                    </div>
                    <div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>STAFF PERMISSIONS</div>
                        <div style={{ fontSize: '18px', fontWeight: 800 }}>Role-Adaptive & Safe</div>
                    </div>
                </div>
            </div>

            {/* List of 13 Guided Tour Sections */}
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>
                    {t('Tour Curriculum & Core Sections')}
                </h3>
                <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                    Click any section to inspect or jump directly
                </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                {sections.map((section, idx) => {
                    const sectionSteps = steps.filter((s) => s.section === section.id);
                    const firstStepIdx = steps.findIndex((s) => s.section === section.id);

                    return (
                        <div
                            key={section.id}
                            className="card"
                            style={{
                                padding: '18px',
                                borderRadius: '16px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                border: '1px solid var(--line, #e2e8f0)',
                                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                            }}
                        >
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <span style={{ fontSize: '24px' }}>{section.icon}</span>
                                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: 'var(--bg, #f1f5f9)', color: 'var(--muted)' }}>
                                        {section.duration}
                                    </span>
                                </div>
                                <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 800 }}>
                                    {section.title}
                                </h4>
                                <p style={{ fontSize: '12.5px', color: 'var(--muted)', margin: '0 0 14px', lineHeight: '1.45' }}>
                                    {sectionSteps.length} interactive walkthrough step{sectionSteps.length !== 1 ? 's' : ''} covering key operations.
                                </p>
                            </div>

                            <button
                                type="button"
                                className="btn"
                                onClick={() => {
                                    if (firstStepIdx >= 0) {
                                        goToStep(firstStepIdx);
                                    }
                                }}
                                style={{
                                    width: '100%',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    padding: '8px',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                }}
                            >
                                <span>▶</span> Start {section.title.split('. ')[1] || section.title}
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Tour Navigation & Replay Instructions Card */}
            <section className="card" style={{ padding: '24px', borderRadius: '18px', background: 'var(--bg, #f8fafc)', border: '1px solid var(--line, #e2e8f0)' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>💡</span> Helpful Tips & Tour Controls
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', lineHeight: '1.8', color: 'var(--muted-dark, #475569)' }}>
                    <li><strong>Moving Forward and Backward:</strong> Use the <code>Next ›</code> and <code>‹ Back</code> buttons on any tooltip, or use your keyboard arrow keys.</li>
                    <li><strong>Cross-Route Automatic Transitions:</strong> When moving to another module (e.g. from Dashboard to POS or Purchases), BornoPos will automatically open the page and wait for elements to load before continuing.</li>
                    <li><strong>Exiting & Resuming:</strong> You can click <code>Skip Tour</code> or press the <code>Esc</code> key at any moment. Your progress is saved automatically so you can resume later.</li>
                    <li><strong>Replaying Anytime:</strong> You can return to this Tour Center anytime by clicking <code>Take a Tour</code> in the sidebar navigation or by visiting <code>/tour</code>.</li>
                </ul>
            </section>
        </div>
    );
}
