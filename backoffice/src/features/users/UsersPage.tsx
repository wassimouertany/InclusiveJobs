import { useEffect, useState } from "react";
import PageShell from "../../components/layout/PageShell";
import SearchInput from "../../components/ui/SearchInput";
import FilterChips from "../../components/ui/FilterChips";
import DataTable, { type Column } from "../../components/ui/DataTable";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import Skeleton from "../../components/ui/Skeleton";
import { useToast } from "../../app/ToastContext";
import { formatDate } from "../../utils/formatDate";
import {
  fetchCandidates,
  fetchRecruiters,
  setUserStatus,
  type RealCandidate,
  type RealRecruiter,
} from "../../services/adminApi";

function fmt(value: string | undefined): string {
  if (!value) return "—";
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function UsersPage() {
  const { showToast } = useToast();

  const [candidates, setCandidates] = useState<RealCandidate[]>([]);
  const [recruiters, setRecruiters] = useState<RealRecruiter[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"candidate" | "recruiter">("candidate");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedCandidate, setSelectedCandidate] = useState<RealCandidate | null>(null);
  const [selectedRecruiter, setSelectedRecruiter] = useState<RealRecruiter | null>(null);
  const [confirmItem, setConfirmItem] = useState<RealCandidate | RealRecruiter | null>(null);

  useEffect(() => {
    setLoading(true);
    const fn = tab === "candidate" ? fetchCandidates : fetchRecruiters;
    fn()
      .then((data) => {
        if (tab === "candidate") setCandidates(data as RealCandidate[]);
        else setRecruiters(data as RealRecruiter[]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [tab]);

  const currentList: (RealCandidate | RealRecruiter)[] =
    tab === "candidate" ? candidates : recruiters;

  const filtered = currentList.filter((u) => {
    const name =
      tab === "candidate"
        ? `${(u as RealCandidate).first_name} ${(u as RealCandidate).last_name}`
        : (u as RealRecruiter).company_name;
    const matchQuery =
      !query || `${name} ${u.email}`.toLowerCase().includes(query.toLowerCase());
    const matchStatus = statusFilter === "all" || (u.status ?? "active") === statusFilter;
    return matchQuery && matchStatus;
  });

  async function handleStatusChange(u: RealCandidate | RealRecruiter) {
    const current = u.status ?? "active";
    const next = current === "active" ? "suspended" : "active";
    const role = tab;
    try {
      await setUserStatus(role, u._id, next);
      if (tab === "candidate") {
        setCandidates((prev) =>
          prev.map((c) => (c._id === u._id ? { ...c, status: next } : c)),
        );
      } else {
        setRecruiters((prev) =>
          prev.map((r) => (r._id === u._id ? { ...r, status: next } : r)),
        );
      }
      const name =
        tab === "candidate"
          ? `${(u as RealCandidate).first_name} ${(u as RealCandidate).last_name}`
          : (u as RealRecruiter).company_name;
      showToast(`${name} is now ${next}`);
    } catch {
      showToast("Failed to update status", "error");
    }
    setConfirmItem(null);
  }

  const candidateColumns: Column<RealCandidate>[] = [
    {
      key: "name",
      header: "Name",
      render: (u) => (
        <span style={{ fontWeight: 600 }}>
          {u.first_name} {u.last_name}
        </span>
      ),
    },
    { key: "email", header: "Email", render: (u) => u.email },
    { key: "disability", header: "Disability", render: (u) => fmt(u.disability_type) },
    { key: "preference", header: "Work pref.", render: (u) => fmt(u.work_preference) },
    {
      key: "status",
      header: "Status",
      render: (u) => <Badge value={u.status ?? "active"} />,
    },
    {
      key: "joined",
      header: "Joined",
      render: (u) => (u.created_at ? formatDate(u.created_at) : "—"),
    },
    {
      key: "actions",
      header: "Actions",
      render: (u) => (
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setSelectedCandidate(u)}>
            View
          </Button>
          <Button
            variant={(u.status ?? "active") === "active" ? "danger" : "primary"}
            onClick={() => setConfirmItem(u)}
          >
            {(u.status ?? "active") === "active" ? "Suspend" : "Activate"}
          </Button>
        </div>
      ),
    },
  ];

  const recruiterColumns: Column<RealRecruiter>[] = [
    {
      key: "company",
      header: "Company",
      render: (u) => <span style={{ fontWeight: 600 }}>{u.company_name}</span>,
    },
    { key: "email", header: "Email", render: (u) => u.email },
    { key: "location", header: "Location", render: (u) => u.location ?? "—" },
    { key: "industry", header: "Industry", render: (u) => u.company_industry ?? "—" },
    {
      key: "disability_employees",
      header: "Employees w/ disability",
      render: (u) =>
        u.employees_with_disability != null ? String(u.employees_with_disability) : "—",
    },
    {
      key: "status",
      header: "Status",
      render: (u) => <Badge value={u.status ?? "active"} />,
    },
    {
      key: "joined",
      header: "Joined",
      render: (u) => (u.created_at ? formatDate(u.created_at) : "—"),
    },
    {
      key: "actions",
      header: "Actions",
      render: (u) => (
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setSelectedRecruiter(u)}>
            View
          </Button>
          <Button
            variant={(u.status ?? "active") === "active" ? "danger" : "primary"}
            onClick={() => setConfirmItem(u)}
          >
            {(u.status ?? "active") === "active" ? "Suspend" : "Activate"}
          </Button>
        </div>
      ),
    },
  ];

  const confirmName =
    confirmItem
      ? tab === "candidate"
        ? `${(confirmItem as RealCandidate).first_name} ${(confirmItem as RealCandidate).last_name}`
        : (confirmItem as RealRecruiter).company_name
      : "";
  const confirmAction =
    (confirmItem?.status ?? "active") === "active" ? "Suspend" : "Activate";

  return (
    <PageShell
      title="Users"
      subtitle="Search, filter, and manage candidate and recruiter accounts."
    >
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(["candidate", "recruiter"] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={`bo-chip capitalize ${tab === t ? "active" : ""}`}
            onClick={() => { setTab(t); setQuery(""); setStatusFilter("all"); }}
          >
            {t}s
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bo-toolbar">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={tab === "candidate" ? "Search candidates…" : "Search recruiters…"}
        />
        <FilterChips
          label="Status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { label: "All", value: "all" },
            { label: "Active", value: "active" },
            { label: "Suspended", value: "suspended" },
          ]}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : tab === "candidate" ? (
        <DataTable
          columns={candidateColumns}
          rows={filtered as RealCandidate[]}
          rowKey={(u) => u._id}
        />
      ) : (
        <DataTable
          columns={recruiterColumns}
          rows={filtered as RealRecruiter[]}
          rowKey={(u) => u._id}
        />
      )}

      {/* Candidate detail modal */}
      {selectedCandidate && (
        <Modal
          open
          title={`${selectedCandidate.first_name} ${selectedCandidate.last_name}`}
          onClose={() => setSelectedCandidate(null)}
        >
          <div className="space-y-3 text-sm">
            <p><strong>Email:</strong> {selectedCandidate.email}</p>
            <p><strong>Address:</strong> {selectedCandidate.address ?? "—"}</p>
            <p><strong>Disability type:</strong> {fmt(selectedCandidate.disability_type)}</p>
            <p><strong>Work preference:</strong> {fmt(selectedCandidate.work_preference)}</p>
            <p><strong>Availability:</strong> {fmt(selectedCandidate.availability_status)}</p>
            <p><strong>Industry:</strong> {selectedCandidate.industry ?? "—"}</p>
            <p><strong>Experience:</strong> {selectedCandidate.years_of_experience ?? "—"} yrs</p>
            <p><strong>Status:</strong> {selectedCandidate.status ?? "active"}</p>
            {selectedCandidate.created_at && (
              <p><strong>Joined:</strong> {formatDate(selectedCandidate.created_at)}</p>
            )}
          </div>
        </Modal>
      )}

      {/* Recruiter detail modal */}
      {selectedRecruiter && (
        <Modal
          open
          title={selectedRecruiter.company_name}
          onClose={() => setSelectedRecruiter(null)}
        >
          <div className="space-y-3 text-sm">
            <p><strong>Email:</strong> {selectedRecruiter.email}</p>
            <p><strong>Location:</strong> {selectedRecruiter.location ?? "—"}</p>
            <p><strong>Industry:</strong> {selectedRecruiter.company_industry ?? "—"}</p>
            <p><strong>Employees w/ disability:</strong> {selectedRecruiter.employees_with_disability ?? "—"}</p>
            <p><strong>Status:</strong> {selectedRecruiter.status ?? "active"}</p>
            {selectedRecruiter.created_at && (
              <p><strong>Joined:</strong> {formatDate(selectedRecruiter.created_at)}</p>
            )}
          </div>
        </Modal>
      )}

      {/* Confirm status change */}
      <ConfirmDialog
        open={!!confirmItem}
        title={`${confirmAction} user?`}
        message={`This will ${confirmAction.toLowerCase()} ${confirmName}.`}
        confirmLabel={confirmAction}
        onClose={() => setConfirmItem(null)}
        onConfirm={() => confirmItem && handleStatusChange(confirmItem)}
      />
    </PageShell>
  );
}
