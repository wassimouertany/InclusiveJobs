// guideContext.js
//
// The React context itself lives in its own tiny module so that
// ShadowGuideProvider.jsx (which creates/provides it) and ShadowGuide.jsx /
// GuideChecklist.jsx (which consume it) don't import each other directly —
// avoids a circular module dependency between the provider and the overlay.

import { createContext, useContext } from "react";

export const GuideContext = createContext(undefined);

export function useShadowGuide() {
  const ctx = useContext(GuideContext);
  if (!ctx) {
    throw new Error("useShadowGuide must be used within a ShadowGuideProvider");
  }
  return ctx;
}
