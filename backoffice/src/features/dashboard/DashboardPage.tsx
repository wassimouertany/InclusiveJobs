import { useMemo, useState } from "react";
import { Users, Briefcase, FileText, Sparkles } from "lucide-react";
import PageShell from "../../components/layout/PageShell";
import StatCard from "../../components/ui/StatCard";
import TrendChart from "../../components/charts/TrendChart";
import Badge from "../../components/ui/Badge";
import MatchBar from "../../components/ui/MatchBar";
import { chartData7d, chartData30d } from "../../data";
import { computeDashboardStats } from "../../data/mockSelectors";
import { useBoStore } from "../../store/useBoStore";
import { useSimulatedLoading } from "../../hooks/useSimulatedLoading";
import Skeleton from "../../components/ui/Skeleton";

const statIcons = [Users, Briefcase, FileText, Sparkles];

export default function DashboardPage() {
  const users = useBoStore((s) => s.users);
  const jobs = useBoStore((s) => s.jobs);
  const applications = useBoStore((s) => s.applications);
  const activityFeed = useBoStore((s) => s.activityFeed);
  const [range, setRange] = useState<"7d" | "30d">("7d");
  const loading = useSimulatedLoading();

  const stats = useMemo(
    () => computeDashboardStats(users, jobs, applications),
    [users, jobs, applications],
  );
  const chart = range === "7d" ? chartData7d : chartData30d;

  if (loading) {
    return (
      <PageShell title="Dashboard" subtitle="Loading analytics…">
        <div className="bo-stat-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Dashboard"
      subtitle="Monitor hiring activity, applications, and inclusion metrics across the platform."
    >
      <section className="bo-stat-grid" aria-label="Key metrics">
        {stats.map((s, i) => (
          <StatCard
            key={s.label}
            label={s.label}
            value={s.value}
            delta={s.delta}
            tone={s.tone}
            icon={statIcons[i] ?? Sparkles}
          />
        ))}
      </section>

      <section className="grid lg:grid-cols-3 gap-5 mb-5">
        <article className="bo-panel lg:col-span-2">
          <header className="bo-panel-header">
            <h2 className="bo-panel-title">Application trend</h2>
            <div className="flex gap-2" role="group" aria-label="Date range">
              <button type="button" className={`bo-chip ${range === "7d" ? "active" : ""}`} onClick={() => setRange("7d")}>
                7 days
              </button>
              <button type="button" className={`bo-chip ${range === "30d" ? "active" : ""}`} onClick={() => setRange("30d")}>
                30 days
              </button>
            </div>
          </header>
          <div className="bo-panel-body">
            <TrendChart data={chart} />
          </div>
        </article>

        <article className="bo-panel">
          <header className="bo-panel-header">
            <h2 className="bo-panel-title">Activity</h2>
          </header>
          <div className="bo-panel-body" style={{ maxHeight: 320, overflowY: "auto" }}>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {activityFeed.slice(0, 8).map((item) => (
                <li key={item.id} className="bo-activity-item">
                  <span className="bo-activity-dot" aria-hidden />
                  <div>
                    <p style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600 }}>{item.message}</p>
                    <p style={{ margin: "0.25rem 0 0", fontSize: "0.78rem", color: "var(--bo-muted)" }}>{item.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </article>
      </section>

      <article className="bo-panel">
        <header className="bo-panel-header">
          <h2 className="bo-panel-title">Recent applications</h2>
        </header>
        <div className="bo-table-wrap">
          <table className="bo-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Role</th>
                <th>Match</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {applications.slice(0, 6).map((app) => (
                <tr key={app.id}>
                  <td style={{ fontWeight: 600 }}>{app.candidate}</td>
                  <td>{app.jobTitle}</td>
                  <td>
                    <MatchBar score={app.matchScore} />
                  </td>
                  <td>
                    <Badge value={app.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </PageShell>
  );
}
