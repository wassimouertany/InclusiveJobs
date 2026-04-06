import { NavLink, Outlet } from "react-router-dom";
import { Bell, FileText, Search, User } from "lucide-react";
import {
  CandidateDashboardProvider,
  useCandidateDashboard,
} from "./CandidateDashboardContext";
import CandidateJobDetail from "./CandidateJobDetail";
import { initials } from "./shared";

function CandidateLayoutShell() {
  const {
    profile,
    avatarBlobUrl,
    avatarLoadFailed,
    setAvatarLoadFailed,
    displayName,
    selectedJob,
  } = useCandidateDashboard();

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
      isActive
        ? "bg-primary text-white shadow-md"
        : "text-gray-600 hover:bg-gray-50"
    }`;

  return (
    <div className="min-h-screen bg-bg-page py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-border p-6 sticky top-24">
              <div className="flex items-center space-x-4 mb-8">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-bold text-xl shrink-0 overflow-hidden ring-2 ring-gray-100">
                  {avatarBlobUrl && !avatarLoadFailed ? (
                    <img
                      src={avatarBlobUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={() => setAvatarLoadFailed(true)}
                    />
                  ) : (
                    initials(profile?.first_name, profile?.last_name)
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-900 truncate">
                    {displayName}
                  </h3>
                  <p className="text-sm text-gray-500">Candidate</p>
                </div>
              </div>

              <nav className="space-y-2">
                <NavLink to="/dashboard/candidate/home" className={navClass}>
                  <Bell className="w-5 h-5 mr-3" /> Dashboard
                </NavLink>
                <NavLink
                  to="/dashboard/candidate/profile"
                  className={navClass}
                >
                  <User className="w-5 h-5 mr-3" /> My Profile
                </NavLink>
                <NavLink
                  to="/dashboard/candidate/find-jobs"
                  className={navClass}
                >
                  <Search className="w-5 h-5 mr-3" /> Find Jobs
                </NavLink>
                <NavLink
                  to="/dashboard/candidate/applications"
                  className={navClass}
                >
                  <FileText className="w-5 h-5 mr-3" /> Applications
                </NavLink>
              </nav>
            </div>
          </div>

          <div className="lg:col-span-3">
            {selectedJob ? <CandidateJobDetail /> : <Outlet />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CandidateLayout() {
  return (
    <CandidateDashboardProvider>
      <CandidateLayoutShell />
    </CandidateDashboardProvider>
  );
}
