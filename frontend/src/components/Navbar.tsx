import { useEffect, useMemo, useState } from "react";
import { User, Menu, X } from "lucide-react";
import { useNavigation } from "../context/NavigationContext";
import { useAuthStore } from "../config/auth";
import NotificationBell from "./NotificationBell";
import { Page, UserRole } from "../types";
import { apiClient } from "../services/apiClient";
import { initials } from "../pages/candidate/shared";
import type { CandidateProfile } from "../pages/candidate/types";

type RecruiterProfile = {
  company_name?: string;
};

function companyInitials(name?: string): string {
  const clean = (name || "").trim();
  if (!clean) return "RC";
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

export default function Navbar() {
  const { currentPage, navigate } = useNavigation();
  const role = useAuthStore((s) => s.role);
  const [lang, setLang] = useState<"EN" | "FR" | "AR">("EN");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile | null>(null);
  const [recruiterProfile, setRecruiterProfile] = useState<RecruiterProfile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const isCandidateLoggedIn = role === UserRole.CANDIDATE;
  const isRecruiterLoggedIn = role === UserRole.COMPANY;
  const isLoggedIn = isCandidateLoggedIn || isRecruiterLoggedIn;

  const isDashboard =
    currentPage === "dashboard" ||
    currentPage === "dashboard-recruiter" ||
    currentPage.startsWith("dashboard-candidate-");

  const handleLogout = () => {
    useAuthStore.getState().clearAuth();
    navigate("landing");
  };

  const defaultNavLinks: { id: Page; label: string }[] = [
    { id: "landing", label: "Home" },
    { id: "find-jobs", label: "Find Jobs" },
    { id: "employers", label: "For Employers" },
    { id: "community", label: "Community" },
  ];

  const candidateNavLinks: { id: Page; label: string }[] = [
    { id: "landing", label: "Home" },
    { id: "dashboard-candidate-find-jobs", label: "Find Jobs" },
    { id: "community", label: "Community" },
    { id: "dashboard-candidate-home", label: "My Dashboard" },
  ];
  const recruiterNavLinks: { id: Page; label: string }[] = [
    { id: "landing", label: "Home" },
    { id: "find-jobs", label: "Find Jobs" },
    { id: "community", label: "Community" },
    { id: "dashboard-recruiter", label: "My Dashboard" },
  ];

  const navLinks = isCandidateLoggedIn
    ? candidateNavLinks
    : isRecruiterLoggedIn
      ? recruiterNavLinks
      : defaultNavLinks;

  useEffect(() => {
    if (!isLoggedIn) {
      setCandidateProfile(null);
      setRecruiterProfile(null);
      setAvatarUrl(null);
      setAvatarFailed(false);
      return;
    }
    let cancelled = false;
    let blobUrl: string | null = null;

    (async () => {
      if (isCandidateLoggedIn) {
        setRecruiterProfile(null);
        try {
          const profileRes = await apiClient.get<CandidateProfile>("/users/candidates/me", {
            validateStatus: () => true,
          });
          if (!cancelled && profileRes.status >= 200 && profileRes.status < 300) {
            setCandidateProfile(profileRes.data);
          }
        } catch {
          if (!cancelled) setCandidateProfile(null);
        }

        try {
          const avatarRes = await apiClient.get("/users/candidates/me/profile-photo", {
            responseType: "blob",
            validateStatus: () => true,
          });
          if (cancelled) return;
          if (avatarRes.status >= 200 && avatarRes.status < 300) {
            blobUrl = URL.createObjectURL(avatarRes.data);
            setAvatarUrl(blobUrl);
            setAvatarFailed(false);
          } else {
            setAvatarUrl(null);
          }
        } catch {
          if (!cancelled) setAvatarUrl(null);
        }
        return;
      }

      setCandidateProfile(null);
      try {
        const profileRes = await apiClient.get<RecruiterProfile>("/users/recruiters/me", {
          validateStatus: () => true,
        });
        if (!cancelled && profileRes.status >= 200 && profileRes.status < 300) {
          setRecruiterProfile(profileRes.data);
        }
      } catch {
        if (!cancelled) setRecruiterProfile(null);
      }

      try {
        const logoRes = await apiClient.get("/users/recruiters/me/logo", {
          responseType: "blob",
          validateStatus: () => true,
        });
        if (cancelled) return;
        if (logoRes.status >= 200 && logoRes.status < 300) {
          blobUrl = URL.createObjectURL(logoRes.data);
          setAvatarUrl(blobUrl);
          setAvatarFailed(false);
        } else {
          setAvatarUrl(null);
        }
      } catch {
        if (!cancelled) setAvatarUrl(null);
      }
    })();

    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [isCandidateLoggedIn, isLoggedIn, role]);

  const candidateDisplayName = useMemo(() => {
    const first = candidateProfile?.first_name?.trim() || "";
    const last = candidateProfile?.last_name?.trim() || "";
    return `${first} ${last}`.trim() || "Candidate";
  }, [candidateProfile?.first_name, candidateProfile?.last_name]);
  const recruiterDisplayName = useMemo(() => {
    return recruiterProfile?.company_name?.trim() || "Recruiter";
  }, [recruiterProfile?.company_name]);

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-border sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          {/* Logo */}
          <div
            className="flex items-center cursor-pointer group"
            onClick={() => navigate("landing")}
          >
            <img
              src="/images/logo.png"
              alt="InclusiveJobs"
              className="w-14 h-14 mr-2 object-contain group-hover:scale-105 transition-transform duration-300"
            />
            <span className="font-display font-bold text-xl text-text-primary tracking-tight group-hover:text-primary transition-colors">
              InclusiveJobs
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <div className="flex items-center space-x-6 mr-4">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => navigate(link.id)}
                  className={`text-sm font-medium transition-colors relative py-1 ${
                    currentPage === link.id
                      ? 'text-primary'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {link.label}
                  {currentPage === link.id && (
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-full" />
                  )}
                </button>
              ))}
            </div>

            <div className="h-6 w-px bg-gray-200"></div>

            {/* Language Switcher */}
            <div className="flex items-center bg-gray-100/60 rounded-full p-1 border border-border/50">
              {(['EN', 'FR', 'AR'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${
                    lang === l
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex items-center space-x-3">
              {isLoggedIn ? (
                <>
                  <NotificationBell />
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        isCandidateLoggedIn
                          ? "dashboard-candidate-profile"
                          : "dashboard-recruiter"
                      )
                    }
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-border hover:bg-gray-50 transition-colors"
                    title="Go to profile"
                  >
                    <span className="w-9 h-9 rounded-full bg-primary text-white text-sm font-bold shrink-0 overflow-hidden flex items-center justify-center ring-2 ring-gray-100">
                      {avatarUrl && !avatarFailed ? (
                        <img
                          src={avatarUrl}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={() => setAvatarFailed(true)}
                        />
                      ) : (
                        isCandidateLoggedIn
                          ? initials(candidateProfile?.first_name, candidateProfile?.last_name)
                          : companyInitials(recruiterDisplayName)
                      )}
                    </span>
                    <span className="text-sm font-medium text-text-primary max-w-[150px] truncate">
                      {isCandidateLoggedIn ? candidateDisplayName : recruiterDisplayName}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="px-5 py-2.5 border border-border text-text-secondary rounded-xl hover:border-primary hover:text-primary transition-all font-medium text-sm bg-transparent"
                  >
                    Log Out
                  </button>
                </>
              ) : (
                <>
                  {currentPage !== "login" && !isDashboard && (
                    <button
                      type="button"
                      onClick={() => navigate("login")}
                      className="flex items-center px-4 py-2.5 text-text-secondary hover:text-primary hover:bg-primary/5 rounded-lg transition-colors font-medium text-sm"
                    >
                      <User className="w-4 h-4 mr-2" />
                      Sign In
                    </button>
                  )}

                  {isDashboard ? (
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="px-5 py-2.5 bg-gray-100 text-text-primary rounded-xl hover:bg-gray-200 transition-all font-medium text-sm"
                    >
                      Log Out
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigate("employers")}
                      className="px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-dark transition-all shadow-md hover:shadow-lg shadow-primary/20 font-medium text-sm transform hover:-translate-y-0.5"
                    >
                      Post a Job
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-text-secondary hover:text-text-primary p-2"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-border p-4 space-y-4 shadow-lg absolute w-full animate-in slide-in-from-top-5 duration-200">
          <div className="space-y-2">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => {
                  navigate(link.id);
                  setIsMenuOpen(false);
                }}
                className={`block w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                  currentPage === link.id
                    ? 'bg-primary/5 text-primary'
                    : 'text-text-secondary hover:bg-gray-50'
                }`}
              >
                {link.label}
              </button>
            ))}
          </div>
          
          <div className="border-t border-gray-100 pt-4 flex justify-center space-x-2">
            {(['EN', 'FR', 'AR'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  lang === l
                    ? 'bg-primary/10 text-primary'
                    : 'bg-gray-50 text-text-secondary'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          
          <div className="grid grid-cols-2 gap-3 pt-2">
            {isLoggedIn ? (
              <button
                type="button"
                onClick={() => {
                  handleLogout();
                  setIsMenuOpen(false);
                }}
                className="col-span-2 flex justify-center items-center px-4 py-3 bg-gray-100 text-text-primary rounded-xl hover:bg-gray-200 transition-colors font-medium"
              >
                Log Out
              </button>
            ) : isDashboard ? (
              <button
                type="button"
                onClick={() => {
                  handleLogout();
                  setIsMenuOpen(false);
                }}
                className="col-span-2 flex justify-center items-center px-4 py-3 bg-gray-100 text-text-primary rounded-xl hover:bg-gray-200 transition-colors font-medium"
              >
                Log Out
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    navigate("login");
                    setIsMenuOpen(false);
                  }}
                  className="flex justify-center items-center px-4 py-3 border border-border text-text-primary rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigate("employers");
                    setIsMenuOpen(false);
                  }}
                  className="px-4 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors font-medium shadow-lg shadow-primary/20"
                >
                  Post a Job
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
