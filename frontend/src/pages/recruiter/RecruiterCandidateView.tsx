import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import { API_BASE_URL } from "../../config/api";
import {
  Download,
  Briefcase,
  User,
  MapPin,
  GraduationCap,
  Clock,
  Heart,
  Star,
  Shield,
  Zap,
  FileText,
  ExternalLink,
  CheckCircle,
  ArrowLeft,
  AlertTriangle,
} from "lucide-react";

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
  work_accommodations?: string[] | string;
  key_skills?: string[] | string;
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

function parseListField(value: unknown): string[] {
  if (value == null) return [];
  if (typeof value === "string") {
    const t = value.trim();
    if (!t) return [];
    if (t.startsWith("[") && t.endsWith("]")) {
      try {
        const p = JSON.parse(t);
        if (Array.isArray(p)) return p.map(String).filter(Boolean);
      } catch { /* fall through */ }
    }
    return [t];
  }
  if (Array.isArray(value)) {
    const out: string[] = [];
    for (const item of value) {
      if (typeof item === "string") {
        const s = item.trim();
        if (s.startsWith("[") && s.endsWith("]")) {
          try {
            const inner = JSON.parse(s);
            if (Array.isArray(inner)) { out.push(...inner.map(String).filter(Boolean)); continue; }
          } catch { /* fall through */ }
        }
        if (s) out.push(s);
      } else if (item != null) {
        out.push(String(item));
      }
    }
    return out;
  }
  return [];
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
  const accommodations = parseListField(candidate?.work_accommodations);
  const skills = parseListField(candidate?.key_skills);
  const isAvailable = candidate?.availability_status === "actively_looking";
  const backTarget =
    typeof (location.state as { from?: unknown } | null)?.from === "string"
      ? ((location.state as { from: string }).from || "").trim()
      : "";

  function back() {
    backTarget ? navigate(backTarget) : navigate(-1);
  }

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-16 border border-slate-100 shadow-sm">
        <div className="space-y-4 animate-pulse">
          <div className="h-48 bg-slate-100 rounded-3xl" />
          <div className="grid grid-cols-5 gap-4">
            <div className="col-span-2 space-y-3">
              <div className="h-32 bg-slate-100 rounded-2xl" />
              <div className="h-24 bg-slate-100 rounded-2xl" />
              <div className="h-28 bg-slate-100 rounded-2xl" />
            </div>
            <div className="col-span-3 h-125 bg-slate-100 rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="bg-red-50 rounded-3xl p-16 text-center border border-red-100">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={28} className="text-red-500" />
        </div>
        <p className="font-bold text-red-700 text-lg mb-2">Profile not found</p>
        <p className="text-red-500 text-sm">{error ?? "Candidate not found."}</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-6 bg-red-600 text-white rounded-xl px-6 py-2.5 font-semibold hover:bg-red-700 transition"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 space-y-6">
      {/* ── SECTION 1: Hero Banner ───────────────────────────────────────── */}
      <div className="bg-linear-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <button
            onClick={back}
            className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm font-medium transition-colors mb-6"
          >
            <ArrowLeft size={16} /> Back to results
          </button>

          <div className="flex items-end gap-6">
            {/* Avatar */}
            {candidate.photo_url ? (
              <img
                src={photoSrc}
                alt={fullName}
                className="w-24 h-24 rounded-2xl object-cover border-4 border-white/20 shadow-2xl shrink-0"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-linear-to-br from-indigo-400 to-purple-600 border-4 border-white/20 shadow-2xl flex items-center justify-center text-white text-3xl font-black shrink-0">
                {initials(candidate.first_name, candidate.last_name)}
              </div>
            )}

            {/* Name + pills */}
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl font-black text-white mb-1">{fullName}</h1>
              <p className="text-lg text-white/70 mb-3">{candidate.profile_title || "—"}</p>
              <div className="flex gap-2 flex-wrap">
                {candidate.work_preference && (
                  <span className="bg-white/10 text-white/80 border border-white/20 rounded-full px-3 py-1 text-xs font-medium flex items-center gap-1">
                    <Zap size={12} /> {formatLabel(candidate.work_preference)}
                  </span>
                )}
                {candidate.industry && (
                  <span className="bg-white/10 text-white/80 border border-white/20 rounded-full px-3 py-1 text-xs font-medium flex items-center gap-1">
                    <Briefcase size={12} /> {formatLabel(candidate.industry)}
                  </span>
                )}
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium flex items-center gap-1.5 border ${
                    isAvailable
                      ? "bg-green-500/20 border-green-400/30 text-green-300"
                      : "bg-gray-500/20 border-gray-500/30 text-gray-400"
                  }`}
                >
                  {isAvailable && (
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  )}
                  {formatLabel(candidate.availability_status)}
                </span>
              </div>
            </div>

            {/* Quick stat stack */}
            <div className="flex flex-col gap-2 text-right shrink-0 ml-auto">
              <div>
                <p className="text-2xl font-black text-white leading-none">
                  {candidate.years_of_experience != null ? `${candidate.years_of_experience}y` : "—"}
                </p>
                <p className="text-xs text-white/50 mt-0.5">experience</p>
              </div>
              <p className="text-sm font-semibold text-white/70">{formatLabel(candidate.education_level)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: Two-column grid ───────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start">
        {/* LEFT COLUMN */}
        <div className="xl:col-span-2 space-y-4">

          {/* Card A: Profile Details */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <User size={14} /> Profile Details
            </p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { Icon: GraduationCap, label: "Education",      value: formatLabel(candidate.education_level) },
                { Icon: Clock,         label: "Experience",     value: candidate.years_of_experience != null ? `${candidate.years_of_experience} years` : "—" },
                { Icon: MapPin,        label: "Work Style",     value: formatLabel(candidate.work_preference) },
                { Icon: Heart,         label: "Disability Type",value: formatLabel(candidate.disability_type) },
              ].map(({ Icon, label, value }) => (
                <div key={label} className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                    <Icon size={11} /> {label}
                  </p>
                  <p className="text-sm font-semibold text-slate-800">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Card B: Accessibility Needs */}
          <div className="bg-linear-to-br from-teal-50 to-indigo-50 rounded-2xl p-5 border border-teal-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center">
                <Shield size={16} className="text-white" />
              </div>
              <span className="font-bold text-slate-800">Accessibility Needs</span>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              {candidate.accessibility_needs || "No specific needs declared."}
            </p>
          </div>

          {/* Card C: Work Accommodations */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <CheckCircle size={14} /> Accommodations
            </p>
            <div className="flex flex-wrap gap-2">
              {accommodations.length > 0 ? (
                accommodations.map((item, idx) => (
                  <span
                    key={`${item}-${idx}`}
                    className="bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl px-3 py-1.5 text-xs font-semibold"
                  >
                    {item}
                  </span>
                ))
              ) : (
                <span className="text-slate-400 text-sm italic">None specified</span>
              )}
            </div>
          </div>

          {/* Card D: Key Skills */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Star size={14} /> Key Skills
              <span className="bg-slate-100 text-slate-600 rounded-full px-2 py-0.5 text-xs font-bold ml-2 inline">
                {skills.length}
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              {skills.length > 0 ? (
                skills.map((skill, idx) => (
                  <span
                    key={`${skill}-${idx}`}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${
                      idx < 8
                        ? "bg-linear-to-r from-indigo-50 to-purple-50 text-indigo-700 border border-indigo-100 hover:from-indigo-100 transition-colors"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {skill}
                  </span>
                ))
              ) : (
                <span className="text-slate-400 text-sm italic">No skills listed</span>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="xl:col-span-3 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Resume header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                <FileText size={20} className="text-indigo-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Resume</h3>
                <p className="text-xs text-slate-400">PDF Document</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => window.open(resumeUrl, "_blank", "noopener,noreferrer")}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-2 transition-colors"
              >
                <Download size={16} /> Download
              </button>
              <button
                type="button"
                onClick={() => window.open(resumeUrl, "_blank")}
                className="bg-white border border-slate-200 hover:border-slate-300 text-slate-600 rounded-xl px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors"
              >
                <ExternalLink size={14} /> Open
              </button>
            </div>
          </div>

          {/* Resume content */}
          {candidate.resume_id ? (
            <iframe
              src={`${API_BASE_URL}/users/candidates/${candidateId}/resume`}
              className="w-full"
              style={{ height: "760px", display: "block" }}
              title="Candidate Resume"
            />
          ) : (
            <div className="h-190 flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <FileText size={36} className="text-slate-300" />
              </div>
              <p className="text-slate-500 font-semibold mb-1">No resume uploaded</p>
              <p className="text-slate-400 text-sm">This candidate hasn't uploaded a resume yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
