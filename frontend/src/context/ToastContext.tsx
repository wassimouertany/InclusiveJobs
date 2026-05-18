import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

type ToastType = "success" | "error" | "info";

export type ShowToastOptions = {
  message: string;
  title?: string;
  type?: ToastType;
  /** Auto-dismiss in ms (default 3000, or 4200 when `title` is set). */
  duration?: number;
};

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  title?: string;
  duration: number;
}

interface ToastContextType {
  showToast: (payload: string | ShowToastOptions, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const DEFAULT_MS = 3000;
const TITLED_MS = 4200;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((payload: string | ShowToastOptions, type?: ToastType) => {
    const id = Math.random().toString(36).substring(2, 9);

    let message: string;
    let toastType: ToastType;
    let title: string | undefined;
    let duration = DEFAULT_MS;

    if (typeof payload === "string") {
      message = payload;
      toastType = type ?? "info";
    } else {
      message = payload.message;
      title = payload.title;
      toastType = payload.type ?? type ?? "info";
      if (typeof payload.duration === "number") {
        duration = payload.duration;
      } else if (title) {
        duration = TITLED_MS;
      }
    }

    setToasts((prev) => [...prev, { id, message, type: toastType, title, duration }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex max-w-[min(420px,calc(100vw-2rem))] flex-col gap-3 pointer-events-none sm:bottom-6 sm:right-6">
        <AnimatePresence>
          {toasts.map((toast) => {
            const accent =
              toast.title &&
              (toast.type === "success"
                ? "border-l-[3px] border-l-emerald-500"
                : toast.type === "error"
                  ? "border-l-[3px] border-l-rose-500"
                  : "border-l-[3px] border-l-sky-500");
            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 12, scale: 0.96, transition: { duration: 0.2 } }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                className={`pointer-events-auto flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-xl shadow-gray-900/10 ring-1 ring-black/[0.04] ${accent || ""}`}
              >
                <div
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    toast.type === "success"
                      ? "bg-emerald-50 text-emerald-600"
                      : toast.type === "error"
                        ? "bg-rose-50 text-rose-600"
                        : "bg-sky-50 text-sky-600"
                  }`}
                >
                  {toast.type === "success" && <CheckCircle className="h-5 w-5" strokeWidth={2.25} />}
                  {toast.type === "error" && <AlertCircle className="h-5 w-5" strokeWidth={2.25} />}
                  {toast.type === "info" && <Info className="h-5 w-5" strokeWidth={2.25} />}
                </div>

                <div className="min-w-0 flex-1 pt-0.5">
                  {toast.title ? (
                    <>
                      <p className="text-sm font-bold leading-tight tracking-tight text-gray-900">
                        {toast.title}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-gray-600">{toast.message}</p>
                    </>
                  ) : (
                    <p className="text-sm font-medium leading-relaxed text-gray-800">{toast.message}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  className="shrink-0 rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                  aria-label="Dismiss"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
