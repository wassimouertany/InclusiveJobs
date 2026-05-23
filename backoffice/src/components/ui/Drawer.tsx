import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect } from "react";

interface DrawerProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export default function Drawer({ open, title, onClose, children }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="bo-drawer-backdrop" role="presentation" onClick={onClose}>
      <aside className="bo-drawer" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">{title}</h2>
          <button type="button" className="bo-btn bo-btn-ghost p-2" onClick={onClose} aria-label="Close drawer">
            <X className="w-4 h-4" />
          </button>
        </header>
        {children}
      </aside>
    </div>
  );
}
