// BlockageBubble.jsx
//
// Presentational wrapper around useBlockageDetector.js — split into its own
// .jsx file because the hook module needed to stay a plain .js file, and
// Vite's esbuild pipeline requires the .jsx extension for any file
// containing JSX.
//
// Not a modal, not an overlay: a small fixed bubble, role="status" +
// aria-live="polite", that never steals focus.

import { useBlockageDetector } from "./useBlockageDetector";

/**
 * `onOpenGuide` is optional — pass it (e.g. the provider's `startTour`) to
 * offer a direct link into the guide; passed as a prop rather than imported,
 * to avoid a circular dependency with ShadowGuideProvider.jsx.
 */
export function BlockageBubble({ onOpenGuide }) {
  const { active, dismiss, optOut } = useBlockageDetector();

  if (!active) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 left-5 z-[9990] max-w-xs rounded-2xl border border-indigo-100 bg-white p-4 shadow-xl shadow-gray-900/10"
    >
      <p className="text-sm text-text-primary leading-relaxed">{active.message}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {typeof onOpenGuide === "function" && (
          <button
            type="button"
            onClick={() => {
              dismiss();
              onOpenGuide();
            }}
            className="text-xs font-semibold text-primary hover:underline"
          >
            Ouvrir le guide
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          className="text-xs font-medium text-text-secondary hover:text-text-primary"
        >
          Plus tard
        </button>
        <button
          type="button"
          onClick={optOut}
          className="ml-auto text-xs text-text-secondary/70 hover:text-text-primary underline underline-offset-2"
        >
          Ne plus proposer d'aide
        </button>
      </div>
    </div>
  );
}

export default BlockageBubble;
