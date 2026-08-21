import type { ComponentType } from "react";
import { Bell, Compass, FileText, Search, User } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useShadowGuide } from "../../features/guide/guideContext";

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
  const { tourId, startTour, totalSteps, completedStepIds } = useShadowGuide();
  const hasUnfinishedTour = Boolean(tourId) && completedStepIds.length < totalSteps;

  return (
    <div className="bg-white border border-border rounded-2xl shadow-sm px-3 py-3">
      <nav className="flex flex-wrap items-center gap-2" aria-label="Candidate dashboard">
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

        {tourId ? (
          <button
            type="button"
            onClick={startTour}
            title="Revoir la visite guidée de votre espace"
            className="relative ml-auto inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/15"
          >
            <Compass className="h-4 w-4" aria-hidden="true" />
            <span>Guide</span>
            {hasUnfinishedTour && (
              <span
                className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-white"
                aria-hidden="true"
              />
            )}
            <span className="sr-only">
              {hasUnfinishedTour ? " — visite guidée non terminée" : " — revoir la visite guidée"}
            </span>
          </button>
        ) : null}
      </nav>
    </div>
  );
}
