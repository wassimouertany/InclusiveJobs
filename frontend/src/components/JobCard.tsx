import { useEffect, useState, type ReactNode } from "react";
import { Building2, MapPin, Clock, CheckCircle2 } from "lucide-react";
import { motion, animate } from "motion/react";
import SkillBadges from "./SkillBadges";

export function matchTierLabel(score: number): string {
  if (score >= 85) return "High Match";
  if (score >= 65) return "Good Match";
  return "Fair Match";
}

type Tier = "high" | "mid" | "low";

function scoreTier(score: number): Tier {
  if (score >= 85) return "high";
  if (score >= 65) return "mid";
  return "low";
}

const TIER_STYLES: Record<
  Tier,
  {
    wrap: string;
    track: string;
    stroke: string;
    pctText: string;
    labelText: string;
  }
> = {
  high: {
    wrap: "bg-emerald-50 border-emerald-100",
    track: "#d1fae5",
    stroke: "#10b981",
    pctText: "text-emerald-900",
    labelText: "text-emerald-800",
  },
  mid: {
    wrap: "bg-amber-50 border-amber-100",
    track: "#fde68a",
    stroke: "#f59e0b",
    pctText: "text-amber-900",
    labelText: "text-amber-800",
  },
  low: {
    wrap: "bg-gray-50 border-gray-200",
    track: "#e5e7eb",
    stroke: "#9ca3af",
    pctText: "text-gray-700",
    labelText: "text-gray-600",
  },
};

export function MatchScoreRing({ score, label }: { score: number; label: string }) {
  const r = 16;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score));
  const targetOffset = c - (pct / 100) * c;
  const tier = scoreTier(pct);
  const styles = TIER_STYLES[tier];
  const [displayPct, setDisplayPct] = useState(0);

  useEffect(() => {
    setDisplayPct(0);
    const ctrl = animate(0, pct, {
      duration: 1.5,
      ease: [0, 0, 0.2, 1],
      onUpdate: (v) => setDisplayPct(Math.round(v)),
    });
    return () => ctrl.stop();
  }, [pct]);

  return (
    <div
      className={`flex items-center gap-2 rounded-full border pl-1.5 pr-3 py-1 shadow-sm transition-colors duration-300 ${styles.wrap}`}
      title="AI compatibility score for your profile vs. this job"
    >
      <div className="relative w-9 h-9 shrink-0 flex items-center justify-center">
        <svg className="absolute inset-0 w-9 h-9 -rotate-90" viewBox="0 0 40 40" aria-hidden>
          <circle cx="20" cy="20" r={r} fill="none" stroke={styles.track} strokeWidth="3.5" />
          <motion.circle
            cx="20"
            cy="20"
            r={r}
            fill="none"
            stroke={styles.stroke}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: targetOffset }}
            transition={{ duration: 1.5, ease: [0, 0, 0.2, 1] }}
          />
        </svg>
        <span
          className={`relative z-[1] text-[9px] font-bold leading-none tabular-nums ${styles.pctText}`}
        >
          {displayPct}%
        </span>
      </div>
      <span className={`text-xs font-semibold whitespace-nowrap ${styles.labelText}`}>
        {label}
      </span>
    </div>
  );
}

function CardLogo({
  logoUrl,
  letter,
  fallbackClassName,
}: {
  logoUrl?: string | null;
  letter: string;
  fallbackClassName: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImg = Boolean(logoUrl && !failed);

  return (
    <div
      className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-xl shadow-sm ring-1 ring-gray-200/60 ${
        showImg ? "bg-white" : fallbackClassName
      }`}
    >
      {showImg ? (
        <img
          src={logoUrl!}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-xl font-bold text-white">
          {letter}
        </span>
      )}
    </div>
  );
}

export type JobCardProps = {
  motionIndex?: number;
  title: string;
  /** Employer line (building icon) — use `company_name` from API when available. */
  company: string;
  /** e.g. job `profile_title` when `company_name` is shown separately. */
  roleHeadline?: string;
  /** Recruiter office / city (`recruiter_location`); shown next to MapPin. */
  recruiterLocation: string;
  /** Free-text work arrangement (`working_conditions`); separate from geo location. */
  workingConditions?: string;
  posted: string;
  logoClassName: string;
  logoLetter: string;
  /** Recruiter company logo from `GET /job-offers/company-logo/{id}` */
  companyLogoUrl?: string | null;
  tags: string[];
  typePill: string;
  roleDescription: string;
  amenities: string[];
  /** Profile skills for match highlighting on badges (candidate pages). */
  candidateSkills?: string[];
  scoreSlot?: ReactNode;
  aiInsightSlot?: ReactNode;
  starSlot?: ReactNode;
  detailsSlot?: ReactNode;
  applySlot: ReactNode;
  variant?: "guest" | "candidate";
  /** Parent handles stagger (e.g. recommendations) — disables card entrance motion. */
  entranceDisabled?: boolean;
};

export default function JobCard({
  motionIndex = 0,
  title,
  company,
  roleHeadline,
  recruiterLocation,
  workingConditions,
  posted,
  logoClassName,
  logoLetter,
  companyLogoUrl,
  tags,
  typePill,
  roleDescription,
  amenities,
  candidateSkills,
  scoreSlot,
  aiInsightSlot,
  starSlot,
  detailsSlot,
  applySlot,
  variant = "candidate",
  entranceDisabled = false,
}: JobCardProps) {
  const shell =
    variant === "guest"
      ? "bg-white rounded-2xl p-6 border border-border shadow-sm hover:shadow-md transition-shadow"
      : "bg-white rounded-xl p-6 border border-indigo-200/90 shadow-sm hover:shadow-md transition-shadow";

  return (
    <motion.article
      initial={entranceDisabled ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        entranceDisabled
          ? { duration: 0 }
          : { delay: Math.min(motionIndex * 0.06, 0.4), duration: 0.4 }
      }
      className={shell}
    >
      <div className="flex gap-4">
        <CardLogo
          logoUrl={companyLogoUrl}
          letter={logoLetter}
          fallbackClassName={logoClassName}
        />

        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="min-w-0">
              <h3
                className={
                  variant === "guest"
                    ? "text-lg font-bold text-text-primary"
                    : "text-lg font-bold text-indigo-900 leading-snug"
                }
              >
                {title}
              </h3>
              {roleHeadline ? (
                <p className="text-sm font-medium text-indigo-800/85 mt-1 leading-snug">
                  {roleHeadline}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center text-sm text-gray-500 mt-1.5 gap-x-4 gap-y-1">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                  {company}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  {recruiterLocation}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  {posted}
                </span>
              </div>
              {workingConditions?.trim() ? (
                <div className="mt-3 rounded-lg border border-gray-100 bg-slate-50/80 px-3 py-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                    Work arrangement
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {workingConditions.trim()}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="flex items-start justify-end gap-2 shrink-0">
              {scoreSlot}
              {starSlot}
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
              <SkillBadges
                skills={tags}
                candidateSkills={candidateSkills}
                variant={variant}
              />
              <span
                className={
                  variant === "guest"
                    ? "inline-flex w-fit px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-md border border-blue-100"
                    : "inline-flex w-fit px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full border border-blue-200/80 backdrop-blur-sm"
                }
              >
                {typePill}
              </span>
            </div>
            <div className="flex w-full flex-wrap gap-2 justify-stretch sm:w-auto sm:justify-end">
              {detailsSlot}
              {applySlot}
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100 grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-bold text-sm text-gray-900 mb-2">Role description</h4>
              <p className="text-sm text-gray-600 leading-relaxed">{roleDescription}</p>
            </div>
            <div>
              <h4 className="font-bold text-sm text-gray-900 mb-2">Accessibility amenities</h4>
              {amenities.length > 0 ? (
                <ul className="space-y-2">
                  {amenities.map((line, i) => (
                    <li key={`am-${i}`} className="flex items-start text-sm text-gray-600">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mr-2 shrink-0 mt-0.5" />
                      {line}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">
                  No specific accommodations listed yet. Check the role description or contact
                  the employer.
                </p>
              )}
            </div>
          </div>

          {aiInsightSlot ? (
            <div className="mt-6 pt-6 border-t border-indigo-100/80">{aiInsightSlot}</div>
          ) : null}
        </div>
      </div>
    </motion.article>
  );
}
