// magnifierGeometry.ts
//
// Pure math for ScreenMagnifier.tsx — kept separate from the component so
// the coordinate derivation can be read (and adjusted) on its own, without
// wading through event wiring and refs.
//
// THE CORE IDEA
// --------------
// The stage element (the app's real content — Navbar/routes/Footer, see
// AppShell in App.tsx) is NEVER reparented, cloned, or switched to
// `position: fixed`: it stays exactly where it is, in normal document flow,
// so the page keeps scrolling exactly as it does today (several places —
// NavigationContext's scroll-to-top, CandidateHome's scroll-position
// restore — read/write `window.scrollY` directly and would silently break
// if scrolling ever moved to an inner container instead).
//
// Instead, while the magnifier is active, the stage gets an inline
// `transform: translate(tx, ty) scale(factor)` (pure paint, no layout
// change — GPU composited) plus an inline `clip-path: inset(...)` that
// reveals only a thin horizontal band of that transformed content. Because
// clip-path is evaluated in the element's own *local*, pre-transform box
// (not viewport space), every value below is derived so that, once the
// transform is applied, the revealed band lands exactly on the current
// on-screen band rectangle (bandTop..bandTop+BAND_HEIGHT, full width) —
// this has to be recomputed on every mouse move, scroll and resize, which
// is exactly why the caller drives it from a rAF loop instead of doing it
// once.
//
// Outside the clipped band there is deliberately nothing painted: the
// stage's own content simply isn't drawn there, so the page's normal
// background shows through on its own — no separate "periphery copy" of
// the page is ever rendered, and no cloneNode() is involved anywhere.

export const BAND_HEIGHT = 250;

export type MagnifierGeometry = {
  bandTop: number;
  transform: string;
  clipPath: string;
};

/**
 * @param zoomPercent   150-400 (see magnifierPref.ts)
 * @param targetScreenX desired on-screen X the magnified content should be
 *                      anchored on (raw mouse clientX, a focused element's
 *                      rect center, or a Shadow Guide target's rect center)
 * @param targetScreenY desired on-screen Y to center the band on (same
 *                      sources as targetScreenX)
 * @param stageEl       the real, single, un-cloned content wrapper
 */
export function computeMagnifierGeometry(
  zoomPercent: number,
  targetScreenX: number,
  targetScreenY: number,
  stageEl: HTMLElement,
): MagnifierGeometry {
  const factor = zoomPercent / 100;
  const viewportW = window.innerWidth;
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  // Deliberately NOT clamped to stay fully on-screen: the brief wants the
  // cursor to always sit at the exact vertical center of the band, and
  // clamping bandTop near the viewport edges (e.g. hovering the sticky
  // header) would break that — the band would still be fully visible, but
  // centered on the clamped position rather than on whatever the cursor is
  // actually over, magnifying the wrong row. Left unclamped, the band (and
  // its border) simply runs past the viewport edge near the top/bottom —
  // the browser crops it for free, exactly like a real docked magnifier —
  // while the visible portion always matches the cursor correctly.
  const bandTop = targetScreenY - BAND_HEIGHT / 2;
  const bandBottom = bandTop + BAND_HEIGHT;

  // The natural (unscaled) document-space point that should end up right
  // under the cursor, both axes. The band's own on-screen SHAPE still
  // always spans the full viewport width — only the content shown inside
  // it now pans horizontally too, so content sitting near the page's left
  // or right edge (a sidebar, anything off-center) is actually reachable.
  // Without this, the band only ever showed a horizontally-centered slice
  // of the page, no matter where the mouse was — the true left/right
  // extremities of the page could never be magnified at all.
  const targetDocY = targetScreenY + scrollY;
  const targetDocX = targetScreenX + scrollX;

  // transform-origin is the stage's own top-left (0,0). CSS composes
  // `transform: translate() scale()` as translate(scale(p)) — scale runs
  // first (in local space), then translate shifts that *already-scaled*
  // result by an unscaled px amount. So, ignoring scroll for a moment:
  // screenY = factor*localY + ty. Scroll then pans the viewport across the
  // whole (already-transformed) document, contributing the -scrollY term.
  // Solving "targetScreenY = -scrollY + factor*targetDocY + ty" for ty
  // (and the symmetric case for tx):
  const ty = targetScreenY + scrollY - factor * targetDocY;
  const tx = targetScreenX + scrollX - factor * targetDocX;

  // Same forward mapping, inverted, to find where the band's screen
  // rectangle falls in the stage's own (pre-transform) local coordinates —
  // that's what clip-path needs.
  const localTop = (bandTop + scrollY - ty) / factor;
  const localBottom = (bandBottom + scrollY - ty) / factor;
  const localLeft = (0 + scrollX - tx) / factor;
  const localRight = (viewportW + scrollX - tx) / factor;

  const stageHeight = stageEl.scrollHeight;
  const stageWidth = stageEl.offsetWidth;

  const insetTop = Math.max(0, localTop);
  const insetBottom = Math.max(0, stageHeight - localBottom);
  const insetLeft = Math.max(0, localLeft);
  const insetRight = Math.max(0, stageWidth - localRight);

  return {
    bandTop,
    transform: `translate(${tx}px, ${ty}px) scale(${factor})`,
    clipPath: `inset(${insetTop}px ${insetRight}px ${insetBottom}px ${insetLeft}px)`,
  };
}
