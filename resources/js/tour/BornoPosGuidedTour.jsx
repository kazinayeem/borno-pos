import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ACTIONS, EVENTS, STATUS, useJoyride } from 'react-joyride';
import { useTour } from './TourContext';
import TourTooltip from './TourTooltip';

/**
 * Polls for target selector to appear in DOM after route changes.
 * Also opens any collapsed `<details>` in sidebar if target is nested.
 */
async function waitForTarget(target, timeoutMs = 3500) {
    if (!target || target === 'body') return document.body;

    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
        const el = typeof target === 'string' ? document.querySelector(target) : target;
        if (el) {
            // Expand parent details if collapsed
            const details = el.closest('details');
            if (details && !details.open) {
                details.open = true;
            }
            return el;
        }
        await new Promise((resolve) => setTimeout(resolve, 80));
    }
    return null;
}

export default function BornoPosGuidedTour() {
    const {
        isRunning,
        stepIndex,
        steps,
        setStepIndex,
        skipTour,
        completeTour,
        setIsRunning,
    } = useTour();

    const location = useLocation();
    const navigate = useNavigate();
    const isNavigatingRef = useRef(false);

    // Prepare steps with automated route navigation before-hooks
    const enhancedSteps = steps.map((step) => ({
        ...step,
        before: async () => {
            if (step.route && location.pathname !== step.route) {
                isNavigatingRef.current = true;
                navigate(step.route);
            }
            await waitForTarget(step.target, 3500);
            isNavigatingRef.current = false;
        },
    }));

    const { controls, state, Tour } = useJoyride({
        steps: enhancedSteps,
        run: isRunning,
        stepIndex,
        continuous: true,
        showProgress: true,
        showSkipButton: true,
        disableBeacon: true,
        disableFocusTrap: false,
        disableCloseOnEsc: false,
        spotlightPadding: 6,
        targetWaitTimeout: 3000,
        tooltipComponent: TourTooltip,
        options: {
            arrowColor: 'var(--card, #ffffff)',
            backgroundColor: 'var(--card, #ffffff)',
            overlayColor: 'rgba(15, 23, 42, 0.65)',
            primaryColor: '#4f46e5',
            textColor: 'var(--text, #111827)',
            zIndex: 10000,
        },
        onEvent: (eventData) => {
            const { action, index, status, type } = eventData;

            if (type === EVENTS.STEP_AFTER) {
                if (action === ACTIONS.NEXT) {
                    const nextIdx = index + 1;
                    if (nextIdx >= steps.length) {
                        completeTour();
                    } else {
                        setStepIndex(nextIdx);
                    }
                } else if (action === ACTIONS.PREV) {
                    const prevIdx = Math.max(0, index - 1);
                    setStepIndex(prevIdx);
                } else if (action === ACTIONS.CLOSE || action === ACTIONS.SKIP) {
                    skipTour();
                }
            } else if (type === EVENTS.TOUR_END || status === STATUS.FINISHED) {
                completeTour();
            } else if (status === STATUS.SKIPPED) {
                skipTour();
            } else if (type === EVENTS.TARGET_NOT_FOUND) {
                // If target not found after transition, gracefully skip to next step
                console.warn(`[BornoPos Tour] Target '${enhancedSteps[index]?.target}' not found. Advancing step.`);
                if (index + 1 < steps.length) {
                    setStepIndex(index + 1);
                } else {
                    completeTour();
                }
            }
        },
    });

    // Clean keyboard Escape handler
    useEffect(() => {
        function handleKeyDown(e) {
            if (e.key === 'Escape' && isRunning) {
                skipTour();
            }
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isRunning, skipTour]);

    if (!isRunning) return null;

    return (
        <div id="bornopos-guided-tour-root">
            {Tour}
        </div>
    );
}
