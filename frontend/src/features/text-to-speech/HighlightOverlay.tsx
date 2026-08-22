// CIBLE : cette fonctionnalité s'adresse aux personnes dyslexiques, malvoyantes
// légères, ou ayant des troubles de la concentration — elles voient l'écran et
// sélectionnent du texte. Elle ne s'adresse PAS aux personnes non-voyantes, qui
// utilisent déjà un lecteur d'écran natif (NVDA, VoiceOver) : faire parler la
// page par-dessus leur lecteur produirait deux voix simultanées. Ne jamais
// présenter cette fonctionnalité comme une solution universelle d'accessibilité.
//
// HighlightOverlay.tsx — surligne le mot en cours de lecture.
// Préfère l'API CSS Custom Highlight (CSS.highlights) quand disponible : le
// navigateur peint directement dans le rendu existant, aucune modification
// du DOM du conteneur. Si l'API n'existe pas, replie sur des rectangles
// positionnés en `fixed` (mêmes coordonnées que `range.getClientRects()`),
// rendus dans un portail — jamais un <span> injecté dans le conteneur, ça
// casserait la sélection de l'utilisateur.
//
// Entièrement désactivé (pas juste "sans transition") si
// prefers-reduced-motion: reduce ou si l'utilisateur l'a coupé — c'est ce
// que demande la spec, pas une simple dégradation visuelle.

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getRangeViewportRects } from "./textMapping";

const HIGHLIGHT_NAME = "ij-tts-word";

function supportsCustomHighlight(): boolean {
  try {
    return typeof CSS !== "undefined" && "highlights" in CSS && typeof (window as any).Highlight === "function";
  } catch {
    return false;
  }
}

type Props = {
  /** The current word's live DOM Range, or null between words / when idle. */
  activeDomRange: Range | null;
  /** Master switch — reduced-motion or an explicit user opt-out both map here. */
  enabled: boolean;
};

export default function HighlightOverlay({ activeDomRange, enabled }: Props) {
  const customHighlightSupported = useRef(supportsCustomHighlight());
  const [fallbackRects, setFallbackRects] = useState<DOMRect[]>([]);

  useEffect(() => {
    const clearCustomHighlight = () => {
      if (!customHighlightSupported.current) return;
      try {
        (CSS as any).highlights.delete(HIGHLIGHT_NAME);
      } catch {
        // ignore
      }
    };

    if (!enabled || !activeDomRange) {
      clearCustomHighlight();
      setFallbackRects([]);
      return;
    }

    if (customHighlightSupported.current) {
      try {
        const HighlightCtor = (window as any).Highlight;
        const highlight = new HighlightCtor(activeDomRange);
        (CSS as any).highlights.set(HIGHLIGHT_NAME, highlight);
        setFallbackRects([]);
        return;
      } catch {
        // Fall through to the rect-based overlay below.
      }
    }
    setFallbackRects(getRangeViewportRects(activeDomRange));
  }, [activeDomRange, enabled]);

  useEffect(() => {
    return () => {
      if (!customHighlightSupported.current) return;
      try {
        (CSS as any).highlights.delete(HIGHLIGHT_NAME);
      } catch {
        // ignore
      }
    };
  }, []);

  if (customHighlightSupported.current || !enabled || fallbackRects.length === 0) return null;

  return createPortal(
    <>
      {fallbackRects.map((rect, i) => (
        <span
          key={i}
          aria-hidden="true"
          style={{
            position: "fixed",
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            background: "rgba(13, 148, 136, 0.28)",
            borderBottom: "2px solid #0D9488",
            pointerEvents: "none",
            zIndex: 9970,
          }}
        />
      ))}
    </>,
    document.body
  );
}
