import {
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  Briefcase,
  Calendar,
  CheckCircle,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  User,
  XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import JobCard, { MatchScoreRing, matchTierLabel } from "../../components/JobCard";
import RecommendationSkeleton from "../../components/RecommendationSkeleton";
import { useToast } from "../../context/ToastContext";
import { apiClient } from "../../services/apiClient";
import { useCandidateDashboard } from "./CandidateDashboardContext";
import { STATUS_CONFIG } from "../../types/application";
import type { Application } from "../../types/application";
import type { JobOfferListItem } from "./apiTypes";
import { selectedJobFromAiMatch } from "./selectedJobUtils";
import {
  formatEnumLabel,
  formatPosted,
  normalizeJobSkillTags,
  normalizeToStringArray,
  splitAccommodations,
} from "./shared";
import { jobOfferCompanyLogoUrl } from "../../utils/jobOfferDisplay";
import type { CandidateProfile } from "./types";
import GuideChecklist from "../../features/guide/GuideChecklist";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const LOGO_BG = [
  "bg-blue-600",
  "bg-orange-500",
  "bg-purple-600",
  "bg-red-600",
  "bg-green-600",
  "bg-indigo-600",
];

const STATUS_ICON_MAP: Record<string, React.FC<{ size?: number; className?: string }>> = {
  Clock,
  Search,
  Calendar,
  CheckCircle,
  XCircle,
};

const BADGE_COLOR: Record<string, string> = {
  blue:   "bg-blue-100 text-blue-700",
  yellow: "bg-yellow-100 text-yellow-700",
  purple: "bg-purple-100 text-purple-700",
  green:  "bg-green-100 text-green-700",
  red:    "bg-red-100 text-red-700",
};

function computeProfileCompletion(profile: CandidateProfile | null): number {
  if (!profile) return 0;
  let score = 0;
  if (profile.logo_id)                                            score += 20;
  if (profile.resume_id)                                          score += 20;
  if (normalizeToStringArray(profile.key_skills).length > 0)     score += 20;
  if (profile.accessibility_needs?.trim())                        score += 20;
  if (profile.profile_title?.trim())                              score += 20;
  return score;
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ---------------------------------------------------------------------------
// Profile completion ring
// ---------------------------------------------------------------------------

const RING_R = 28;
const RING_CIRC = 2 * Math.PI * RING_R;

function ProfileRing({ pct }: { pct: number }) {
  return (
    <svg
      width="72" height="72" viewBox="0 0 72 72"
      className="-rotate-90"
      aria-hidden
    >
      <circle
        cx="36" cy="36" r={RING_R}
        fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="6"
      />
      <circle
        cx="36" cy="36" r={RING_R}
        fill="none" stroke="white" strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={RING_CIRC}
        strokeDashoffset={RING_CIRC * (1 - pct / 100)}
        style={{ transition: "stroke-dashoffset 0.7s ease" }}
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Explore chips
// ---------------------------------------------------------------------------

const NEED_CHIPS = [
  { label: "Wheelchair Access", emoji: "♿" },
  { label: "Visual Aid",        emoji: "👁" },
  { label: "Hearing Aid",       emoji: "🎧" },
  { label: "Neurodiverse Friendly", emoji: "🧠" },
  { label: "Fully Remote",      emoji: "🏠" },
  { label: "Flexible Hours",    emoji: "⏰" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CandidateHome() {
  const { showToast } = useToast();
  const {
    displayName,
    setSelectedJob,
    profile,
    aiMatches: matches,
    aiMatchesLoading: loading,
    aiMatchesOffersById: offersById,
    fetchAiMatches,
    homeScrollYRef,
  } = useCandidateDashboard();
  const navigate = useNavigate();

  // Restore scroll position on mount (e.g. returning from an offer detail view)
  // and keep it updated while this page is visible.
  useEffect(() => {
    if (homeScrollYRef.current > 0) {
      window.scrollTo(0, homeScrollYRef.current);
    }
    const onScroll = () => {
      homeScrollYRef.current = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [homeScrollYRef]);

  // Applications state (new)
  const [applications, setApplications] = useState<Application[]>([]);
  const [appsLoading, setAppsLoading] = useState(true);

  // Open offers count
  const [openOffersCount, setOpenOffersCount] = useState<number | null>(null);

  const profileCompletion = useMemo(() => computeProfileCompletion(profile), [profile]);
  const firstName = profile?.first_name?.trim() || displayName;

  const candidateSkillList = useMemo(
    () => normalizeToStringArray(profile?.key_skills),
    [profile?.key_skills]
  );

  // Fetch open offers count once on mount
  useEffect(() => {
    apiClient
      .get<JobOfferListItem[]>("/job-offers/", { validateStatus: () => true })
      .then((res) => {
        if (res.status >= 200 && res.status < 300) {
          setOpenOffersCount(res.data.length);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch applications once on mount
  useEffect(() => {
    apiClient
      .get<Application[]>("/applications/mine")
      .then((res) => {
        const sorted = [...res.data].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setApplications(sorted);
      })
      .catch(() => {})
      .finally(() => setAppsLoading(false));
  }, []);

  const handleApply = (e: MouseEvent) => {
    e.stopPropagation();
    showToast("Application submitted — full apply flow coming soon.", "success");
  };

  const aiMatchCount = matches?.length ?? 0;
  const recentApps = applications.slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {/* ------------------------------------------------------------------ */}
      {/* 1. WELCOME BANNER                                                    */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-linear-to-r from-indigo-600 to-teal-500 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-white">
            Welcome back, {firstName} 👋
          </h2>
          <p className="text-white/75 mt-1 text-sm">
            Here's what's waiting for you today.
          </p>
        </div>

        {/* Progress ring */}
        <div className="flex items-center gap-4 sm:flex-col sm:items-center sm:text-center shrink-0">
          <div className="relative">
            <ProfileRing pct={profileCompletion} />
            <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">
              {profileCompletion}%
            </span>
          </div>
          <div>
            <p className="text-white/80 text-xs font-medium whitespace-nowrap">
              Profile {profileCompletion}% complete
            </p>
            {profileCompletion < 100 && (
              <button
                type="button"
                onClick={() => navigate("/dashboard/candidate/profile")}
                className="mt-1.5 text-xs font-semibold bg-white/20 hover:bg-white/30 text-white rounded-full px-3 py-1 transition-colors whitespace-nowrap"
              >
                Complete Profile
              </button>
            )}
          </div>
        </div>
      </div>

      <GuideChecklist />

      {/* ------------------------------------------------------------------ */}
      {/* 2. QUICK STATS ROW                                                   */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Applications Sent",
            value: appsLoading ? "—" : applications.length,
            Icon: Send,
            iconBg: "bg-indigo-50",
            iconColor: "text-indigo-600",
          },
          {
            label: "AI Matches Found",
            value: aiMatchCount,
            Icon: Sparkles,
            iconBg: "bg-purple-50",
            iconColor: "text-purple-600",
          },
          {
            label: "Profile Strength",
            value: `${profileCompletion}%`,
            Icon: User,
            iconBg: "bg-teal-50",
            iconColor: "text-teal-600",
          },
          {
            label: "Available Offers",
            value: openOffersCount === null ? "—" : openOffersCount,
            Icon: Briefcase,
            iconBg: "bg-amber-50",
            iconColor: "text-amber-600",
          },
        ].map(({ label, value, Icon, iconBg, iconColor }) => (
          <div
            key={label}
            className="bg-white rounded-2xl p-5 border border-indigo-50 shadow-sm"
          >
            <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center mb-3`}>
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <div className="text-2xl font-bold text-text-primary">{value}</div>
            <div className="text-xs text-text-secondary mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 3. EXPLORE BY NEED                                                   */}
      {/* ------------------------------------------------------------------ */}
      <div>
        <p className="text-lg font-semibold text-text-primary mb-3">
          Find jobs that fit your needs
        </p>
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-3" style={{ width: "max-content" }}>
            {NEED_CHIPS.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => navigate("/dashboard/candidate/find-jobs")}
                className="inline-flex items-center gap-2 bg-white border-2 border-indigo-100 hover:border-primary hover:bg-indigo-50 rounded-full px-4 py-2 text-sm font-medium text-text-primary cursor-pointer transition-all whitespace-nowrap"
              >
                <span>{chip.emoji}</span>
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 4. AI MATCHES SECTION                                                */}
      {/* ------------------------------------------------------------------ */}
      <div data-guide="match_score">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">
            Recommended for you
          </h3>
          {matches && matches.length > 0 && (
            <button
              type="button"
              onClick={() => fetchAiMatches()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
              Refresh matches
            </button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="recommendation-loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
            >
              <RecommendationSkeleton count={3} />
            </motion.div>
          ) : matches && matches.length > 0 ? (
            <motion.div
              key="recommendation-cards"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="grid gap-4"
            >
              {matches.map((m, index) => {
                const offer = offersById[m.offer_id];
                const title = offer?.title ?? m.title ?? "Job";
                const logoClass = LOGO_BG[index % LOGO_BG.length];
                const companyLine =
                  offer?.company_name?.trim() ||
                  offer?.profile_title?.trim() ||
                  "InclusiveJobs partner";
                const logoLetter = (companyLine || title || "?")
                  .charAt(0)
                  .toUpperCase();
                const companyLogoUrl = jobOfferCompanyLogoUrl(offer?.company_logo_id);
                const recruiterLocation =
                  offer?.recruiter_location?.trim() || "Location not specified";
                const workingConditions = offer?.working_conditions?.trim();
                const posted = formatPosted(offer?.created_at);
                const skillTags = normalizeJobSkillTags(
                  offer?.key_skills,
                  offer?.required_skills
                ).slice(0, 12);
                const contractLabel = formatEnumLabel(offer?.contract_type);
                const roleDesc =
                  offer?.description?.trim() ||
                  "No detailed description loaded for this role yet.";
                const amenities = splitAccommodations(offer?.possible_accommodations);
                const score = Math.round(
                  typeof m.ai_score === "number"
                    ? m.ai_score
                    : m.vector_score ?? 0
                );

                return (
                  <motion.div
                    key={m.offer_id}
                    initial={{ opacity: 0, y: 28 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.52,
                      delay: index * 0.08,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    <JobCard
                      entranceDisabled
                      motionIndex={0}
                      title={title}
                      company={companyLine}
                      roleHeadline={
                        offer?.company_name?.trim() && offer?.profile_title?.trim()
                          ? offer.profile_title.trim()
                          : undefined
                      }
                      recruiterLocation={recruiterLocation}
                      workingConditions={workingConditions}
                      posted={posted}
                      logoClassName={logoClass}
                      logoLetter={logoLetter}
                      companyLogoUrl={companyLogoUrl}
                      tags={skillTags}
                      candidateSkills={candidateSkillList}
                      typePill={contractLabel}
                      roleDescription={roleDesc}
                      amenities={amenities}
                      scoreSlot={
                        <MatchScoreRing score={score} label={matchTierLabel(score)} />
                      }
                      aiInsightSlot={
                        <div className="space-y-3">
                          <div className="relative rounded-2xl bg-linear-to-br from-indigo-600 to-purple-700 p-5 text-white overflow-hidden">
                            <div
                              data-decorative="true"
                              className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl pointer-events-none"
                            />
                            <div className="relative z-10">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
                                  <Sparkles className="w-3.5 h-3.5 text-white" />
                                </div>
                                <h4 className="font-bold text-sm text-white">Why you matched</h4>
                              </div>
                              <p className="text-sm text-white/85 leading-relaxed whitespace-pre-wrap">
                                {m.explanation?.trim() || "—"}
                              </p>
                            </div>
                          </div>
                          {m.strengths && m.strengths.length > 0 && (
                            <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4">
                              <h4 className="font-bold text-xs uppercase tracking-widest text-emerald-600 mb-3 flex items-center gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Your strengths
                              </h4>
                              <ul className="space-y-2">
                                {m.strengths.map((s: string, i: number) => (
                                  <li key={i} className="flex items-start gap-2.5 text-sm text-emerald-900">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                                    {s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {m.concerns && m.concerns.length > 0 && (
                            <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4">
                              <h4 className="font-bold text-xs uppercase tracking-widest text-amber-600 mb-3 flex items-center gap-2">
                                <AlertTriangle className="w-3.5 h-3.5" /> Points to consider
                              </h4>
                              <ul className="space-y-2">
                                {m.concerns.map((c: string, i: number) => (
                                  <li key={i} className="flex items-start gap-2.5 text-sm text-amber-900">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                                    {c}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      }
                      detailsSlot={
                        <button
                          type="button"
                          onClick={() => setSelectedJob(selectedJobFromAiMatch(m, offer))}
                          className="shrink-0 px-5 py-2.5 border border-indigo-200 text-indigo-700 bg-white hover:bg-indigo-50 text-sm font-semibold rounded-lg transition-colors w-full sm:w-auto"
                        >
                          Details
                        </button>
                      }
                      applySlot={
                        <button
                          type="button"
                          onClick={handleApply}
                          className="shrink-0 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm active:scale-[0.98] w-full sm:w-auto"
                        >
                          Apply Now
                        </button>
                      }
                    />
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            /* Empty / not-yet-run state */
            <motion.div
              key="recommendation-empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="bg-linear-to-br from-indigo-50 to-teal-50 rounded-3xl p-10 border border-indigo-100 text-center">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Sparkles className="w-10 h-10 text-primary" />
                </div>
                <h4 className="font-display text-2xl font-bold text-text-primary mb-2">
                  Discover Your Perfect Match
                </h4>
                <p className="text-text-secondary text-sm max-w-sm mx-auto mb-6 leading-relaxed">
                  Our AI analyzes your profile, disability type, and accessibility needs
                  to find roles where you'll truly thrive.
                </p>
                <button
                  type="button"
                  onClick={fetchAiMatches}
                  disabled={loading}
                  className="inline-flex items-center gap-2 bg-linear-to-r from-primary to-primary-light text-white rounded-2xl px-8 py-3 font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Sparkles size={18} />
                  )}
                  Get AI Recommendations
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 5. RECENT APPLICATIONS                                               */}
      {/* ------------------------------------------------------------------ */}
      <div data-guide="apply_track">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold text-gray-900">Recent Applications</h3>
          {applications.length > 0 && (
            <button
              type="button"
              onClick={() => navigate("/dashboard/candidate/applications")}
              className="text-sm text-primary font-medium hover:underline"
            >
              View all →
            </button>
          )}
        </div>

        {appsLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-4 bg-gray-100 rounded w-1/4" />
                  <div className="ml-auto h-6 w-24 bg-gray-200 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : recentApps.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <Send size={28} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400 mb-3">No applications yet</p>
            <button
              type="button"
              onClick={() => navigate("/dashboard/candidate/find-jobs")}
              className="text-sm text-primary font-semibold hover:underline"
            >
              Browse Jobs
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {recentApps.map((app) => {
              const cfg = STATUS_CONFIG[app.status];
              const StatusIcon = STATUS_ICON_MAP[cfg.icon];
              return (
                <div
                  key={app._id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">
                      {app.offer_title || "Job Offer"}
                    </p>
                    {app.company_name && (
                      <p className="text-xs text-gray-500 mt-0.5">{app.company_name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-gray-400">{shortDate(app.created_at)}</span>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${BADGE_COLOR[cfg.color]}`}
                    >
                      {StatusIcon && <StatusIcon size={12} />}
                      {cfg.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
