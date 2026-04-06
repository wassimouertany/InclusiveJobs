import type { Page } from "../types";

export const PATH_BY_PAGE: Record<Page, string> = {
  landing: "/",
  login: "/login",
  "find-jobs": "/find-jobs",
  employers: "/employers",
  dashboard: "/dashboard",
  "dashboard-recruiter": "/dashboard/recruiter",
  "dashboard-candidate-home": "/dashboard/candidate/home",
  "dashboard-candidate-profile": "/dashboard/candidate/profile",
  "dashboard-candidate-find-jobs": "/dashboard/candidate/find-jobs",
  "dashboard-candidate-applications": "/dashboard/candidate/applications",
};

export function pageToPath(page: Page): string {
  return PATH_BY_PAGE[page];
}

export function pathToPage(pathname: string): Page {
  const p = pathname.replace(/\/$/, "") || "/";
  if (p.startsWith("/dashboard/candidate")) {
    if (p === "/dashboard/candidate" || p === "/dashboard/candidate/home") {
      return "dashboard-candidate-home";
    }
    if (p === "/dashboard/candidate/profile") {
      return "dashboard-candidate-profile";
    }
    if (p === "/dashboard/candidate/find-jobs") {
      return "dashboard-candidate-find-jobs";
    }
    if (p === "/dashboard/candidate/applications") {
      return "dashboard-candidate-applications";
    }
    return "dashboard-candidate-home";
  }
  if (p === "/dashboard/recruiter") return "dashboard-recruiter";
  if (p === "/dashboard") return "dashboard";
  if (p === "/login") return "login";
  if (p === "/find-jobs") return "find-jobs";
  if (p === "/employers") return "employers";
  if (p === "/") return "landing";
  return "landing";
}
