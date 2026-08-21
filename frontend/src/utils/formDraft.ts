// formDraft.ts
//
// Local drafts for long forms (CV/profile, job offer publishing) so nothing
// is lost to an accidental reload or a session expiring mid-form.
//
// Privacy constraint, non-negotiable: fields about disability, specific
// needs, health, or CV content must NEVER reach localStorage. Callers pass
// `{ sensitive: true }` for those — the draft then goes to sessionStorage
// only (cleared on submit and on logout), never localStorage. Neutral
// fields (job title, city, sector…) may use `{ sensitive: false }`
// (default) and persist in localStorage across sessions.
//
// Every read/write is wrapped in try/catch — a disabled/full storage means
// "the draft silently isn't saved", never a crash.

const PREFIX = "ij_draft_";

type DraftOptions = { sensitive?: boolean };

function storageFor(sensitive: boolean): Storage | null {
  try {
    return sensitive ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

export function saveDraft(key: string, data: unknown, options: DraftOptions = {}): void {
  const storage = storageFor(options.sensitive === true);
  if (!storage) return;
  try {
    storage.setItem(PREFIX + key, JSON.stringify({ savedAt: Date.now(), data }));
  } catch {
    // Quota exceeded or storage disabled — the draft just isn't saved.
  }
}

export function loadDraft<T>(key: string, options: DraftOptions = {}): T | null {
  const storage = storageFor(options.sensitive === true);
  if (!storage) return null;
  try {
    const raw = storage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data?: T } | null;
    return parsed && "data" in parsed ? (parsed.data as T) : null;
  } catch {
    return null;
  }
}

export function clearDraft(key: string, options: DraftOptions = {}): void {
  const storage = storageFor(options.sensitive === true);
  if (!storage) return;
  try {
    storage.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
}

/** Wipes every sensitive (sessionStorage) draft — called on logout. Neutral
 * localStorage drafts are left alone: they carry no health/disability data,
 * so there's no privacy reason to erase them when signing out. */
export function clearAllSensitiveDrafts(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const k = window.sessionStorage.key(i);
      if (k && k.startsWith(PREFIX)) keysToRemove.push(k);
    }
    keysToRemove.forEach((k) => window.sessionStorage.removeItem(k));
  } catch {
    // ignore
  }
}
