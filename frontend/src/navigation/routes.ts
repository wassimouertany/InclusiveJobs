import type { Page } from "../types";

export const PATH_BY_PAGE: Record<Page, string> = {
  landing: "/",
  login: "/login",
  "find-jobs": "/find-jobs",
  employers: "/employers",
  dashboard: "/dashboard",
  "dashboard-recruiter": "/dashboard/recruiter",
  "dashboard-candidate": "/dashboard/candidate",
};

export function pageToPath(page: Page): string {
  return PATH_BY_PAGE[page];
}

export function pathToPage(pathname: string): Page {
  const p = pathname.replace(/\/$/, "") || "/";
  if (p === "/dashboard/candidate") return "dashboard-candidate";
  if (p === "/dashboard/recruiter") return "dashboard-recruiter";
  if (p === "/dashboard") return "dashboard";
  if (p === "/login") return "login";
  if (p === "/find-jobs") return "find-jobs";
  if (p === "/employers") return "employers";
  if (p === "/") return "landing";
  return "landing";
}
