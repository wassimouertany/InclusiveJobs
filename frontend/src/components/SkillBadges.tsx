import { CheckCircle2 } from "lucide-react";
import { jobSkillMatchesCandidate } from "../pages/candidate/shared";

type Props = {
  skills: string[];
  /** When provided (e.g. from candidate profile), matching skills get highlight styling. */
  candidateSkills?: string[];
  variant?: "guest" | "candidate";
};

export default function SkillBadges({
  skills,
  candidateSkills,
  variant = "candidate",
}: Props) {
  const profile = candidateSkills ?? [];
  const matchEnabled = profile.length > 0;

  return (
    <div className="flex flex-wrap gap-2 min-w-0">
      {skills.map((skill, i) => {
        const matched =
          matchEnabled && jobSkillMatchesCandidate(skill, profile);
        const baseGlass =
          "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-md border shadow-sm transition-colors";
        const guestNeutral =
          "bg-white/50 text-text-secondary border-white/60 ring-1 ring-gray-200/50";
        const candidateNeutral =
          "bg-white/40 text-gray-600 border-white/50 ring-1 ring-gray-200/45";
        const matchedStyles =
          "bg-emerald-50/70 text-emerald-900 border-emerald-300/70 ring-2 ring-emerald-400/45 shadow-[0_0_14px_rgba(16,185,129,0.22)]";

        if (variant === "guest") {
          return (
            <span
              key={`${skill}-${i}`}
              className={`${baseGlass} ${guestNeutral}`}
            >
              {skill}
            </span>
          );
        }

        return (
          <span
            key={`${skill}-${i}`}
            className={`${baseGlass} ${
              matched ? matchedStyles : candidateNeutral
            }`}
          >
            {matched ? (
              <CheckCircle2
                className="w-3.5 h-3.5 text-emerald-600 shrink-0"
                aria-hidden
              />
            ) : null}
            <span>{skill}</span>
          </span>
        );
      })}
    </div>
  );
}
