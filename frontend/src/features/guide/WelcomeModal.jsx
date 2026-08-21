// WelcomeModal.jsx
//
// Petite modale proposée au premier montage éligible (voir
// ShadowGuideProvider) : "Lancer la visite" démarre le tour, "Plus tard" la
// referme pour cette session sans marquer le tour comme ignoré (il sera
// reproposé à la prochaine visite tant que l'utilisateur n'a pas cliqué
// "Ignorer le guide" depuis l'intérieur du tour lui-même).

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { FocusTrap } from "focus-trap-react";
import { Compass, X } from "lucide-react";

export default function WelcomeModal({ tourTitle, onStart, onLater }) {
  const titleId = useId();
  const descId = useId();
  const previouslyFocusedRef = useRef(null);

  useEffect(() => {
    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => {
      previouslyFocusedRef.current?.focus?.({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onLater();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [onLater]);

  let reducedMotion = false;
  try {
    reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
  } catch {
    reducedMotion = false;
  }

  const roleLabel = tourTitle === "recruteur" ? "recruteur" : "candidat";

  return createPortal(
    <div className="fixed inset-0 z-[9995] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]"
        aria-hidden="true"
        onClick={onLater}
      />
      <FocusTrap
        focusTrapOptions={{
          escapeDeactivates: false,
          clickOutsideDeactivates: false,
          fallbackFocus: `#${titleId}`,
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descId}
          className={`relative w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl shadow-gray-900/20 ${
            reducedMotion ? "" : "transition-all"
          }`}
        >
          <button
            type="button"
            onClick={onLater}
            aria-label="Fermer"
            className="absolute right-4 top-4 rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-gray-100 hover:text-text-primary"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>

          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Compass className="h-6 w-6" aria-hidden="true" />
          </div>

          <h2 id={titleId} className="text-xl font-bold text-text-primary" tabIndex={-1}>
            Bienvenue sur InclusiveJobs
          </h2>
          <p id={descId} className="mt-2 text-sm leading-relaxed text-text-secondary">
            Une courte visite guidée présente les fonctionnalités clés de votre espace {roleLabel}.
            Vous pourrez la revoir à tout moment depuis votre profil.
          </p>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onLater}
              className="rounded-xl px-5 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-gray-100"
            >
              Plus tard
            </button>
            <button
              type="button"
              onClick={onStart}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-primary-dark"
            >
              Lancer la visite
            </button>
          </div>
        </div>
      </FocusTrap>
    </div>,
    document.body
  );
}
