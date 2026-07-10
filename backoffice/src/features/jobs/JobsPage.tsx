import { useEffect, useState } from "react";
import PageShell from "../../components/layout/PageShell";
import SearchInput from "../../components/ui/SearchInput";
import FilterChips from "../../components/ui/FilterChips";
import DataTable, { type Column } from "../../components/ui/DataTable";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Drawer from "../../components/ui/Drawer";
import Skeleton from "../../components/ui/Skeleton";
import { useToast } from "../../app/ToastContext";
import { formatDate } from "../../utils/formatDate";
import {
  fetchJobs,
  setJobStatus,
  type RealJob,
} from "../../services/adminApi";

function fmtType(value: string | undefined): string {
  if (!value) return "—";
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function JobsPage() {
  const { showToast } = useToast();

  const [jobs, setJobs] = useState<RealJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<RealJob | null>(null);

  useEffect(() => {
    fetchJobs()
      .then(setJobs)
      .catch(() => showToast("Failed to load jobs", "error"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = jobs.filter((j) => {
    const matchQuery =
      !query ||
      `${j.title} ${j.company_name ?? ""}`.toLowerCase().includes(query.toLowerCase());
    const matchStatus = statusFilter === "all" || j.status === statusFilter;
    return matchQuery && matchStatus;
  });

  async function updateStatus(job: RealJob, status: string) {
    try {
      await setJobStatus(job._id, status);
      setJobs((prev) => prev.map((j) => (j._id === job._id ? { ...j, status } : j)));
      if (selected?._id === job._id) setSelected({ ...job, status });
      showToast(`"${job.title}" set to ${status}`);
    } catch {
      showToast("Failed to update job status", "error");
    }
  }

  const columns: Column<RealJob>[] = [
    {
      key: "id",
      header: "ID",
      render: (j) => (
        <span style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "var(--bo-muted)" }}>
          {j._id.slice(-6).toUpperCase()}
        </span>
      ),
    },
    {
      key: "title",
      header: "Title",
      render: (j) => <span style={{ fontWeight: 600 }}>{j.title}</span>,
    },
    { key: "company", header: "Company", render: (j) => j.company_name ?? "—" },
    { key: "location", header: "Location", render: (j) => j.location ?? "—" },
    { key: "type", header: "Type", render: (j) => fmtType(j.contract_type) },
    { key: "status", header: "Status", render: (j) => <Badge value={j.status} /> },
    {
      key: "posted",
      header: "Posted",
      render: (j) => (j.created_at ? formatDate(j.created_at) : "—"),
    },
    {
      key: "actions",
      header: "Actions",
      render: (j) => (
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => setSelected(j)}>
            View
          </Button>
          {j.status === "open" && (
            <Button variant="ghost" onClick={() => updateStatus(j, "closed")}>
              Close
            </Button>
          )}
          {j.status === "closed" && (
            <>
              <Button variant="ghost" onClick={() => updateStatus(j, "open")}>
                Open
              </Button>
              <Button variant="ghost" onClick={() => updateStatus(j, "archived")}>
                Archive
              </Button>
            </>
          )}
          {j.status === "archived" && (
            <Button variant="ghost" onClick={() => updateStatus(j, "open")}>
              Open
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <PageShell title="Jobs" subtitle="Manage job offers and publication status.">
      <div className="bo-toolbar">
        <SearchInput value={query} onChange={setQuery} placeholder="Search jobs…" />
        <FilterChips
          label="Status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { label: "All", value: "all" },
            { label: "Open", value: "open" },
            { label: "Closed", value: "closed" },
            { label: "Archived", value: "archived" },
          ]}
        />
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : (
        <DataTable columns={columns} rows={filtered} rowKey={(j) => j._id} />
      )}

      <Drawer
        open={!!selected}
        title={selected?.title ?? "Job detail"}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <div className="space-y-4 text-sm">
            <p><strong>Company:</strong> {selected.company_name ?? "—"}</p>
            <p><strong>Location:</strong> {selected.location ?? "—"}</p>
            <p><strong>Type:</strong> {fmtType(selected.contract_type)}</p>
            <p><strong>Status:</strong> <Badge value={selected.status} /></p>
            {selected.created_at && (
              <p><strong>Posted:</strong> {formatDate(selected.created_at)}</p>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              {selected.status !== "open" && (
                <Button onClick={() => updateStatus(selected, "open")}>Open</Button>
              )}
              {selected.status !== "closed" && (
                <Button variant="ghost" onClick={() => updateStatus(selected, "closed")}>
                  Close
                </Button>
              )}
              {selected.status !== "archived" && (
                <Button variant="ghost" onClick={() => updateStatus(selected, "archived")}>
                  Archive
                </Button>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </PageShell>
  );
}
