import React from "react";

export function formatEnumLabel(value: string | undefined): string {
  if (!value) return "—";
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Job offer `possible_accommodations` is often one string; split for lists. */
export function splitAccommodations(raw?: string): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/\n+/)
    .flatMap((line) => line.split(";").map((s) => s.trim()))
    .filter(Boolean);
}

/** Relative label for job `created_at` ISO strings. */
export function formatPosted(iso?: string): string {
  if (!iso) return "Recently posted";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "Recently posted";
    const now = Date.now();
    const diff = now - d.getTime();
    const days = Math.floor(diff / (864e5));
    if (days <= 0) return "Posted today";
    if (days === 1) return "1 day ago";
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "Recently posted";
  }
}

export function initials(first?: string, last?: string): string {
  const a = first?.trim().charAt(0) ?? "";
  const b = last?.trim().charAt(0) ?? "";
  const s = (a + b).toUpperCase();
  return s || "?";
}

export function ProfileField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="text-gray-900 font-medium break-words">{value ?? "—"}</p>
    </div>
  );
}

/** Whether a job-listed skill aligns with the candidate profile (normalized + fuzzy). */
export function jobSkillMatchesCandidate(
  jobSkill: string,
  profileSkills: string[]
): boolean {
  const n = jobSkill.trim().toLowerCase();
  if (!n || profileSkills.length === 0) return false;
  const set = new Set(profileSkills.map((s) => s.trim().toLowerCase()).filter(Boolean));
  if (set.has(n)) return true;
  for (const p of set) {
    if (!p || p.length < 2) continue;
    if (n === p) return true;
    if (n.length >= 4 && p.length >= 4 && (n.includes(p) || p.includes(n)))
      return true;
  }
  return false;
}

/**
 * Build a deduped skill list from job `key_skills` / `required_skills`, including
 * splitting comma-separated strings (e.g. `["Python,NLP,TensorFlow"]`).
 */
export function normalizeJobSkillTags(
  keySkills?: unknown,
  requiredSkills?: unknown
): string[] {
  const raw = [
    ...normalizeToStringArray(keySkills),
    ...normalizeToStringArray(requiredSkills),
  ];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    for (const part of item.split(",")) {
      const p = part.trim();
      if (!p) continue;
      const k = p.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(p);
    }
  }
  return out.slice(0, 32);
}

/** Coerce API values to a clean string list (arrays or JSON array strings). */
export function normalizeToStringArray(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    const t = value.trim();
    if (!t) return [];
    if (t.startsWith("[") && t.endsWith("]")) {
      try {
        const parsed: unknown = JSON.parse(t);
        if (Array.isArray(parsed)) {
          return parsed.map((v) => String(v).trim()).filter(Boolean);
        }
        return [];
      } catch {
        return [t];
      }
    }
    return [t];
  }
  return [];
}

export function PillList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return (
      <span className="text-sm text-gray-500">None specified</span>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <span
          key={`${item}-${i}`}
          className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

export function ProfileLabeledPills({
  label,
  raw,
}: {
  label: string;
  raw: unknown;
}) {
  const items = normalizeToStringArray(raw);
  return (
    <div className="space-y-1">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <PillList items={items} />
    </div>
  );
}
