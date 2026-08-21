// SessionExpiryBanner.tsx
//
// Non-modal warning shown ~2 minutes before the JWT expires. Never steals
// focus, never blocks the page — a dismissible banner, announced once via
// aria-live="polite". There is no refresh-token endpoint in this app (JWT is
// stateless, fixed 7-day lifetime — see backend/core-service/auth.py) and no
// new API call is allowed here, so "Compris" only snoozes the warning: it
// does not, and cannot, actually extend the session. "Se reconnecter" sends
// the user to /login proactively, before anything is lost — their form
// drafts (see utils/formDraft.ts) survive that trip.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, X } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { getTokenExpiryMs } from "../utils/jwt";

const WARNING_WINDOW_MS = 2 * 60 * 1000; // 2 minutes
const CHECK_INTERVAL_MS = 10_000;

export default function SessionExpiryBanner() {
  const token = useAuthStore((s) => s.token);
  const navigate = useNavigate();
  const [showWarning, setShowWarning] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(false);
    if (!token) {
      setShowWarning(false);
      return undefined;
    }

    const check = () => {
      const expiryMs = getTokenExpiryMs(token);
      if (expiryMs === null) {
        setShowWarning(false);
        return;
      }
      const remaining = expiryMs - Date.now();
      setShowWarning(remaining > 0 && remaining <= WARNING_WINDOW_MS);
    };

    check();
    const id = window.setInterval(check, CHECK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [token]);

  if (!showWarning || dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[9985] flex justify-center px-4 pt-3"
    >
      <div className="flex w-full max-w-lg items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-lg">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-amber-900">Votre session expire bientôt.</p>
          <p className="mt-0.5 text-sm text-amber-800">
            Enregistrez votre travail. Vous devrez vous reconnecter dans quelques minutes.
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="text-sm font-semibold text-amber-900 underline underline-offset-2 hover:text-amber-950"
            >
              Se reconnecter maintenant
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="text-sm font-medium text-amber-700 hover:text-amber-900"
            >
              Compris
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Fermer cette notification"
          className="shrink-0 rounded-lg p-1 text-amber-500 transition-colors hover:bg-amber-100 hover:text-amber-700"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
