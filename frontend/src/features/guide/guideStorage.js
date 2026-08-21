// guideStorage.js
//
// SEUL point de persistance de la feature "Shadow Guide". Tout ce qui doit
// survivre à un rechargement (progression de la visite, préférence de langage
// simplifié, compteurs anti-agacement de l'aide contextuelle) passe par ce
// module et par lui seul — personne d'autre dans features/guide/ ne touche à
// localStorage directement.
//
// Stockage : une seule clé JSON versionnée, "ij_guide_v1". Chaque lecture et
// chaque écriture est entourée d'un try/catch : navigation privée, quota
// plein, ou tout simplement pas de `localStorage` (SSR, environnement de
// test) ne doivent jamais faire planter l'app. Dans ce cas, la progression du
// guide n'est simplement pas mémorisée d'une session à l'autre.

import { TOURS } from "./tours.config";

const STORAGE_KEY = "ij_guide_v1";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function defaultRoot() {
  return {
    schemaVersion: 1,
    simplifiedLanguage: false,
    prefs: { blockageHelpOptOut: false },
    blockage: {},
    tours: {},
  };
}

function safeParseObject(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
  } catch {
    // Malformed JSON (corrupted write, manual tampering, older incompatible
    // shape) — treat as absent rather than throwing.
  }
  return null;
}

function readRoot() {
  try {
    if (typeof window === "undefined" || !window.localStorage) return defaultRoot();
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultRoot();
    const parsed = safeParseObject(raw);
    if (!parsed) return defaultRoot();
    const base = defaultRoot();
    return {
      ...base,
      ...parsed,
      prefs: { ...base.prefs, ...(parsed.prefs || {}) },
      blockage: { ...(parsed.blockage || {}) },
      tours: { ...(parsed.tours || {}) },
    };
  } catch {
    return defaultRoot();
  }
}

function writeRoot(root) {
  try {
    if (typeof window === "undefined" || !window.localStorage) return false;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(root));
    return true;
  } catch {
    // Quota exceeded, private-mode Safari, storage disabled by policy… the
    // guide degrades to "doesn't remember anything", never to a crash.
    return false;
  }
}

function tourVersion(tourId) {
  return TOURS[tourId]?.version ?? 1;
}

function freshProgress(tourId) {
  return {
    version: tourVersion(tourId),
    status: "not_started", // "not_started" | "in_progress" | "completed" | "dismissed"
    stepIndex: 0,
    completedStepIds: [],
  };
}

// ---------------------------------------------------------------------------
// Core API (per spec)
// ---------------------------------------------------------------------------

/** Reads a tour's progress. Auto-resets to a fresh state if the stored
 * progress belongs to an older tour version (steps changed shape/order). */
export function getProgress(tourId) {
  const root = readRoot();
  const stored = root.tours?.[tourId];
  const currentVersion = tourVersion(tourId);
  if (!stored || typeof stored.version !== "number" || stored.version < currentVersion) {
    return freshProgress(tourId);
  }
  return {
    version: stored.version,
    status: typeof stored.status === "string" ? stored.status : "not_started",
    stepIndex: typeof stored.stepIndex === "number" ? stored.stepIndex : 0,
    completedStepIds: Array.isArray(stored.completedStepIds) ? stored.completedStepIds : [],
  };
}

/** Merges `patch` into the stored progress for `tourId`, stamping it with the
 * tour's current version. Returns the resulting progress object. */
export function setProgress(tourId, patch) {
  const root = readRoot();
  const current = getProgress(tourId); // already version-checked / reset if stale
  const next = { ...current, ...patch, version: tourVersion(tourId) };
  root.tours = { ...root.tours, [tourId]: next };
  writeRoot(root);
  return next;
}

/** Wipes a tour's progress entirely so it starts from step 0 next time. */
export function resetTour(tourId) {
  const root = readRoot();
  const tours = { ...(root.tours || {}) };
  delete tours[tourId];
  root.tours = tours;
  writeRoot(root);
}

/** True once the user has finished the tour or explicitly skipped it. */
export function isDismissed(tourId) {
  const { status } = getProgress(tourId);
  return status === "dismissed" || status === "completed";
}

/** Marks a tour as skipped so it won't auto-start again on its own. */
export function dismiss(tourId) {
  return setProgress(tourId, { status: "dismissed" });
}

/** Tracks a step as visited (used by GuideChecklist to render check marks). */
export function markStepCompleted(tourId, stepId) {
  const current = getProgress(tourId);
  if (current.completedStepIds.includes(stepId)) return current;
  return setProgress(tourId, {
    completedStepIds: [...current.completedStepIds, stepId],
  });
}

// ---------------------------------------------------------------------------
// Shared preferences (still routed through this single storage gateway)
// ---------------------------------------------------------------------------

/** "Langage simplifié" toggle — shared across tours, read by useGuideSpeech. */
export function getSimplifiedLanguage() {
  return readRoot().simplifiedLanguage === true;
}

export function setSimplifiedLanguage(value) {
  const root = readRoot();
  root.simplifiedLanguage = value === true;
  writeRoot(root);
}

/** "Ne plus me proposer d'aide" — opts out of useBlockageDetector entirely. */
export function getBlockageOptOut() {
  return readRoot().prefs?.blockageHelpOptOut === true;
}

export function setBlockageOptOut(value) {
  const root = readRoot();
  root.prefs = { ...root.prefs, blockageHelpOptOut: value === true };
  writeRoot(root);
}

/** Per-blockage-type anti-agacement counters used by useBlockageDetector. */
export function getBlockageState(type) {
  const stored = readRoot().blockage?.[type];
  return {
    dismissCount: typeof stored?.dismissCount === "number" ? stored.dismissCount : 0,
    disabledUntil: typeof stored?.disabledUntil === "string" ? stored.disabledUntil : null,
  };
}

/** Call when the user closes a blockage bubble. After 2 dismissals for the
 * same type, that type goes quiet for 7 days. */
export function recordBlockageDismissal(type) {
  const root = readRoot();
  const current = getBlockageState(type);
  const dismissCount = current.dismissCount + 1;
  const disabledUntil =
    dismissCount >= 2 ? new Date(Date.now() + SEVEN_DAYS_MS).toISOString() : current.disabledUntil;
  root.blockage = { ...root.blockage, [type]: { dismissCount, disabledUntil } };
  writeRoot(root);
}

export function isBlockageTypeCoolingDown(type) {
  const { disabledUntil } = getBlockageState(type);
  if (!disabledUntil) return false;
  try {
    return new Date(disabledUntil).getTime() > Date.now();
  } catch {
    return false;
  }
}

export const GUIDE_STORAGE_KEY = STORAGE_KEY;
