import { useMemo, useState } from "react";
import PageShell from "../../components/layout/PageShell";
import SearchInput from "../../components/ui/SearchInput";
import DataTable, { type Column } from "../../components/ui/DataTable";
import Badge from "../../components/ui/Badge";
import MatchBar from "../../components/ui/MatchBar";
import { useFakeSearch } from "../../hooks/useFakeSearch";
import { useBoStore } from "../../store/useBoStore";
import { useToast } from "../../app/ToastContext";
import type { AppStatus, BoApplication } from "../../types";

const columns_order: AppStatus[] = [
  "pending",
  "review",
  "accepted",
  "rejected",
];

export default function ApplicationsPage() {
  const applications = useBoStore((s) => s.applications);
  const setApplicationStatus = useBoStore((s) => s.setApplicationStatus);
  const { showToast } = useToast();
  const [view, setView] = useState<"table" | "kanban">("table");

  const { query, setQuery, filtered } = useFakeSearch(applications, (a, q) =>
    [a.candidate, a.jobTitle, a.company, a.id]
      .join(" ")
      .toLowerCase()
      .includes(q),
  );

  const byStatus = useMemo(() => {
    const map: Record<AppStatus, BoApplication[]> = {
      pending: [],
      review: [],
      accepted: [],
      rejected: [],
    };
    filtered.forEach((a) => map[a.status].push(a));
    return map;
  }, [filtered]);

  const move = (app: BoApplication, status: AppStatus) => {
    setApplicationStatus(app.id, status);
    showToast(`Application ${app.id} → ${status} (demo)`);
  };

  const tableColumns: Column<BoApplication>[] = [
    { key: "id", header: "ID", render: (a) => a.id },
    { key: "candidate", header: "Candidate", render: (a) => a.candidate },
    { key: "job", header: "Job", render: (a) => a.jobTitle },
    { key: "company", header: "Company", render: (a) => a.company },
    {
      key: "match",
      header: "Match",
      render: (a) => <MatchBar score={a.matchScore} />,
    },
    {
      key: "status",
      header: "Status",
      render: (a) => <Badge value={a.status} />,
    },
    {
      key: "actions",
      header: "Move to",
      render: (a) => (
        <div className="flex flex-wrap gap-1">
          {columns_order
            .filter((s) => s !== a.status)
            .map((s) => (
              <button
                key={s}
                type="button"
                className="bo-chip text-xs"
                onClick={() => move(a, s)}
              >
                {s}
              </button>
            ))}
        </div>
      ),
    },
  ];

  return (
    <PageShell
      title="Applications"
      subtitle="Track candidate applications and match scores"
      actions={
        <div className="flex gap-2">
          <button
            type="button"
            className={`bo-chip ${view === "table" ? "active" : ""}`}
            onClick={() => setView("table")}
          >
            Table
          </button>
          <button
            type="button"
            className={`bo-chip ${view === "kanban" ? "active" : ""}`}
            onClick={() => setView("kanban")}
          >
            Kanban
          </button>
        </div>
      }
    >
      <div className="bo-toolbar">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="    Search applications..."
        />
      </div>

      {view === "table" ? (
        <DataTable
          columns={tableColumns}
          rows={filtered}
          rowKey={(a) => a.id}
        />
      ) : (
        <section className="bo-kanban-grid">
          {columns_order.map((status) => (
            <div key={status} className="bo-kanban-column">
              <h3 className="font-bold capitalize mb-3 flex items-center justify-between">
                {status}
                <Badge value={status} />
              </h3>
              <div className="space-y-3 max-h-[420px] overflow-auto">
                {byStatus[status].map((app) => (
                  <article key={app.id} className="bo-kanban-card">
                    <p className="font-semibold text-sm">{app.candidate}</p>
                    <p className="text-xs text-[var(--bo-muted)]">
                      {app.jobTitle}
                    </p>
                    <div className="mt-2">
                      <MatchBar score={app.matchScore} />
                    </div>
                    <div className="flex flex-wrap gap-1 mt-3">
                      {columns_order
                        .filter((s) => s !== status)
                        .slice(0, 2)
                        .map((s) => (
                          <button
                            key={s}
                            type="button"
                            className="bo-chip text-xs"
                            onClick={() => move(app, s)}
                          >
                            → {s}
                          </button>
                        ))}
                    </div>
                  </article>
                ))}
                {byStatus[status].length === 0 && (
                  <p className="text-xs text-[var(--bo-muted)]">No cards</p>
                )}
              </div>
            </div>
          ))}
        </section>
      )}
    </PageShell>
  );
}
