import { Bell } from "lucide-react";
import type { ReactNode } from "react";

interface TopbarProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export default function Topbar({ title, subtitle, actions }: TopbarProps) {
  return (
    <header className="bo-page-header">
      <div className="bo-page-header-text">
        <p className="bo-kicker">InclusiveJobs · Admin</p>
        <h1 className="bo-title">{title}</h1>
        {subtitle ? <p className="bo-page-subtitle">{subtitle}</p> : null}
      </div>
      <div className="bo-page-header-actions">
        {actions}
        <button type="button" className="bo-btn bo-btn-ghost bo-notif-btn" aria-label="Notifications">
          <Bell className="w-4 h-4" />
          <span className="bo-notif-dot" aria-hidden />
        </button>
        <div className="bo-user-pill">
          <span className="bo-user-avatar" aria-hidden>
            A
          </span>
          <span>Admin</span>
        </div>
      </div>
    </header>
  );
}
