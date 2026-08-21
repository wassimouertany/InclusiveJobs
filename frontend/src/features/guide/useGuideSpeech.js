// useGuideSpeech.js
//
// Lecture à voix haute d'une étape via l'API SpeechSynthesis du navigateur
// (voix française — lang "fr-FR"), plus le toggle "langage simplifié" qui
// bascule entre `step.body` et `step.body_simple` dans tours.config.js. La
// préférence est persistée via guideStorage (seul point d'écriture).
//
// Dégradation silencieuse : si `window.speechSynthesis` n'existe pas
// (navigateur non supporté, contexte non sécurisé), `supported` vaut false et
// `speak()` ne fait rien — aucune erreur, aucun bouton cassé.
//
// Note : le widget d'accessibilité existant (AccessibilityWidget.tsx) n'a pas
// de "mode vocal" à ce jour, donc rien ne déclenche `speak()` automatiquement
// depuis lui. Le bouton "Écouter cette étape" reste une action manuelle.

import { useCallback, useEffect, useRef, useState } from "react";
import { getSimplifiedLanguage, setSimplifiedLanguage } from "./guideStorage";

const SPEECH_LANG = "fr-FR";

function speechSupported() {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof window.SpeechSynthesisUtterance === "function"
  );
}

export function useGuideSpeech(resetKey) {
  const supported = speechSupported();
  const [speaking, setSpeaking] = useState(false);
  const [simplified, setSimplified] = useState(() => {
    try {
      return getSimplifiedLanguage();
    } catch {
      return false;
    }
  });
  const utteranceRef = useRef(null);

  const stop = useCallback(() => {
    if (!supported) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Some browsers throw when cancelling with nothing queued — ignore.
    }
    setSpeaking(false);
  }, [supported]);

  const speak = useCallback(
    (text) => {
      if (!supported || !text || !text.trim()) return;
      try {
        window.speechSynthesis.cancel();
        const utterance = new window.SpeechSynthesisUtterance(text);
        utterance.lang = SPEECH_LANG;
        utterance.onend = () => setSpeaking(false);
        utterance.onerror = () => setSpeaking(false);
        utteranceRef.current = utterance;
        setSpeaking(true);
        window.speechSynthesis.speak(utterance);
      } catch {
        setSpeaking(false);
      }
    },
    [supported]
  );

  const toggleSimplified = useCallback(() => {
    setSimplified((prev) => {
      const next = !prev;
      try {
        setSimplifiedLanguage(next);
      } catch {
        // Non-persisted but still applied for the current session.
      }
      return next;
    });
  }, []);

  // Stop any ongoing narration whenever the step changes.
  useEffect(() => {
    stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  // Stop on unmount (tour closed, page navigated away from).
  useEffect(() => stop, [stop]);

  return { supported, speaking, speak, stop, simplified, toggleSimplified };
}

export default useGuideSpeech;
