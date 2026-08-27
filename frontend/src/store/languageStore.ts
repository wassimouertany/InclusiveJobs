// languageStore.ts
//
// Minimal app-wide UI language, mirroring the useAuthStore pattern
// (zustand + persist + a hand-written PersistStorage over a single key).
// Every storage access is wrapped in try/catch: private browsing or a
// storage-disabled policy must never crash the app — the language just falls
// back to "EN, not remembered".
//
// Scope note: nothing else in the app reads this store yet. The Navbar's
// EN/FR/AR switcher still owns its own local useState — see the report.

import { create } from "zustand";
import { persist, type PersistStorage } from "zustand/middleware";
import { Language } from "../types";

export const LANGUAGE_KEY = "inclusivejobs_lang";

type LanguageState = {
  lang: Language;
  setLang: (lang: Language) => void;
};

type PersistedLanguageState = Pick<LanguageState, "lang">;

function isLanguage(value: unknown): value is Language {
  return value === Language.EN || value === Language.FR || value === Language.AR;
}

const languageStorage: PersistStorage<PersistedLanguageState> = {
  getItem: () => {
    try {
      const raw = localStorage.getItem(LANGUAGE_KEY);
      if (!isLanguage(raw)) return null;
      return { state: { lang: raw }, version: 0 };
    } catch {
      return null;
    }
  },
  setItem: (_name, value) => {
    try {
      localStorage.setItem(LANGUAGE_KEY, value.state.lang);
    } catch {
      // Not persisted this session — the in-memory language still works.
    }
  },
  removeItem: () => {
    try {
      localStorage.removeItem(LANGUAGE_KEY);
    } catch {
      // Nothing to clean up if storage is unavailable.
    }
  },
};

export const useLanguageStore = create<LanguageState>()(
  persist<LanguageState, [], [], PersistedLanguageState>(
    (set) => ({
      lang: Language.EN,
      setLang: (lang) => set({ lang }),
    }),
    {
      name: "inclusivejobs-language",
      storage: languageStorage,
      partialize: (state) => ({ lang: state.lang }),
    },
  ),
);
