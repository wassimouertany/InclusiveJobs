// SummaryDrawer.tsx
//
// Generic side drawer. No knowledge of summaries — it owns the overlay
// mechanics only, so any future panel can reuse it.
//
// The a11y pattern (portal + focus trap + capture-phase Escape) is copied
// from ConfirmDialog.tsx:47-70, which is purpose-built for confirmations and
// cannot host arbitrary content. Two things ConfirmDialog does NOT do are
// added here:
//   - focus restoration is explicit (the element focused at open time is
//     re-focused on close) rather than delegated to focus-trap's default;
//   - body scroll is locked while open and the PREVIOUS inline overflow value
//     is restored on close — nothing else in the codebase does this.
//
// z-index 9993: below ConfirmDialog (9994) so a confirmation raised from
// inside the drawer still sits on top, above BlockageBubble (9990).

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { FocusTrap } from "focus-trap-react";
import { X } from "lucide-react";

export type SummaryDrawerProps = {
  open: boolean;
  title: string;
  /** Accessible name for the close control — never rely on the X glyph alone. */
  closeLabel: string;
  onClose: () => void;
  /** Right-to-left languages flip both the text direction and the panel side. */
  isRtl?: boolean;
  /** Marks the scrollable body as busy while content loads. */
  busy?: boolean;
  children: ReactNode;
};

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

export default function SummaryDrawer({
  open,
  title,
  closeLabel,
  onClose,
  isRtl = false,
  busy = false,
  children,
}: SummaryDrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const titleId = useRef(
    `summary-drawer-title-${Math.random().toString(36).slice(2)}`,
  ).current;
  const reducedMotion = usePrefersReducedMotion();

  // Escape closes. Capture phase, same as ConfirmDialog, so the drawer wins
  // over anything listening on bubble.
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open, onClose]);

  // Explicit focus restoration: remember what was focused when the drawer
  // opened, put focus back there when it closes.
  useEffect(() => {
    if (!open) return undefined;
    const active = document.activeElement;
    triggerRef.current = active instanceof HTMLElement ? active : null;
    return () => {
      const trigger = triggerRef.current;
      triggerRef.current = null;
      if (trigger && document.contains(trigger)) trigger.focus();
    };
  }, [open]);

  // Scroll lock: restore the exact previous inline value, not a hardcoded "".
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  // Slide-in is done with inline styles on purpose: the `animate-in` utility
  // classes used elsewhere in these views resolve to nothing (no
  // tailwindcss-animate plugin is installed — reported, not fixed).
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    if (!open) {
      setEntered(false);
      return undefined;
    }
    if (reducedMotion) {
      setEntered(true);
      return undefined;
    }
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [open, reducedMotion]);

  if (!open) return null;

  const sideClass = isRtl ? "left-0" : "right-0";
  const offscreen = isRtl ? "translateX(-100%)" : "translateX(100%)";
  const panelStyle = {
    transform: entered ? "translateX(0)" : offscreen,
    transition: reducedMotion ? "none" : "transform 200ms ease-out",
  };

  return createPortal(
    <div className="fixed inset-0 z-[9993]" dir={isRtl ? "rtl" : "ltr"}>
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]"
        aria-hidden="true"
        onClick={onClose}
      />
      <FocusTrap
        focusTrapOptions={{
          escapeDeactivates: false, // handled above so Escape always maps to close
          clickOutsideDeactivates: false,
          returnFocusOnDeactivate: false, // restored explicitly in the effect above
          initialFocus: () => closeRef.current || false,
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          style={panelStyle}
          className={`absolute top-0 ${sideClass} flex h-[100dvh] w-full flex-col bg-white shadow-2xl shadow-gray-900/20 sm:w-[26rem]`}
        >
          <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
            <h2 id={titleId} className="text-lg font-bold text-text-primary">
              {title}
            </h2>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-gray-100 hover:text-text-primary focus:ring-2 focus:ring-indigo-400 outline-none"
            >
              <X className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">{closeLabel}</span>
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4" aria-busy={busy}>
            {children}
          </div>
        </div>
      </FocusTrap>
    </div>,
    document.body,
  );
}
