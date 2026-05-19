import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  Calendar,
  CheckCircle,
  Clock,
  Search,
  Send,
  XCircle,
} from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { STATUS_CONFIG } from "../../types/application";
import type { Application, ApplicationStatus } from "../../types/application";

// ---------------------------------------------------------------------------
// Icon and colour maps
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, React.FC<{ size?: number; className?: string }>> = {
  Clock,
  Search,
  Calendar,
  CheckCircle,
  XCircle,
};

const BORDER_COLOR: Record<string, string> = {
  blue:   "border-l-blue-400",
  yellow: "border-l-yellow-400",
  purple: "border-l-purple-500",
  green:  "border-l-green-500",
  red:    "border-l-red-400",
};

const BADGE_COLOR: Record<string, string> = {
  blue:   "bg-blue-100 text-blue-700",
  yellow: "bg-yellow-100 text-yellow-700",
  purple: "bg-purple-100 text-purple-700",
  green:  "bg-green-100 text-green-700",
  red:    "bg-red-100 text-red-700",
};

// ---------------------------------------------------------------------------
// Stats bar config
// ---------------------------------------------------------------------------

type StatKey = ApplicationStatus | "total";

const STAT_ITEMS: {
  key: StatKey;
  label: string;
  Icon: React.FC<{ size?: number; className?: string }>;
  bg: string;
  text: string;
}[] = [
  { key: "total",               label: "Total",        Icon: Briefcase,   bg: "bg-indigo-50",  text: "text-indigo-600" },
  { key: "under_review",        label: "Under Review", Icon: Search,      bg: "bg-yellow-50",  text: "text-yellow-600" },
  { key: "interview_scheduled", label: "Interviews",   Icon: Calendar,    bg: "bg-purple-50",  text: "text-purple-600" },
  { key: "accepted",            label: "Accepted",     Icon: CheckCircle, bg: "bg-green-50",   text: "text-green-600" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateTime(iso: string): string {
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
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="h-5 bg-gray-200 rounded w-1/2" />
          <div className="h-4 bg-gray-100 rounded w-1/3" />
          <div className="h-3 bg-gray-100 rounded w-1/4 mt-3" />
        </div>
        <div className="h-7 w-28 bg-gray-200 rounded-full shrink-0" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CandidateApplications() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<Application[]>("/applications/mine")
      .then((res) => {
        const sorted = [...res.data].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setApplications(sorted);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const counts: Record<StatKey, number> = {
    total:               applications.length,
    submitted:           applications.filter((a) => a.status === "submitted").length,
    under_review:        applications.filter((a) => a.status === "under_review").length,
    interview_scheduled: applications.filter((a) => a.status === "interview_scheduled").length,
    accepted:            applications.filter((a) => a.status === "accepted").length,
    rejected:            applications.filter((a) => a.status === "rejected").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Applications</h1>
        <p className="text-gray-500 mt-1">Track your application progress</p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {STAT_ITEMS.map(({ key, label, Icon, bg, text }) => (
          <div key={key} className={`${bg} rounded-2xl p-4 flex items-center gap-3`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bg}`}>
              <Icon size={20} className={text} />
            </div>
            <div>
              <p className={`text-2xl font-bold leading-none ${text}`}>
                {loading ? "—" : counts[key]}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* List / loading / empty */}
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
            <p className="text-gray-400 text-sm mt-1 max-w-xs">
              Start exploring job offers and apply to positions that match your profile.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/dashboard/candidate/find-jobs")}
            className="mt-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition-colors"
          >
            Find Jobs
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => {
            const cfg = STATUS_CONFIG[app.status];
            const StatusIcon = ICON_MAP[cfg.icon];
            return (
              <div
                key={app._id}
                className={`bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow border-l-4 ${BORDER_COLOR[cfg.color]} p-5`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {app.offer_title || "Job Offer"}
                    </h3>
                    {app.company_name && (
                      <p className="text-sm text-gray-500 mt-0.5">{app.company_name}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      Applied on {formatDate(app.created_at)}
                    </p>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium shrink-0 ${BADGE_COLOR[cfg.color]}`}
                  >
                    {StatusIcon && <StatusIcon size={14} />}
                    {cfg.label}
                  </span>
                </div>

                {app.status === "interview_scheduled" && app.interview_date && (
                  <div className="mt-4 flex items-start gap-3 bg-purple-50 border border-purple-100 rounded-xl px-4 py-3">
                    <Calendar size={18} className="text-purple-500 shrink-0 mt-0.5" />
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
