// CIBLE : cette fonctionnalité s'adresse aux personnes dyslexiques, malvoyantes
// légères, ou ayant des troubles de la concentration — elles voient l'écran et
// sélectionnent du texte. Elle ne s'adresse PAS aux personnes non-voyantes, qui
// utilisent déjà un lecteur d'écran natif (NVDA, VoiceOver) : faire parler la
// page par-dessus leur lecteur produirait deux voix simultanées. Ne jamais
// présenter cette fonctionnalité comme une solution universelle d'accessibilité.
//
// MissingVoiceNotice.tsx — message honnête affiché quand aucune voix n'est
// installée pour la langue demandée (cas fréquent pour l'arabe sous
// Windows). On ne lit JAMAIS dans cette langue avec une mauvaise voix — voir
// le blocage dans useSelectionSpeech.ts — ce message explique pourquoi rien
// ne se passe, au lieu de laisser l'utilisateur croire que le bouton est cassé.

import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { LANG_LABELS, type SupportedLang } from "./languageDetection";

function isWindows(): boolean {
  try {
    return navigator.platform?.toLowerCase().includes("win") === true;
  } catch {
    return false;
  }
}

export default function MissingVoiceNotice({
  lang,
  anchor,
}: {
  lang: SupportedLang;
  /** Position it near the floating button when one triggered the read;
   * falls back to a fixed bottom-center placement for the "Lire la
   * description" button, which lives wherever the host page put it. */
  anchor: { top: number; left: number } | null;
}) {
  const style: CSSProperties = anchor
    ? { position: "fixed", top: anchor.top, left: anchor.left, zIndex: 9970 }
    : {};
  const className = anchor
    ? "w-64 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-snug text-amber-800 shadow-lg"
    : "fixed inset-x-0 bottom-4 z-[9970] mx-auto w-fit max-w-[calc(100vw-2rem)] rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-snug text-amber-800 shadow-lg";

  return createPortal(
    <div role="status" data-tts-ui="true" style={style} className={className}>
      Aucune voix {LANG_LABELS[lang]} n'est installée sur cet appareil — la lecture dans cette langue
      n'est pas disponible ici.{" "}
      {isWindows() ? (
        <a href="ms-settings:speech" className="font-semibold underline underline-offset-2">
          Ouvrir les paramètres vocaux
        </a>
      ) : (
        "Ajoutez-en une depuis les réglages d'accessibilité de votre système."
      )}
    </div>,
    document.body
  );
}
