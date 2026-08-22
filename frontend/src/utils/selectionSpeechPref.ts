// selectionSpeechPref.ts
//
// Persistence + reactive read for the "Lecture par sélection" toggle in
// AccessibilityWidget.tsx — off by default, like every other option in that
// widget. When on, TextToSpeechSelection is mounted once, globally
// (containerRef = document.body), so selecting >= 3 characters anywhere on
// the site offers to read it aloud. Same pattern as utils/focusMode.ts:
// dedicated storage key, tiny event bus, safe no-op if storage is
// unavailable.

import { useEffect, useState } from "react";

const STORAGE_KEY = "ij_a11y_selection_speech";
const CHANGE_EVENT = "ij-selection-speech-change";

export function getSelectionSpeechEnabled(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setSelectionSpeechEnabled(enabled: boolean): void {
  try {
    if (enabled) window.localStorage.setItem(STORAGE_KEY, "1");
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Non-persisted this session — the toggle itself still works below.
  }
  try {
    window.dispatchEvent(new CustomEvent<boolean>(CHANGE_EVENT, { detail: enabled }));
  } catch {
    // CustomEvent unsupported — extremely old browsers only; no-op.
  }
}

export function useSelectionSpeechEnabled(): boolean {
  const [enabled, setEnabled] = useState(getSelectionSpeechEnabled);
  useEffect(() => {
    const handler = (event: Event) => setEnabled(Boolean((event as CustomEvent<boolean>).detail));
    window.addEventListener(CHANGE_EVENT, handler);
    return () => window.removeEventListener(CHANGE_EVENT, handler);
  }, []);
  return enabled;
}
