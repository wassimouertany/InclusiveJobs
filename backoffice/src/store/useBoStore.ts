import { create } from "zustand";
import {
  initialActivity,
  initialApplications,
  initialEmployers,
  initialJobs,
  initialUsers,
} from "../data";
import type {
  AppStatus,
  BoApplication,
  BoEmployer,
  BoJob,
  BoUser,
  JobStatus,
  ThemeMode,
  UiLanguage,
  UserStatus,
} from "../types";

interface BoState {
  isAuthenticated: boolean;
  users: BoUser[];
  jobs: BoJob[];
  applications: BoApplication[];
  employers: BoEmployer[];
  activityFeed: typeof initialActivity;
  theme: ThemeMode;
  language: UiLanguage;
  compactSidebar: boolean;
  login: () => void;
  logout: () => void;
  setTheme: (theme: ThemeMode) => void;
  setLanguage: (language: UiLanguage) => void;
  setCompactSidebar: (compact: boolean) => void;
  setUserStatus: (id: string, status: UserStatus) => void;
  setJobStatus: (id: string, status: JobStatus) => void;
  setApplicationStatus: (id: string, status: AppStatus) => void;
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.setAttribute("data-theme", theme);
}

export const useBoStore = create<BoState>((set) => ({
  isAuthenticated: sessionStorage.getItem("bo-auth") === "1",
  users: initialUsers,
  jobs: initialJobs,
  applications: initialApplications,
  employers: initialEmployers,
  activityFeed: initialActivity,
  theme: (sessionStorage.getItem("bo-theme") as ThemeMode) || "light",
  language: (sessionStorage.getItem("bo-lang") as UiLanguage) || "en",
  compactSidebar: sessionStorage.getItem("bo-compact") === "1",

  login: () => {
    sessionStorage.setItem("bo-auth", "1");
    set({ isAuthenticated: true });
  },
  logout: () => {
    sessionStorage.removeItem("bo-auth");
    set({ isAuthenticated: false });
  },
  setTheme: (theme) => {
    sessionStorage.setItem("bo-theme", theme);
    applyTheme(theme);
    set({ theme });
  },
  setLanguage: (language) => {
    sessionStorage.setItem("bo-lang", language);
    set({ language });
  },
  setCompactSidebar: (compactSidebar) => {
    sessionStorage.setItem("bo-compact", compactSidebar ? "1" : "0");
    set({ compactSidebar });
  },
  setUserStatus: (id, status) =>
    set((s) => ({
      users: s.users.map((u) => (u.id === id ? { ...u, status } : u)),
    })),
  setJobStatus: (id, status) =>
    set((s) => ({
      jobs: s.jobs.map((j) => (j.id === id ? { ...j, status } : j)),
    })),
  setApplicationStatus: (id, status) =>
    set((s) => ({
      applications: s.applications.map((a) => (a.id === id ? { ...a, status } : a)),
    })),
}));

const initialTheme = (sessionStorage.getItem("bo-theme") as ThemeMode) || "light";
applyTheme(initialTheme);
