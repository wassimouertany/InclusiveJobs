import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bookmark,
  Briefcase,
  Building,
  Calendar,
  FileText,
  Filter,
  Users,
} from "lucide-react";
import { apiClient } from "../../services/apiClient";
import GuideChecklist from "../../features/guide/GuideChecklist";

function companyInitials(name) {
  const clean = (name || "").trim();
  if (!clean) return "RC";
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2)
    return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ---------------------------------------------------------------------------
// Skeleton for stats cards while loading
// ---------------------------------------------------------------------------
function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="bg-white rounded-2xl p-6 border border-indigo-50 shadow-sm animate-pulse"
        >
          <div className="w-11 h-11 rounded-full bg-gray-200" />
          <div className="h-9 bg-gray-200 rounded w-14 mt-4 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-24 mb-1" />
          <div className="h-3 bg-gray-100 rounded w-20" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// RecruiterHomePage
// ---------------------------------------------------------------------------
export default function RecruiterHomePage() {
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("");
  const [logoUrl, setLogoUrl] = useState(null);
  const [logoFailed, setLogoFailed] = useState(false);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [headcount, setHeadcount] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let blobUrl = null;

    (async () => {
      // Profile + logo in parallel
      const [profileRes, logoRes] = await Promise.allSettled([
        apiClient.get("/users/recruiters/me", { validateStatus: () => true }),
        apiClient.get("/users/recruiters/me/logo", {
          responseType: "blob",
          validateStatus: () => true,
        }),
      ]);

      if (!cancelled) {
        if (
          profileRes.status === "fulfilled" &&
          profileRes.value.status >= 200 &&
          profileRes.value.status < 300
        ) {
          setCompanyName(profileRes.value.data?.company_name?.trim() || "");
          const rawHeadcount = profileRes.value.data?.employees_with_disability;
          setHeadcount(typeof rawHeadcount === "number" ? rawHeadcount : 0);
        }
        if (
          logoRes.status === "fulfilled" &&
          logoRes.value.status >= 200 &&
          logoRes.value.status < 300
        ) {
          blobUrl = URL.createObjectURL(logoRes.value.data);
          setLogoUrl(blobUrl);
        }
      }

      // Stats
      try {
        const r = await apiClient.get("/users/recruiters/me/stats", {
          validateStatus: () => true,
        });
        if (!cancelled && r.status >= 200 && r.status < 300) {
          setStats(r.data);
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, []);

  // Pipeline stages derived from stats
  const stages = stats
    ? [
        { label: "Submitted",    count: stats.pending_applications,  color: "bg-blue-500" },
        { label: "Under Review", count: stats.under_review,          color: "bg-yellow-500" },
        { label: "Interview",    count: stats.interviews_scheduled,   color: "bg-purple-500" },
        { label: "Accepted",     count: stats.accepted,              color: "bg-green-500" },
      ]
    : [];
  const maxCount = stages.length
    ? Math.max(...stages.map((s) => s.count), 1)
    : 1;

  return (
    <div className="space-y-6">

      {/* ── Section 1: Welcome banner ─────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-800 to-indigo-900 text-white rounded-3xl p-8">
        <div className="flex items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-bold">
              {getGreeting()},{" "}
              <span>{companyName || "Recruiter"}</span>
            </h1>
            <p className="text-white/60 mt-1">
              Here's your hiring activity at a glance.
            </p>
            <div className="flex gap-3 mt-6 flex-wrap">
              <button
                onClick={() => navigate("/dashboard/recruiter/jobs")}
                className="bg-white text-indigo-900 font-bold rounded-xl px-5 py-2.5 hover:bg-indigo-50 transition"
              >
                + Create New Offer
              </button>
              <button
                onClick={() => navigate("/dashboard/recruiter/matches")}
                className="bg-indigo-600 text-white font-bold rounded-xl px-5 py-2.5 hover:bg-indigo-500 transition"
              >
                AI Match Candidates
              </button>
            </div>
          </div>

          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold text-white shrink-0 overflow-hidden ring-2 ring-white/10">
            {logoUrl && !logoFailed ? (
              <img
                src={logoUrl}
                alt=""
                className="w-full h-full object-cover"
                onError={() => setLogoFailed(true)}
              />
            ) : (
              companyInitials(companyName)
            )}
          </div>
        </div>
      </div>

      <GuideChecklist />

      {/* ── Section 2: Stats grid ─────────────────────────────────────── */}
      {statsLoading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            {
              key: "headcount",
              label: "Employees w/ Disability",
              value: headcount ?? 0,
              sub: "personnes à besoins spécifiques",
              iconBg: "bg-rose-100",
              iconColor: "text-rose-600",
              Icon: Users,
              guideId: "recruiter_headcount",
            },
            {
              key: "open_offers",
              label: "Open Offers",
              value: stats?.open_offers ?? 0,
              sub: `of ${stats?.total_offers ?? 0} total`,
              iconBg: "bg-indigo-100",
              iconColor: "text-indigo-600",
              Icon: Briefcase,
            },
            {
              key: "applications",
              label: "Applications",
              value: stats?.total_applications ?? 0,
              sub: `${stats?.pending_applications ?? 0} pending review`,
              iconBg: "bg-teal-100",
              iconColor: "text-teal-600",
              Icon: FileText,
            },
            {
              key: "interviews",
              label: "Interviews",
              value: stats?.interviews_scheduled ?? 0,
              sub: `${stats?.accepted ?? 0} accepted`,
              iconBg: "bg-purple-100",
              iconColor: "text-purple-600",
              Icon: Calendar,
            },
            {
              key: "saved_candidates",
              label: "Saved Candidates",
              value: stats?.total_saved_candidates ?? 0,
              sub: "across all offers",
              iconBg: "bg-amber-100",
              iconColor: "text-amber-600",
              Icon: Bookmark,
            },
          ].map(({ key, label, value, sub, iconBg, iconColor, Icon, guideId }) => (
            <div
              key={key}
              data-guide={guideId}
              className="bg-white rounded-2xl p-6 border border-indigo-50 shadow-sm hover:shadow-md transition-shadow"
            >
              <div
                className={`w-11 h-11 rounded-full ${iconBg} flex items-center justify-center`}
              >
                <Icon size={20} className={iconColor} />
              </div>
              <p className="text-4xl font-extrabold text-slate-900 mt-4 mb-1">
                {value}
              </p>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                {label}
              </p>
              <p className="text-xs text-slate-400 mt-1">{sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Section 3: Application pipeline funnel ────────────────────── */}
      {!statsLoading && stats && (
        <div className="bg-white rounded-2xl p-6 border border-indigo-50 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Filter size={18} className="text-slate-400" />
            <h2 className="font-bold text-slate-800">Application Pipeline</h2>
          </div>

          {stages.map(({ label, count, color }) => (
            <div key={label} className="flex items-center gap-3 mb-3">
              <span className="w-28 text-sm font-medium text-slate-600 text-right shrink-0">
                {label}
              </span>
              <div
                className={`h-8 rounded-r-full ${color} flex items-center px-3 text-white text-sm font-bold transition-all duration-700`}
                style={{ width: `${Math.max((count / maxCount) * 100, 8)}%` }}
              >
                {count > 0 ? count : ""}
              </div>
              <span className="text-sm font-bold text-slate-700 ml-2">{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Section 4: Quick actions ──────────────────────────────────── */}
      {/* data-decorative: redundant with the sidebar nav (same destinations),
          hidden in Focus Mode without creating a dead-end. */}
      {!statsLoading && stats && (
        <div className="grid grid-cols-3 gap-4" data-decorative="true">
          {[
            {
              bg: "bg-indigo-50 hover:bg-indigo-100",
              Icon: Briefcase,
              iconCls: "text-indigo-600",
              title: "Manage Offers",
              sub: `${stats.open_offers} open`,
              to: "/dashboard/recruiter/jobs",
            },
            {
              bg: "bg-teal-50 hover:bg-teal-100",
              Icon: FileText,
              iconCls: "text-teal-600",
              title: "View Applications",
              sub: `${stats.pending_applications} need review`,
              to: "/dashboard/recruiter/applications",
            },
            {
              bg: "bg-amber-50 hover:bg-amber-100",
              Icon: Building,
              iconCls: "text-amber-600",
              title: "Company Profile",
              sub: "Update your profile",
              to: "/dashboard/recruiter/profile",
            },
          ].map(({ bg, Icon, iconCls, title, sub, to }) => (
            <div
              key={title}
              onClick={() => navigate(to)}
              className={`${bg} rounded-2xl p-5 cursor-pointer transition text-center`}
            >
              <Icon size={32} className={`${iconCls} mx-auto mb-2`} />
              <p className="font-semibold text-slate-800">{title}</p>
              <p className="text-sm text-slate-500 mt-1">{sub}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
