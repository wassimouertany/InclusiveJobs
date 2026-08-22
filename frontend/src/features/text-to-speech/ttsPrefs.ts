// CIBLE : cette fonctionnalité s'adresse aux personnes dyslexiques, malvoyantes
// légères, ou ayant des troubles de la concentration — elles voient l'écran et
// sélectionnent du texte. Elle ne s'adresse PAS aux personnes non-voyantes, qui
// utilisent déjà un lecteur d'écran natif (NVDA, VoiceOver) : faire parler la
// page par-dessus leur lecteur produirait deux voix simultanées. Ne jamais
// présenter cette fonctionnalité comme une solution universelle d'accessibilité.
//
// ttsPrefs.ts — persistance de la vitesse et de la voix choisies, dans
// localStorage sous "ij_tts_prefs". Aucune donnée sensible ici (juste un
// nombre et un identifiant de voix système) : localStorage est approprié.
// Try/catch systématique — indisponible = l'app fonctionne quand même, sans
// se souvenir du choix.

const STORAGE_KEY = "ij_tts_prefs";

export type TtsPrefs = {
  rate: number;
  voiceURI: string | null;
};

const DEFAULT_PREFS: TtsPrefs = { rate: 1, voiceURI: null };

export function loadTtsPrefs(): TtsPrefs {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw);
    return {
      rate: typeof parsed?.rate === "number" ? parsed.rate : DEFAULT_PREFS.rate,
      voiceURI: typeof parsed?.voiceURI === "string" ? parsed.voiceURI : null,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function saveTtsPrefs(prefs: TtsPrefs): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Quota exceeded / storage disabled — the choice just isn't remembered.
  }
}
