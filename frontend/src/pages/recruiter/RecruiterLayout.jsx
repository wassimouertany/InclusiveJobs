import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import { Briefcase, Building, Search, Star } from "lucide-react";
import { apiClient } from "../../services/apiClient";

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

              <nav className="space-y-2">
                <NavLink to="/dashboard/recruiter/jobs" className={navClass} end>
                  <Briefcase className="w-5 h-5 mr-3" /> Manage Offers
                </NavLink>
                <NavLink to="/dashboard/recruiter/matches" className={navClass}>
                  <Star className="w-5 h-5 mr-3" /> AI Matches
                </NavLink>
                <NavLink to="/dashboard/recruiter/search" className={navClass}>
                  <Search className="w-5 h-5 mr-3" /> Global Search
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
