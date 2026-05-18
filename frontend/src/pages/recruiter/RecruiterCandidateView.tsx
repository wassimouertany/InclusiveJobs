import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import { API_BASE_URL } from "../../config/api";
import { ChevronLeft, Download, Briefcase, User } from "lucide-react";

type Candidate = {
  _id: string;
  first_name?: string;
  last_name?: string;
  profile_title?: string;
  industry?: string;
  years_of_experience?: number;
  education_level?: string;
  work_preference?: string;
  disability_type?: string;
  accessibility_needs?: string;
  work_accommodations?: string[];
  key_skills?: string[];
  availability_status?: string;
  resume_id?: string | null;
  photo_url?: string;
};

function formatLabel(value?: string | number | null): string {
  if (value === undefined || value === null || value === "") return "—";
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function initials(first?: string, last?: string): string {
  const a = first?.trim().charAt(0) ?? "";
  const b = last?.trim().charAt(0) ?? "";
  const s = `${a}${b}`.toUpperCase();
  return s || "CA";
}

export default function RecruiterCandidateView() {
  const { candidateId } = useParams<{ candidateId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!candidateId) {
        setError("Missing candidate id.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.get<Candidate>(
          `/users/candidates/${encodeURIComponent(candidateId)}`,
          { validateStatus: () => true }
        );
        if (cancelled) return;
        if (response.status >= 200 && response.status < 300) {
          setCandidate(response.data);
        } else {
          setCandidate(null);
          setError((response.data as { detail?: string })?.detail || "Candidate not found.");
        }
      } catch {
        if (!cancelled) {
          setCandidate(null);
          setError("Failed to load candidate profile.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [candidateId]);

  const fullName = `${candidate?.first_name || ""} ${candidate?.last_name || ""}`.trim() || "Candidate";
  const photoSrc = candidate?.photo_url ? `${API_BASE_URL}${candidate.photo_url}` : "";
  const resumeUrl = `${API_BASE_URL}/users/candidates/${candidateId}/resume`;
  const accommodations = Array.isArray(candidate?.work_accommodations) ? candidate.work_accommodations : [];
  const skills = Array.isArray(candidate?.key_skills) ? candidate.key_skills : [];
  const isAvailable = candidate?.availability_status === "actively_looking";
  const backTarget =
    typeof (location.state as { from?: unknown } | null)?.from === "string"
      ? ((location.state as { from: string }).from || "").trim()
      : "";

  return (
    <div className="min-h-screen bg-bg-page py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
          <button
            type="button"
            onClick={() => (backTarget ? navigate(backTarget) : navigate(-1))}
            className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
          >
            <ChevronLeft size={18} /> Back
          </button>
          <h1 className="mt-3 text-2xl sm:text-3xl font-black text-gray-900">Candidate Profile</h1>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-border shadow-sm p-10 text-center text-gray-500">
            Loading candidate profile...
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl border border-border shadow-sm p-10 text-center text-red-600">
            {error}
          </div>
        ) : !candidate ? (
          <div className="bg-white rounded-2xl border border-border shadow-sm p-10 text-center text-gray-500">
            Candidate not found.
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            <section className="xl:col-span-2 bg-white rounded-2xl border border-border shadow-sm p-6">
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 overflow-hidden flex items-center justify-center text-primary font-bold text-xl shrink-0">
                  {candidate.photo_url ? (
                    <img src={photoSrc} alt={fullName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <User size={16} /> {initials(candidate.first_name, candidate.last_name)}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="text-2xl font-black text-gray-900 truncate">{fullName}</h2>
                  <p className="text-gray-500 mt-1">{candidate.profile_title || "—"}</p>
                </div>
              </div>

              <div className="my-6 border-t border-border" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Industry</p>
                  <p className="font-semibold text-gray-900">{formatLabel(candidate.industry)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Years of experience</p>
                  <p className="font-semibold text-gray-900">{formatLabel(candidate.years_of_experience)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Education level</p>
                  <p className="font-semibold text-gray-900">{formatLabel(candidate.education_level)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Work preference</p>
                  <p className="font-semibold text-gray-900">{formatLabel(candidate.work_preference)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Disability type</p>
                  <p className="font-semibold text-gray-900">{formatLabel(candidate.disability_type)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Accessibility needs</p>
                  <p className="font-semibold text-gray-900">{candidate.accessibility_needs || "—"}</p>
                </div>
              </div>

              <div className="mt-6">
                <p className="text-gray-500 text-sm mb-2">Work accommodations</p>
                <div className="flex flex-wrap gap-2">
                  {accommodations.length > 0 ? (
                    accommodations.map((item, idx) => (
                      <span
                        key={`${item}-${idx}`}
                        className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold"
                      >
                        {item}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500">—</span>
                  )}
                </div>
              </div>

              <div className="mt-5">
                <p className="text-gray-500 text-sm mb-2">Key skills</p>
                <div className="flex flex-wrap gap-2">
                  {skills.length > 0 ? (
                    skills.map((skill, idx) => (
                      <span
                        key={`${skill}-${idx}`}
                        className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500">—</span>
                  )}
                </div>
              </div>

              <div className="mt-5">
                <p className="text-gray-500 text-sm mb-2">Availability status</p>
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                    isAvailable ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                  }`}
                >
                  <Briefcase size={12} />
                  {formatLabel(candidate.availability_status)}
                </span>
              </div>
            </section>

            <section className="xl:col-span-3 bg-white rounded-2xl border border-border shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Resume</h3>
                <button
                  type="button"
                  onClick={() => window.open(resumeUrl, "_blank", "noopener,noreferrer")}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-gray-700 hover:bg-gray-50"
                >
                  <Download size={16} />
                </button>
              </div>

              {candidate.resume_id ? (
                <iframe
                  src={`${API_BASE_URL}/users/candidates/${candidateId}/resume`}
                  className="w-full rounded-xl border border-gray-200"
                  style={{ height: "780px" }}
                  title="Candidate Resume"
                />
              ) : (
                <div className="h-[780px] w-full rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-500">
                  No resume uploaded.
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
