// ShadowGuide.jsx
//
// The tour overlay itself: a spotlight cutout (box-shadow trick — one box
// sized to the target, with a huge box-shadow that dims the rest of the
// viewport) plus a ring around the target, and a tooltip positioned by
// @floating-ui/react (offset/flip/shift). Rendered once, globally, via
// createPortal onto document.body, and driven entirely by
// ShadowGuideProvider's state (see guideContext.js).
//
// Robustness rules baked in on purpose:
//   - a target missing from the DOM gets 3 retries (300ms apart), then the
//     tour silently moves on to the next step — it never throws, never stalls
//   - a step whose `route` differs from the current path triggers a
//     navigation first, then the same retry logic looks for the target
//   - the spotlight rect is recomputed on window resize/scroll AND via a
//     ResizeObserver on the target itself (content-driven size changes)

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { FocusTrap } from "focus-trap-react";
import { autoUpdate, flip, offset, shift, useFloating } from "@floating-ui/react";
import { Check, ChevronLeft, ChevronRight, Lock, Volume2, VolumeX, X } from "lucide-react";
import { useShadowGuide } from "./guideContext";
import { useGuideSpeech } from "./useGuideSpeech";

const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 300;
const SPOTLIGHT_PADDING = 8;

function prefersReducedMotion() {
  try {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
  } catch {
    return false;
  }
}

function isRTL() {
  return typeof document !== "undefined" && document.dir === "rtl";
}

/** Mirrors left/right placements when the document is RTL. */
function resolvePlacement(placement) {
  if (!placement) return "bottom";
  if (!isRTL()) return placement;
  if (placement.startsWith("left")) return placement.replace("left", "right");
  if (placement.startsWith("right")) return placement.replace("right", "left");
  return placement;
}

export default function ShadowGuide() {
  const { steps, currentStep, totalSteps, next, prev, goToStep, skip, isActive } = useShadowGuide();
  const step = steps[currentStep] ?? null;

  const location = useLocation();
  const navigate = useNavigate();

  const [targetEl, setTargetEl] = useState(null);
  const [targetRect, setTargetRect] = useState(null);
  const [confirmingQuit, setConfirmingQuit] = useState(false);
  const reducedMotion = prefersReducedMotion();

  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef(null);
  const tooltipRef = useRef(null);
  const headingRef = useRef(null);
  const originFocusRef = useRef(null);
  const wasActiveRef = useRef(false);

  const titleId = useId();
  const descId = useId();

  const speech = useGuideSpeech(step?.id);

  // ---------------------------------------------------------------------
  // Targeting: resolve `[data-guide="..."]` for the active step, navigating
  // first if the step lives on another route, retrying if it's not painted
  // yet, and skipping the step altogether if it never shows up.
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!isActive || !step) {
      setTargetEl(null);
      return undefined;
    }

    let cancelled = false;
    retryCountRef.current = 0;
    if (retryTimeoutRef.current) window.clearTimeout(retryTimeoutRef.current);

    if (step.route && location.pathname !== step.route) {
      navigate(step.route);
      return () => {
        cancelled = true;
      };
    }

    const attempt = () => {
      if (cancelled) return;
      const el = step.target ? document.querySelector(step.target) : null;
      if (el) {
        setTargetEl(el);
        return;
      }
      if (retryCountRef.current >= RETRY_ATTEMPTS) {
        setTargetEl(null);
        next(); // never block the user on a missing element
        return;
      }
      retryCountRef.current += 1;
      retryTimeoutRef.current = window.setTimeout(attempt, RETRY_DELAY_MS);
    };

    attempt();

    return () => {
      cancelled = true;
      if (retryTimeoutRef.current) window.clearTimeout(retryTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, step?.id, location.pathname]);

  // ---------------------------------------------------------------------
  // Spotlight rect: recomputed on resize, scroll (any ancestor, capture
  // phase), and via ResizeObserver on the target for content-driven resizes.
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!targetEl) {
      setTargetRect(null);
      return undefined;
    }

    const update = () => {
      const r = targetEl.getBoundingClientRect();
      setTargetRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    update();

    window.addEventListener("resize", update, { passive: true });
    window.addEventListener("scroll", update, { passive: true, capture: true });

    let observer;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(update);
      observer.observe(targetEl);
    }

    targetEl.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "center",
      inline: "nearest",
    });

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, { capture: true });
      observer?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetEl]);

  // ---------------------------------------------------------------------
  // Tooltip positioning (@floating-ui/react)
  // ---------------------------------------------------------------------
  const { refs, floatingStyles } = useFloating({
    placement: resolvePlacement(step?.placement),
    middleware: [offset(14), flip({ padding: 12 }), shift({ padding: 12 })],
    whileElementsMounted: autoUpdate,
  });

  useEffect(() => {
    refs.setReference(targetEl);
  }, [targetEl, refs]);

  const setFloatingRef = useCallback(
    (node) => {
      tooltipRef.current = node;
      refs.setFloating(node);
    },
    [refs]
  );

  // ---------------------------------------------------------------------
  // Focus management: move focus to the step heading on every step change;
  // remember and restore the element focused before the tour started.
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (isActive && !wasActiveRef.current) {
      originFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    }
    if (!isActive && wasActiveRef.current) {
      originFocusRef.current?.focus?.({ preventScroll: true });
      originFocusRef.current = null;
    }
    wasActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    if (!isActive || !step) return undefined;
    // Re-focus the heading whenever the step changes AND whenever the quit
    // confirmation panel is toggled either way — the dialog's content
    // changes underneath the same DOM node in both cases.
    const raf = requestAnimationFrame(() => headingRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [isActive, step?.id, confirmingQuit]);

  useEffect(
    () => () => {
      originFocusRef.current?.focus?.({ preventScroll: true });
    },
    []
  );

  // ---------------------------------------------------------------------
  // Keyboard: arrows to navigate (mirrored in RTL), Escape to quit (with
  // confirmation).
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!isActive || !step) return undefined;
    const onKeyDown = (event) => {
      if (confirmingQuit) return;
      if (event.key === "Escape") {
        event.preventDefault();
        setConfirmingQuit(true);
        return;
      }
      const rtl = isRTL();
      if (event.key === "ArrowRight") {
        event.preventDefault();
        if (rtl) prev();
        else if (!step.locked) next();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        if (rtl) {
          if (!step.locked) next();
        } else {
          prev();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isActive, step, confirmingQuit, next, prev]);

  if (!isActive || !step) return null;

  const bodyText = speech.simplified && step.body_simple ? step.body_simple : step.body;
  const liveMessage = `Étape ${currentStep + 1} sur ${totalSteps} : ${step.title}`;

  const spotlightStyle = targetRect
    ? {
        position: "fixed",
        top: targetRect.top - SPOTLIGHT_PADDING,
        left: targetRect.left - SPOTLIGHT_PADDING,
        width: targetRect.width + SPOTLIGHT_PADDING * 2,
        height: targetRect.height + SPOTLIGHT_PADDING * 2,
        borderRadius: 14,
        boxShadow:
          "0 0 0 3px #fff, 0 0 0 6px var(--color-primary), 0 0 0 9999px rgba(15, 23, 42, 0.6)",
        pointerEvents: "none",
        zIndex: 9991,
        transition: reducedMotion
          ? "none"
          : "top 0.25s ease, left 0.25s ease, width 0.25s ease, height 0.25s ease",
      }
    : {
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.6)",
        pointerEvents: "none",
        zIndex: 9991,
      };

  const lockedOverlayStyle =
    step.locked && targetRect
      ? {
          position: "fixed",
          top: targetRect.top - SPOTLIGHT_PADDING,
          left: targetRect.left - SPOTLIGHT_PADDING,
          width: targetRect.width + SPOTLIGHT_PADDING * 2,
          height: targetRect.height + SPOTLIGHT_PADDING * 2,
          borderRadius: 14,
          background: "rgba(255, 255, 255, 0.55)",
          backdropFilter: "grayscale(0.6)",
          pointerEvents: "none",
          zIndex: 9992,
        }
      : null;

  const tooltipPositionStyle = targetEl
    ? floatingStyles
    : {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };

  return createPortal(
    <>
      <div style={spotlightStyle} aria-hidden="true" />
      {lockedOverlayStyle ? <div style={lockedOverlayStyle} aria-hidden="true" /> : null}
      <div aria-live="polite" className="sr-only">
        {confirmingQuit ? "Quitter le guide ? Une confirmation est demandée." : liveMessage}
      </div>

      <FocusTrap
        focusTrapOptions={{
          escapeDeactivates: false,
          clickOutsideDeactivates: false,
          allowOutsideClick: true,
          fallbackFocus: () => tooltipRef.current,
        }}
      >
        <div
          ref={setFloatingRef}
          style={{ ...tooltipPositionStyle, zIndex: 9993 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descId}
          className="w-[min(360px,calc(100vw-2rem))] rounded-2xl bg-white p-5 shadow-2xl shadow-gray-900/25 ring-1 ring-black/5"
        >
          <button
            type="button"
            onClick={() => setConfirmingQuit(true)}
            aria-label="Fermer le guide"
            className="absolute right-3 top-3 rounded-lg p-1 text-text-secondary transition-colors hover:bg-gray-100 hover:text-text-primary"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>

          {confirmingQuit ? (
            <div>
              <h2 id={titleId} ref={headingRef} tabIndex={-1} className="pr-6 text-base font-bold text-text-primary">
                Quitter le guide ?
              </h2>
              <p id={descId} className="mt-2 text-sm leading-relaxed text-text-secondary">
                Vous pourrez le relancer à tout moment depuis votre profil ("Revoir le guide").
              </p>
              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setConfirmingQuit(false)}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-text-secondary hover:bg-gray-100"
                >
                  Continuer le guide
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmingQuit(false);
                    skip();
                  }}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Quitter
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="pr-6 text-xs font-bold uppercase tracking-wider text-primary">
                Étape {currentStep + 1} / {totalSteps}
              </p>
              <h2
                id={titleId}
                ref={headingRef}
                tabIndex={-1}
                className="mt-1 pr-4 text-base font-bold leading-snug text-text-primary"
              >
                {step.locked ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
                    {step.title}
                  </span>
                ) : (
                  step.title
                )}
              </h2>
              <p id={descId} className="mt-2 text-sm leading-relaxed text-text-secondary">
                {bodyText}
              </p>
              {step.actionHint ? (
                <p className="mt-2 text-xs italic text-text-secondary/80">{step.actionHint}</p>
              ) : null}

              {/* Speech + simplified-language controls */}
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-3">
                {speech.supported ? (
                  <button
                    type="button"
                    onClick={() => (speech.speaking ? speech.stop() : speech.speak(bodyText))}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                  >
                    {speech.speaking ? (
                      <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {speech.speaking ? "Arrêter la lecture" : "Écouter cette étape"}
                  </button>
                ) : null}
                <label className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                  <input
                    type="checkbox"
                    checked={speech.simplified}
                    onChange={speech.toggleSimplified}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary/40"
                  />
                  Langage simplifié
                </label>
              </div>

              {/* Dot navigation — shape + icon convey state, never color alone */}
              <div className="mt-4 flex items-center justify-center gap-1.5" role="tablist" aria-label="Étapes du guide">
                {steps.map((s, i) => {
                  const done = i < currentStep;
                  const current = i === currentStep;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      role="tab"
                      aria-selected={current}
                      aria-current={current ? "step" : undefined}
                      aria-label={`Aller à l'étape ${i + 1} : ${s.title}`}
                      onClick={() => goToStep(i)}
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${
                        current
                          ? "bg-primary text-white ring-2 ring-primary/30"
                          : done
                            ? "bg-primary/15 text-primary"
                            : "border border-gray-300 text-gray-400 hover:border-primary/50"
                      }`}
                    >
                      {done ? <Check className="h-3 w-3" aria-hidden="true" /> : i + 1}
                    </button>
                  );
                })}
              </div>

              {/* Primary navigation */}
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={prev}
                  disabled={currentStep === 0}
                  className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  Précédent
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmingQuit(true)}
                  className="text-xs font-medium text-text-secondary underline-offset-2 hover:text-text-primary hover:underline"
                >
                  Ignorer le guide
                </button>

                {step.locked ? (
                  <button
                    type="button"
                    onClick={() => navigate(step.lockedCtaRoute || "/employers")}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-600"
                  >
                    <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                    Voir les formules
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={next}
                    className="inline-flex items-center gap-1 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
                  >
                    {currentStep === totalSteps - 1 ? "Terminer" : "Suivant"}
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </FocusTrap>
    </>,
    document.body
  );
}
