import { useMemo, useState } from "react";
import PageShell from "../../components/layout/PageShell";
import FilterChips from "../../components/ui/FilterChips";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import SearchInput from "../../components/ui/SearchInput";
import { useBoStore } from "../../store/useBoStore";
import { useFakeSearch } from "../../hooks/useFakeSearch";

export default function EmployersPage() {
  const employers = useBoStore((s) => s.employers);
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const {
    query,
    setQuery,
    filtered: searched,
  } = useFakeSearch(employers, (e, q) =>
    [e.name, e.industry ?? "", e.plan].join(" ").toLowerCase().includes(q),
  );

  const filtered = useMemo(
    () =>
      searched.filter((e) => {
        if (planFilter !== "all" && e.plan !== planFilter) return false;
        if (statusFilter !== "all" && e.status !== statusFilter) return false;
        return true;
      }),
    [searched, planFilter, statusFilter],
  );

  return (
    <PageShell title="Employers" subtitle="Partner companies and hiring plans">
      <div className="bo-toolbar">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="   Search employers..."
        />
        <FilterChips
          label="Plan"
          value={planFilter}
          onChange={setPlanFilter}
          options={[
            { label: "All", value: "all" },
            { label: "Starter", value: "Starter" },
            { label: "Pro", value: "Pro" },
            { label: "Enterprise", value: "Enterprise" },
          ]}
        />
        <FilterChips
          label="Status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { label: "All", value: "all" },
            { label: "Active", value: "active" },
            { label: "Trial", value: "trial" },
            { label: "Suspended", value: "suspended" },
          ]}
        />
      </div>

      <section className="bo-employers-grid">
        {filtered.map((employer) => (
          <Card key={employer.id} className="bo-employer-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="bo-kicker">{employer.id}</p>
                <h2 className="text-lg font-bold mt-1">{employer.name}</h2>
                <p className="text-sm text-[var(--bo-muted)]">
                  {employer.industry}
                </p>
              </div>
              <Badge value={employer.status} />
            </div>
            <div className="bo-card-stats mt-4 text-sm">
              <div>
                <p className="text-[var(--bo-muted)]">Plan</p>
                <p className="font-semibold">{employer.plan}</p>
              </div>
              <div>
                <p className="text-[var(--bo-muted)]">Jobs</p>
                <p className="font-semibold">{employer.jobs}</p>
              </div>
              <div>
                <p className="text-[var(--bo-muted)]">Hires</p>
                <p className="font-semibold">{employer.hires}</p>
              </div>
            </div>
          </Card>
        ))}
      </section>
    </PageShell>
  );
}
