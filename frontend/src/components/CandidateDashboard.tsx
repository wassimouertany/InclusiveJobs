import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  Bell,
  FileText,
  Search,
  Briefcase,
  User,
  Upload,
  CheckCircle,
  Clock,
  XCircle,
  MapPin,
  Building,
  Filter,
  ChevronRight,
  ChevronLeft,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button, Input } from "./UI";
import { useToast } from "../context/ToastContext";
import { API_BASE_URL } from "../config/api";
import {
  AUTH_ROLE_KEY,
  getAuthHeaders,
  getStoredToken,
} from "../config/auth";
import { useNavigation } from "../context/NavigationContext";
import { UserRole } from "../types";

/** Candidate document from GET /users/candidates/me (password stripped). */
export type CandidateProfile = {
  _id: string;
  role?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  birth_date?: string;
  phone_number?: string;
  address?: string;
  industry?: string;
  gender?: string;
  years_of_experience?: number;
  education_level?: string;
  work_accommodations?: string[];
  profile_title?: string;
  key_skills?: string[];
  disability_type?: string;
  accessibility_needs?: string;
  work_preference?: string;
  availability_status?: string;
  logo_id?: string | null;
  disability_card_id?: string | null;
  resume_id?: string | null;
  created_at?: string;
};

function formatEnumLabel(value: string | undefined): string {
  if (!value) return "—";
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function initials(first?: string, last?: string): string {
  const a = first?.trim().charAt(0) ?? "";
  const b = last?.trim().charAt(0) ?? "";
  const s = (a + b).toUpperCase();
  return s || "?";
}

function ProfileField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="text-gray-900 dark:text-white font-medium break-words">
        {value ?? "—"}
      </p>
    </div>
  );
}

export default function CandidateDashboard() {
  const { navigate } = useNavigation();
  const [activeTab, setActiveTab] = useState<
    "home" | "profile" | "search" | "applications"
  >("home");
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const { showToast } = useToast();

  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [avatarBlobUrl, setAvatarBlobUrl] = useState<string | null>(null);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const avatarBlobRef = useRef<string | null>(null);

  const revokeAvatarBlob = useCallback(() => {
    if (avatarBlobRef.current) {
      URL.revokeObjectURL(avatarBlobRef.current);
      avatarBlobRef.current = null;
    }
  }, []);

  useEffect(() => {
    setAvatarLoadFailed(false);
    if (!profile?.logo_id) {
      revokeAvatarBlob();
      setAvatarBlobUrl(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/users/candidates/me/profile-photo`,
          {
            headers: {
              ...getAuthHeaders(),
              Accept: "image/*,*/*",
            },
          }
        );
        if (!res.ok || cancelled) return;
        const blob = await res.blob();
        if (cancelled) return;
        revokeAvatarBlob();
        const url = URL.createObjectURL(blob);
        avatarBlobRef.current = url;
        setAvatarBlobUrl(url);
      } catch {
        if (!cancelled) {
          revokeAvatarBlob();
          setAvatarBlobUrl(null);
        }
      }
    })();

    return () => {
      cancelled = true;
      revokeAvatarBlob();
      setAvatarBlobUrl(null);
    };
  }, [profile?.logo_id, revokeAvatarBlob]);

  const loadProfile = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setProfileError("Not signed in. Please log in again.");
      return;
    }
    setProfileLoading(true);
    setProfileError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/users/candidates/me`, {
        headers: {
          ...getAuthHeaders(),
          Accept: "application/json",
        },
      });
      if (res.status === 401 || res.status === 403) {
        const detail = await res.json().catch(() => ({}));
        setProfileError(
          typeof detail?.detail === "string"
            ? detail.detail
            : "Session invalid or not a candidate account."
        );
        setProfile(null);
        return;
      }
      if (!res.ok) {
        setProfileError("Could not load profile.");
        setProfile(null);
        return;
      }
      const data = (await res.json()) as CandidateProfile;
      setProfile(data);
    } catch {
      setProfileError("Network error. Is the API running?");
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(AUTH_ROLE_KEY);
    if (stored && stored !== UserRole.CANDIDATE) {
      navigate("dashboard-recruiter");
      return;
    }
    loadProfile();
  }, [loadProfile, navigate]);

  const displayName =
    profile?.first_name || profile?.last_name
      ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
      : "Candidate";

  const renderHome = () => (
    <div className="space-y-6">
      <div className="bg-primary/10 border border-primary/20 rounded-2xl p-6 flex items-start gap-4">
        <div className="bg-primary text-white p-3 rounded-xl">
          <Bell size={24} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            New AI Recommendations!
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            We found 3 new job offers that match your skills and accessibility
            needs.
          </p>
          <Button
            className="mt-4 text-sm"
            onClick={() => setActiveTab("search")}
          >
            View Recommendations
          </Button>
        </div>
      </div>

      <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
        Recommended for You (AI Match)
      </h3>
      <div className="grid gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all flex justify-between items-center"
          >
            <div>
              <h4 className="font-bold text-lg text-gray-900 dark:text-white">
                Frontend Developer
              </h4>
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-2">
                <span className="flex items-center gap-1">
                  <Building size={16} /> TechCorp
                </span>
                <span className="flex items-center gap-1">
                  <MapPin size={16} /> Remote
                </span>
              </div>
              <div className="flex gap-2 mt-3">
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md text-xs font-bold">
                  95% Match
                </span>
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-bold">
                  Wheelchair Accessible
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() =>
                setSelectedJob({
                  title: "Frontend Developer",
                  company: "TechCorp",
                  location: "Remote",
                  match: 95,
                })
              }
            >
              View Details <ChevronRight size={16} />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderProfile = () => {
    if (profileLoading && !profile) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-gray-600 dark:text-gray-300">
          <Loader2 className="animate-spin text-primary" size={40} />
          <p className="font-medium">Loading your profile…</p>
        </div>
      );
    }

    if (profileError && !profile) {
      return (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-red-200 dark:border-red-900/50 text-center space-y-4">
          <p className="text-red-600 dark:text-red-400 font-medium">
            {profileError}
          </p>
          <Button onClick={() => loadProfile()} className="inline-flex gap-2">
            <RefreshCw size={18} /> Retry
          </Button>
        </div>
      );
    }

    if (!profile) {
      return null;
    }

    const skills =
      profile.key_skills?.length ? profile.key_skills.join(", ") : "—";
    const accommodations =
      profile.work_accommodations?.length
        ? profile.work_accommodations.join(" · ")
        : "—";

    return (
      <div className="space-y-8">
        <div className="flex justify-end">
          <Button
            variant="outline"
            className="gap-2 py-2 px-4 text-sm"
            onClick={() => loadProfile()}
            disabled={profileLoading}
          >
            {profileLoading ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <RefreshCw size={16} />
            )}
            Refresh
          </Button>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            Professional profile
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Data from your registration (read-only). Profile editing will
            connect to the API in a future update.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ProfileField label="First name" value={profile.first_name} />
            <ProfileField label="Last name" value={profile.last_name} />
            <ProfileField label="Email" value={profile.email} />
            <ProfileField label="Birth date" value={profile.birth_date} />
            <ProfileField label="Phone" value={profile.phone_number} />
            <ProfileField label="Address" value={profile.address} />
            <ProfileField
              label="Gender"
              value={formatEnumLabel(profile.gender)}
            />
            <ProfileField label="Job title" value={profile.profile_title} />
            <ProfileField label="Industry" value={profile.industry} />
            <ProfileField
              label="Years of experience"
              value={
                profile.years_of_experience != null
                  ? String(profile.years_of_experience)
                  : "—"
              }
            />
            <ProfileField
              label="Education level"
              value={formatEnumLabel(profile.education_level)}
            />
            <ProfileField label="Key skills" value={skills} />
            <ProfileField
              label="Work preference"
              value={formatEnumLabel(profile.work_preference)}
            />
            <ProfileField
              label="Availability"
              value={formatEnumLabel(profile.availability_status)}
            />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            Accessibility & documents
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <ProfileField
              label="Disability type"
              value={formatEnumLabel(profile.disability_type)}
            />
            <ProfileField
              label="Work accommodations"
              value={accommodations}
            />
          </div>
          <div className="space-y-2 mb-6">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Accessibility needs
            </p>
            <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
              {profile.accessibility_needs?.trim() || "—"}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700">
              <p className="font-bold text-gray-700 dark:text-gray-300 mb-1">
                Resume (PDF)
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                {profile.resume_id ? "Uploaded (stored)" : "Not uploaded"}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700">
              <p className="font-bold text-gray-700 dark:text-gray-300 mb-1">
                Profile photo
              </p>
              {!profile.logo_id ? (
                <p className="text-gray-600 dark:text-gray-400">Not uploaded</p>
              ) : avatarBlobUrl && !avatarLoadFailed ? (
                <img
                  src={avatarBlobUrl}
                  alt=""
                  className="mt-2 w-20 h-20 rounded-lg object-cover border border-gray-200 dark:border-gray-600"
                  onError={() => setAvatarLoadFailed(true)}
                />
              ) : avatarLoadFailed ? (
                <p className="text-gray-600 dark:text-gray-400">
                  Could not load preview
                </p>
              ) : (
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                  Loading preview…
                </p>
              )}
            </div>
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700">
              <p className="font-bold text-gray-700 dark:text-gray-300 mb-1">
                Disability card
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                {profile.disability_card_id ? "Uploaded (stored)" : "Not uploaded"}
              </p>
            </div>
          </div>

          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-8 text-center mt-6 opacity-60">
            <Upload className="mx-auto text-gray-400 mb-4" size={32} />
            <p className="font-bold text-gray-700 dark:text-gray-300">
              Replace CV (coming soon)
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Upload will be available when the update profile API is added.
            </p>
          </div>

          <Button
            className="mt-6"
            variant="outline"
            disabled
            title="Update API not implemented yet"
          >
            Save changes (soon)
          </Button>
        </div>
      </div>
    );
  };

  const renderSearch = () => (
    <div className="space-y-6">
      <div className="flex gap-4">
        <div className="flex-grow relative">
          <Search
            className="absolute left-4 top-3.5 text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Search jobs by title, skill, or company..."
            className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 dark:text-white focus:border-primary outline-none"
          />
        </div>
        <Button variant="outline" className="flex items-center gap-2">
          <Filter size={20} /> Filters
        </Button>
      </div>

      <div className="grid gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex justify-between items-center"
          >
            <div>
              <h4 className="font-bold text-lg text-gray-900 dark:text-white">
                Software Engineer
              </h4>
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-2">
                <span className="flex items-center gap-1">
                  <Building size={16} /> InnovateTech
                </span>
                <span className="flex items-center gap-1">
                  <MapPin size={16} /> Tunis, Tunisia
                </span>
                <span className="flex items-center gap-1">
                  <Briefcase size={16} /> Full-time
                </span>
              </div>
            </div>
            <Button
              onClick={() =>
                setSelectedJob({
                  title: "Software Engineer",
                  company: "InnovateTech",
                  location: "Tunis, Tunisia",
                  match: 80,
                })
              }
            >
              View Details
            </Button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderApplications = () => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100 dark:border-gray-700">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          My Applications
        </h3>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {[
          {
            role: "Frontend Developer",
            company: "TechCorp",
            status: "Interview",
            date: "Oct 25, 2023",
            icon: Clock,
            color: "text-blue-500",
          },
          {
            role: "UX Designer",
            company: "DesignStudio",
            status: "Applied",
            date: "Oct 28, 2023",
            icon: CheckCircle,
            color: "text-yellow-500",
          },
          {
            role: "Product Manager",
            company: "InnovateInc",
            status: "Rejected",
            date: "Oct 20, 2023",
            icon: XCircle,
            color: "text-red-500",
          },
        ].map((app, i) => (
          <div
            key={i}
            className="p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div
                className={`p-3 rounded-xl bg-gray-100 dark:bg-gray-700 ${app.color}`}
              >
                <app.icon size={24} />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white">
                  {app.role}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {app.company} • Applied on {app.date}
                </p>
              </div>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-bold bg-gray-100 dark:bg-gray-700 ${app.color}`}
            >
              {app.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderJobDetails = () => (
    <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm animate-in fade-in zoom-in-95 duration-200">
      <button
        onClick={() => setSelectedJob(null)}
        className="text-primary font-bold flex items-center gap-2 mb-6 hover:underline"
      >
        <ChevronLeft size={20} /> Back to jobs
      </button>

      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white">
            {selectedJob.title}
          </h2>
          <div className="flex items-center gap-4 text-gray-500 dark:text-gray-400 mt-2">
            <span className="flex items-center gap-1">
              <Building size={18} /> {selectedJob.company}
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={18} /> {selectedJob.location}
            </span>
          </div>
        </div>
        <div className="text-right">
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-bold inline-block mb-2">
            {selectedJob.match}% AI Match
          </span>
          <Button
            onClick={() => {
              showToast("Application submitted successfully!", "success");
              setSelectedJob(null);
            }}
          >
            Apply Now
          </Button>
        </div>
      </div>

      <div className="space-y-6 text-gray-700 dark:text-gray-300">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Job Description
          </h3>
          <p>
            We are looking for an experienced developer to join our inclusive
            team. You will be responsible for building accessible and performant
            user interfaces.
          </p>
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Requirements
          </h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>3+ years of experience with React</li>
            <li>Strong understanding of web accessibility (WCAG)</li>
            <li>Experience with TypeScript and Tailwind CSS</li>
          </ul>
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Accommodations Provided
          </h3>
          <div className="flex gap-2 mt-2">
            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
              Fully Remote
            </span>
            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
              Flexible Hours
            </span>
            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
              Screen Reader Support
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 sticky top-24">
              <div className="flex items-center space-x-4 mb-8">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-bold text-xl shrink-0 overflow-hidden ring-2 ring-gray-100 dark:ring-gray-700">
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
                  <h3 className="font-bold text-gray-900 dark:text-white truncate">
                    {displayName}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Candidate
                  </p>
                </div>
              </div>

              <nav className="space-y-2">
                <button
                  onClick={() => setActiveTab("home")}
                  className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    activeTab === "home"
                      ? "bg-primary text-white shadow-md"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  <Bell className="w-5 h-5 mr-3" /> Dashboard
                </button>
                <button
                  onClick={() => setActiveTab("profile")}
                  className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    activeTab === "profile"
                      ? "bg-primary text-white shadow-md"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  <User className="w-5 h-5 mr-3" /> My Profile
                </button>
                <button
                  onClick={() => setActiveTab("search")}
                  className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    activeTab === "search"
                      ? "bg-primary text-white shadow-md"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  <Search className="w-5 h-5 mr-3" /> Find Jobs
                </button>
                <button
                  onClick={() => setActiveTab("applications")}
                  className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    activeTab === "applications"
                      ? "bg-primary text-white shadow-md"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  <FileText className="w-5 h-5 mr-3" /> Applications
                </button>
              </nav>
            </div>
          </div>

          <div className="lg:col-span-3">
            <motion.div
              key={activeTab + (selectedJob ? "-detail" : "")}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {selectedJob ? (
                renderJobDetails()
              ) : (
                <>
                  {activeTab === "home" && renderHome()}
                  {activeTab === "profile" && renderProfile()}
                  {activeTab === "search" && renderSearch()}
                  {activeTab === "applications" && renderApplications()}
                </>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
