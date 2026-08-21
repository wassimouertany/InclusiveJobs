import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import { Briefcase, Building, Compass, FileText, LayoutDashboard, Search, Star, Users } from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { useShadowGuide } from "../../features/guide/guideContext";

const navInactive = "text-gray-600 hover:bg-gray-50";
const navActive = "bg-primary text-white shadow-md";

function navClass({ isActive }) {
  return `w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
    isActive ? navActive : navInactive
  }`;
}

function companyInitials(name) {
  const clean = (name || "").trim();
  if (!clean) return "RC";
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

export default function RecruiterLayout() {
  const location = useLocation();
  const { tourId, startTour, totalSteps, completedStepIds } = useShadowGuide();
  const hasUnfinishedTour = Boolean(tourId) && completedStepIds.length < totalSteps;
  const [companyName, setCompanyName] = useState("Recruiter");
  const [logoUrl, setLogoUrl] = useState(null);
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let blobUrl = null;

    (async () => {
      try {
        const profileRes = await apiClient.get("/users/recruiters/me", {
          validateStatus: () => true,
        });
        if (!cancelled && profileRes.status >= 200 && profileRes.status < 300) {
          setCompanyName(profileRes.data?.company_name?.trim() || "Recruiter");
        }
      } catch {
        if (!cancelled) setCompanyName("Recruiter");
      }

      try {
        const logoRes = await apiClient.get("/users/recruiters/me/logo", {
          responseType: "blob",
          validateStatus: () => true,
        });
        if (cancelled) return;
        if (logoRes.status >= 200 && logoRes.status < 300) {
          blobUrl = URL.createObjectURL(logoRes.data);
          setLogoUrl(blobUrl);
          setLogoFailed(false);
        } else {
          setLogoUrl(null);
        }
      } catch {
        if (!cancelled) setLogoUrl(null);
      }
    })();

    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, []);

  const initials = useMemo(() => companyInitials(companyName), [companyName]);

  return (
    <div className="min-h-screen bg-bg-page py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-border p-6 sticky top-24">
              <div className="flex items-center space-x-4 mb-8">
                <span className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-xl overflow-hidden ring-2 ring-gray-100 shrink-0">
                  {logoUrl && !logoFailed ? (
                    <img
                      src={logoUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={() => setLogoFailed(true)}
                    />
                  ) : (
                    initials
                  )}
                </span>
                <div>
                  <h3 className="font-bold text-gray-900">{companyName}</h3>
                  <p className="text-sm text-gray-500">Recruiter Account</p>
                </div>
              </div>

              {tourId ? (
                <button
                  type="button"
                  onClick={startTour}
                  title="Revoir la visite guidée de votre espace"
                  className="relative mb-5 flex w-full items-center gap-3 rounded-xl border border-indigo-100 bg-linear-to-r from-indigo-50 to-purple-50 px-4 py-3 text-left transition-colors hover:border-indigo-200 hover:from-indigo-100 hover:to-purple-100"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
                    <Compass className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-indigo-900">Visite guidée</span>
                    <span className="block truncate text-xs text-indigo-500">
                      Découvrez votre espace recruteur
                    </span>
                  </span>
                  {hasUnfinishedTour && (
                    <span
                      className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-white"
                      aria-hidden="true"
                    />
                  )}
                </button>
              ) : null}

              <nav className="space-y-2">
                <NavLink to="/dashboard/recruiter" end className={navClass}>
                  <LayoutDashboard className="w-5 h-5 mr-3" /> Dashboard
                </NavLink>
                <NavLink to="/dashboard/recruiter/jobs" className={navClass} end>
                  <Briefcase className="w-5 h-5 mr-3" /> Manage Offers
                </NavLink>
                <NavLink to="/dashboard/recruiter/matches" data-guide="top5_candidates" className={navClass}>
                  <Star className="w-5 h-5 mr-3" /> AI Matches
                </NavLink>
                <NavLink to="/dashboard/recruiter/search" className={navClass}>
                  <Search className="w-5 h-5 mr-3" /> Global Search
                </NavLink>
                <NavLink to="/dashboard/recruiter/applications" className={navClass}>
                  <FileText className="w-5 h-5 mr-3" /> Applications
                </NavLink>
                <NavLink to="/community" className={navClass}>
                  <Users className="w-5 h-5 mr-3" /> Community
                </NavLink>
                <NavLink to="/dashboard/recruiter/profile" className={navClass}>
                  <Building className="w-5 h-5 mr-3" /> Company Profile
                </NavLink>
              </nav>
            </div>
          </div>

          <div className="lg:col-span-3">
            <motion.div
              key={location.pathname + location.search}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
            >
              <Outlet />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
