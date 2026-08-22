// CIBLE : cette fonctionnalité s'adresse aux personnes dyslexiques, malvoyantes
// légères, ou ayant des troubles de la concentration — elles voient l'écran et
// sélectionnent du texte. Elle ne s'adresse PAS aux personnes non-voyantes, qui
// utilisent déjà un lecteur d'écran natif (NVDA, VoiceOver) : faire parler la
// page par-dessus leur lecteur produirait deux voix simultanées. Ne jamais
// présenter cette fonctionnalité comme une solution universelle d'accessibilité.
//
// SpeechControls.tsx — barre affichée seulement pendant une lecture
// déclenchée par sélection. Ne prend jamais le focus à l'ouverture (portail
// fixed, aucun appel à .focus()) ; chaque bouton a un aria-label explicite.

import { createPortal } from "react-dom";
import { Highlighter, Pause, Play, Square } from "lucide-react";
import { LANG_LABELS, SUPPORTED_LANGS, type SupportedLang } from "./languageDetection";

const RATE_MIN = 0.5;
const RATE_MAX = 2;
const RATE_STEP = 0.25;

export type SpeechControlsProps = {
  paused: boolean;
  rate: number;
  onChangeRate: (rate: number) => void;
  onPauseResume: () => void;
  onStop: () => void;
  highlightEnabled: boolean;
  highlightForcedOff: boolean; // prefers-reduced-motion — toggle disabled, not just off
  onToggleHighlight: () => void;
  showLangSelector: boolean;
  lang: SupportedLang;
  onChangeLang: (lang: SupportedLang) => void;
  voices: SpeechSynthesisVoice[];
  selectedVoiceURI: string | null;
  onChangeVoice: (voiceURI: string) => void;
  rtl: boolean;
};

export default function SpeechControls({
  paused,
  rate,
  onChangeRate,
  onPauseResume,
  onStop,
  highlightEnabled,
  highlightForcedOff,
  onToggleHighlight,
  showLangSelector,
  lang,
  onChangeLang,
  voices,
  selectedVoiceURI,
  onChangeVoice,
  rtl,
}: SpeechControlsProps) {
  return createPortal(
    <div
      dir={rtl ? "rtl" : "ltr"}
      data-tts-ui="true"
      className="fixed inset-x-0 bottom-4 z-[9970] flex justify-center px-4"
    >
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-white/95 px-4 py-3 shadow-2xl shadow-gray-900/15 backdrop-blur-sm">
        <button
          type="button"
          onClick={onPauseResume}
          aria-label={paused ? "Reprendre la lecture" : "Mettre en pause"}
          aria-pressed={paused}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white transition-colors hover:bg-primary-dark"
        >
          {paused ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}
        </button>

        <button
          type="button"
          onClick={onStop}
          aria-label="Arrêter la lecture"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border text-text-secondary transition-colors hover:bg-gray-100 hover:text-text-primary"
        >
          <Square className="h-3.5 w-3.5" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-1.5 border-l border-border pl-3">
          <button
            type="button"
            onClick={() => onChangeRate(Math.max(RATE_MIN, Math.round((rate - RATE_STEP) * 100) / 100))}
            disabled={rate <= RATE_MIN}
            aria-label="Ralentir la lecture"
            className="rounded-lg px-1.5 py-1 text-text-secondary hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            −
          </button>
          <span className="w-10 text-center text-xs font-semibold text-text-primary tabular-nums">
            {rate.toFixed(2).replace(/\.?0+$/, "")}x
          </span>
          <button
            type="button"
            onClick={() => onChangeRate(Math.min(RATE_MAX, Math.round((rate + RATE_STEP) * 100) / 100))}
            disabled={rate >= RATE_MAX}
            aria-label="Accélérer la lecture"
            className="rounded-lg px-1.5 py-1 text-text-secondary hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={onToggleHighlight}
          disabled={highlightForcedOff}
          aria-label={highlightEnabled ? "Désactiver le surlignage du mot lu" : "Activer le surlignage du mot lu"}
          aria-pressed={highlightEnabled}
          title={highlightForcedOff ? "Désactivé (réduction des animations)" : undefined}
          className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            highlightEnabled && !highlightForcedOff
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-border text-text-secondary hover:bg-gray-100"
          }`}
        >
          <Highlighter className="h-4 w-4" aria-hidden="true" />
        </button>

        {showLangSelector ? (
          <label className="flex items-center gap-1.5 border-l border-border pl-3 text-xs font-medium text-text-secondary">
            <span className="sr-only">Langue de lecture</span>
            <select
              value={lang}
              onChange={(e) => onChangeLang(e.target.value as SupportedLang)}
              aria-label="Langue de lecture"
              className="rounded-lg border border-border bg-white px-2 py-1 text-xs text-text-primary outline-none focus:border-primary"
            >
              {SUPPORTED_LANGS.map((l) => (
                <option key={l} value={l}>
                  {LANG_LABELS[l]}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {voices.length > 0 ? (
          <label className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
            <span className="sr-only">Voix</span>
            <select
              value={selectedVoiceURI ?? voices[0]?.voiceURI}
              onChange={(e) => onChangeVoice(e.target.value)}
              aria-label="Voix de lecture"
              className="max-w-40 truncate rounded-lg border border-border bg-white px-2 py-1 text-xs text-text-primary outline-none focus:border-primary"
            >
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
