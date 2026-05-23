import { useMemo, useState } from "react";
import PageShell from "../../components/layout/PageShell";
import SearchInput from "../../components/ui/SearchInput";
import FilterChips from "../../components/ui/FilterChips";
import DataTable, { type Column } from "../../components/ui/DataTable";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { useFakeSearch } from "../../hooks/useFakeSearch";
import { useFakePagination } from "../../hooks/useFakePagination";
import { useBoStore } from "../../store/useBoStore";
import { useToast } from "../../app/ToastContext";
import type { BoUser, UserRole } from "../../types";
import { formatDate } from "../../utils/formatDate";

type Tab = UserRole;

export default function UsersPage() {
  const users = useBoStore((s) => s.users);
  const setUserStatus = useBoStore((s) => s.setUserStatus);
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>("candidate");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [selected, setSelected] = useState<BoUser | null>(null);
  const [confirmUser, setConfirmUser] = useState<BoUser | null>(null);

  const tabUsers = useMemo(() => users.filter((u) => u.role === tab), [users, tab]);

  const { query, setQuery, filtered: searched } = useFakeSearch(tabUsers, (u, q) =>
    [u.name, u.email, u.city, u.company ?? ""].join(" ").toLowerCase().includes(q),
  );

  const filtered = useMemo(
    () =>
      searched.filter((u) => {
        if (statusFilter !== "all" && u.status !== statusFilter) return false;
        if (cityFilter !== "all" && u.city !== cityFilter) return false;
        return true;
      }),
    [searched, statusFilter, cityFilter],
  );

  const { paginated, page, setPage, totalPages } = useFakePagination(filtered, 8);

  const cities = useMemo(() => ["all", ...new Set(users.map((u) => u.city))], [users]);

  const columns: Column<BoUser>[] = [
    { key: "id", header: "ID", render: (u) => u.id },
    { key: "name", header: "Name", render: (u) => <span className="font-semibold">{u.name}</span> },
    { key: "email", header: "Email", render: (u) => u.email },
    { key: "city", header: "City", render: (u) => u.city },
    { key: "status", header: "Status", render: (u) => <Badge value={u.status} /> },
    { key: "joined", header: "Joined", render: (u) => formatDate(u.joinedAt) },
    {
      key: "actions",
      header: "Actions",
      render: (u) => (
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setSelected(u)}>
            View
          </Button>
          <Button
            variant={u.status === "active" ? "danger" : "primary"}
            onClick={() => setConfirmUser(u)}
          >
            {u.status === "active" ? "Suspend" : "Activate"}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageShell title="Users" subtitle="Search, filter, and manage candidate, recruiter, and admin accounts.">
      <div className="flex flex-wrap gap-2 mb-4">
        {(["candidate", "recruiter", "admin"] as Tab[]).map((t) => (
          <button key={t} type="button" className={`bo-chip capitalize ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t}s
          </button>
        ))}
      </div>

      <div className="bo-toolbar">
        <SearchInput value={query} onChange={setQuery} placeholder="    Search users..." />
        <FilterChips label="Status" value={statusFilter} onChange={setStatusFilter} options={[
          { label: "All", value: "all" },
          { label: "Active", value: "active" },
          { label: "Suspended", value: "suspended" },
        ]} />
        <FilterChips
          label="City"
          value={cityFilter}
          onChange={setCityFilter}
          options={cities.map((c) => ({ label: c === "all" ? "All" : c, value: c }))}
        />
      </div>

      <DataTable columns={columns} rows={paginated} rowKey={(u) => u.id} />

      <div className="flex justify-between items-center mt-4 text-sm">
        <span className="text-[var(--bo-muted)]">
          Page {page} / {totalPages}
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <Button variant="ghost" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      </div>

      <Modal open={!!selected} title={selected?.name ?? ""} onClose={() => setSelected(null)}>
        {selected && (
          <div className="space-y-3 text-sm">
            <p>
              <strong>Email:</strong> {selected.email}
            </p>
            <p>
              <strong>Role:</strong> {selected.role}
            </p>
            <p>
              <strong>City:</strong> {selected.city}
            </p>
            {selected.disabilityType && (
              <p>
                <strong>Disability type:</strong> {selected.disabilityType}
              </p>
            )}
            {selected.accessibilityNeeds && (
              <p>
                <strong>Accessibility needs:</strong> {selected.accessibilityNeeds}
              </p>
            )}
            {selected.accommodations && (
              <p>
                <strong>Accommodations:</strong> {selected.accommodations}
              </p>
            )}
            {selected.company && (
              <p>
                <strong>Company:</strong> {selected.company}
              </p>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmUser}
        title={confirmUser?.status === "active" ? "Suspend user?" : "Activate user?"}
        message={`This will update ${confirmUser?.name} status in demo mode.`}
        confirmLabel="Save (demo)"
        onClose={() => setConfirmUser(null)}
        onConfirm={() => {
          if (!confirmUser) return;
          const next = confirmUser.status === "active" ? "suspended" : "active";
          setUserStatus(confirmUser.id, next);
          showToast(`User ${confirmUser.name} is now ${next} (demo)`);
          setConfirmUser(null);
        }}
      />
    </PageShell>
  );
}
