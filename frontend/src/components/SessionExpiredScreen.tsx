// SessionExpiredScreen.tsx
//
// Shown when apiClient's response interceptor actually catches a 401 on an
// authenticated request (see services/apiClient.ts, sets
// useAuthStore.sessionExpired). This replaces the old pattern of redirecting
// straight to /login the instant a request fails — that could yank someone
// out of a form mid-keystroke. Instead: an explicit, unmissable screen that
// only navigates away once the user clicks the button themselves.

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { FocusTrap } from "focus-trap-react";
import { LogIn, ShieldAlert } from "lucide-react";
import { useAuthStore } from "../store/authStore";

export default function SessionExpiredScreen() {
  const sessionExpired = useAuthStore((s) => s.sessionExpired);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const navigate = useNavigate();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (sessionExpired) {
      requestAnimationFrame(() => headingRef.current?.focus());
    }
  }, [sessionExpired]);

  if (!sessionExpired) return null;

  const handleReconnect = () => {
    clearAuth(); // also wipes sensitive (sessionStorage) drafts — see formDraft.ts
    navigate("/login");
  };

  return createPortal(
    <div className="fixed inset-0 z-[9996] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
      <FocusTrap focusTrapOptions={{ escapeDeactivates: false, clickOutsideDeactivates: false }}>
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="session-expired-title"
          aria-describedby="session-expired-desc"
          className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl"
        >
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
            <ShieldAlert className="h-7 w-7" aria-hidden="true" />
          </div>
          <h2
            id="session-expired-title"
            ref={headingRef}
            tabIndex={-1}
            className="text-xl font-bold text-text-primary"
          >
            Votre session a expiré
          </h2>
          <p id="session-expired-desc" className="mt-2 text-sm leading-relaxed text-text-secondary">
            Pour votre sécurité, vous avez été déconnecté. Vos informations neutres restent
            enregistrées ; reconnectez-vous pour continuer.
          </p>
          <button
            type="button"
            onClick={handleReconnect}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-primary-dark"
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            Se reconnecter
          </button>
        </div>
      </FocusTrap>
    </div>,
    document.body
  );
}
