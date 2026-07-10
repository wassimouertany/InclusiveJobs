import { useEffect, useState } from "react";
import PageShell from "../../components/layout/PageShell";
import SearchInput from "../../components/ui/SearchInput";
import FilterChips from "../../components/ui/FilterChips";
import DataTable, { type Column } from "../../components/ui/DataTable";
import Badge from "../../components/ui/Badge";
import Skeleton from "../../components/ui/Skeleton";
import { useToast } from "../../app/ToastContext";
import { formatDate } from "../../utils/formatDate";
import { fetchApplications, type RealApplication } from "../../services/adminApi";

export default function ApplicationsPage() {
  const { showToast } = useToast();

  const [applications, setApplications] = useState<RealApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchApplications()
      .then(setApplications)
      .catch(() => showToast("Failed to load applications", "error"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = applications.filter((a) => {
    const matchQuery =
      !query ||
      `${a.candidate_name} ${a.job_title} ${a.company_name}`
        .toLowerCase()
        .includes(query.toLowerCase());
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    return matchQuery && matchStatus;
  });

  const columns: Column<RealApplication>[] = [
    {
      key: "id",
      header: "ID",
      render: (a) => (
        <span style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "var(--bo-muted)" }}>
          {a._id.slice(-6).toUpperCase()}
        </span>
      ),
    },
    {
      key: "candidate",
      header: "Candidate",
      render: (a) => <span style={{ fontWeight: 600 }}>{a.candidate_name}</span>,
    },
    { key: "job", header: "Job", render: (a) => a.job_title || "—" },
    { key: "company", header: "Company", render: (a) => a.company_name || "—" },
    { key: "status", header: "Status", render: (a) => <Badge value={a.status} /> },
    {
      key: "date",
      header: "Date",
      render: (a) => (a.created_at ? formatDate(a.created_at) : "—"),
    },
  ];

  return (
    <PageShell
      title="Applications"
      subtitle="Track candidate applications across the hiring pipeline."
    >
      <div className="bo-toolbar">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search by candidate, job, or company…"
        />
        <FilterChips
          label="Status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { label: "All", value: "all" },
            { label: "Submitted", value: "submitted" },
            { label: "Under Review", value: "under_review" },
            { label: "Interview", value: "interview_scheduled" },
            { label: "Accepted", value: "accepted" },
            { label: "Rejected", value: "rejected" },
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
        <DataTable columns={columns} rows={filtered} rowKey={(a) => a._id} />
      )}
    </PageShell>
  );
}
