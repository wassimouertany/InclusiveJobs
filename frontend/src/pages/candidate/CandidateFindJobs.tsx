import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { Search, MapPin, Star, ChevronDown, Loader2, ChevronLeft, Building, Send } from "lucide-react";
import { useToast } from "../../context/ToastContext";
import { apiClient } from "../../services/apiClient";
import JobCard from "../../components/JobCard";
import { useCandidateDashboardOptional } from "./CandidateDashboardContext";
import type { JobOfferListItem } from "./apiTypes";
import { selectedJobFromOffer } from "./selectedJobUtils";
import {
  formatEnumLabel,
  formatPosted,
  hasMeaningfulHtmlText,
  normalizeJobSkillTags,
  normalizeToStringArray,
  splitAccommodations,
} from "./shared";
import { jobOfferCompanyLogoUrl } from "../../utils/jobOfferDisplay";
import { ContractType, OfferStatus, UserRole, WorkPreference } from "../../types";
import { useAuthStore } from "../../config/auth";

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

/** Backend `ContractType` — exact `contract_type` on offers. */
const CONTRACT_TYPE_FILTERS: { value: ContractType; label: string }[] = [
  { value: ContractType.PERMANENT, label: "Permanent (CDI)" },
  { value: ContractType.FIXED_TERM, label: "Fixed term (CDD)" },
  { value: ContractType.CIVP, label: "CIVP" },
  { value: ContractType.KARAMA, label: "Karama" },
  { value: ContractType.INTERNSHIP, label: "Internship (Stage)" },
];

/**
 * Backend `WorkPreference` values — match keywords in offer `working_conditions`
 * (free text; not a separate field on offers).
 */
const WORK_ARRANGEMENT_FILTERS: {
  value: WorkPreference;
  label: string;
  keywords: string[];
}[] = [
  {
    value: WorkPreference.FULLY_REMOTE,
    label: "Fully remote",
    keywords: [
      "fully_remote",
      "fully remote",
      "full remote",
      "100% remote",
      "remote-first",
      "remote first",
      "télétravail",
      "teletravail",
      "work from home",
      "wfh",
    ],
  },
  {
    value: WorkPreference.HYBRID,
    label: "Hybrid",
    keywords: ["hybrid", "hybride", "2/3", "3/2"],
  },
  {
    value: WorkPreference.ON_SITE,
    label: "On site",
    keywords: [
      "on_site",
      "on site",
      "onsite",
      "on-site",
      "presentiel",
      "présentiel",
      "office",
      "on premise",
    ],
  },
  {
    value: WorkPreference.FLEXIBLE_HOURS,
    label: "Flexible hours",
    keywords: [
      "flexible_hours",
      "flexible hours",
      "flexible hour",
      "horaires flexibles",
      "core hours",
      "flex time",
    ],
  },
  {
    value: WorkPreference.PART_TIME,
    label: "Part time",
    keywords: [
      "part_time",
      "part time",
      "part-time",
      "temps partiel",
      "mi-temps",
      "half-time",
    ],
  },
];

/** UI id + label + keywords matched in `possible_accommodations` (case-insensitive). */
const ACCESSIBILITY_FILTERS: { id: string; label: string; keywords: string[] }[] = [
  {
    id: "visual_aid",
    label: "Visual Aid",
    keywords: [
      "visual",
      "screen reader",
      "malvoyant",
      "visually impaired",
      "low vision",
      "braille",
      "a11y",
    ],
  },
  {
    id: "hearing_aid",
    label: "Hearing Aid",
    keywords: ["hearing", "deaf", "hoh", "audio", "sourd", "malentendant", "caption", "subtitle"],
  },
  {
    id: "wheelchair_access",
    label: "Wheelchair Access",
    keywords: ["wheelchair", "fauteuil roulant", "mobility", "ramp", "rampe", "accessible office"],
  },
  {
    id: "neurodiverse_friendly",
    label: "Neurodiverse Friendly",
    keywords: ["neuro", "neurodiverse", "autism", "adhd", "tnd", "sensory", "asperger"],
  },
  {
    id: "ergonomic_workstation",
    label: "Ergonomic Workstation",
    keywords: ["ergonomic", "ergonom", "workstation", "desk setup", "adjustable desk", "chair"],
  },
  {
    id: "flexible_scheduling",
    label: "Flexible Scheduling",
    keywords: [
      "flexible schedul",
      "flexible schedule",
      "horaire modulable",
      "async",
      "flexible timing",
    ],
  },
];

function isOfferOpen(job: JobOfferListItem): boolean {
  const s = (job.status ?? OfferStatus.OPEN).toLowerCase();
  return s === OfferStatus.OPEN;
}

function jobMatchesContractTypes(
  job: JobOfferListItem,
  selected: Set<ContractType>
): boolean {
  if (selected.size === 0) return true;
  const ct = (job.contract_type ?? "").trim().toLowerCase();
  for (const c of selected) {
    if (ct === String(c).toLowerCase()) return true;
  }
  return false;
}

function jobMatchesWorkArrangements(
  job: JobOfferListItem,
  selected: Set<WorkPreference>
): boolean {
  if (selected.size === 0) return true;
  const text = (job.working_conditions ?? "").toLowerCase();
  if (!text.trim()) return false;
  for (const pref of selected) {
    const def = WORK_ARRANGEMENT_FILTERS.find((x) => x.value === pref);
    if (!def) continue;
    if (def.keywords.some((k) => text.includes(k.toLowerCase()))) return true;
  }
  return false;
}

function jobMatchesAccessibilityFilters(
  job: JobOfferListItem,
  selectedIds: Set<string>
): boolean {
  if (selectedIds.size === 0) return true;
  const text = (job.possible_accommodations ?? "").toLowerCase();
  if (!text.trim()) return false;
  for (const id of selectedIds) {
    const def = ACCESSIBILITY_FILTERS.find((x) => x.id === id);
    if (!def) continue;
    if (def.keywords.some((k) => text.includes(k.toLowerCase()))) return true;
  }
  return false;
}

function toggleInSet<T extends string>(prev: Set<T>, key: T): Set<T> {
  const next = new Set(prev);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}

function FilterSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="border-b border-border pb-4 mb-4 last:mb-0 last:border-0 last:pb-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 py-1 text-left"
        aria-expanded={open}
      >
        <span className="font-semibold text-sm text-text-primary">{title}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open ? <div className="mt-3 space-y-2.5">{children}</div> : null}
    </div>
  );
}

const LOGO_BG = [
  "bg-blue-600",
  "bg-orange-500",
  "bg-purple-600",
  "bg-red-600",
  "bg-green-600",
  "bg-indigo-600",
];

export default function CandidateFindJobs() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const dashboard = useCandidateDashboardOptional();
  const role = useAuthStore((s) => s.role);
  const isCandidate = role === UserRole.CANDIDATE;
  const isRecruiter = role === UserRole.COMPANY;
  const isGuest = !role;
  const profile = dashboard?.profile ?? null;
  const setSelectedJob = dashboard?.setSelectedJob ?? null;
  const isInsideCandidateDashboard = Boolean(dashboard);

  const candidateSkillList = useMemo(
    () => normalizeToStringArray(profile?.key_skills),
    [profile?.key_skills]
  );
  const highlightedSkills = isGuest ? undefined : candidateSkillList;
  const [offers, setOffers] = useState<JobOfferListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [savedOfferIds, setSavedOfferIds] = useState<Set<string>>(() => new Set());
  const [publicSelectedJob, setPublicSelectedJob] = useState<JobOfferListItem | null>(null);
  const [applyingToId, setApplyingToId] = useState<string | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(() => new Set());

  const [openContractSection, setOpenContractSection] = useState(true);
  const [openWorkSection, setOpenWorkSection] = useState(true);
  const [openAccessibilitySection, setOpenAccessibilitySection] = useState(true);

  const [selectedContractTypes, setSelectedContractTypes] = useState<Set<ContractType>>(
    () => new Set()
  );
  const [selectedWorkPreferences, setSelectedWorkPreferences] = useState<Set<WorkPreference>>(
    () => new Set()
  );
  const [selectedAccessibilityIds, setSelectedAccessibilityIds] = useState<Set<string>>(
    () => new Set()
  );

  const loadOffers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<JobOfferListItem[]>("/job-offers/", {
        validateStatus: () => true,
      });
      if (res.status < 200 || res.status >= 300) {
        setError(readErrorDetailFromResponseLike(res.data, res.statusText));
        setOffers([]);
        return;
      }
      setOffers(Array.isArray(res.data) ? res.data : []);
    } catch {
      setError("Network error. Is the API running?");
      setOffers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOffers();
  }, [loadOffers]);

  useEffect(() => {
    if (!isCandidate) return;
    apiClient
      .get<{ offer_id: string }[]>("/applications/mine")
      .then((res) => {
        setAppliedIds(new Set(res.data.map((a) => a.offer_id)));
      })
      .catch(() => {});
  }, [isCandidate]);

  const filteredJobs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return offers.filter((job) => {
      if (!isOfferOpen(job)) return false;
      if (!jobMatchesContractTypes(job, selectedContractTypes)) return false;
      if (!jobMatchesWorkArrangements(job, selectedWorkPreferences)) return false;
      if (!jobMatchesAccessibilityFilters(job, selectedAccessibilityIds)) return false;

      const title = (job.title ?? "").toLowerCase();
      const desc = (job.description ?? "").toLowerCase();
      const companyName = (job.company_name ?? "").toLowerCase();
      const profileTitle = (job.profile_title ?? "").toLowerCase();
      const skills = [
        ...(job.key_skills ?? []),
        ...(job.required_skills ?? []),
      ]
        .join(" ")
        .toLowerCase();
      const loc = [job.recruiter_location ?? "", job.working_conditions ?? ""]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !q ||
        title.includes(q) ||
        desc.includes(q) ||
        companyName.includes(q) ||
        profileTitle.includes(q) ||
        skills.includes(q);
      const matchesLocation =
        !locationQuery.trim() || loc.includes(locationQuery.toLowerCase());
      return matchesSearch && matchesLocation;
    });
  }, [
    offers,
    searchQuery,
    locationQuery,
    selectedContractTypes,
    selectedWorkPreferences,
    selectedAccessibilityIds,
  ]);

  const clearAllFilters = useCallback(() => {
    setSearchQuery("");
    setLocationQuery("");
    setSelectedContractTypes(new Set());
    setSelectedWorkPreferences(new Set());
    setSelectedAccessibilityIds(new Set());
  }, []);

  const openDetails = useCallback(
    (job: JobOfferListItem) => {
      if (isCandidate && setSelectedJob) {
        setSelectedJob(selectedJobFromOffer(job));
        return;
      }
      setPublicSelectedJob(job);
    },
    [isCandidate, setSelectedJob]
  );

  const toggleSaveOffer = (id: string, e: MouseEvent) => {
    e.stopPropagation();
    setSavedOfferIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleApply = async (offerId: string, offerTitle: string) => {
    if (isRecruiter) return;
    if (isGuest) {
      showToast("Please sign in or create an account to apply.", "info");
      navigate("/login");
      return;
    }
    setApplyingToId(offerId);
    try {
      await apiClient.post("/applications/", { offer_id: offerId, cover_letter: "" });
      setAppliedIds((prev) => new Set([...prev, offerId]));
      showToast(`Successfully applied to ${offerTitle}!`, "success");
      apiClient.post("/badges/award/first_application").catch(() => {});
    } catch (err: any) {
      if (err?.response?.status === 409) {
        showToast("You have already applied to this offer", "info");
      } else {
        showToast("Failed to apply. Please try again.", "error");
      }
    } finally {
      setApplyingToId(null);
    }
  };

  const runSearchToast = () => {
    showToast(
      `Found ${filteredJobs.length} job${filteredJobs.length === 1 ? "" : "s"} matching your criteria`,
      "info"
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-gray-500">
        <Loader2 className="animate-spin text-primary" size={44} />
        <p className="font-medium text-gray-600">Loading open positions…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-10 rounded-2xl border border-red-200 text-center shadow-sm">
        <p className="text-red-600 font-medium mb-4">{error}</p>
        <button
          type="button"
          onClick={loadOffers}
          className="px-6 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] -mt-2">
      <div
        className={
          isInsideCandidateDashboard
            ? ""
            : "max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8"
        }
      >
        <div className="bg-white border border-border rounded-2xl shadow-sm mb-6 overflow-hidden">
          <div className="px-4 sm:px-6 py-5 border-b border-border/80">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-grow relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by job title, skill, or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-gray-900"
                />
              </div>
              <div className="flex-grow-0 md:w-1/3 relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Location (e.g., Remote, Tunis)"
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-gray-900"
                />
              </div>
              <button
                type="button"
                onClick={runSearchToast}
                className="bg-primary text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20 flex items-center justify-center active:scale-95 whitespace-nowrap"
              >
                Search Jobs
              </button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
        <div className="hidden lg:block space-y-8">
          <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-text-primary">Filters</h3>
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-sm text-primary hover:underline"
              >
                Clear all
              </button>
            </div>
           

            <FilterSection
              title="Contract type"
              open={openContractSection}
              onToggle={() => setOpenContractSection((o) => !o)}
            >
              {CONTRACT_TYPE_FILTERS.map(({ value, label }) => (
                <label
                  key={value}
                  className="flex cursor-pointer items-start gap-3 rounded-lg py-0.5 group"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-primary focus:ring-primary/20"
                    checked={selectedContractTypes.has(value)}
                    onChange={() =>
                      setSelectedContractTypes((prev) => toggleInSet(prev, value))
                    }
                  />
                  <span className="text-sm text-text-secondary group-hover:text-text-primary">
                    <span className="font-medium text-text-primary">{label}</span>
                  </span>
                </label>
              ))}
            </FilterSection>

            <FilterSection
              title="Work arrangement"
              open={openWorkSection}
              onToggle={() => setOpenWorkSection((o) => !o)}
            >

              {WORK_ARRANGEMENT_FILTERS.map(({ value, label }) => (
                <label
                  key={value}
                  className="flex cursor-pointer items-start gap-3 rounded-lg py-0.5 group"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-primary focus:ring-primary/20"
                    checked={selectedWorkPreferences.has(value)}
                    onChange={() =>
                      setSelectedWorkPreferences((prev) => toggleInSet(prev, value))
                    }
                  />
                  <span className="text-sm text-text-secondary group-hover:text-text-primary">
                    <span className="font-medium text-text-primary">{label}</span>
                  </span>
                </label>
              ))}
            </FilterSection>

            <FilterSection
              title="Accessibility accommodations"
              open={openAccessibilitySection}
              onToggle={() => setOpenAccessibilitySection((o) => !o)}
            >
              <p className="text-[11px] text-text-secondary leading-snug mb-1">
                Keyword match on{" "}
                <code className="rounded bg-gray-100 px-0.5">possible_accommodations</code>.
              </p>
              {ACCESSIBILITY_FILTERS.map(({ id, label }) => (
                <label
                  key={id}
                  className="flex cursor-pointer items-start gap-3 rounded-lg py-0.5 group"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-primary focus:ring-primary/20"
                    checked={selectedAccessibilityIds.has(id)}
                    onChange={() =>
                      setSelectedAccessibilityIds((prev) => toggleInSet(prev, id))
                    }
                  />
                  <span className="text-sm text-text-secondary group-hover:text-text-primary">
                    {label}
                  </span>
                </label>
              ))}
            </FilterSection>
          </div>

          <div className="bg-gradient-to-br from-primary to-primary-dark p-6 rounded-2xl text-white shadow-lg">
            <h3 className="font-bold text-lg mb-2">Need help applying?</h3>
            <p className="text-white/80 text-sm mb-4">
              Our accessibility experts can review your profile.
            </p>
            <button
              type="button"
              onClick={() => showToast("Support request — we’ll be in touch soon.", "info")}
              className="w-full py-2 bg-white text-primary rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors"
            >
              Get Support
            </button>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          {publicSelectedJob ? (
            <div className="bg-white p-8 rounded-2xl border border-border shadow-sm animate-in fade-in zoom-in-95 duration-200">
              <button
                type="button"
                onClick={() => setPublicSelectedJob(null)}
                className="text-primary font-bold flex items-center gap-2 mb-6 hover:underline"
              >
                <ChevronLeft size={20} /> Back
              </button>

              <div className="flex justify-between items-start mb-8 flex-wrap gap-4">
                <div>
                  <h2 className="text-3xl font-black text-gray-900">{publicSelectedJob.title}</h2>
                  <div className="flex flex-wrap items-center gap-4 text-gray-500 mt-2">
                    <span className="flex items-center gap-1">
                      <Building size={18} />{" "}
                      {(publicSelectedJob.company_name || publicSelectedJob.profile_title || "InclusiveJobs partner").trim()}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin size={18} /> {publicSelectedJob.recruiter_location?.trim() || "Location not specified"}
                    </span>
                  </div>
                  {publicSelectedJob.contract_type ? (
                    <p className="text-sm text-gray-600 mt-2">
                      <span className="font-semibold text-gray-800">Contract: </span>
                      {formatEnumLabel(publicSelectedJob.contract_type)}
                    </p>
                  ) : null}
                  {publicSelectedJob.working_conditions?.trim() ? (
                    <p className="text-sm text-gray-600 mt-2 max-w-2xl">
                      <span className="font-semibold text-gray-800">Work arrangement: </span>
                      <span className="whitespace-pre-wrap">
                        {publicSelectedJob.working_conditions.trim()}
                      </span>
                    </p>
                  ) : null}
                </div>
                {!isRecruiter ? (
                  appliedIds.has(publicSelectedJob._id) ? (
                    <button
                      disabled
                      className="shrink-0 px-6 py-2.5 bg-green-100 text-green-700 text-sm font-semibold rounded-xl border border-green-200 flex items-center gap-2 cursor-default"
                    >
                      Applied ✓
                    </button>
                  ) : applyingToId === publicSelectedJob._id ? (
                    <button
                      disabled
                      className="shrink-0 px-6 py-2.5 bg-indigo-400 text-white text-sm font-semibold rounded-xl flex items-center gap-2 cursor-not-allowed"
                    >
                      <Loader2 className="w-4 h-4 animate-spin" /> Applying…
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleApply(publicSelectedJob._id, publicSelectedJob.title)}
                      className="shrink-0 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm active:scale-[0.98] flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" /> Apply Now
                    </button>
                  )
                ) : null}
              </div>

              <div className="space-y-6 text-gray-700">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Job description</h3>
                  {hasMeaningfulHtmlText(publicSelectedJob.description) ? (
                    <div
                      className="prose prose-sm max-w-none text-gray-700"
                      dangerouslySetInnerHTML={{ __html: publicSelectedJob.description ?? "" }}
                    />
                  ) : (
                    <p className="text-gray-500">No description provided.</p>
                  )}
                </div>

                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Key skills</h3>
                  {normalizeJobSkillTags(publicSelectedJob.key_skills, publicSelectedJob.required_skills)
                    .length > 0 ? (
                    <ul className="list-disc pl-5 space-y-1">
                      {normalizeJobSkillTags(publicSelectedJob.key_skills, publicSelectedJob.required_skills).map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 text-sm">No specific skills listed for this role.</p>
                  )}
                </div>

                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Accommodations</h3>
                  {splitAccommodations(publicSelectedJob.possible_accommodations).length > 0 ? (
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {splitAccommodations(publicSelectedJob.possible_accommodations).join("; ")}
                    </p>
                  ) : (
                    <p className="text-gray-500 text-sm">
                      No specific accommodations listed for this role.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {!publicSelectedJob ? (
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <h2 className="font-bold text-xl text-text-primary">
              {filteredJobs.length}{" "}
              <span className="text-text-secondary font-normal">Jobs Found</span>
            </h2>
            <div className="flex items-center text-sm text-text-secondary">
              Sort by:{" "}
              <span className="font-medium text-text-primary ml-1 cursor-pointer">
                Newest
              </span>
              <ChevronDown className="w-4 h-4 ml-1" />
            </div>
          </div>
          ) : null}

          {!publicSelectedJob && filteredJobs.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-border shadow-sm">
              <p className="text-text-secondary text-lg">
                {offers.length === 0
                  ? "No open job offers right now."
                  : "No jobs found matching your criteria."}
              </p>
              <button
                type="button"
                onClick={clearAllFilters}
                className="mt-4 text-primary font-medium hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : !publicSelectedJob ? (
            filteredJobs.map((job, index) => {
              const logoClass = LOGO_BG[index % LOGO_BG.length];
              const companyLine =
                job.company_name?.trim() ||
                job.profile_title?.trim() ||
                "InclusiveJobs partner";
              const skillTags = normalizeJobSkillTags(
                job.key_skills,
                job.required_skills
              ).slice(0, 12);
              const logoLetter = (companyLine || job.title || "?")
                .charAt(0)
                .toUpperCase();
              const companyLogoUrl = jobOfferCompanyLogoUrl(job.company_logo_id);
              const contractLabel = formatEnumLabel(job.contract_type);
              const amenities = splitAccommodations(job.possible_accommodations);
              const saved = savedOfferIds.has(job._id);

              return (
                <Fragment key={job._id}>
                  <JobCard
                    motionIndex={index}
                    showRoleAndAmenities={false}
                    title={job.title}
                    company={companyLine}
                    roleHeadline={
                      job.company_name?.trim() && job.profile_title?.trim()
                        ? job.profile_title.trim()
                        : undefined
                    }
                    recruiterLocation={
                      job.recruiter_location?.trim() || "Location not specified"
                    }
                    workingConditions={job.working_conditions?.trim()}
                    posted={formatPosted(job.created_at)}
                    logoClassName={logoClass}
                    logoLetter={logoLetter}
                    companyLogoUrl={companyLogoUrl}
                    tags={skillTags}
                    candidateSkills={highlightedSkills}
                    typePill={contractLabel}
                    roleDescription={
                      job.description?.trim() ||
                      "No detailed description provided for this role yet."
                    }
                    amenities={amenities}
                    detailsSlot={
                      <button
                        type="button"
                        onClick={() => openDetails(job)}
                        className="shrink-0 px-5 py-2.5 border border-indigo-200 text-indigo-700 bg-white hover:bg-indigo-50 text-sm font-semibold rounded-lg transition-colors w-full sm:w-auto"
                      >
                        Details
                      </button>
                    }
                    starSlot={
                      <button
                        type="button"
                        className={`p-2 rounded-lg transition-colors ${
                          saved
                            ? "text-amber-500"
                            : "text-gray-300 hover:text-amber-500"
                        }`}
                        onClick={(e) => toggleSaveOffer(job._id, e)}
                        aria-pressed={saved}
                        aria-label={saved ? "Remove saved job" : "Save job"}
                      >
                        <Star
                          className="w-5 h-5"
                          fill={saved ? "currentColor" : "none"}
                        />
                      </button>
                    }
                    applySlot={
                      isRecruiter ? (
                        <span className="shrink-0 px-6 py-2.5 bg-gray-100 text-gray-500 text-sm font-semibold rounded-lg border border-gray-200 w-full sm:w-auto text-center">
                          Recruiter View
                        </span>
                      ) : appliedIds.has(job._id) ? (
                        <button
                          disabled
                          className="shrink-0 px-6 py-2.5 bg-green-100 text-green-700 text-sm font-semibold rounded-xl border border-green-200 w-full sm:w-auto flex items-center justify-center gap-2 cursor-default"
                        >
                          Applied ✓
                        </button>
                      ) : applyingToId === job._id ? (
                        <button
                          disabled
                          className="shrink-0 px-6 py-2.5 bg-indigo-400 text-white text-sm font-semibold rounded-xl w-full sm:w-auto flex items-center justify-center gap-2 cursor-not-allowed"
                        >
                          <Loader2 className="w-4 h-4 animate-spin" /> Applying…
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleApply(job._id, job.title)}
                          className="shrink-0 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm active:scale-[0.98] w-full sm:w-auto flex items-center justify-center gap-2"
                        >
                          <Send className="w-4 h-4" /> Apply Now
                        </button>
                      )
                    }
                  />
                </Fragment>
              );
            })
          ) : null}

          {!publicSelectedJob && filteredJobs.length > 0 && (
            <div className="flex justify-center mt-8">
              <button
                type="button"
                onClick={() => showToast("More listings load when available.", "info")}
                className="px-6 py-3 border border-gray-200 text-text-secondary rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm"
              >
                Load More Jobs
              </button>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
