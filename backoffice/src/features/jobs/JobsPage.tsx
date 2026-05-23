import { useMemo, useState } from "react";
import PageShell from "../../components/layout/PageShell";
import SearchInput from "../../components/ui/SearchInput";
import FilterChips from "../../components/ui/FilterChips";
import DataTable, { type Column } from "../../components/ui/DataTable";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Drawer from "../../components/ui/Drawer";
import { useFakeSearch } from "../../hooks/useFakeSearch";
import { useBoStore } from "../../store/useBoStore";
import { useToast } from "../../app/ToastContext";
import type { BoJob, JobStatus } from "../../types";
import { formatDate } from "../../utils/formatDate";

export default function JobsPage() {
  const jobs = useBoStore((s) => s.jobs);
  const setJobStatus = useBoStore((s) => s.setJobStatus);
  const { showToast } = useToast();
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selected, setSelected] = useState<BoJob | null>(null);

  const { query, setQuery, filtered: searched } = useFakeSearch(jobs, (j, q) =>
    [j.title, j.company, j.location, j.type].join(" ").toLowerCase().includes(q),
  );

  const filtered = useMemo(
    () =>
      searched.filter((j) => {
        if (statusFilter !== "all" && j.status !== statusFilter) return false;
        if (typeFilter !== "all" && j.type !== typeFilter) return false;
        return true;
      }),
    [searched, statusFilter, typeFilter],
  );

  const types = useMemo(() => ["all", ...new Set(jobs.map((j) => j.type))], [jobs]);

  const updateStatus = (job: BoJob, status: JobStatus) => {
    setJobStatus(job.id, status);
    showToast(`Job ${job.id} set to ${status} (demo)`);
    setSelected({ ...job, status });
  };

  const columns: Column<BoJob>[] = [
    { key: "id", header: "ID", render: (j) => j.id },
    { key: "title", header: "Title", render: (j) => <span className="font-semibold">{j.title}</span> },
    { key: "company", header: "Company", render: (j) => j.company },
    { key: "location", header: "Location", render: (j) => j.location },
    { key: "type", header: "Type", render: (j) => j.type },
    { key: "status", header: "Status", render: (j) => <Badge value={j.status} /> },
    { key: "posted", header: "Posted", render: (j) => formatDate(j.postedAt) },
    {
      key: "actions",
      header: "Actions",
      render: (j) => (
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => setSelected(j)}>
            View
          </Button>
          {j.status !== "open" && (
            <Button variant="ghost" onClick={() => updateStatus(j, "open")}>
              Open
            </Button>
          )}
          {j.status !== "closed" && (
            <Button variant="ghost" onClick={() => updateStatus(j, "closed")}>
              Close
            </Button>
          )}
          {j.status !== "archived" && (
            <Button variant="ghost" onClick={() => updateStatus(j, "archived")}>
              Archive
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <PageShell title="Jobs" subtitle="Manage job offers and publication status">
      <div className="bo-toolbar">
        <SearchInput value={query} onChange={setQuery} placeholder="    Search jobs..." />
        <FilterChips
          label="Status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { label: "All", value: "all" },
            { label: "Open", value: "open" },
            { label: "Closed", value: "closed" },
            { label: "Archived", value: "archived" },
            { label: "Draft", value: "draft" },
          ]}
        />
        <FilterChips
          label="Type"
          value={typeFilter}
          onChange={setTypeFilter}
          options={types.map((t) => ({ label: t === "all" ? "All" : t, value: t }))}
        />
      </div>

      <DataTable columns={columns} rows={filtered} rowKey={(j) => j.id} />

      <Drawer open={!!selected} title={selected?.title ?? "Job detail"} onClose={() => setSelected(null)}>
        {selected && (
          <div className="space-y-4 text-sm">
            <p>
              <strong>Company:</strong> {selected.company}
            </p>
            <p>
              <strong>Location:</strong> {selected.location}
            </p>
            <p>
              <strong>Type:</strong> {selected.type}
            </p>
            <p>
              <strong>Applicants:</strong> {selected.applicants}
            </p>
            <p>
              <strong>Status:</strong> <Badge value={selected.status} />
            </p>
            <p>{selected.description}</p>
            <p>
              <strong>Accommodations:</strong> {selected.possibleAccommodations}
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={() => updateStatus(selected, "open")}>Open</Button>
              <Button variant="ghost" onClick={() => updateStatus(selected, "closed")}>
                Close
              </Button>
              <Button variant="ghost" onClick={() => updateStatus(selected, "archived")}>
                Archive
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </PageShell>
  );
}
