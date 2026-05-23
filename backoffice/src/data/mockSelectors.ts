import type { BoApplication, BoJob, BoUser, DashboardStat } from "../types";

export function computeDashboardStats(
  users: BoUser[],
  jobs: BoJob[],
  applications: BoApplication[],
): DashboardStat[] {
  const activeUsers = users.filter((u) => u.status === "active").length;
  const openJobs = jobs.filter((j) => j.status === "open").length;
  const avgMatch =
    applications.length === 0
      ? 0
      : Math.round(
          applications.reduce((s, a) => s + a.matchScore, 0) / applications.length,
        );

  return [
    { label: "Active Users", value: activeUsers.toLocaleString(), delta: "+12.4%", tone: "success" },
    { label: "Open Jobs", value: openJobs.toLocaleString(), delta: "+4.1%", tone: "success" },
    { label: "Applications", value: applications.length.toLocaleString(), delta: "+18.7%", tone: "success" },
    { label: "Avg Match Score", value: `${avgMatch}%`, delta: "+2.3%", tone: "neutral" },
  ];
}
