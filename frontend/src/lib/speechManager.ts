// CIBLE : cette fonctionnalité s'adresse aux personnes dyslexiques, malvoyantes
// légères, ou ayant des troubles de la concentration — elles voient l'écran et
// sélectionnent du texte. Elle ne s'adresse PAS aux personnes non-voyantes, qui
// utilisent déjà un lecteur d'écran natif (NVDA, VoiceOver) : faire parler la
// page par-dessus leur lecteur produirait deux voix simultanées. Ne jamais
// présenter cette fonctionnalité comme une solution universelle d'accessibilité.
//
// speechManager.ts — SEUL point du projet autorisé à appeler
// `window.speechSynthesis`. Tout le reste (useGuideSpeech, la lecture par
// sélection) passe par ce singleton, jamais directement par l'API navigateur.
//
// Ce que ce fichier corrige, à la main, parce que l'API SpeechSynthesis brute
// ne le fait pas :
//   - getVoices() est vide au premier appel dans la plupart des navigateurs —
//     la vraie liste arrive plus tard via l'événement `voiceschanged`.
//   - Chrome coupe la synthèse au bout d'environ 15 secondes sur une longue
//     utterance (bug connu, jamais corrigé) — on découpe le texte en
//     segments de phrases et on les enchaîne nous-mêmes.
//   - deux appels concurrents à `speak()` sans coordination se marchent
//     dessus — d'où les priorités "system" (Shadow Guide) / "user"
//     (sélection de texte) gérées ici.

export type SpeechPriority = "system" | "user";

export type SpeechBoundaryInfo = {
  /** Name of the boundary reported by the browser, e.g. "word" or "sentence". */
  name: string;
  /** Character offset into the ORIGINAL text passed to speak() — already
   * corrected for internal chunking, callers never see per-chunk offsets. */
  charIndex: number;
  charLength?: number;
};

export type SpeakOptions = {
  lang?: string;
  /** 0.5 – 2, per the Web Speech API range this project exposes. */
  rate?: number;
  voice?: SpeechSynthesisVoice | null;
  /** Default "user". "system" always preempts whatever is currently reading. */
  priority?: SpeechPriority;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: unknown) => void;
  onBoundary?: (info: SpeechBoundaryInfo) => void;
  /** Called on the PREVIOUS reading when a higher-priority request (system)
   * preempts it mid-speech — lets its owner update its own UI instead of
   * silently going stale. Never called for a normal end-of-speech. */
  onInterrupted?: () => void;
};

export type SpeechHandle = {
  id: string;
  /** "rejected": never started (unsupported browser, empty text, or a
   * "user" request arriving while a "system" one is active). */
  status: "speaking" | "rejected";
  cancel: () => void;
};

export type SpeechManagerState = {
  isSupported: boolean;
  speaking: boolean;
  paused: boolean;
  priority: SpeechPriority | null;
};

type Listener = (state: SpeechManagerState) => void;
type TextChunk = { text: string; offset: number };

const MAX_CHUNK_LENGTH = 200;
// Sentence-ending punctuation across the languages this project supports —
// Latin (. ! ? ;) and Arabic (؟). Used only to pick a clean cut point; never
// required — falls back to the nearest whitespace, and only cuts mid-word if
// a single "word" alone exceeds MAX_CHUNK_LENGTH (unavoidable).
const SENTENCE_ENDERS = /[.!?;؟]/;

/** Splits `fullText` into consecutive segments capped at ~`maxLen` chars,
 * preferring to end on sentence punctuation, falling back to whitespace,
 * and tracking each segment's exact offset into `fullText` so boundary
 * events can be reported back in the caller's original coordinates. */
export function splitIntoChunks(fullText: string, maxLen = MAX_CHUNK_LENGTH): TextChunk[] {
  const chunks: TextChunk[] = [];
  const n = fullText.length;
  let start = 0;

  while (start < n) {
    while (start < n && /\s/.test(fullText[start])) start++;
    if (start >= n) break;

    let end = Math.min(start + maxLen, n);
    if (end < n) {
      let bestEnd = -1;
      for (let i = start; i < end; i++) {
        if (SENTENCE_ENDERS.test(fullText[i])) bestEnd = i + 1;
      }
      if (bestEnd > start) {
        end = bestEnd;
      } else {
        let ws = end;
        while (ws > start && !/\s/.test(fullText[ws])) ws--;
        if (ws > start) end = ws;
        // else: one "word" longer than maxLen — hard cut, no space to use.
      }
    }

    const raw = fullText.slice(start, end);
    const trimmed = raw.trim();
    if (trimmed) {
      const leadingWs = raw.length - raw.trimStart().length;
      chunks.push({ text: trimmed, offset: start + leadingWs });
    }
    start = end;
  }

  return chunks.length > 0 ? chunks : fullText.trim() ? [{ text: fullText.trim(), offset: 0 }] : [];
}

function isSpeechSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof window.SpeechSynthesisUtterance === "function"
  );
}

function makeId(): string {
  return `speech-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

class SpeechManager {
  readonly isSupported: boolean;
  private synth: SpeechSynthesis | null;
  private listeners = new Set<Listener>();
  private voicesCache: SpeechSynthesisVoice[] = [];
  private speaking = false;
  private paused = false;
  private activePriority: SpeechPriority | null = null;
  private activeHandleId: string | null = null;
  private activeOpts: SpeakOptions | null = null;
  /** Bumped on every cancellation source (new speak(), stop(), a handle's
   * own cancel()) so in-flight chunk callbacks from a superseded reading can
   * recognize they're stale and go silent, instead of racing the new one. */
  private generation = 0;

  constructor() {
    this.isSupported = isSpeechSupported();
    this.synth = this.isSupported ? window.speechSynthesis : null;

    if (this.synth) {
      this.voicesCache = this.synth.getVoices();
      this.synth.addEventListener("voiceschanged", () => {
        this.voicesCache = this.synth?.getVoices() ?? [];
        this.notify();
      });
      // Closest equivalent to "app unmount" for a page-lifetime singleton.
      window.addEventListener("pagehide", () => this.stop());
    }
  }

  getState(): SpeechManagerState {
    return {
      isSupported: this.isSupported,
      speaking: this.speaking,
      paused: this.paused,
      priority: this.activePriority,
    };
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }

  /** Best-effort: may be empty on the very first call before the browser
   * populates the list. Callers should `subscribe()` to react once it
   * arrives, rather than assume an empty array means "no voices ever". */
  getVoices(lang?: string): SpeechSynthesisVoice[] {
    if (!this.isSupported) return [];
    if (!lang) return this.voicesCache;
    const prefix = lang.split("-")[0].toLowerCase();
    return this.voicesCache.filter((v) => v.lang.toLowerCase().startsWith(prefix));
  }

  speak(text: string, opts: SpeakOptions = {}): SpeechHandle {
    const id = makeId();
    const priority: SpeechPriority = opts.priority ?? "user";
    const rejected = (): SpeechHandle => ({ id, status: "rejected", cancel: () => {} });

    if (!this.isSupported) return rejected();
    if (priority === "user" && this.activePriority === "system") {
      // Refused cleanly, per spec — never crashes, never queues behind a
      // system announcement.
      return rejected();
    }

    const chunks = splitIntoChunks(text ?? "");
    if (chunks.length === 0) return rejected();

    if (this.speaking) {
      const previousOpts = this.activeOpts;
      this.generation++;
      this.synth!.cancel();
      previousOpts?.onInterrupted?.();
    }

    const myGeneration = ++this.generation;
    this.activePriority = priority;
    this.activeHandleId = id;
    this.activeOpts = opts;
    this.speaking = true;
    this.paused = false;
    this.notify();
    opts.onStart?.();

    let index = 0;
    const speakNext = () => {
      if (this.generation !== myGeneration) return; // superseded — go quiet

      if (index >= chunks.length) {
        this.speaking = false;
        this.paused = false;
        this.activePriority = null;
        this.activeHandleId = null;
        this.activeOpts = null;
        this.notify();
        opts.onEnd?.();
        return;
      }

      const chunk = chunks[index++];
      const utterance = new window.SpeechSynthesisUtterance(chunk.text);
      if (opts.lang) utterance.lang = opts.lang;
      if (typeof opts.rate === "number") utterance.rate = opts.rate;
      if (opts.voice) utterance.voice = opts.voice;

      utterance.onboundary = (event) => {
        if (this.generation !== myGeneration) return;
        opts.onBoundary?.({
          name: event.name,
          charIndex: (event.charIndex ?? 0) + chunk.offset,
          charLength: event.charLength,
        });
      };
      utterance.onend = () => speakNext();
      utterance.onerror = (event) => {
        if (this.generation !== myGeneration) return; // expected cancellation noise
        const errorName = (event as SpeechSynthesisErrorEvent).error;
        if (errorName !== "interrupted" && errorName !== "canceled") {
          opts.onError?.(event);
        }
      };

      this.synth!.speak(utterance);
    };
    speakNext();

    return {
      id,
      status: "speaking",
      cancel: () => {
        if (this.generation !== myGeneration) return;
        this.generation++;
        this.synth?.cancel();
        this.speaking = false;
        this.paused = false;
        this.activePriority = null;
        this.activeHandleId = null;
        this.activeOpts = null;
        this.notify();
      },
    };
  }

  pause() {
    if (!this.isSupported || !this.speaking || this.paused) return;
    this.synth!.pause();
    this.paused = true;
    this.notify();
  }

  resume() {
    if (!this.isSupported || !this.paused) return;
    this.synth!.resume();
    this.paused = false;
    this.notify();
  }

  stop() {
    if (!this.isSupported) return;
    this.generation++;
    this.synth!.cancel();
    this.speaking = false;
    this.paused = false;
    this.activePriority = null;
    this.activeHandleId = null;
    this.activeOpts = null;
    this.notify();
  }
}

/** The single instance every consumer in this project shares. */
export const speechManager = new SpeechManager();

export default speechManager;
