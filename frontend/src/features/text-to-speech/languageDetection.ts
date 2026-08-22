// CIBLE : cette fonctionnalité s'adresse aux personnes dyslexiques, malvoyantes
// légères, ou ayant des troubles de la concentration — elles voient l'écran et
// sélectionnent du texte. Elle ne s'adresse PAS aux personnes non-voyantes, qui
// utilisent déjà un lecteur d'écran natif (NVDA, VoiceOver) : faire parler la
// page par-dessus leur lecteur produirait deux voix simultanées. Ne jamais
// présenter cette fonctionnalité comme une solution universelle d'accessibilité.
//
// languageDetection.ts — ne devine JAMAIS entre français et anglais (trop peu
// fiable pour ne pas se planter). Ordre de résolution :
//   1. attribut `lang` explicite le plus proche du conteneur (fiable, posé
//      par l'auteur du contenu)
//   2. plage Unicode arabe sur le texte sélectionné lui-même (fiable — les
//      alphabets ne se chevauchent pas)
//   3. sinon : incertain → le composant doit proposer un sélecteur, jamais
//      choisir à la place de l'utilisateur

export type SupportedLang = "fr-FR" | "en-US" | "ar-SA";

export const SUPPORTED_LANGS: SupportedLang[] = ["fr-FR", "en-US", "ar-SA"];

const ARABIC_RANGE = /[؀-ۿ]/;

/** Nearest ancestor `lang` attribute, if any — the one honest source of
 * truth we don't need to guess at. */
export function readContainerLang(container: HTMLElement | null): string | null {
  if (!container) return null;
  const withLang = container.closest("[lang]");
  const value = withLang?.getAttribute("lang")?.trim();
  return value || null;
}

/** True if `text` contains Arabic-script characters — used only to catch
 * the "no lang attribute, but the selection is visibly Arabic" case, never
 * to distinguish French from English. */
export function looksArabic(text: string): boolean {
  return ARABIC_RANGE.test(text);
}

/** Best-effort normalization of a free-form BCP-47-ish tag (e.g. "fr",
 * "en-GB", "ar") down to one of our three supported voice targets. Returns
 * null if it doesn't match any of them — the caller then knows to fall back
 * to a manual selector rather than mis-picking. */
export function normalizeToSupportedLang(tag: string | null | undefined): SupportedLang | null {
  if (!tag) return null;
  const primary = tag.split("-")[0].toLowerCase();
  if (primary === "fr") return "fr-FR";
  if (primary === "en") return "en-US";
  if (primary === "ar") return "ar-SA";
  return null;
}

export const LANG_LABELS: Record<SupportedLang, string> = {
  "fr-FR": "Français",
  "en-US": "English",
  "ar-SA": "العربية",
};
