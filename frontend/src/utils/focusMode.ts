// focusMode.ts
//
// Persistence + cross-component notification for the "Mode Focus" toggle in
// AccessibilityWidget.tsx. None of the widget's other options are persisted
// today (see AccessibilityWidget.tsx — plain useState, no storage at all),
// so this is deliberately self-contained: its own storage key, its own tiny
// event bus. Toggling Focus Mode never touches how the other 16 options
// behave.
//
// Every read/write is wrapped in try/catch: private browsing, a full quota,
// or storage disabled by policy must never crash the app — Focus Mode just
// falls back to "off, not remembered" in that case.

import { useEffect, useState } from "react";

const STORAGE_KEY = "ij_a11y_focus_mode";
const CHANGE_EVENT = "ij-focus-mode-change";
export const FOCUS_MODE_BODY_CLASS = "ij-focus-mode";

export function getFocusModeEnabled(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setFocusModeEnabled(enabled: boolean): void {
  try {
    if (enabled) window.localStorage.setItem(STORAGE_KEY, "1");
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Non-persisted this session — the toggle itself still works below.
  }
  try {
    document.body.classList.toggle(FOCUS_MODE_BODY_CLASS, enabled);
  } catch {
    // Defensive — document should always exist in this SPA, but never crash.
  }
  try {
    window.dispatchEvent(new CustomEvent<boolean>(CHANGE_EVENT, { detail: enabled }));
  } catch {
    // CustomEvent unsupported — extremely old browsers only; no-op.
  }
}

/** Subscribe to Focus Mode changes fired from anywhere (e.g. AccessibilityWidget). */
export function onFocusModeChange(listener: (enabled: boolean) => void): () => void {
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<boolean>).detail;
    listener(Boolean(detail));
  };
  window.addEventListener(CHANGE_EVENT, handler);
  return () => window.removeEventListener(CHANGE_EVENT, handler);
}

/** Reactive read of Focus Mode — any component can ask "is Focus Mode on?"
 * without owning the toggle itself (used by the Shadow Guide, and by any
 * page that swaps a decorative element for a plainer one in Focus Mode). */
export function useFocusMode(): boolean {
  const [enabled, setEnabled] = useState(getFocusModeEnabled);
  useEffect(() => onFocusModeChange(setEnabled), []);
  return enabled;
}
