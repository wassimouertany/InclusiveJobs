const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("bo_token");
  return { Authorization: `Bearer ${token}` };
}

export interface AdminStats {
  total_candidates: number;
  total_recruiters: number;
  actively_looking: number;
  total_offers: number;
  open_offers: number;
  total_applications: number;
  applications_submitted: number;
  applications_under_review: number;
  applications_interview_scheduled: number;
  applications_accepted: number;
  applications_rejected: number;
  conversion_rate: number;
  disability_breakdown: Record<string, number>;
  work_preference_breakdown: Record<string, number>;
  top_inclusive_recruiters: {
    company_name: string;
    employees_with_disability: number | null;
    total_accepted: number;
  }[];
  total_stories: number;
  total_badges_awarded: number;
  hired_badges: number;
  new_candidates_7d: number;
  new_applications_7d: number;
  new_offers_7d: number;
  registrations_trend: { date: string; count: number }[];
  applications_trend: { date: string; count: number }[];
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const res = await fetch(`${API_BASE}/admin/stats`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

// ── TYPES ─────────────────────────────────────────────────────────────────

export interface RealCandidate {
  _id: string;
  first_name: string;
  last_name: string;
  email: string;
  address?: string;
  disability_type?: string;
  work_preference?: string;
  availability_status?: string;
  industry?: string;
  profile_title?: string;
  years_of_experience?: number;
  created_at?: string;
  status?: string;
}

export interface RealRecruiter {
  _id: string;
  company_name: string;
  email: string;
  location?: string;
  company_industry?: string;
  employee_count?: number;
  employees_with_disability?: number;
  created_at?: string;
  status?: string;
}

export interface RealJob {
  _id: string;
  title: string;
  company_name?: string;
  location?: string;
  contract_type?: string;
  status: string;
  created_at?: string;
  recruiter_id?: string;
}

export interface RealApplication {
  _id: string;
  candidate_name: string;
  job_title: string;
  company_name: string;
  status: string;
  created_at?: string;
  recruiter_id?: string;
  offer_id?: string;
  candidate_id?: string;
}

// ── FETCH FUNCTIONS ───────────────────────────────────────────────────────

export async function fetchCandidates(): Promise<RealCandidate[]> {
  const res = await fetch(`${API_BASE}/admin/users/candidates`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch candidates");
  return res.json();
}

export async function fetchRecruiters(): Promise<RealRecruiter[]> {
  const res = await fetch(`${API_BASE}/admin/users/recruiters`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch recruiters");
  return res.json();
}

export async function fetchJobs(): Promise<RealJob[]> {
  const res = await fetch(`${API_BASE}/admin/jobs`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch jobs");
  return res.json();
}

export async function fetchApplications(): Promise<RealApplication[]> {
  const res = await fetch(`${API_BASE}/admin/applications`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch applications");
  return res.json();
}

export async function setUserStatus(role: string, userId: string, status: string) {
  const res = await fetch(`${API_BASE}/admin/users/${role}/${userId}/status`, {
    method: "PATCH",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update status");
  return res.json();
}

export async function setJobStatus(jobId: string, status: string) {
  const res = await fetch(`${API_BASE}/admin/jobs/${jobId}/status`, {
    method: "PATCH",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update job status");
  return res.json();
}
