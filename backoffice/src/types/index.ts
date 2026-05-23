export type UserRole = "candidate" | "recruiter" | "admin";
export type UserStatus = "active" | "suspended";
export type JobStatus = "open" | "closed" | "archived" | "draft";
export type AppStatus = "pending" | "review" | "accepted" | "rejected";
export type EmployerStatus = "active" | "trial" | "suspended";
export type ThemeMode = "light" | "dark" | "invert";
export type UiLanguage = "en" | "fr";

export interface BoUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  city: string;
  status: UserStatus;
  joinedAt: string;
  disabilityType?: string;
  accessibilityNeeds?: string;
  accommodations?: string;
  company?: string;
}

export interface BoJob {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  applicants: number;
  status: JobStatus;
  postedAt: string;
  possibleAccommodations?: string;
  description?: string;
}

export interface BoApplication {
  id: string;
  candidate: string;
  jobTitle: string;
  company: string;
  matchScore: number;
  status: AppStatus;
  submittedAt: string;
}

export interface BoEmployer {
  id: string;
  name: string;
  plan: "Starter" | "Pro" | "Enterprise";
  jobs: number;
  hires: number;
  status: EmployerStatus;
  industry?: string;
}

export interface BoActivity {
  id: string;
  message: string;
  time: string;
}

export interface ChartPoint {
  date: string;
  users: number;
  applications: number;
}

export interface DashboardStat {
  label: string;
  value: string;
  delta: string;
  tone: "success" | "neutral" | "warning";
}
