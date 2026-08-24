// guideTargetBus.js
//
// Tiny pubsub so ScreenMagnifier can know which DOM element the Shadow
// Guide is currently spotlighting, without importing guide internals or
// widening GuideContext's public shape (targetEl is local render state
// inside ShadowGuide.jsx, not provider state). ShadowGuide.jsx publishes
// its resolved targetEl (or null, once the tour is inactive/between steps)
// every time it changes; anything else — today, just ScreenMagnifier —
// subscribes read-only.

const listeners = new Set();
let currentTarget = null;

export function publishGuideTarget(el) {
  currentTarget = el ?? null;
  listeners.forEach((listener) => listener(currentTarget));
}

export function getGuideTarget() {
  return currentTarget;
}

export function subscribeGuideTarget(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
