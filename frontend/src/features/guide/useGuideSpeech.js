// useGuideSpeech.js
//
// Lecture à voix haute d'une étape du Shadow Guide (voix française —
// lang "fr-FR"), plus le toggle "langage simplifié" qui bascule entre
// `step.body` et `step.body_simple` dans tours.config.js. La préférence est
// persistée via guideStorage (seul point d'écriture).
//
// Passe entièrement par lib/speechManager.ts, avec priorité "system" — une
// lecture du guide interrompt proprement une lecture par sélection en cours
// (voir features/text-to-speech/), jamais l'inverse. Ce fichier n'appelle
// plus jamais `window.speechSynthesis` directement.
//
// Dégradation silencieuse : si la synthèse vocale n'est pas supportée par le
// navigateur, `supported` vaut false et `speak()` ne fait rien — aucune
// erreur, aucun bouton cassé.
//
// Note : le widget d'accessibilité existant (AccessibilityWidget.tsx) n'a pas
// de "mode vocal" à ce jour, donc rien ne déclenche `speak()` automatiquement
// depuis lui. Le bouton "Écouter cette étape" reste une action manuelle.

import { useCallback, useEffect, useRef, useState } from "react";
import { getSimplifiedLanguage, setSimplifiedLanguage } from "./guideStorage";
import { speechManager } from "../../lib/speechManager";

const SPEECH_LANG = "fr-FR";

export function useGuideSpeech(resetKey) {
  const supported = speechManager.isSupported;
  const [speaking, setSpeaking] = useState(false);
  const [simplified, setSimplified] = useState(() => {
    try {
      return getSimplifiedLanguage();
    } catch {
      return false;
    }
  });
  const handleRef = useRef(null);

  const stop = useCallback(() => {
    handleRef.current?.cancel();
    handleRef.current = null;
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text) => {
      if (!supported || !text || !text.trim()) return;
      const handle = speechManager.speak(text, {
        lang: SPEECH_LANG,
        priority: "system",
        onEnd: () => setSpeaking(false),
        onError: () => setSpeaking(false),
      });
      if (handle.status === "rejected") {
        setSpeaking(false);
        return;
      }
      handleRef.current = handle;
      setSpeaking(true);
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
