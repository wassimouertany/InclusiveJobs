import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FileText,
  Building2,
  Settings,
  Sparkles,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { useBoStore } from "../../store/useBoStore";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/users", label: "Users", icon: Users },
  { to: "/jobs", label: "Jobs", icon: Briefcase },
  { to: "/applications", label: "Applications", icon: FileText },
  { to: "/employers", label: "Employers", icon: Building2 },
];

const bottomLinks = [{ to: "/settings", label: "Settings", icon: Settings }];

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const compactSidebar = useBoStore((s) => s.compactSidebar);
  const logout = useBoStore((s) => s.logout);

  const renderLinks = (items: typeof links) =>
    items.map(({ to, label, icon: Icon }) => (
      <NavLink
        key={to}
        to={to}
        end={to === "/"}
        title={label}
        onClick={() => setMobileOpen(false)}
        className={({ isActive }) =>
          `bo-nav-link ${isActive ? "active" : ""} ${compactSidebar ? "is-compact" : ""}`
        }
      >
        <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={2} aria-hidden />
        {!compactSidebar && <span>{label}</span>}
      </NavLink>
    ));

  const navContent = (
    <>
      <div className={`bo-sidebar-brand ${compactSidebar ? "is-compact" : ""}`}>
        <div className="bo-brand-icon">
          <Sparkles className="w-4 h-4" />
        </div>
        {!compactSidebar && (
          <div>
            <p className="bo-brand-name">InclusiveJobs</p>
            <p className="bo-kicker" style={{ marginBottom: 0, color: "var(--bo-muted)" }}>
              Admin workspace
            </p>
          </div>
        )}
      </div>

      {!compactSidebar && <p className="bo-nav-section-label">Overview</p>}
      <nav aria-label="Main navigation" className="bo-sidebar-nav">
        {renderLinks(links)}
      </nav>

      {!compactSidebar && <p className="bo-nav-section-label">System</p>}
      <nav aria-label="Settings navigation">{renderLinks(bottomLinks)}</nav>

      <div className="bo-sidebar-footer">
        {!compactSidebar && (
          <div className="bo-demo-pill">Live demo · fake data only</div>
        )}
        <button
          type="button"
          className={`bo-nav-link bo-nav-link--logout ${compactSidebar ? "is-compact" : ""}`}
          onClick={logout}
          aria-label="Logout"
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          {!compactSidebar && <span>Sign out</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="bo-sidebar-col">
      <button
        type="button"
        className="bo-mobile-toggle"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      <aside className={`bo-sidebar ${compactSidebar ? "is-compact" : ""}`}>{navContent}</aside>

      {mobileOpen && (
        <div className="bo-drawer-backdrop lg:hidden" onClick={() => setMobileOpen(false)}>
          <aside className="bo-drawer bo-mobile-drawer" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="bo-btn bo-btn-ghost mb-4"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
            {navContent}
          </aside>
        </div>
      )}
    </div>
  );
}
