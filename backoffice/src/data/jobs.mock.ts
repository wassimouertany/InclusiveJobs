import type { BoJob } from "../types";

const companies = ["TechForAll", "Inclusive Corp", "North HR", "Insight Labs", "CareConnect", "AccessWorks"];
const titles = [
  "Frontend Developer",
  "Accessibility Specialist",
  "HR Inclusion Lead",
  "Data Analyst",
  "Customer Success",
  "UX Researcher",
  "Backend Engineer",
  "Inclusion Coach",
];
const types = ["Full-time", "Part-time", "Contract", "Hybrid", "Remote"];
const statuses: BoJob["status"][] = ["open", "open", "open", "closed", "archived", "draft"];

export const initialJobs: BoJob[] = Array.from({ length: 18 }, (_, i) => {
  const n = i + 1;
  const status = statuses[i % statuses.length];
  return {
    id: `J-${500 + n}`,
    title: titles[i % titles.length],
    company: companies[i % companies.length],
    location: i % 3 === 0 ? "Remote" : ["Tunis", "Sfax", "Sousse"][i % 3],
    type: types[i % types.length],
    applicants: 8 + (i * 3) % 40,
    status,
    postedAt: `2026-0${(i % 4) + 1}-${String((i % 26) + 1).padStart(2, "0")}`,
    possibleAccommodations:
      "Flexible schedule, assistive technology budget, accessible interview process",
    description:
      "Inclusive role focused on accessible collaboration and measurable inclusion outcomes.",
  };
});
