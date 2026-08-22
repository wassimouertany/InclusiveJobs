// CIBLE : cette fonctionnalité s'adresse aux personnes dyslexiques, malvoyantes
// légères, ou ayant des troubles de la concentration — elles voient l'écran et
// sélectionnent du texte. Elle ne s'adresse PAS aux personnes non-voyantes, qui
// utilisent déjà un lecteur d'écran natif (NVDA, VoiceOver) : faire parler la
// page par-dessus leur lecteur produirait deux voix simultanées. Ne jamais
// présenter cette fonctionnalité comme une solution universelle d'accessibilité.
//
// textMapping.ts — le pont entre trois espaces de coordonnées différents :
//   1. le texte "brut" tel que rendu par Range.toString() (peut contenir des
//      sauts de ligne, espaces multiples, puces de liste)
//   2. le texte "normalisé" réellement envoyé à la synthèse vocale (espaces
//      collapsés, puces retirées) — c'est dans cet espace que
//      SpeechSynthesisUtterance.onboundary rapporte ses charIndex
//   3. les vrais nœuds texte du DOM, pour dessiner le surlignage au bon
//      endroit sans jamais les modifier
//
// Tout ici est défensif : une position qui ne peut pas être résolue renvoie
// simplement `null`, jamais une exception — un surlignage manqué n'est
// jamais grave, une page cassée l'est.

export type RawMapping = {
  /** Texte prêt pour la synthèse vocale (espaces collapsés, puces retirées). */
  text: string;
  /** toRawIndex[i] = position du caractère i de `text` dans le texte brut d'origine. */
  toRawIndex: number[];
};

const BULLET_CHARS = new Set(["•", "◦", "▪", "‣", "·"]);

/** Collapses whitespace runs to a single space and drops bullet glyphs,
 * while keeping a reversible index back to the raw text — needed so a
 * boundary event reported against the *spoken* text can still be located in
 * the real DOM later. */
export function normalizeForSpeech(raw: string): RawMapping {
  let text = "";
  const toRawIndex: number[] = [];
  let lastWasSpace = true; // collapse leading whitespace too

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (BULLET_CHARS.has(ch)) continue;
    if (/\s/.test(ch)) {
      if (!lastWasSpace) {
        text += " ";
        toRawIndex.push(i);
        lastWasSpace = true;
      }
      continue;
    }
    text += ch;
    toRawIndex.push(i);
    lastWasSpace = false;
  }

  if (text.endsWith(" ")) {
    text = text.slice(0, -1);
    toRawIndex.pop();
  }

  return { text, toRawIndex };
}

type RangeTextNode = { node: Text; start: number; end: number };

/** All text nodes intersecting `range`, clipped to the actually-selected
 * portion of the boundary nodes. Order matches document (and thus reading)
 * order. */
function collectTextNodesInRange(range: Range): RangeTextNode[] {
  const results: RangeTextNode[] = [];
  const root = range.commonAncestorContainer;
  const walkerRoot = root.nodeType === Node.TEXT_NODE ? (root.parentNode ?? root) : root;

  let walker: TreeWalker;
  try {
    walker = document.createTreeWalker(walkerRoot, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (range.intersectsNode(n) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
    });
  } catch {
    return results;
  }

  let node: Node | null;
  while ((node = walker.nextNode())) {
    const textNode = node as Text;
    const start = textNode === range.startContainer ? range.startOffset : 0;
    const end = textNode === range.endContainer ? range.endOffset : textNode.length;
    if (end > start) results.push({ node: textNode, start, end });
  }
  return results;
}

/** Maps [rawCharIndex, rawCharIndex + rawCharLength) — offsets into the raw
 * text of `selectionRange` — to a live DOM Range spanning the matching text
 * node(s). Returns null if it can't be resolved (stale selection, DOM
 * changed underneath, etc.) — callers must treat that as "skip this
 * highlight frame", never as an error. */
export function mapRawOffsetToDomRange(
  selectionRange: Range,
  rawCharIndex: number,
  rawCharLength: number
): Range | null {
  const nodes = collectTextNodesInRange(selectionRange);
  if (nodes.length === 0) return null;

  let remaining = rawCharIndex;
  let startNode: Text | null = null;
  let startOffset = 0;
  let endNode: Text | null = null;
  let endOffset = 0;
  let remainingLength = Math.max(rawCharLength, 1);

  for (const { node, start, end } of nodes) {
    const len = end - start;
    if (!startNode) {
      if (remaining < len) {
        startNode = node;
        startOffset = start + remaining;
      } else {
        remaining -= len;
        continue;
      }
    }
    const segStart = node === startNode ? startOffset : start;
    const availableHere = end - segStart;
    if (availableHere <= 0) continue;
    if (remainingLength <= availableHere) {
      endNode = node;
      endOffset = segStart + remainingLength;
      break;
    }
    remainingLength -= availableHere;
  }

  if (!startNode) return null;
  if (!endNode) {
    const last = nodes[nodes.length - 1];
    endNode = last.node;
    endOffset = last.end;
  }

  try {
    const domRange = document.createRange();
    domRange.setStart(startNode, startOffset);
    domRange.setEnd(endNode, endOffset);
    return domRange;
  } catch {
    return null;
  }
}

/** Viewport-relative rects covering `range` — one per visual line it spans.
 * Used by the non-CSS-Highlight-API fallback, which draws boxes over the
 * text instead of touching the container's DOM. */
export function getRangeViewportRects(range: Range): DOMRect[] {
  try {
    return Array.from(range.getClientRects()).filter((r) => r.width > 0 && r.height > 0);
  } catch {
    return [];
  }
}
