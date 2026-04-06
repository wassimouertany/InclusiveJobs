import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
} from "react";
import {
  Search,
  MapPin,
  Filter,
  Star,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { useToast } from "../../context/ToastContext";
import { apiClient } from "../../services/apiClient";
import JobCard from "../../components/JobCard";
import { useCandidateDashboard } from "./CandidateDashboardContext";
import type { JobOfferListItem } from "./apiTypes";
import { selectedJobFromOffer } from "./selectedJobUtils";
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

const filters = [
  { name: "Job Type", options: ["Full-time", "Part-time", "Contract", "Internship"] },
  {
    name: "Accessibility",
    options: ["Visual Aid", "Hearing Aid", "Wheelchair Access", "Neurodiverse Friendly"],
  },
  { name: "Location", options: ["Remote", "Tunis", "Sfax", "Sousse", "Ariana"] },
];

export default function CandidateFindJobs() {
  const { showToast } = useToast();
  const { setSelectedJob, profile } = useCandidateDashboard();

  const candidateSkillList = useMemo(
    () => normalizeToStringArray(profile?.key_skills),
    [profile?.key_skills]
  );
  const [offers, setOffers] = useState<JobOfferListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [savedOfferIds, setSavedOfferIds] = useState<Set<string>>(() => new Set());

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

  const filteredJobs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return offers.filter((job) => {
      const title = (job.title ?? "").toLowerCase();
      const desc = (job.description ?? "").toLowerCase();
      const company = (job.profile_title ?? "").toLowerCase();
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
        company.includes(q) ||
        skills.includes(q);
      const matchesLocation =
        !locationQuery.trim() || loc.includes(locationQuery.toLowerCase());
      return matchesSearch && matchesLocation;
    });
  }, [offers, searchQuery, locationQuery]);

  const toggleSaveOffer = (id: string, e: MouseEvent) => {
    e.stopPropagation();
    setSavedOfferIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleApply = (e: MouseEvent) => {
    e.stopPropagation();
    showToast(
      "Application submitted — full apply flow coming soon.",
      "success"
    );
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
      {/* Header search — mirrors public FindJobs */}
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

          <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
            <button
              type="button"
              className="flex items-center px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium border border-primary/20 whitespace-nowrap"
            >
              <Filter className="w-4 h-4 mr-2" />
              All Filters
            </button>
            {["Remote", "Full-time", "Hybrid", "Tech"].map((f, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSearchQuery((q) => (q ? `${q} ${f}` : f))}
                className="px-4 py-2 bg-white border border-gray-200 text-text-secondary rounded-full text-sm font-medium hover:border-primary hover:text-primary transition-colors whitespace-nowrap"
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-8">
        <div className="hidden lg:block space-y-8">
          <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-text-primary">Filters</h3>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setLocationQuery("");
                }}
                className="text-sm text-primary hover:underline"
              >
                Clear all
              </button>
            </div>

            {filters.map((category, idx) => (
              <div key={idx} className="mb-6 last:mb-0">
                <h4 className="font-semibold text-sm text-text-primary mb-3 flex justify-between cursor-pointer">
                  {category.name}
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </h4>
                <div className="space-y-2">
                  {category.options.map((opt, i) => (
                    <label
                      key={i}
                      className="flex items-center space-x-3 cursor-pointer group"
                    >
                      <input
                        type="checkbox"
                        className="peer h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/20"
                        onChange={() => showToast(`Filter “${opt}” — coming soon`, "info")}
                      />
                      <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
                        {opt}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
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

          {filteredJobs.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-border shadow-sm">
              <p className="text-text-secondary text-lg">
                {offers.length === 0
                  ? "No open job offers right now."
                  : "No jobs found matching your criteria."}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setLocationQuery("");
                }}
                className="mt-4 text-primary font-medium hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
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
                  candidateSkills={candidateSkillList}
                  typePill={contractLabel}
                  roleDescription={
                    job.description?.trim() ||
                    "No detailed description provided for this role yet."
                  }
                  amenities={amenities}
                  detailsSlot={
                    <button
                      type="button"
                      onClick={() => setSelectedJob(selectedJobFromOffer(job))}
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
                    <button
                      type="button"
                      onClick={handleApply}
                      className="shrink-0 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm active:scale-[0.98] w-full sm:w-auto"
                    >
                      Apply Now
                    </button>
                  }
                />
                </Fragment>
              );
            })
          )}

          {filteredJobs.length > 0 && (
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
  );
}
