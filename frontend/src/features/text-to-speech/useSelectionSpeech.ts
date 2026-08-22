// CIBLE : cette fonctionnalité s'adresse aux personnes dyslexiques, malvoyantes
// légères, ou ayant des troubles de la concentration — elles voient l'écran et
// sélectionnent du texte. Elle ne s'adresse PAS aux personnes non-voyantes, qui
// utilisent déjà un lecteur d'écran natif (NVDA, VoiceOver) : faire parler la
// page par-dessus leur lecteur produirait deux voix simultanées. Ne jamais
// présenter cette fonctionnalité comme une solution universelle d'accessibilité.
//
// useSelectionSpeech.ts — toute la logique derrière TextToSpeechSelection :
// détection de sélection (souris, clavier, tactile), résolution de langue et
// de voix, lecture via speechManager (priorité "user"), et calcul du Range
// DOM à surligner à chaque `onboundary`. Le composant ne fait que rendre ce
// que ce hook expose.

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { speechManager } from "../../lib/speechManager";
import { loadTtsPrefs, saveTtsPrefs } from "./ttsPrefs";
import { mapRawOffsetToDomRange, normalizeForSpeech } from "./textMapping";
import {
  looksArabic,
  normalizeToSupportedLang,
  readContainerLang,
  type SupportedLang,
} from "./languageDetection";

const SELECTION_DEBOUNCE_MS = 150;
const MIN_SELECTION_LENGTH = 3;
const BUTTON_SIZE = 40;
const BUTTON_MARGIN = 8;

type ButtonPosition = { top: number; left: number; placement: "above" | "below" };

export type UseSelectionSpeechOptions = {
  containerRef: RefObject<HTMLElement | null>;
  lang?: SupportedLang;
  onReadStart?: (text: string) => void;
  onReadEnd?: () => void;
};

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
  } catch {
    return false;
  }
}

export function useSelectionSpeech({ containerRef, lang: langProp, onReadStart, onReadEnd }: UseSelectionSpeechOptions) {
  const supported = speechManager.isSupported;

  const [buttonVisible, setButtonVisible] = useState(false);
  const [buttonPosition, setButtonPosition] = useState<ButtonPosition | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [activeDomRange, setActiveDomRange] = useState<Range | null>(null);

  const [lang, setLangState] = useState<SupportedLang>(langProp ?? "en-US");
  const [langCertain, setLangCertain] = useState(false);
  // Set when a read was attempted but no voice exists for the resolved
  // language — shown near the button even though nothing is "speaking".
  const [blockedLang, setBlockedLang] = useState<SupportedLang | null>(null);

  const prefsRef = useRef(loadTtsPrefs());
  const [rate, setRateState] = useState(prefsRef.current.rate);
  const [selectedVoiceURI, setSelectedVoiceURIState] = useState<string | null>(prefsRef.current.voiceURI);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => speechManager.getVoices());

  const [highlightUserEnabled, setHighlightUserEnabled] = useState(true);
  const reducedMotion = useRef(prefersReducedMotion()).current;
  const highlightForcedOff = reducedMotion;
  const highlightEnabled = highlightUserEnabled && !highlightForcedOff;

  const pendingRangeRef = useRef<Range | null>(null);
  const pendingRawTextRef = useRef<string>("");
  const debounceTimerRef = useRef<number | null>(null);
  const speechHandleRef = useRef<ReturnType<typeof speechManager.speak> | null>(null);
  const buttonElRef = useRef<HTMLButtonElement | null>(null);
  const controlsElRef = useRef<HTMLElement | null>(null);

  // ---------------------------------------------------------------------
  // Voices: keep in sync with speechManager (async on first load).
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!supported) return undefined;
    return speechManager.subscribe(() => {
      setVoices(speechManager.getVoices());
    });
  }, [supported]);

  const voicesForLang = voices.filter((v) => v.lang.toLowerCase().startsWith(lang.split("-")[0].toLowerCase()));

  // ---------------------------------------------------------------------
  // Position helpers
  // ---------------------------------------------------------------------
  const computeButtonPosition = useCallback((range: Range): ButtonPosition | null => {
    const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0 || r.height > 0);
    const boundingRect = range.getBoundingClientRect();
    if (boundingRect.width === 0 && boundingRect.height === 0) return null;
    if (boundingRect.bottom < 0 || boundingRect.top > window.innerHeight) return null; // scrolled out of view

    // Anchored on the END of the selection (bottom-right corner of its last
    // line), not centered above/below the whole block — a centered anchor
    // collides with the native copy/paste bubble some browsers show, and
    // with extensions (Grammarly, etc.) that place their own icon right
    // above/below a selection too. Ending up at a corner, offset further
    // out than those typically reach, avoids the fight for that space.
    const endRect = rects.length > 0 ? rects[rects.length - 1] : boundingRect;
    const OFFSET = 16;

    let placement: "above" | "below" = "below";
    let top = endRect.bottom + OFFSET;
    if (top + BUTTON_SIZE > window.innerHeight - BUTTON_MARGIN) {
      placement = "above";
      top = endRect.top - BUTTON_SIZE - OFFSET;
    }
    top = Math.max(BUTTON_MARGIN, Math.min(top, window.innerHeight - BUTTON_SIZE - BUTTON_MARGIN));

    let left = endRect.right - BUTTON_SIZE / 2;
    left = Math.min(Math.max(left, BUTTON_MARGIN), window.innerWidth - BUTTON_SIZE - BUTTON_MARGIN);

    return { top, left, placement };
  }, []);

  const closeSelectionUi = useCallback(() => {
    setButtonVisible(false);
    setButtonPosition(null);
    setBlockedLang(null);
    pendingRangeRef.current = null;
    pendingRawTextRef.current = "";
  }, []);

  // ---------------------------------------------------------------------
  // Selection detection — selectionchange (mouse + keyboard) and touchend
  // (mobile selection handles don't reliably fire selectionchange in sync
  // with a pointer event we can hook).
  // ---------------------------------------------------------------------
  const evaluateSelection = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const selection = document.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      closeSelectionUi();
      return;
    }
    const anchor = selection.anchorNode;
    const focus = selection.focusNode;
    if (!anchor || !focus || !container.contains(anchor) || !container.contains(focus)) {
      closeSelectionUi();
      return;
    }
    // Never react to a selection made inside the feature's own floating
    // button / controls bar / notices — those are portaled onto
    // document.body too, so a global containerRef would otherwise "see" them.
    const anchorEl = anchor.nodeType === Node.ELEMENT_NODE ? (anchor as Element) : anchor.parentElement;
    if (anchorEl?.closest('[data-tts-ui="true"]')) {
      closeSelectionUi();
      return;
    }

    const range = selection.getRangeAt(0).cloneRange();
    const rawText = range.toString();
    if (rawText.trim().length < MIN_SELECTION_LENGTH) {
      closeSelectionUi();
      return;
    }

    const position = computeButtonPosition(range);
    if (!position) {
      closeSelectionUi();
      return;
    }

    pendingRangeRef.current = range;
    pendingRawTextRef.current = rawText;
    setButtonPosition(position);
    setButtonVisible(true);

    // Resolve language fresh for this selection, unless the caller pinned one.
    if (langProp) {
      setLangState(langProp);
      setLangCertain(true);
    } else {
      const containerLang = normalizeToSupportedLang(readContainerLang(container));
      if (containerLang) {
        setLangState(containerLang);
        setLangCertain(true);
      } else if (looksArabic(rawText)) {
        setLangState("ar-SA");
        setLangCertain(true);
      } else {
        setLangState((prev) => normalizeToSupportedLang(navigator.language) ?? prev ?? "en-US");
        setLangCertain(false);
      }
    }
  }, [containerRef, langProp, computeButtonPosition, closeSelectionUi]);

  useEffect(() => {
    const onSelectionChange = () => {
      if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = window.setTimeout(evaluateSelection, SELECTION_DEBOUNCE_MS);
    };
    document.addEventListener("selectionchange", onSelectionChange);
    const container = containerRef.current;
    container?.addEventListener("touchend", onSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", onSelectionChange);
      container?.removeEventListener("touchend", onSelectionChange);
      if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current);
    };
  }, [containerRef, evaluateSelection]);

  // Reposition on scroll/resize; close if it scrolls out of view.
  useEffect(() => {
    if (!buttonVisible) return undefined;
    const onViewportChange = () => {
      const range = pendingRangeRef.current;
      if (!range) return;
      const position = computeButtonPosition(range);
      if (!position) {
        closeSelectionUi();
        return;
      }
      setButtonPosition(position);
    };
    window.addEventListener("scroll", onViewportChange, { passive: true, capture: true });
    window.addEventListener("resize", onViewportChange, { passive: true });
    return () => {
      window.removeEventListener("scroll", onViewportChange, { capture: true });
      window.removeEventListener("resize", onViewportChange);
    };
  }, [buttonVisible, computeButtonPosition, closeSelectionUi]);

  // Escape + click-outside close the floating button (not the playback bar —
  // that one only goes away via Stop / natural end, per spec).
  useEffect(() => {
    if (!buttonVisible || speaking) return undefined;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSelectionUi();
    };
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (target?.closest?.('[data-tts-ui="true"]')) return; // clicking our own UI
      // A click that lands on real content usually collapses the selection
      // itself (handled by the normal selectionchange path); this only
      // catches the remaining case — a click on chrome that doesn't. Check
      // on the next tick so the browser has updated the selection first.
      window.setTimeout(() => {
        const current = document.getSelection();
        if (!current || current.isCollapsed) closeSelectionUi();
      }, 0);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [buttonVisible, speaking, closeSelectionUi]);

  // ---------------------------------------------------------------------
  // Reading
  // ---------------------------------------------------------------------
  const stopReading = useCallback(() => {
    speechHandleRef.current?.cancel();
    speechHandleRef.current = null;
    setSpeaking(false);
    setPaused(false);
    setActiveDomRange(null);
  }, []);

  /** Shared reading engine — both "read the selection" and "read the whole
   * block" funnel through here, so they share one state machine, one
   * controls bar, one highlight overlay. */
  const readRange = useCallback(
    (range: Range, rawText: string, langOverride?: SupportedLang) => {
      if (!supported || !rawText.trim()) return;

      const { text: spokenText, toRawIndex } = normalizeForSpeech(rawText);
      if (!spokenText) return;

      // Never trust the `lang`/`voices` closures alone here: a caller may
      // have just resolved a language synchronously (readContainer) in the
      // same tick as this call, before React re-renders with it — using an
      // explicit override keeps that case correct instead of racing state.
      const effectiveLang = langOverride ?? lang;
      const effectiveVoicesForLang = voices.filter((v) =>
        v.lang.toLowerCase().startsWith(effectiveLang.split("-")[0].toLowerCase())
      );

      if (effectiveVoicesForLang.length === 0) {
        if (voices.length === 0) {
          // Nothing has loaded from the browser at all yet — very first
          // paint, before `voiceschanged` fires. Rather than falsely
          // accusing a language of having no voice, just stay quiet; the
          // next click (after voices arrive) will resolve correctly.
          return;
        }
        // Voices ARE loaded, and genuinely none match — refuse to speak
        // rather than let the engine silently fall back to whatever default
        // voice it has (e.g. reading Arabic with a French voice, which is
        // unintelligible and explicitly forbidden here). Surface it instead.
        setBlockedLang(effectiveLang);
        return;
      }
      setBlockedLang(null);

      const voice =
        (langOverride ? undefined : voices.find((v) => v.voiceURI === selectedVoiceURI)) ??
        effectiveVoicesForLang[0] ??
        null;

      const handle = speechManager.speak(spokenText, {
        lang: effectiveLang,
        rate,
        voice,
        priority: "user",
        onStart: () => {
          setSpeaking(true);
          setPaused(false);
          onReadStart?.(spokenText);
        },
        onEnd: () => {
          setSpeaking(false);
          setPaused(false);
          setActiveDomRange(null);
          onReadEnd?.();
        },
        onError: () => {
          setSpeaking(false);
          setPaused(false);
          setActiveDomRange(null);
        },
        onInterrupted: () => {
          // A Shadow Guide announcement took over — go quiet without pretending
          // we're still reading.
          setSpeaking(false);
          setPaused(false);
          setActiveDomRange(null);
        },
        onBoundary: (info) => {
          if (!highlightEnabled) return;
          const rawIndex = toRawIndex[info.charIndex];
          if (rawIndex === undefined) return;
          const rawLengthEnd = toRawIndex[info.charIndex + (info.charLength ?? 1)];
          const rawLength = rawLengthEnd !== undefined ? rawLengthEnd - rawIndex : info.charLength ?? 1;
          const domRange = mapRawOffsetToDomRange(range, rawIndex, Math.max(rawLength, 1));
          setActiveDomRange(domRange);
        },
      });

      if (handle.status === "rejected") return;
      speechHandleRef.current = handle;
      setButtonVisible(false);
    },
    [supported, voices, selectedVoiceURI, voicesForLang, lang, rate, highlightEnabled, onReadStart, onReadEnd]
  );

  const startReading = useCallback(() => {
    const range = pendingRangeRef.current;
    const rawText = pendingRawTextRef.current;
    if (!range) return;
    readRange(range, rawText);
  }, [readRange]);

  /** For the "Lire la description" discoverability button — reads the
   * entire container, no selection required. */
  const readContainer = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const range = document.createRange();
    range.selectNodeContents(container);
    const rawText = range.toString();
    if (!rawText.trim()) return;

    let resolvedLang: SupportedLang;
    let certain: boolean;
    if (langProp) {
      resolvedLang = langProp;
      certain = true;
    } else {
      const containerLang = normalizeToSupportedLang(readContainerLang(container));
      if (containerLang) {
        resolvedLang = containerLang;
        certain = true;
      } else if (looksArabic(rawText)) {
        resolvedLang = "ar-SA";
        certain = true;
      } else {
        resolvedLang = normalizeToSupportedLang(navigator.language) ?? lang;
        certain = false;
      }
    }
    setLangState(resolvedLang);
    setLangCertain(certain);
    readRange(range, rawText, resolvedLang);
  }, [containerRef, langProp, lang, readRange]);

  const pauseResume = useCallback(() => {
    if (paused) {
      speechManager.resume();
      setPaused(false);
    } else {
      speechManager.pause();
      setPaused(true);
    }
  }, [paused]);

  // Alt+L reads the current selection directly, without needing the button.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "l" || e.key === "L") && pendingRangeRef.current) {
        e.preventDefault();
        startReading();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [startReading]);

  // Stop any reading when the component unmounts (route change, etc.).
  useEffect(() => stopReading, [stopReading]);

  const setRate = useCallback((next: number) => {
    setRateState(next);
    const prefs = { ...prefsRef.current, rate: next };
    prefsRef.current = prefs;
    saveTtsPrefs(prefs);
  }, []);

  const setVoiceURI = useCallback((uri: string) => {
    setSelectedVoiceURIState(uri);
    const prefs = { ...prefsRef.current, voiceURI: uri };
    prefsRef.current = prefs;
    saveTtsPrefs(prefs);
  }, []);

  const setLang = useCallback((next: SupportedLang) => {
    setLangState(next);
    setLangCertain(true);
  }, []);

  const toggleHighlight = useCallback(() => {
    if (highlightForcedOff) return;
    setHighlightUserEnabled((v) => !v);
  }, [highlightForcedOff]);

  return {
    supported,
    buttonVisible,
    buttonPosition,
    buttonElRef,
    controlsElRef,
    startReading,
    readContainer,
    speaking,
    paused,
    pauseResume,
    stop: stopReading,
    rate,
    setRate,
    highlightEnabled,
    highlightForcedOff,
    toggleHighlight,
    activeDomRange,
    lang,
    setLang,
    showLangSelector: !langCertain && !langProp,
    voices: voicesForLang,
    selectedVoiceURI,
    setVoiceURI,
    blockedLang,
    rtl: lang === "ar-SA",
  };
}

export default useSelectionSpeech;
