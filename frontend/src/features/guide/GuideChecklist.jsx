// GuideChecklist.jsx
//
// "Complétez votre espace (3/6)" — small reducible checklist, entirely fed by
// guideStorage (through ShadowGuideProvider's state, which mirrors it).
// Each row relaunches the corresponding guide step on click. Rendered as an
// <ol> so screen readers get real list semantics; status is always text +
// icon, never color alone.

import { useState } from "react";
import { Check, ChevronDown, ChevronUp, Circle, PartyPopper } from "lucide-react";
import { useShadowGuide } from "./guideContext";

export default function GuideChecklist() {
  const { tourId, steps, totalSteps, completedStepIds, goToStep } = useShadowGuide();
  const [open, setOpen] = useState(true);

  if (!tourId || totalSteps === 0) return null;

  const doneCount = steps.filter((s) => completedStepIds.includes(s.id)).length;
  const allDone = doneCount === totalSteps;

  return (
    <div className="rounded-2xl border border-indigo-50 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-text-primary">
          {allDone ? (
            <PartyPopper className="h-4 w-4 text-primary" aria-hidden="true" />
          ) : null}
          Complétez votre espace ({doneCount}/{totalSteps})
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-text-secondary" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-text-secondary" aria-hidden="true" />
        )}
      </button>

      {open ? (
        <ol className="space-y-1 px-3 pb-4">
          {steps.map((step, index) => {
            const done = completedStepIds.includes(step.id);
            return (
              <li key={step.id}>
                <button
                  type="button"
                  onClick={() => goToStep(index)}
                  className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm transition-colors hover:bg-gray-50"
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                      done ? "bg-primary/15 text-primary" : "border border-gray-300 text-gray-300"
                    }`}
                    aria-hidden="true"
                  >
                    {done ? <Check className="h-3 w-3" /> : <Circle className="h-2 w-2" />}
                  </span>
                  <span className={done ? "text-text-secondary line-through" : "text-text-primary"}>
                    {step.title}
                  </span>
                  <span className="ml-auto shrink-0 text-xs font-medium text-text-secondary/70">
                    {done ? "Fait" : "À faire"}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      ) : null}
    </div>
  );
}
