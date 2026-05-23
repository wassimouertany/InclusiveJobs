import type { AppStatus, BoApplication } from "../types";

const statuses: AppStatus[] = ["pending", "review", "accepted", "rejected"];

export const initialApplications: BoApplication[] = Array.from({ length: 28 }, (_, i) => {
  const n = i + 1;
  return {
    id: `A-${9000 + n}`,
    candidate: i % 2 === 0 ? `Candidate ${(i % 12) + 1}` : ["Sarah Ben Ali", "Amira Tounsi", "Nadia R."][i % 3],
    jobTitle: ["Frontend Developer", "Accessibility Specialist", "Customer Success", "Data Analyst"][i % 4],
    company: ["TechForAll", "Inclusive Corp", "CareConnect", "Insight Labs"][i % 4],
    matchScore: 68 + (i * 7) % 32,
    status: statuses[i % statuses.length],
    submittedAt: `2026-05-${String((i % 28) + 1).padStart(2, "0")}`,
  };
});
