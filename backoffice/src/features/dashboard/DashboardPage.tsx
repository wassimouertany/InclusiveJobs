import { useEffect, useState } from "react";
import {
  Users,
  Briefcase,
  FileText,
  TrendingUp,
  MessageSquare,
  Building2,
} from "lucide-react";
import PageShell from "../../components/layout/PageShell";
import StatCard from "../../components/ui/StatCard";
import TrendChart from "../../components/charts/TrendChart";
import Badge from "../../components/ui/Badge";
import Skeleton from "../../components/ui/Skeleton";
import { fetchAdminStats, fetchApplications } from "../../services/adminApi";
import type { AdminStats, RealApplication } from "../../services/adminApi";

function relativeTime(iso: string | undefined): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const DISABILITY_COLORS: Record<string, string> = {
  motor: "#4338CA",
  visual: "#0D9488",
  hearing: "#F59E0B",
  cognitive: "#8B5CF6",
  psychological: "#EF4444",
  other: "#6B7280",
};

type FunnelKey =
  | "applications_submitted"
  | "applications_under_review"
  | "applications_interview_scheduled"
  | "applications_accepted"
  | "applications_rejected";

const FUNNEL_STEPS: { key: FunnelKey; label: string; color: string }[] = [
  { key: "applications_submitted", label: "Submitted", color: "#3B82F6" },
  { key: "applications_under_review", label: "Under Review", color: "#EAB308" },
  { key: "applications_interview_scheduled", label: "Interview Scheduled", color: "#8B5CF6" },
  { key: "applications_accepted", label: "Accepted", color: "#22C55E" },
  { key: "applications_rejected", label: "Rejected", color: "#EF4444" },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentApps, setRecentApps] = useState<RealApplication[]>([]);

  useEffect(() => {
    fetchAdminStats()
      .then(setStats)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
    fetchApplications()
      .then((apps) => {
        const sorted = [...apps].sort(
          (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
        );
        setRecentApps(sorted);
      })
      .catch(() => {});
  }, []);

  if (loading) {
    return (
      <PageShell title="Dashboard" subtitle="Loading analytics…">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </PageShell>
    );
  }

  if (error || !stats) {
    return (
      <PageShell
        title="Dashboard"
        subtitle="Monitor hiring activity, applications, and inclusion metrics across the platform."
      >
        <div className="bo-panel p-8 text-center" style={{ color: "var(--bo-danger)" }}>
          Failed to load stats: {error ?? "Unknown error"}
        </div>
      </PageShell>
    );
  }

  const regTrend = stats.registrations_trend.map((d) => ({ date: d.date, value: d.count }));
  const appTrend = stats.applications_trend.map((d) => ({ date: d.date, value: d.count }));

  const disabilityEntries = Object.entries(stats.disability_breakdown).sort(
    ([, a], [, b]) => b - a,
  );
  const maxDisability = Math.max(...disabilityEntries.map(([, v]) => v), 1);

  return (
    <PageShell
      title="Dashboard"
      subtitle="Monitor hiring activity, applications, and inclusion metrics across the platform."
    >
      {/* ── KPI Cards ── */}
      <section className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5" aria-label="Key metrics">
        <StatCard
          label="Total Candidates"
          value={String(stats.total_candidates)}
          subtitle={`${stats.actively_looking} actively looking`}
          icon={Users}
          tone="neutral"
        />
        <StatCard
          label="Open Offers"
          value={String(stats.open_offers)}
          subtitle={`of ${stats.total_offers} total`}
          icon={Briefcase}
          tone="neutral"
        />
        <StatCard
          label="Total Applications"
          value={String(stats.total_applications)}
          subtitle={`${stats.new_applications_7d} this week`}
          icon={FileText}
          tone="neutral"
        />
        <StatCard
          label="Conversion Rate"
          value={`${stats.conversion_rate}%`}
          subtitle={`${stats.applications_accepted} hired`}
          icon={TrendingUp}
          tone={stats.conversion_rate >= 10 ? "success" : "warning"}
        />
        <StatCard
          label="Stories Published"
          value={String(stats.total_stories)}
          subtitle={`${stats.hired_badges} self-reported hires`}
          icon={MessageSquare}
          tone="success"
        />
        <StatCard
          label="Recruiters"
          value={String(stats.total_recruiters)}
          subtitle="active on platform"
          icon={Building2}
          tone="neutral"
        />
      </section>

      {/* ── Trend Charts ── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <article className="bo-panel">
          <header className="bo-panel-header">
            <h2 className="bo-panel-title">Registrations Trend (30 days)</h2>
          </header>
          <div className="bo-panel-body">
            <TrendChart data={regTrend} label="Registrations" color="#4338CA" />
          </div>
        </article>

        <article className="bo-panel">
          <header className="bo-panel-header">
            <h2 className="bo-panel-title">Applications Trend (30 days)</h2>
          </header>
          <div className="bo-panel-body">
            <TrendChart data={appTrend} label="Applications" color="#0D9488" />
          </div>
        </article>
      </section>

      {/* ── Application Funnel ── */}
      <article className="bo-panel mb-5">
        <header className="bo-panel-header">
          <h2 className="bo-panel-title">Application Funnel</h2>
        </header>
        <div className="bo-panel-body">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {FUNNEL_STEPS.map(({ key, label, color }) => {
              const count = stats[key];
              const pct =
                stats.total_applications > 0
                  ? Math.round((count / stats.total_applications) * 100)
                  : 0;
              return (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span
                    style={{
                      width: "10rem",
                      flexShrink: 0,
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      textAlign: "right",
                      color: "var(--bo-muted)",
                    }}
                  >
                    {label}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      backgroundColor: "var(--bo-surface-muted)",
                      borderRadius: "9999px",
                      height: "0.625rem",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        backgroundColor: color,
                        borderRadius: "9999px",
                        transition: "width 0.5s ease",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      width: "5rem",
                      flexShrink: 0,
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      textAlign: "right",
                    }}
                  >
                    {count}{" "}
                    <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "var(--bo-muted)" }}>
                      ({pct}%)
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </article>

      {/* ── Disability Breakdown + Top Inclusive Recruiters ── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <article className="bo-panel">
          <header className="bo-panel-header">
            <h2 className="bo-panel-title">Disability Breakdown</h2>
          </header>
          <div className="bo-panel-body">
            {disabilityEntries.length === 0 ? (
              <p style={{ fontSize: "0.875rem", color: "var(--bo-muted)" }}>No data yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {disabilityEntries.map(([type, count]) => {
                  const barColor = DISABILITY_COLORS[type] ?? DISABILITY_COLORS.other;
                  const pct = Math.round((count / maxDisability) * 100);
                  return (
                    <div
                      key={type}
                      style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
                    >
                      <span
                        style={{
                          width: "8rem",
                          flexShrink: 0,
                          fontSize: "0.875rem",
                          fontWeight: 500,
                          textTransform: "capitalize",
                          color: "var(--bo-muted)",
                        }}
                      >
                        {type}
                      </span>
                      <div
                        style={{
                          flex: 1,
                          backgroundColor: "var(--bo-surface-muted)",
                          borderRadius: "9999px",
                          height: "0.625rem",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${pct}%`,
                            height: "100%",
                            backgroundColor: barColor,
                            borderRadius: "9999px",
                            transition: "width 0.5s ease",
                          }}
                        />
                      </div>
                      <span
                        style={{
                          width: "2rem",
                          flexShrink: 0,
                          fontSize: "0.875rem",
                          fontWeight: 600,
                          textAlign: "right",
                        }}
                      >
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </article>

        <article className="bo-panel">
          <header className="bo-panel-header">
            <h2 className="bo-panel-title">Top Inclusive Recruiters</h2>
          </header>
          <div className="bo-table-wrap">
            <table className="bo-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Employees w/ disability</th>
                  <th>Hires via platform</th>
                </tr>
              </thead>
              <tbody>
                {stats.top_inclusive_recruiters.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      style={{ textAlign: "center", color: "var(--bo-muted)", padding: "1.5rem 0" }}
                    >
                      No data yet.
                    </td>
                  </tr>
                ) : (
                  stats.top_inclusive_recruiters.map((rec, i) => (
                    <tr key={rec.company_name}>
                      <td style={{ fontWeight: 600 }}>
                        {i === 0 && (
                          <span aria-label="top ranked" style={{ marginRight: "0.375rem" }}>
                            🏆
                          </span>
                        )}
                        {rec.company_name}
                      </td>
                      <td>{rec.employees_with_disability ?? "—"}</td>
                      <td>{rec.total_accepted}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      {/* ── Activity Feed + Recent Applications ── */}
      <section className="grid lg:grid-cols-3 gap-5 mb-5">
        <article className="bo-panel">
          <header className="bo-panel-header">
            <h2 className="bo-panel-title">Recent activity</h2>
          </header>
          <div className="bo-panel-body" style={{ maxHeight: 320, overflowY: "auto" }}>
            {recentApps.length === 0 ? (
              <p style={{ fontSize: "0.875rem", color: "var(--bo-muted)" }}>No activity yet.</p>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {recentApps.slice(0, 8).map((app) => (
                  <li key={app._id} className="bo-activity-item">
                    <span className="bo-activity-dot" aria-hidden />
                    <div>
                      <p style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600 }}>
                        {app.candidate_name} applied to {app.job_title || "a position"}
                      </p>
                      <p style={{ margin: "0.25rem 0 0", fontSize: "0.78rem", color: "var(--bo-muted)" }}>
                        {app.company_name && <span>{app.company_name} · </span>}
                        {relativeTime(app.created_at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </article>

        <article className="bo-panel lg:col-span-2">
          <header className="bo-panel-header">
            <h2 className="bo-panel-title">Recent applications</h2>
          </header>
          <div className="bo-table-wrap">
            <table className="bo-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Role</th>
                  <th>Company</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentApps.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", color: "var(--bo-muted)", padding: "1.5rem 0" }}>
                      No applications yet.
                    </td>
                  </tr>
                ) : (
                  recentApps.slice(0, 6).map((app) => (
                    <tr key={app._id}>
                      <td style={{ fontWeight: 600 }}>{app.candidate_name}</td>
                      <td>{app.job_title || "—"}</td>
                      <td>{app.company_name || "—"}</td>
                      <td>
                        <Badge value={app.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </PageShell>
  );
}
