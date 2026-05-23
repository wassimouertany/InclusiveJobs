import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect } from "react";
import Button from "./Button";

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

export default function Modal({ open, title, onClose, children, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="bo-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="bo-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bo-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 mb-4">
          <h2 id="bo-modal-title" className="font-bold text-lg">
            {title}
          </h2>
          <button type="button" className="bo-btn bo-btn-ghost p-2" onClick={onClose} aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </header>
        <div>{children}</div>
        {footer ? <footer className="mt-5 flex justify-end gap-2">{footer}</footer> : null}
      </div>
    </div>
  );
}

export function ModalActions({ onClose, onConfirm, confirmLabel = "Confirm" }: { onClose: () => void; onConfirm: () => void; confirmLabel?: string }) {
  return (
    <>
      <Button variant="ghost" onClick={onClose}>
        Cancel
      </Button>
      <Button onClick={onConfirm}>{confirmLabel}</Button>
    </>
  );
}
