import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
  Search,
  Send,
  User,
  XCircle,
} from "lucide-react";
import { useToast } from "../../context/ToastContext";
import { apiClient } from "../../services/apiClient";
import { API_BASE_URL } from "../../config/api";
import { STATUS_CONFIG } from "../../types/application";
import {
  formatPostedDate,
  readErrorDetailFromResponseLike,
} from "./recruiterShared";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ICON_MAP = { Clock, Search, Calendar, CheckCircle, XCircle };

const BADGE_COLOR = {
  blue:   "bg-blue-100 text-blue-700",
  yellow: "bg-yellow-100 text-yellow-700",
  purple: "bg-purple-100 text-purple-700",
  green:  "bg-green-100 text-green-700",
  red:    "bg-red-100 text-red-700",
};

const BORDER_COLOR = {
  blue:   "border-l-blue-400",
  yellow: "border-l-yellow-400",
  purple: "border-l-purple-500",
  green:  "border-l-green-500",
  red:    "border-l-red-400",
};

const STATUS_OPTIONS = [
  { value: "submitted",           label: "Submitted" },
  { value: "under_review",        label: "Under Review" },
  { value: "interview_scheduled", label: "Interview Scheduled" },
  { value: "accepted",            label: "Accepted" },
  { value: "rejected",            label: "Rejected" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function candidateInitials(candidate) {
  const fn = (candidate?.first_name || "").trim();
  const ln = (candidate?.last_name || "").trim();
  if (fn && ln) return (fn[0] + ln[0]).toUpperCase();
  if (fn) return fn.slice(0, 2).toUpperCase();
  return "?";
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 border-l-4 border-l-gray-200 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-gray-200 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-5 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-100 rounded w-1/4" />
          <div className="flex gap-2 mt-2">
            <div className="h-6 w-16 bg-gray-100 rounded-full" />
            <div className="h-6 w-20 bg-gray-100 rounded-full" />
          </div>
        </div>
        <div className="h-7 w-28 bg-gray-200 rounded-full shrink-0" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RecruiterApplicationsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const offerId = searchParams.get("offer");

  const [offerTitle, setOfferTitle] = useState("");
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Inline update panel state
  const [expandedId, setExpandedId] = useState(null);
  const [updateForm, setUpdateForm] = useState({
    status: "submitted",
    interviewDate: "",
    interviewLocation: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!offerId) return;

    // Fetch offer title and applications in parallel
    apiClient
      .get(`/job-offers/${offerId}`, { validateStatus: () => true })
      .then((res) => {
        if (res.status >= 200 && res.status < 300) {
          setOfferTitle(res.data.title || "Offer");
        }
      })
      .catch(() => {});

    apiClient
      .get(`/applications/for-offer/${offerId}`, { validateStatus: () => true })
      .then((res) => {
        if (res.status >= 200 && res.status < 300) {
          setApplications(Array.isArray(res.data) ? res.data : []);
        } else {
          showToast(
            readErrorDetailFromResponseLike(res.data, res.statusText),
            "error"
          );
        }
      })
      .catch(() => showToast("Could not load applications.", "error"))
      .finally(() => setLoading(false));
  }, [offerId]);

  function openUpdatePanel(app) {
    const alreadyOpen = expandedId === app._id;
    setExpandedId(alreadyOpen ? null : app._id);
    if (!alreadyOpen) {
      setUpdateForm({
        status: app.status,
        interviewDate: app.interview_date
          ? new Date(app.interview_date).toISOString().slice(0, 16)
          : "",
        interviewLocation: app.interview_location || "",
        notes: app.interview_notes || "",
      });
    }
  }

  async function handleSave(app) {
    setSaving(true);
    try {
      const body = {
        status: updateForm.status,
        interview_notes: updateForm.notes,
        interview_location: updateForm.interviewLocation,
        ...(updateForm.status === "interview_scheduled" && updateForm.interviewDate
          ? { interview_date: new Date(updateForm.interviewDate).toISOString() }
          : {}),
      };
      const res = await apiClient.patch(
        `/applications/${app._id}/status`,
        body,
        { validateStatus: () => true }
      );
      if (res.status >= 200 && res.status < 300) {
        setApplications((prev) =>
          prev.map((a) => (a._id === app._id ? { ...a, ...res.data } : a))
        );
        setExpandedId(null);
        showToast("Application status updated.", "success");
      } else {
        showToast(
          readErrorDetailFromResponseLike(res.data, res.statusText),
          "error"
        );
      }
    } catch {
      showToast("Failed to update status.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (!offerId) {
    return (
      <div className="p-8 text-center text-gray-500">
        No offer selected.{" "}
        <button
          type="button"
          className="text-indigo-600 underline"
          onClick={() => navigate("/dashboard/recruiter/jobs")}
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <button
          type="button"
          onClick={() => navigate("/dashboard/recruiter/jobs")}
          className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium mb-4 transition-colors"
        >
          <ArrowLeft size={16} /> Back to My Jobs
        </button>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-gray-900">
            {offerTitle || "Applications"}
          </h1>
          {!loading && (
            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold">
              {applications.length}{" "}
              {applications.length === 1 ? "application" : "applications"}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : applications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-20 gap-4 text-center px-6">
          <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center">
            <Send size={32} className="text-indigo-400" />
          </div>
          <div>
            <p className="text-gray-800 font-semibold text-lg">No applications yet</p>
            <p className="text-gray-400 text-sm mt-1">
              No one has applied to this offer yet.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => {
            const cfg = STATUS_CONFIG[app.status] ?? STATUS_CONFIG.submitted;
            const StatusIcon = ICON_MAP[cfg.icon];
            const candidate = app.candidate || {};
            const candidateName =
              [candidate.first_name, candidate.last_name]
                .filter(Boolean)
                .join(" ") || "Unknown Candidate";
            const initials = candidateInitials(candidate);
            const skills = Array.isArray(candidate.key_skills)
              ? candidate.key_skills
              : [];
            const visibleSkills = skills.slice(0, 3);
            const extraSkills = skills.length - visibleSkills.length;
            const isExpanded = expandedId === app._id;

            return (
              <div
                key={app._id}
                className={`bg-white rounded-2xl border border-gray-100 shadow-sm border-l-4 ${BORDER_COLOR[cfg.color]} overflow-hidden`}
              >
                {/* Card body */}
                <div className="p-5">
                  <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
                    {/* Avatar */}
                    <div className="relative w-12 h-12 shrink-0">
                      <div className="w-12 h-12 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm select-none">
                        {initials}
                      </div>
                      {candidate._id && (
                        <img
                          src={`${API_BASE_URL}/users/candidates/${candidate._id}/photo`}
                          alt={candidateName}
                          className="absolute inset-0 w-12 h-12 rounded-full object-cover"
                          onError={(e) => { e.currentTarget.style.display = "none"; }}
                        />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-base truncate">
                        {candidateName}
                      </p>
                      {candidate.profile_title && (
                        <p className="text-sm text-gray-500 truncate mt-0.5">
                          {candidate.profile_title}
                        </p>
                      )}
                      {visibleSkills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {visibleSkills.map((skill) => (
                            <span
                              key={skill}
                              className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded-full font-medium"
                            >
                              {skill}
                            </span>
                          ))}
                          {extraSkills > 0 && (
                            <span className="px-2.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full font-medium">
                              +{extraSkills} more
                            </span>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        Applied on {formatDate(app.created_at)}
                      </p>
                    </div>

                    {/* Status badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium shrink-0 ${BADGE_COLOR[cfg.color]}`}
                    >
                      {StatusIcon && <StatusIcon size={14} />}
                      {cfg.label}
                    </span>
                  </div>

                  {/* Interview info box */}
                  {app.status === "interview_scheduled" && app.interview_date && (
                    <div className="mt-4 flex items-start gap-3 bg-purple-50 border border-purple-100 rounded-xl px-4 py-3">
                      <Calendar size={16} className="text-purple-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-purple-800">
                          {formatDateTime(app.interview_date)}
                        </p>
                        {app.interview_location && (
                          <p className="text-xs text-purple-600 mt-0.5">
                            {app.interview_location}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 mt-4 flex-wrap">
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/dashboard/recruiter/candidate/${encodeURIComponent(
                            String(app.candidate_id)
                          )}`
                        )
                      }
                      className="px-4 py-2 border border-indigo-200 text-indigo-700 bg-white hover:bg-indigo-50 text-sm font-semibold rounded-xl transition-colors flex items-center gap-1.5"
                    >
                      <User size={14} /> View Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => openUpdatePanel(app)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-1.5"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp size={14} /> Close
                        </>
                      ) : (
                        <>
                          <ChevronDown size={14} /> Update Status
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Inline update panel */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 px-5 py-5 space-y-4">
                    {/* Status select */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        Status
                      </label>
                      <select
                        value={updateForm.status}
                        onChange={(e) =>
                          setUpdateForm((f) => ({ ...f, status: e.target.value }))
                        }
                        className="w-full sm:w-64 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Interview fields */}
                    {updateForm.status === "interview_scheduled" && (
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                            Interview date &amp; time
                          </label>
                          <input
                            type="datetime-local"
                            value={updateForm.interviewDate}
                            onChange={(e) =>
                              setUpdateForm((f) => ({
                                ...f,
                                interviewDate: e.target.value,
                              }))
                            }
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                            Location / URL
                          </label>
                          <input
                            type="text"
                            value={updateForm.interviewLocation}
                            onChange={(e) =>
                              setUpdateForm((f) => ({
                                ...f,
                                interviewLocation: e.target.value,
                              }))
                            }
                            placeholder="https://meet.google.com/… or office address"
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                          />
                        </div>
                      </div>
                    )}

                    {/* Private notes */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        Private notes
                      </label>
                      <textarea
                        rows={3}
                        value={updateForm.notes}
                        onChange={(e) =>
                          setUpdateForm((f) => ({ ...f, notes: e.target.value }))
                        }
                        placeholder="Internal notes visible only to you…"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                      />
                    </div>

                    {/* Save */}
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleSave(app)}
                        disabled={saving}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2"
                      >
                        {saving ? (
                          <>
                            <Loader2 size={14} className="animate-spin" /> Saving…
                          </>
                        ) : (
                          <>
                            <CheckCircle size={14} /> Save
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
