import type { ComponentType } from "react";
import { Bell, FileText, Search, User } from "lucide-react";
import { NavLink } from "react-router-dom";

type NavItem = {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const ITEMS: NavItem[] = [
  { to: "/dashboard/candidate/home", label: "My Space", icon: Bell },
  { to: "/dashboard/candidate/profile", label: "My Profile", icon: User },
  { to: "/dashboard/candidate/find-jobs", label: "Find Jobs", icon: Search },
  { to: "/dashboard/candidate/applications", label: "Applications", icon: FileText },
];

export default function DashboardSubNav() {
  return (
    <div className="bg-white border border-border rounded-2xl shadow-sm px-3 py-3">
      <nav className="flex flex-wrap items-center gap-2">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-100"
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}

