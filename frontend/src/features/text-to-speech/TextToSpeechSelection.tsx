// CIBLE : cette fonctionnalité s'adresse aux personnes dyslexiques, malvoyantes
// légères, ou ayant des troubles de la concentration — elles voient l'écran et
// sélectionnent du texte. Elle ne s'adresse PAS aux personnes non-voyantes, qui
// utilisent déjà un lecteur d'écran natif (NVDA, VoiceOver) : faire parler la
// page par-dessus leur lecteur produirait deux voix simultanées. Ne jamais
// présenter cette fonctionnalité comme une solution universelle d'accessibilité.
//
// TextToSpeechSelection.tsx — point d'entrée public de la feature. Entoure
// un bloc de contenu via `containerRef` ; fait apparaître un bouton flottant
// quand l'utilisateur sélectionne >= 3 caractères à l'intérieur, lit la
// sélection à voix haute (raccourci clavier Alt+L), surligne le mot en
// cours, et affiche une barre de contrôle (pause/vitesse/voix) pendant la
// lecture. Rendu 100% via portails sur document.body — ne modifie jamais le
// DOM du conteneur qu'on lui passe.
//
// Expose un handle impératif (`ref`) avec `readContainer()`, pour le bouton
// "Lire la description" du bloc — même moteur de lecture, même état partagé
// que la sélection, pas une deuxième instance qui se marcherait dessus.

import { forwardRef, useImperativeHandle, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Volume2 } from "lucide-react";
import { useSelectionSpeech } from "./useSelectionSpeech";
import SpeechControls from "./SpeechControls";
import HighlightOverlay from "./HighlightOverlay";
import MissingVoiceNotice from "./MissingVoiceNotice";
import type { SupportedLang } from "./languageDetection";

export type TextToSpeechSelectionProps = {
  containerRef: RefObject<HTMLElement | null>;
  lang?: SupportedLang;
  onReadStart?: (text: string) => void;
  onReadEnd?: () => void;
};

export type TextToSpeechSelectionHandle = {
  readContainer: () => void;
  stop: () => void;
  speaking: boolean;
  supported: boolean;
};

const TextToSpeechSelection = forwardRef<TextToSpeechSelectionHandle, TextToSpeechSelectionProps>(
  function TextToSpeechSelection({ containerRef, lang, onReadStart, onReadEnd }, ref) {
    const tts = useSelectionSpeech({ containerRef, lang, onReadStart, onReadEnd });

    useImperativeHandle(
      ref,
      () => ({
        readContainer: tts.readContainer,
        stop: tts.stop,
        speaking: tts.speaking,
        supported: tts.supported,
      }),
      [tts.readContainer, tts.stop, tts.speaking, tts.supported]
    );

    if (!tts.supported) return null;

    return (
      <>
        {tts.buttonVisible && tts.buttonPosition
          ? createPortal(
              <button
                ref={tts.buttonElRef}
                type="button"
                data-tts-ui="true"
                onClick={tts.startReading}
                aria-label="Lire la sélection à voix haute"
                title="Lire la sélection à voix haute (Alt+L)"
                style={{
                  position: "fixed",
                  top: tts.buttonPosition.top,
                  left: tts.buttonPosition.left,
                  zIndex: 9970,
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 transition-transform hover:scale-105 hover:bg-primary-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <Volume2 className="h-5 w-5" aria-hidden="true" />
              </button>,
              document.body
            )
          : null}

        {tts.speaking ? (
          <SpeechControls
            paused={tts.paused}
            rate={tts.rate}
            onChangeRate={tts.setRate}
            onPauseResume={tts.pauseResume}
            onStop={tts.stop}
            highlightEnabled={tts.highlightEnabled}
            highlightForcedOff={tts.highlightForcedOff}
            onToggleHighlight={tts.toggleHighlight}
            showLangSelector={tts.showLangSelector}
            lang={tts.lang}
            onChangeLang={tts.setLang}
            voices={tts.voices}
            selectedVoiceURI={tts.selectedVoiceURI}
            onChangeVoice={tts.setVoiceURI}
            rtl={tts.rtl}
          />
        ) : null}

        <HighlightOverlay activeDomRange={tts.activeDomRange} enabled={tts.highlightEnabled} />

        {tts.blockedLang ? (
          <MissingVoiceNotice
            lang={tts.blockedLang}
            anchor={tts.buttonPosition ? { top: tts.buttonPosition.top, left: tts.buttonPosition.left } : null}
          />
        ) : null}
      </>
    );
  }
);

export default TextToSpeechSelection;
