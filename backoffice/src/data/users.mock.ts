import type { BoUser } from "../types";

const cities = ["Tunis", "Sfax", "Sousse", "Bizerte", "Nabeul", "Remote"];
const disabilities = ["motor", "visual", "hearing", "cognitive", "psychological", "other"];
const accommodations = [
  "Screen reader compatible workspace",
  "Flexible hours and remote option",
  "Wheelchair accessible office",
  "Sign language interpreter on request",
  "Quiet workspace and written instructions",
];

const candidates: BoUser[] = Array.from({ length: 18 }, (_, i) => {
  const n = i + 1;
  return {
    id: `U-C${String(n).padStart(3, "0")}`,
    name: `Candidate ${n}`,
    email: `candidate${n}@mail.tn`,
    role: "candidate",
    city: cities[i % cities.length],
    status: i % 11 === 0 ? "suspended" : "active",
    joinedAt: `2025-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 27) + 1).padStart(2, "0")}`,
    disabilityType: disabilities[i % disabilities.length],
    accessibilityNeeds: "High contrast UI, keyboard navigation",
    accommodations: accommodations[i % accommodations.length],
  };
});

const recruiters: BoUser[] = Array.from({ length: 8 }, (_, i) => {
  const n = i + 1;
  return {
    id: `U-R${String(n).padStart(3, "0")}`,
    name: `Recruiter ${n}`,
    email: `recruiter${n}@company.tn`,
    role: "recruiter",
    city: cities[(i + 2) % cities.length],
    status: i === 3 ? "suspended" : "active",
    joinedAt: `2025-${String((i % 10) + 1).padStart(2, "0")}-10`,
    company: `Company ${n}`,
  };
});

const admins: BoUser[] = [
  {
    id: "U-A001",
    name: "Admin Ops",
    email: "ops@inclusivejobs.demo",
    role: "admin",
    city: "Remote",
    status: "active",
    joinedAt: "2025-06-01",
  },
  {
    id: "U-A002",
    name: "Sonia Admin",
    email: "sonia.admin@inclusivejobs.demo",
    role: "admin",
    city: "Tunis",
    status: "active",
    joinedAt: "2025-09-12",
  },
];

export const initialUsers: BoUser[] = [
  {
    id: "U-C000",
    name: "Sarah Ben Ali",
    email: "sarah.b@mail.tn",
    role: "candidate",
    city: "Tunis",
    status: "active",
    joinedAt: "2025-11-02",
    disabilityType: "visual",
    accessibilityNeeds: "Screen reader, large text",
    accommodations: "Remote-first role with accessible tooling",
  },
  {
    id: "U-C001",
    name: "Amira Tounsi",
    email: "amira.t@mail.tn",
    role: "candidate",
    city: "Sousse",
    status: "active",
    joinedAt: "2026-01-09",
    disabilityType: "hearing",
    accessibilityNeeds: "Captions and visual alerts",
    accommodations: "Sign language sessions for interviews",
  },
  ...candidates.slice(2),
  {
    id: "U-R001",
    name: "Mohamed Khelifi",
    email: "m.khelifi@corp.tn",
    role: "recruiter",
    city: "Sfax",
    status: "active",
    joinedAt: "2025-10-18",
    company: "TechForAll",
  },
  ...recruiters.slice(1),
  ...admins,
];
