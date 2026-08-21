// ConfirmDialog.tsx
//
// Reusable confirmation for every destructive action in the app. Rules,
// non-negotiable:
//   - `title` states the exact object of the action ("Voulez-vous vraiment
//     supprimer ce CV ?"), never a bare "Êtes-vous sûr ?"
//   - `description` says whether the consequence is reversible or definitive
//   - `confirmLabel` carries the action's verb ("Supprimer"), never "OK"
//   - the non-destructive choice (Cancel) has focus by default at open
//   - role="alertdialog", full focus trap, Escape cancels

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { FocusTrap } from "focus-trap-react";
import { AlertTriangle } from "lucide-react";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Red/destructive styling for the confirm button. Default true — this
   * component exists for destructive actions; pass false for the rare
   * confirm-but-not-destructive case. */
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Annuler",
  destructive = true,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useRef(`confirm-title-${Math.random().toString(36).slice(2)}`).current;
  const descId = useRef(`confirm-desc-${Math.random().toString(36).slice(2)}`).current;

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open, onCancel]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9994] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px]" aria-hidden="true" />
      <FocusTrap
        focusTrapOptions={{
          escapeDeactivates: false, // handled above so Escape always maps to Cancel
          clickOutsideDeactivates: false,
          initialFocus: () => cancelRef.current || false,
        }}
      >
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descId}
          className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl shadow-gray-900/20"
        >
          <div className="flex items-start gap-3">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                destructive ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"
              }`}
              aria-hidden="true"
            >
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div className="min-w-0 pt-0.5">
              <h2 id={titleId} className="text-base font-bold text-text-primary">
                {title}
              </h2>
              <p id={descId} className="mt-1.5 text-sm leading-relaxed text-text-secondary">
                {description}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              ref={cancelRef}
              type="button"
              onClick={onCancel}
              className="w-full rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:bg-gray-50 sm:w-auto"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto ${
                destructive ? "bg-red-600 hover:bg-red-700" : "bg-primary hover:bg-primary-dark"
              }`}
            >
              {busy ? "…" : confirmLabel}
            </button>
          </div>
        </div>
      </FocusTrap>
    </div>,
    document.body
  );
}
