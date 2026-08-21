// ShadowGuideProvider.jsx
//
// State machine + context for the Shadow Guide onboarding tours. Picks the
// right tour from the signed-in role, decides whether to auto-offer it on
// first mount, and exposes the navigation API (next/prev/goToStep/skip) that
// ShadowGuide.jsx and GuideChecklist.jsx consume. Also mounts the overlay,
// the welcome modal, and the contextual blockage helper — a single
// <ShadowGuideProvider> around the authenticated routes is enough to wire the
// whole feature.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { getFocusModeEnabled } from "../../utils/focusMode";
import { UserRole } from "../../types";
import { TOURS } from "./tours.config";
import {
  dismiss,
  getProgress,
  isDismissed,
  markStepCompleted,
  resetTour,
  setProgress as persistProgress,
} from "./guideStorage";
import { GuideContext, useShadowGuide } from "./guideContext";
import ShadowGuide from "./ShadowGuide";
import WelcomeModal from "./WelcomeModal";
import { BlockageBubble } from "./BlockageBubble";

export { useShadowGuide };

function tourIdForRole(role) {
  if (role === UserRole.CANDIDATE) return "candidat_onboarding";
  if (role === UserRole.COMPANY) return "recruteur_onboarding";
  return null;
}

export function ShadowGuideProvider({ children }) {
  const role = useAuthStore((s) => s.role);
  const tourId = useMemo(() => tourIdForRole(role), [role]);
  const tourConfig = tourId ? TOURS[tourId] : null;
  const steps = tourConfig?.steps ?? [];
  const totalSteps = steps.length;

  const [isActive, setIsActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeDismissedThisSession, setWelcomeDismissedThisSession] = useState(false);
  // Mirrors guideStorage's completedStepIds in React state so GuideChecklist
  // re-renders reactively instead of polling localStorage.
  const [completedStepIds, setCompletedStepIds] = useState([]);

  // Decide what to do the first time a tour becomes available for this
  // session (login, or app load with a persisted session). Runs again only
  // if the role actually changes (login/logout/role switch), not on every
  // route change, since ShadowGuideProvider is mounted once at the app root.
  useEffect(() => {
    if (!tourId) {
      setIsActive(false);
      setShowWelcome(false);
      setCompletedStepIds([]);
      return;
    }
    const progress = getProgress(tourId);
    setCompletedStepIds(progress.completedStepIds);
    if (progress.status === "in_progress") {
      // Reload in the middle of a tour: resume exactly where they left off.
      const total = TOURS[tourId]?.steps.length ?? 0;
      setStepIndex(total > 0 ? Math.min(progress.stepIndex, total - 1) : 0);
      setIsActive(true);
      setShowWelcome(false);
      return;
    }
    setIsActive(false);
    // Focus Mode: never self-offer the tour, however welcome it'd normally
    // be — an unexpected modal is exactly the kind of interruption Focus
    // Mode exists to remove. Still reachable manually (startTour(), e.g.
    // from "Revoir le guide" in the profile menu).
    const focusModeActive = getFocusModeEnabled();
    if (
      !focusModeActive &&
      progress.status === "not_started" &&
      !isDismissed(tourId) &&
      !welcomeDismissedThisSession
    ) {
      setShowWelcome(true);
    } else {
      setShowWelcome(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourId]);

  const launch = useCallback(
    (fromIndex = 0) => {
      if (!tourId) return;
      setStepIndex(fromIndex);
      setIsActive(true);
      setShowWelcome(false);
      persistProgress(tourId, { status: "in_progress", stepIndex: fromIndex });
    },
    [tourId]
  );

  /** Manual (re)start — used by "Lancer la visite" and "Revoir le guide".
   * Bypasses any previous dismissal and always begins at step 0. */
  const startTour = useCallback(() => {
    if (!tourId) return;
    resetTour(tourId);
    setCompletedStepIds([]);
    launch(0);
  }, [tourId, launch]);

  /** Closes the overlay without recording a dismissal (soft close). */
  const stopTour = useCallback(() => {
    setIsActive(false);
  }, []);

  /** Closes the overlay AND remembers the user skipped it, so it won't
   * auto-offer itself again on future visits. */
  const skip = useCallback(() => {
    setIsActive(false);
    if (tourId) dismiss(tourId);
  }, [tourId]);

  const next = useCallback(() => {
    if (!tourId || totalSteps === 0) return;
    const current = steps[stepIndex];
    if (current) {
      const updated = markStepCompleted(tourId, current.id);
      setCompletedStepIds(updated.completedStepIds);
    }
    if (stepIndex >= totalSteps - 1) {
      persistProgress(tourId, { status: "completed", stepIndex: totalSteps - 1 });
      setIsActive(false);
      return;
    }
    const nextIndex = stepIndex + 1;
    setStepIndex(nextIndex);
    persistProgress(tourId, { status: "in_progress", stepIndex: nextIndex });
  }, [tourId, steps, stepIndex, totalSteps]);

  const prev = useCallback(() => {
    if (!tourId || stepIndex <= 0) return;
    const prevIndex = stepIndex - 1;
    setStepIndex(prevIndex);
    persistProgress(tourId, { status: "in_progress", stepIndex: prevIndex });
  }, [tourId, stepIndex]);

  /** Jumps straight to a given step (GuideChecklist rows call this). */
  const goToStep = useCallback(
    (index) => {
      if (!tourId || totalSteps === 0) return;
      const clamped = Math.max(0, Math.min(index, totalSteps - 1));
      launch(clamped);
    },
    [tourId, totalSteps, launch]
  );

  const dismissWelcome = useCallback(() => {
    setShowWelcome(false);
    setWelcomeDismissedThisSession(true);
  }, []);

  const value = useMemo(
    () => ({
      tourId,
      tourConfig,
      steps,
      startTour,
      stopTour,
      next,
      prev,
      goToStep,
      skip,
      currentStep: stepIndex,
      totalSteps,
      isActive,
      completedStepIds,
    }),
    [
      tourId,
      tourConfig,
      steps,
      startTour,
      stopTour,
      next,
      prev,
      goToStep,
      skip,
      stepIndex,
      totalSteps,
      isActive,
      completedStepIds,
    ]
  );

  return (
    <GuideContext.Provider value={value}>
      {children}
      {tourId ? <ShadowGuide /> : null}
      {tourId && showWelcome ? (
        <WelcomeModal tourTitle={tourConfig?.role} onStart={startTour} onLater={dismissWelcome} />
      ) : null}
      {tourId ? <BlockageBubble onOpenGuide={startTour} /> : null}
    </GuideContext.Provider>
  );
}

export default ShadowGuideProvider;
