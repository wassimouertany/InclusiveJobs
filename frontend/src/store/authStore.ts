import { create } from "zustand";
import { persist, type PersistStorage } from "zustand/middleware";
import { clearAllSensitiveDrafts } from "../utils/formDraft";

export const AUTH_TOKEN_KEY = "inclusivejobs_access_token";
export const AUTH_ROLE_KEY = "inclusivejobs_role";
export const AUTH_USER_ID_KEY = "inclusivejobs_user_id";

type AuthState = {
  token: string | null;
  role: string | null;
  userId: string | null;
  // Not persisted (see partialize below) — a transient in-memory flag set by
  // apiClient's response interceptor when a request comes back 401 "token
  // expired/invalid". Read by SessionExpiredScreen to show an explicit
  // re-login screen instead of redirecting mid-keystroke.
  sessionExpired: boolean;
  setAuth: (token: string, role: string, userId: string) => void;
  clearAuth: () => void;
  markSessionExpired: () => void;
  clearSessionExpired: () => void;
};

type PersistedAuthState = Pick<
  AuthState,
  "token" | "role" | "userId"
>;

const inclusiveJobsAuthStorage: PersistStorage<PersistedAuthState> = {
  getItem: () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const role = localStorage.getItem(AUTH_ROLE_KEY);
    const userId = localStorage.getItem(AUTH_USER_ID_KEY);
    if (token === null && role === null && userId === null) return null;
    return {
      state: { token, role, userId },
      version: 0,
    };
  },
  setItem: (_name, value) => {
    const { token, role, userId } = value.state;
    if (token != null) localStorage.setItem(AUTH_TOKEN_KEY, token);
    else localStorage.removeItem(AUTH_TOKEN_KEY);
    if (role != null) localStorage.setItem(AUTH_ROLE_KEY, role);
    else localStorage.removeItem(AUTH_ROLE_KEY);
    if (userId != null) localStorage.setItem(AUTH_USER_ID_KEY, userId);
    else localStorage.removeItem(AUTH_USER_ID_KEY);
  },
  removeItem: () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_ROLE_KEY);
    localStorage.removeItem(AUTH_USER_ID_KEY);
  },
};

export const useAuthStore = create<AuthState>()(
  persist<AuthState, [], [], PersistedAuthState>(
    (set) => ({
      token: null,
      role: null,
      userId: null,
      sessionExpired: false,
      setAuth: (token, role, userId) => set({ token, role, userId, sessionExpired: false }),
      clearAuth: () => {
        clearAllSensitiveDrafts();
        set({ token: null, role: null, userId: null, sessionExpired: false });
      },
      markSessionExpired: () => set({ sessionExpired: true }),
      clearSessionExpired: () => set({ sessionExpired: false }),
    }),
    {
      name: "inclusivejobs-auth",
      storage: inclusiveJobsAuthStorage,
      partialize: (state) => ({
        token: state.token,
        role: state.role,
        userId: state.userId,
      }),
    },
  ),
);
