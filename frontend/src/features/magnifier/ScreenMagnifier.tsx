// ScreenMagnifier.tsx
//
// Screen magnifier for low-vision users: a full-width horizontal band
// (~250px tall, see BAND_HEIGHT in magnifierGeometry.ts) that shows the
// real page content magnified 150-400%, tracking the mouse (both axes —
// the band's shape is always full-width, but which slice of the page it
// shows pans with the cursor, so content near the page's left/right edges
// stays reachable too), the keyboard focus, and whatever the Shadow Guide
// is currently spotlighting. Toggled via the "Loupe d'écran" control in
// AccessibilityWidget.tsx or Alt+Z anywhere.
//
// NOT a circle, NOT a clone of the DOM, NOT a blur over the rest of the
// page — see the product brief this was built against for why each of
// those was rejected. Concretely:
//
//   - the "stage" (App.tsx's #ij-magnifier-stage, wrapping Navbar/routes/
//     Footer) is the app's one and only real content — never reparented,
//     never cloned. It stays in completely normal document flow at all
//     times, so the page keeps scrolling exactly as it does without this
//     feature (several places read/write `window.scrollY` directly and
//     would silently break if scrolling ever moved to an inner container).
//   - while active, the stage gets an inline `transform: translate() scale()`
//     (paint-only, GPU-composited, no layout change) and an inline
//     `clip-path` that reveals only the band — see magnifierGeometry.ts for
//     the full derivation. Outside the band, nothing is painted, so the
//     page's own background shows through on its own: a neutral periphery,
//     never a blur, satisfying "no blur over the rest of the page" without
//     needing a second, duplicate rendering of the real content anywhere.
//   - the "atténuer le reste de la page" option (off by default) swaps that
//     showing-through background for a dimmer neutral tone — it never
//     touches the magnified band itself, since a `filter` on <body> would
//     dim the band's content too; a background-color swap only changes
//     what's visible in the *unpainted* area around it.
//
// PERFORMANCE
//   - every mousemove/scroll/resize/focus event only writes into refs and
//     schedules a rAF tick (scheduleUpdate) — never touches the DOM
//     synchronously from the handler itself.
//   - `will-change: transform` is set on the stage only while active, and
//     cleared (along with the transform/clip-path themselves, and any
//     pending rAF) the moment the magnifier turns off — see the cleanup in
//     the "while enabled" effect below.
//
// REACHABILITY
//   - AccessibilityWidget is mounted as a true sibling of the stage in
//     App.tsx (outside it, not inside), specifically so it's never swept
//     into the stage's transform/clip-path and stays reachable to turn the
//     loupe back off.
//   - this component's own on-screen elements (the decorative band border
//     at z-[9965], the zoom/close toolbar at z-[9966]) sit below
//     BlockageBubble/ShadowGuide/every modal (9970-9999, see those files),
//     so a guide tooltip or a confirmation dialog (all portalled to
//     document.body already) always stays readable on top of them.
//     TextToSpeechSelection's floating button (z-[9970]) also stays above
//     for the same reason.
//
// QUICK CONTROLS
//   - turning the loupe off, or nudging the zoom, used to require reopening
//     the whole AccessibilityWidget panel every time — the toolbar riding
//     on the band (zoom -/%/+ and a close button) puts both right where
//     the user is already looking, no panel round-trip needed. Unlike the
//     band's decorative border, this toolbar is a real control, so its
//     position is separately clamped to stay fully on-screen even when the
//     band itself is allowed to run past the viewport edge.
//
// Tracking is always instant — no CSS transition is ever applied to the
// transform/clip-path/band position, regardless of prefers-reduced-motion,
// per the brief ("le suivi doit être immédiat"): a magnifier that glides
// with a delay causes motion sickness for some users. There is no other
// animated effect here to gate behind prefers-reduced-motion.

import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Minus, Plus, X } from "lucide-react";
import {
  MAGNIFIER_ZOOM_MAX,
  MAGNIFIER_ZOOM_MIN,
  MAGNIFIER_ZOOM_STEP,
  useMagnifierPrefs,
} from "../../utils/magnifierPref";
import { subscribeGuideTarget } from "../guide/guideTargetBus";
import { BAND_HEIGHT, computeMagnifierGeometry } from "./magnifierGeometry";

const DIM_STYLE_ID = "ij-magnifier-dim";
// Height budget for the little zoom/close pill riding on the band (see
// TOOLBAR jsx below) — used only to keep it clamped inside the viewport
// (unlike the band's own border, which is allowed to run off-screen near
// the top/bottom edges — a *decoration* can do that, a *control* can't).
const TOOLBAR_HEIGHT = 40;
// Clears AccessibilityWidget's always-visible toggle button (fixed at
// right-0, ~48px wide) so the two never visually collide.
const TOOLBAR_RIGHT_OFFSET = 68;

function getOrCreateStyle(id: string): HTMLStyleElement {
  let el = document.getElementById(id) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = id;
    document.head.appendChild(el);
  }
  return el;
}

function removeStyle(id: string) {
  document.getElementById(id)?.remove();
}

function isPlusKey(e: KeyboardEvent): boolean {
  return e.key === "+" || e.key === "=" || e.code === "NumpadAdd";
}

function isMinusKey(e: KeyboardEvent): boolean {
  return e.key === "-" || e.code === "NumpadSubtract";
}

export type ScreenMagnifierProps = {
  /** The real, single, un-cloned content wrapper (see App.tsx's AppShell). */
  stageRef: React.RefObject<HTMLDivElement | null>;
};

export default function ScreenMagnifier({ stageRef }: ScreenMagnifierProps) {
  const [prefs, setPrefs] = useMagnifierPrefs();

  const targetScreenXRef = useRef<number | null>(null);
  const targetScreenYRef = useRef<number | null>(null);
  const zoomRef = useRef(prefs.zoom);
  const enabledRef = useRef(prefs.enabled);
  const rafIdRef = useRef<number | null>(null);
  const frameElRef = useRef<HTMLDivElement | null>(null);
  const toolbarElRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    zoomRef.current = prefs.zoom;
  }, [prefs.zoom]);

  useEffect(() => {
    enabledRef.current = prefs.enabled;
  }, [prefs.enabled]);

  // ---------------------------------------------------------------------
  // The rAF-batched update: reads the latest target/zoom out of refs,
  // recomputes the transform + clip-path, and writes them straight onto
  // the stage element and the band's border-frame node. React state is
  // deliberately not involved in this hot path.
  // ---------------------------------------------------------------------
  const runUpdate = useCallback(() => {
    rafIdRef.current = null;
    const stageEl = stageRef.current;
    const targetX = targetScreenXRef.current;
    const targetY = targetScreenYRef.current;
    if (!stageEl || targetX == null || targetY == null) return;
    const { bandTop, transform, clipPath } = computeMagnifierGeometry(zoomRef.current, targetX, targetY, stageEl);
    stageEl.style.transform = transform;
    stageEl.style.clipPath = clipPath;
    if (frameElRef.current) {
      frameElRef.current.style.top = `${bandTop}px`;
    }
    if (toolbarElRef.current) {
      // The band's border is allowed to run past the viewport edge (see
      // magnifierGeometry.ts) so the cursor always stays truly centered —
      // but the toolbar is a real control, not a decoration, so it always
      // has to stay fully clickable on-screen.
      const maxTop = Math.max(8, window.innerHeight - TOOLBAR_HEIGHT - 8);
      toolbarElRef.current.style.top = `${Math.min(Math.max(bandTop + 8, 8), maxTop)}px`;
    }
  }, [stageRef]);

  const scheduleUpdate = useCallback(() => {
    if (rafIdRef.current != null) return;
    rafIdRef.current = requestAnimationFrame(runUpdate);
  }, [runUpdate]);

  // ---------------------------------------------------------------------
  // Alt+Z toggles from anywhere, regardless of whether the loupe is
  // currently on — this listener is always mounted (cheap: one keydown
  // listener). Auto-disable when the tab is hidden (visibilitychange) lives
  // here too, for the same reason.
  // ---------------------------------------------------------------------
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        setPrefs({ enabled: !enabledRef.current });
      }
    };
    const onVisibilityChange = () => {
      if (document.hidden && enabledRef.current) setPrefs({ enabled: false });
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [setPrefs]);

  // ---------------------------------------------------------------------
  // Shadow Guide integration: recenter on whatever the active tour step is
  // spotlighting. Always subscribed (subscribing is free); the callback
  // itself no-ops unless the loupe is actually on.
  // ---------------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = subscribeGuideTarget((el) => {
      if (!el || !enabledRef.current) return;
      const rect = el.getBoundingClientRect();
      targetScreenXRef.current = rect.left + rect.width / 2;
      targetScreenYRef.current = rect.top + rect.height / 2;
      scheduleUpdate();
    });
    return () => {
      unsubscribe();
    };
  }, [scheduleUpdate]);

  // Zoom changed (Alt+/Alt- or the widget's stepper) while active: redraw
  // immediately at the new factor, same target row.
  useEffect(() => {
    if (prefs.enabled) scheduleUpdate();
  }, [prefs.zoom, prefs.enabled, scheduleUpdate]);

  // ---------------------------------------------------------------------
  // The listeners that only make sense while the loupe is active: mouse
  // (both axes — the band's on-screen SHAPE always spans the full viewport
  // width, but the content shown inside it pans horizontally too, so the
  // page's left/right extremities are actually reachable), keyboard focus
  // (Tab), scroll/resize (the band's target is a screen position, but
  // scrolling changes what page content is under it), Escape to quit,
  // Alt+/Alt- to zoom.
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!prefs.enabled) return undefined;
    const stageEl = stageRef.current;
    if (!stageEl) return undefined;

    stageEl.style.willChange = "transform";
    // magnifierGeometry.ts derives tx/ty/clip-path assuming the transform
    // pivots from the stage's own top-left corner — without this, the
    // browser's default 50%/50% origin invalidates all of that math and
    // the clip-path ends up hiding the very content it should reveal.
    stageEl.style.transformOrigin = "0 0";

    // Neutralize `position: sticky` descendants (the Navbar, a sticky
    // sidebar card in RecruiterLayout, etc.) for the duration: a
    // `transform` on an ancestor changes how browsers compute their
    // containing block, so they detach from the linear transform/clip-path
    // math above and either freeze in the wrong spot or drop out of the
    // magnified band entirely — the header would never show up correctly
    // magnified. Forcing them to `static` makes them ordinary, in-flow
    // content for as long as the loupe is on — sticky elements are
    // designed to make sense unstuck too, that's their normal fallback.
    // (Genuinely `position: fixed` descendants, e.g. BlockageBubble, are
    // NOT touched here: forcing those to `static` would break a layout
    // they were never designed to render in.)
    const unstuckEls: { el: HTMLElement; prevPosition: string }[] = [];
    stageEl.querySelectorAll<HTMLElement>("*").forEach((el) => {
      if (getComputedStyle(el).position === "sticky") {
        unstuckEls.push({ el, prevPosition: el.style.position });
        el.style.position = "static";
      }
    });

    // A `transform: scale()` doesn't change the stage's own LAYOUT size,
    // but browsers still count its scaled-up PAINTED size when computing
    // how far an ancestor can scroll — so without this, the page becomes
    // scrollable well past its real end, and the true top/bottom of the
    // page drift out of reach while zoomed in. Clipping it at the stage's
    // real parent stops that scaled paint from ever counting toward the
    // page's scrollable area. Safe to toggle only here, for the same
    // reason as above: `overflow: hidden` on an ancestor is a classic way
    // to break `position: sticky` for a descendant, but sticky is already
    // neutralized for this entire duration, so there's nothing left for it
    // to break.
    const parentEl = stageEl.parentElement;
    const prevParentOverflow = parentEl?.style.overflow ?? "";
    if (parentEl) parentEl.style.overflow = "hidden";

    // Start centered on the viewport until the first mouse/focus event.
    targetScreenXRef.current = window.innerWidth / 2;
    targetScreenYRef.current = window.innerHeight / 2;
    scheduleUpdate();

    const onMouseMove = (e: MouseEvent) => {
      targetScreenXRef.current = e.clientX;
      targetScreenYRef.current = e.clientY;
      scheduleUpdate();
    };
    const onScrollOrResize = () => scheduleUpdate();
    const onFocusIn = (e: FocusEvent) => {
      if (!(e.target instanceof HTMLElement)) return;
      const rect = e.target.getBoundingClientRect();
      targetScreenXRef.current = rect.left + rect.width / 2;
      targetScreenYRef.current = rect.top + rect.height / 2;
      scheduleUpdate();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setPrefs({ enabled: false });
        return;
      }
      if (e.altKey && isPlusKey(e)) {
        e.preventDefault();
        setPrefs({ zoom: Math.min(MAGNIFIER_ZOOM_MAX, zoomRef.current + MAGNIFIER_ZOOM_STEP) });
      } else if (e.altKey && isMinusKey(e)) {
        e.preventDefault();
        setPrefs({ zoom: Math.max(MAGNIFIER_ZOOM_MIN, zoomRef.current - MAGNIFIER_ZOOM_STEP) });
      }
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    // capture: true — catches scroll on any scrollable descendant, not just
    // window itself (same reasoning as ShadowGuide.jsx's own scroll listener).
    window.addEventListener("scroll", onScrollOrResize, { passive: true, capture: true });
    window.addEventListener("resize", onScrollOrResize, { passive: true });
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("scroll", onScrollOrResize, { capture: true });
      window.removeEventListener("resize", onScrollOrResize);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("keydown", onKeyDown);
      if (rafIdRef.current != null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      targetScreenXRef.current = null;
      targetScreenYRef.current = null;
      stageEl.style.transform = "";
      stageEl.style.clipPath = "";
      stageEl.style.willChange = "";
      stageEl.style.transformOrigin = "";
      unstuckEls.forEach(({ el, prevPosition }) => {
        el.style.position = prevPosition;
      });
      if (parentEl) parentEl.style.overflow = prevParentOverflow;
    };
  }, [prefs.enabled, stageRef, scheduleUpdate, setPrefs]);

  // ---------------------------------------------------------------------
  // "Atténuer le reste de la page" — dims the neutral fill that shows
  // through outside the band (never the band's own magnified content: see
  // the file header for why this is a background-color swap, not a filter).
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!(prefs.enabled && prefs.dimBackground)) {
      removeStyle(DIM_STYLE_ID);
      return undefined;
    }
    const el = getOrCreateStyle(DIM_STYLE_ID);
    el.textContent = "body { background-color: #94A3B8 !important; }";
    return () => removeStyle(DIM_STYLE_ID);
  }, [prefs.enabled, prefs.dimBackground]);

  if (!prefs.enabled) return null;

  const initialTop = Math.max(0, window.innerHeight / 2 - BAND_HEIGHT / 2);
  const initialToolbarTop = Math.min(
    Math.max(initialTop + 8, 8),
    Math.max(8, window.innerHeight - TOOLBAR_HEIGHT - 8),
  );

  return createPortal(
    <>
      <div
        ref={frameElRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          left: 0,
          top: initialTop,
          width: "100%",
          height: BAND_HEIGHT,
          zIndex: 9965,
          pointerEvents: "none",
          borderTop: "4px solid var(--color-primary)",
          borderBottom: "4px solid var(--color-primary)",
          // Border alone can fail contrast against some background colors a
          // page might have right at the band's edge — the white outline +
          // soft shadow underneath makes the edge legible independent of
          // color (never rely on color alone).
          boxShadow: "0 0 0 2px #fff, 0 0 0 6px var(--color-primary), 0 6px 20px rgba(15, 23, 42, 0.35)",
          transition: "none",
        }}
      />

      {/* Quick controls riding on the band itself — turning the loupe off
          or nudging the zoom used to mean reopening the whole
          AccessibilityWidget panel every time; this puts both right where
          the user is already looking. Alt+Z/Alt+±/Escape still work too. */}
      <div
        ref={toolbarElRef}
        style={{ position: "fixed", top: initialToolbarTop, right: TOOLBAR_RIGHT_OFFSET, zIndex: 9966 }}
        className="flex items-center gap-0.5 rounded-full border border-gray-200 bg-white px-1.5 py-1 shadow-lg shadow-gray-900/10"
      >
        <button
          type="button"
          onClick={() => setPrefs({ zoom: Math.max(MAGNIFIER_ZOOM_MIN, prefs.zoom - MAGNIFIER_ZOOM_STEP) })}
          disabled={prefs.zoom <= MAGNIFIER_ZOOM_MIN}
          aria-label="Réduire le grossissement"
          title="Réduire le grossissement (Alt+-)"
          className="p-1.5 text-indigo-600 rounded-full hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        >
          <Minus className="w-4 h-4" />
        </button>
        <span className="w-10 text-center text-xs font-semibold tabular-nums text-gray-700">{prefs.zoom}%</span>
        <button
          type="button"
          onClick={() => setPrefs({ zoom: Math.min(MAGNIFIER_ZOOM_MAX, prefs.zoom + MAGNIFIER_ZOOM_STEP) })}
          disabled={prefs.zoom >= MAGNIFIER_ZOOM_MAX}
          aria-label="Augmenter le grossissement"
          title="Augmenter le grossissement (Alt++)"
          className="p-1.5 text-indigo-600 rounded-full hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        >
          <Plus className="w-4 h-4" />
        </button>
        <span className="mx-0.5 h-4 w-px bg-gray-200" aria-hidden="true" />
        <button
          type="button"
          onClick={() => setPrefs({ enabled: false })}
          aria-label="Désactiver la loupe d'écran"
          title="Désactiver la loupe (Échap)"
          className="p-1.5 text-gray-500 rounded-full hover:bg-gray-100 hover:text-gray-700"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </>,
    document.body,
  );
}
