// magnifierPref.ts
//
// Persistence + reactive read/write for the Screen Magnifier (see
// features/magnifier/ScreenMagnifier.tsx): on/off, zoom level (150-400%,
// step 50, default 200), and the "dim the rest of the page" option (default
// off, like every other option in AccessibilityWidget.tsx). Same pattern as
// focusMode.ts / selectionSpeechPref.ts: one storage key, one tiny event
// bus, every localStorage access wrapped in its own try/catch so a full
// quota or storage disabled by policy never breaks the app — the magnifier
// just falls back to defaults, not persisted, for that session.

import { useEffect, useState } from "react";

const STORAGE_KEY = "ij_magnifier";
const CHANGE_EVENT = "ij-magnifier-change";

export const MAGNIFIER_ZOOM_MIN = 150;
export const MAGNIFIER_ZOOM_MAX = 400;
export const MAGNIFIER_ZOOM_STEP = 50;
export const MAGNIFIER_ZOOM_DEFAULT = 200;

export type MagnifierPrefs = {
  enabled: boolean;
  zoom: number;
  dimBackground: boolean;
};

const DEFAULT_PREFS: MagnifierPrefs = {
  enabled: false,
  zoom: MAGNIFIER_ZOOM_DEFAULT,
  dimBackground: false,
};

function clampZoom(value: number): number {
  if (!Number.isFinite(value)) return MAGNIFIER_ZOOM_DEFAULT;
  const stepped = Math.round(value / MAGNIFIER_ZOOM_STEP) * MAGNIFIER_ZOOM_STEP;
  return Math.min(MAGNIFIER_ZOOM_MAX, Math.max(MAGNIFIER_ZOOM_MIN, stepped));
}

export function getMagnifierPrefs(): MagnifierPrefs {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw);
    return {
      enabled: Boolean(parsed.enabled),
      zoom: clampZoom(Number(parsed.zoom)),
      dimBackground: Boolean(parsed.dimBackground),
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function setMagnifierPrefs(patch: Partial<MagnifierPrefs>): MagnifierPrefs {
  const current = getMagnifierPrefs();
  const merged = { ...current, ...patch };
  const next: MagnifierPrefs = { ...merged, zoom: clampZoom(merged.zoom) };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Not persisted this session — the toggle itself still works below.
  }
  try {
    window.dispatchEvent(new CustomEvent<MagnifierPrefs>(CHANGE_EVENT, { detail: next }));
  } catch {
    // CustomEvent unsupported — extremely old browsers only; no-op.
  }
  return next;
}

/** Subscribe to magnifier pref changes fired from anywhere. */
export function onMagnifierPrefsChange(listener: (prefs: MagnifierPrefs) => void): () => void {
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<MagnifierPrefs>).detail;
    if (detail) listener(detail);
  };
  window.addEventListener(CHANGE_EVENT, handler);
  return () => window.removeEventListener(CHANGE_EVENT, handler);
}

/** Reactive read/write — both AccessibilityWidget and ScreenMagnifier share
 * this so the widget's controls and the engine's own keyboard shortcuts
 * (Alt+Z, Alt+/Alt-) stay in sync without prop-drilling. */
export function useMagnifierPrefs(): [MagnifierPrefs, (patch: Partial<MagnifierPrefs>) => void] {
  const [prefs, setPrefs] = useState<MagnifierPrefs>(getMagnifierPrefs);
  useEffect(() => onMagnifierPrefsChange(setPrefs), []);
  return [prefs, setMagnifierPrefs];
}
