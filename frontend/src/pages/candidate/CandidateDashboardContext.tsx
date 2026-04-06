import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuthStore } from "../../config/auth";
import { apiClient } from "../../services/apiClient";
import { useNavigation } from "../../context/NavigationContext";
import { UserRole } from "../../types";
import type { CandidateProfile, SelectedJob } from "./types";

type CandidateDashboardContextValue = {
  profile: CandidateProfile | null;
  profileLoading: boolean;
  profileError: string | null;
  loadProfile: () => Promise<void>;
  avatarBlobUrl: string | null;
  avatarLoadFailed: boolean;
  setAvatarLoadFailed: (v: boolean) => void;
  selectedJob: SelectedJob | null;
  setSelectedJob: React.Dispatch<React.SetStateAction<SelectedJob | null>>;
  displayName: string;
};

const CandidateDashboardContext = createContext<
  CandidateDashboardContextValue | undefined
>(undefined);

export function CandidateDashboardProvider({ children }: { children: ReactNode }) {
  const { navigate } = useNavigation();
  const [selectedJob, setSelectedJob] = useState<SelectedJob | null>(null);

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
        const res = await apiClient.get("/users/candidates/me/profile-photo", {
          responseType: "blob",
          headers: { Accept: "image/*,*/*" },
          validateStatus: () => true,
        });
        if (res.status < 200 || res.status >= 300 || cancelled) return;
        const blob = res.data;
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
    const token = useAuthStore.getState().token;
    if (!token) {
      setProfileError("Not signed in. Please log in again.");
      return;
    }
    setProfileLoading(true);
    setProfileError(null);
    try {
      const res = await apiClient.get<CandidateProfile>("/users/candidates/me", {
        headers: { Accept: "application/json" },
        validateStatus: () => true,
      });
      if (res.status === 401 || res.status === 403) {
        const detail =
          res.data && typeof res.data === "object" && !Array.isArray(res.data)
            ? (res.data as { detail?: unknown })
            : {};
        setProfileError(
          typeof detail?.detail === "string"
            ? detail.detail
            : "Session invalid or not a candidate account."
        );
        setProfile(null);
        return;
      }
      if (res.status < 200 || res.status >= 300) {
        setProfileError("Could not load profile.");
        setProfile(null);
        return;
      }
      setProfile(res.data);
    } catch {
      setProfileError("Network error. Is the API running?");
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const storedRole = useAuthStore((s) => s.role);

  useEffect(() => {
    if (storedRole && storedRole !== UserRole.CANDIDATE) {
      navigate("dashboard-recruiter");
      return;
    }
    loadProfile();
  }, [loadProfile, navigate, storedRole]);

  const displayName = useMemo(
    () =>
      profile?.first_name || profile?.last_name
        ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
        : "Candidate",
    [profile?.first_name, profile?.last_name]
  );

  const value = useMemo(
    () => ({
      profile,
      profileLoading,
      profileError,
      loadProfile,
      avatarBlobUrl,
      avatarLoadFailed,
      setAvatarLoadFailed,
      selectedJob,
      setSelectedJob,
      displayName,
    }),
    [
      profile,
      profileLoading,
      profileError,
      loadProfile,
      avatarBlobUrl,
      avatarLoadFailed,
      selectedJob,
      displayName,
    ]
  );

  return (
    <CandidateDashboardContext.Provider value={value}>
      {children}
    </CandidateDashboardContext.Provider>
  );
}

export function useCandidateDashboard() {
  const ctx = useContext(CandidateDashboardContext);
  if (!ctx) {
    throw new Error(
      "useCandidateDashboard must be used within CandidateDashboardProvider"
    );
  }
  return ctx;
}
