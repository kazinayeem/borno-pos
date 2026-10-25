import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { allTourSteps, TOUR_SECTIONS } from './tourSteps';

const TourContext = createContext(null);

const STORAGE_PREFIX = 'bornopos_tour_state_';

function getStorageKey(user) {
    return `${STORAGE_PREFIX}${user?.id || 'guest'}`;
}

function loadSavedState(user) {
    try {
        const raw = localStorage.getItem(getStorageKey(user));
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function saveState(user, state) {
    try {
        localStorage.setItem(getStorageKey(user), JSON.stringify(state));
    } catch {
        // Storage unavailable or quota exceeded; silently ignore
    }
}

export function TourProvider({ children }) {
    const user = useSelector((state) => state.session.user);
    const location = useLocation();
    const navigate = useNavigate();

    const isOwnerOrAdmin = user?.role === 'owner' || user?.role === 'super_admin' || user?.role === 'admin';
    const userPerms = Array.isArray(user?.permissions) ? user.permissions : [];

    // Filter steps based on active user abilities
    const steps = useMemo(() => {
        return allTourSteps.filter((step) => {
            if (!step.permission) return true;
            if (isOwnerOrAdmin) return true;
            return userPerms.includes(step.permission);
        });
    }, [isOwnerOrAdmin, userPerms]);

    const [isRunning, setIsRunning] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const [isCompleted, setIsCompleted] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);

    // Load initial saved progress for user
    useEffect(() => {
        const saved = loadSavedState(user);
        if (saved) {
            if (typeof saved.stepIndex === 'number' && saved.stepIndex < steps.length) {
                setStepIndex(saved.stepIndex);
            }
            if (saved.isCompleted) {
                setIsCompleted(true);
            }
        }
    }, [user, steps.length]);

    // Save state on change
    useEffect(() => {
        saveState(user, {
            stepIndex,
            isCompleted,
            lastRoute: location.pathname,
            updatedAt: Date.now(),
        });
    }, [user, stepIndex, isCompleted, location.pathname]);

    const currentStep = steps[stepIndex] || steps[0];

    const hasSavedProgress = stepIndex > 0 && !isCompleted;

    const progressPercent = steps.length > 0 ? Math.round(((stepIndex + 1) / steps.length) * 100) : 0;

    function startTour(fromBeginning = true) {
        const targetIndex = fromBeginning ? 0 : stepIndex;
        setStepIndex(targetIndex);
        setIsCompleted(false);
        setIsRunning(true);

        const targetStep = steps[targetIndex];
        if (targetStep && targetStep.route && location.pathname !== targetStep.route) {
            navigate(targetStep.route);
        }
    }

    function resumeTour() {
        startTour(false);
    }

    function restartTour() {
        startTour(true);
    }

    function skipTour() {
        setIsRunning(false);
        saveState(user, {
            stepIndex,
            isCompleted: false,
            skipped: true,
            updatedAt: Date.now(),
        });
    }

    function completeTour() {
        setIsRunning(false);
        setIsCompleted(true);
        saveState(user, {
            stepIndex: steps.length - 1,
            isCompleted: true,
            updatedAt: Date.now(),
        });
    }

    function goToStep(index) {
        if (index < 0 || index >= steps.length) return;
        setStepIndex(index);
        setIsRunning(true);
        const targetStep = steps[index];
        if (targetStep?.route && location.pathname !== targetStep.route) {
            navigate(targetStep.route);
        }
    }

    function nextStep() {
        if (stepIndex >= steps.length - 1) {
            completeTour();
        } else {
            goToStep(stepIndex + 1);
        }
    }

    function prevStep() {
        if (stepIndex > 0) {
            goToStep(stepIndex - 1);
        }
    }

    const value = {
        isRunning,
        setIsRunning,
        stepIndex,
        setStepIndex,
        steps,
        currentStep,
        sections: TOUR_SECTIONS,
        isCompleted,
        hasSavedProgress,
        progressPercent,
        isNavigating,
        setIsNavigating,
        startTour,
        resumeTour,
        restartTour,
        skipTour,
        completeTour,
        goToStep,
        nextStep,
        prevStep,
    };

    return (
        <TourContext.Provider value={value}>
            {children}
        </TourContext.Provider>
    );
}

export function useTour() {
    const ctx = useContext(TourContext);
    if (!ctx) {
        throw new Error('useTour must be used within a TourProvider');
    }
    return ctx;
}
