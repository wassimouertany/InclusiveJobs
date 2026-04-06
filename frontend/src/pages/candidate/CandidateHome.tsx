import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bell, Info, Loader2, Sparkles } from "lucide-react";
import JobCard, { MatchScoreRing, matchTierLabel } from "../../components/JobCard";
import RecommendationSkeleton from "../../components/RecommendationSkeleton";
import { Button } from "../../components/UI";
import { useToast } from "../../context/ToastContext";
import { apiClient } from "../../services/apiClient";
import { useCandidateDashboard } from "./CandidateDashboardContext";
import type {
  AiMatchesForCandidateResponse,
  JobOfferListItem,
} from "./apiTypes";
import { selectedJobFromAiMatch } from "./selectedJobUtils";
import {
  formatEnumLabel,
  formatPosted,
  normalizeJobSkillTags,
  normalizeToStringArray,
  splitAccommodations,
} from "./shared";
import { jobOfferCompanyLogoUrl } from "../../utils/jobOfferDisplay";

function readErrorDetailFromResponseLike(
  data: unknown,
  statusText: string
): string {
  if (data !== null && typeof data === "object" && !Array.isArray(data)) {
    const body = data as { detail?: unknown };
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail)) {
      return (
        body.detail.map((e: { msg?: string }) => e.msg).filter(Boolean).join(", ") ||
        "Request failed"
      );
    }
    return "Request failed";
  }
  return statusText || "Request failed";
}

const LOGO_BG = [
  "bg-blue-600",
  "bg-orange-500",
  "bg-purple-600",
  "bg-red-600",
  "bg-green-600",
  "bg-indigo-600",
];

export default function CandidateHome() {
  const { showToast } = useToast();
  const { displayName, setSelectedJob, profile } = useCandidateDashboard();
  const [matches, setMatches] = useState<
    AiMatchesForCandidateResponse["matches"] | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [offersById, setOffersById] = useState<
    Record<string, JobOfferListItem>
  >({});

  const candidateSkillList = useMemo(
    () => normalizeToStringArray(profile?.key_skills),
    [profile?.key_skills]
  );

  const fetchAiMatches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<AiMatchesForCandidateResponse>(
        "/ai/matches/for-candidate",
        { validateStatus: () => true }
      );
      if (res.status < 200 || res.status >= 300) {
        showToast(
          readErrorDetailFromResponseLike(res.data, res.statusText),
          "error"
        );
        return;
      }
      setMatches(res.data.matches ?? []);
    } catch {
      showToast("Could not load AI recommendations. Is the API running?", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!matches?.length) {
      setOffersById({});
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await apiClient.get<JobOfferListItem[]>("/job-offers/", {
        validateStatus: () => true,
      });
      if (cancelled || res.status < 200 || res.status >= 300 || !Array.isArray(res.data)) {
        return;
      }
      const map: Record<string, JobOfferListItem> = {};
      for (const o of res.data) {
        map[o._id] = o;
      }
      setOffersById(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [matches]);

  const handleApply = (e: MouseEvent) => {
    e.stopPropagation();
    showToast(
      "Application submitted — full apply flow coming soon.",
      "success"
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900">
          Welcome{displayName ? `, ${displayName}` : ""}
        </h2>
        <p className="text-gray-500 mt-2">
          Your candidate dashboard — get AI recommendations here, or browse every
          open role under Find Jobs.
        </p>
      </div>

      <div className="bg-primary/10 border border-primary/20 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="bg-primary text-white p-3 rounded-xl shrink-0">
          <Bell size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-gray-900">AI job matches</h3>
          <p className="text-gray-500 mt-1">
            Get personalized recommendations based on your profile and accessibility
            needs. Results include a compatibility score and a short explanation.
          </p>
          <Button
            className="mt-4 text-sm gap-2"
            onClick={fetchAiMatches}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <Sparkles size={18} />
            )}
            Get AI Recommendations
          </Button>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          Recommended for you
        </h3>

        {matches === null && !loading && (
          <p className="text-sm text-gray-500">
            Click &quot;Get AI Recommendations&quot; above to load matches from the AI
            service.
          </p>
        )}

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
                const companyLogoUrl = jobOfferCompanyLogoUrl(
                  offer?.company_logo_id
                );
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
                const amenities = splitAccommodations(
                  offer?.possible_accommodations
                );
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
                        offer?.company_name?.trim() &&
                        offer?.profile_title?.trim()
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
                        <MatchScoreRing
                          score={score}
                          label={matchTierLabel(score)}
                        />
                      }
                      aiInsightSlot={
                        <div className="space-y-4">
                          <div className="rounded-xl border border-indigo-100/90 bg-indigo-50/35 backdrop-blur-md p-4 shadow-sm">
                            <h4 className="font-bold text-sm text-indigo-950 mb-2">
                              Why you matched
                            </h4>
                            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                              {m.explanation?.trim() || "—"}
                            </p>
                          </div>
                          {m.strengths && m.strengths.length > 0 ? (
                            <div className="rounded-xl border border-indigo-200/70 bg-gradient-to-br from-indigo-50/90 to-violet-50/40 backdrop-blur-md p-4 shadow-sm ring-1 ring-indigo-100/50">
                              <div className="flex gap-3 items-start">
                                <Info
                                  className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5"
                                  strokeWidth={2}
                                  aria-hidden
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-950">
                                    Pro Insight
                                  </p>
                                  <p className="text-xs text-indigo-900/85 mt-1 mb-3">
                                    Strengths the model highlighted for this match
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {m.strengths.map((s) => (
                                      <span
                                        key={s}
                                        className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-white/60 border border-indigo-200/70 text-indigo-950 backdrop-blur-sm shadow-sm"
                                      >
                                        {s}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      }
                      detailsSlot={
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedJob(selectedJobFromAiMatch(m, offer))
                          }
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
          ) : null}
        </AnimatePresence>

        {!loading && matches !== null && matches.length === 0 && (
          <p className="text-sm text-gray-500">
            No matches returned. Try again later or browse all open roles under Find
            Jobs.
          </p>
        )}
      </div>
    </motion.div>
  );
}
