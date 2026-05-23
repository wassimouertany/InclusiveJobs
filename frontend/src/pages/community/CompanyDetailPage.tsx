import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiClient } from "../../services/apiClient";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface CompanyProfile {
  _id: string;
  company_name: string;
  company_industry: string;
  location: string;
  logo_id: string | null;
  founded_year: number;
  employee_count: number;
  employees_with_disability: number;
  inclusion_strategy: string;
  total_offers: number;
  total_hires: number;
  inclusion_score: number;
  inclusion_level: "Champion" | "Gold" | "Silver" | "Bronze";
  created_at: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const LEVEL_STYLES: Record<string, string> = {
  Champion: "bg-gradient-to-r from-yellow-400 to-orange-400 text-white",
  Gold:     "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
  Silver:   "bg-gray-400/20 text-gray-300 border border-gray-400/30",
  Bronze:   "bg-orange-800/20 text-orange-400 border border-orange-700/30",
};

const GAUGE_R    = 60;
const GAUGE_CIRC = 2 * Math.PI * GAUGE_R;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function gaugeColor(score: number): string {
  if (score >= 65) return "#14B8A6"; // teal
  if (score >= 40) return "#EAB308"; // yellow
  return "#EF4444";                  // red
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function nameInitials(name: string): string {
  return (
    name
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function LevelBadge({ level }: { level: string }) {
  return (
    <span className={`rounded-full px-4 py-1.5 text-sm font-bold ${LEVEL_STYLES[level] ?? LEVEL_STYLES.Bronze}`}>
      {level}
    </span>
  );
}

function CompanyAvatar({ name, size = "w-20 h-20" }: { name: string; size?: string }) {
  return (
    <div className={`${size} rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold text-2xl shrink-0`}>
      {nameInitials(name)}
    </div>
  );
}

function InclusionGauge({ score }: { score: number }) {
  const color  = gaugeColor(score);
  const offset = GAUGE_CIRC * (1 - score / 100);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative flex items-center justify-center w-40 h-40">
        <svg width="160" height="160" viewBox="0 0 160 160" className="-rotate-90" aria-hidden>
          <circle cx="80" cy="80" r={GAUGE_R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
          <circle
            cx="80" cy="80" r={GAUGE_R}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={GAUGE_CIRC}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1s ease, stroke 0.5s ease" }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-white font-bold text-4xl leading-none">{score}</span>
          <span className="text-white/50 text-xs mt-1">/ 100</span>
        </div>
      </div>
    </div>
  );
}

function StatPill({ label }: { label: string }) {
  return (
    <span className="bg-white/10 text-white/70 rounded-full px-4 py-2 text-sm font-medium">
      {label}
    </span>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
      <p className="text-teal-400 text-xs font-bold uppercase tracking-widest mb-3">{title}</p>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CompanyDetailPage
// ---------------------------------------------------------------------------
export default function CompanyDetailPage() {
  const { recruiterId } = useParams<{ recruiterId: string }>();
  const navigate        = useNavigate();

  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  useEffect(() => {
    if (!recruiterId) { setError(true); setLoading(false); return; }
    apiClient
      .get<CompanyProfile>(`/users/recruiters/public/${recruiterId}`)
      .then((r) => setCompany(r.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [recruiterId]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-white/40">
          <div className="w-12 h-12 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
          <span className="text-sm">Loading company profile…</span>
        </div>
      </div>
    );
  }

  // ── Error / not found ────────────────────────────────────────────────────
  if (error || !company) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-center px-4">
        <div>
          <p className="text-white/40 text-6xl mb-4">🏢</p>
          <p className="text-white font-semibold text-xl mb-2">Company not found</p>
          <p className="text-white/40 text-sm mb-8">This company profile doesn't exist or has been removed.</p>
          <button
            onClick={() => navigate("/community")}
            className="bg-teal-500 hover:bg-teal-400 text-white rounded-2xl px-6 py-3 font-semibold transition-all"
          >
            ← Back to Champions
          </button>
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-900">

      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 px-4 pt-10 pb-16">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => navigate("/community")}
            className="text-white/50 hover:text-white text-sm font-medium transition-colors mb-8 flex items-center gap-1.5"
          >
            ← Back to Champions
          </button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="flex flex-col sm:flex-row items-center sm:items-start gap-6"
          >
            <CompanyAvatar name={company.company_name} size="w-20 h-20" />
            <div className="text-center sm:text-left">
              <h1 className="font-display text-4xl font-bold text-white mb-3">
                {company.company_name}
              </h1>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                {company.company_industry && (
                  <span className="bg-white/10 text-white/70 rounded-full px-3 py-1 text-sm">
                    {company.company_industry}
                  </span>
                )}
                {company.location && (
                  <span className="bg-white/10 text-white/70 rounded-full px-3 py-1 text-sm">
                    📍 {company.location}
                  </span>
                )}
                {company.founded_year > 0 && (
                  <span className="bg-white/10 text-white/70 rounded-full px-3 py-1 text-sm">
                    Est. {company.founded_year}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-10">

        {/* Inclusion score gauge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="flex flex-col items-center gap-5"
        >
          <InclusionGauge score={company.inclusion_score} />
          <LevelBadge level={company.inclusion_level} />
          <div className="flex flex-wrap justify-center gap-3">
            {company.employee_count > 0 && (
              <StatPill label={`${company.employee_count.toLocaleString()} employees`} />
            )}
            {company.employees_with_disability > 0 && (
              <StatPill label={`${company.employees_with_disability} with disabilities`} />
            )}
          </div>
        </motion.div>

        {/* Info cards grid */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          <InfoCard title="Inclusion Strategy">
            <p className="text-white/70 text-sm leading-relaxed">
              {company.inclusion_strategy?.trim() || "Not provided"}
            </p>
          </InfoCard>

          <InfoCard title="Hiring Stats">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white/50 text-sm">Accepted hires</span>
                <span className="text-white font-bold text-lg">{company.total_hires}</span>
              </div>
              <div className="h-px bg-white/10" />
              <div className="flex items-center justify-between">
                <span className="text-white/50 text-sm">Open offers</span>
                <span className="text-white font-bold text-lg">{company.total_offers}</span>
              </div>
            </div>
          </InfoCard>

          <InfoCard title="On Platform Since">
            <p className="text-white font-semibold text-lg">{formatDate(company.created_at)}</p>
            <p className="text-white/40 text-xs mt-1">Member of InclusiveJobs</p>
          </InfoCard>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="flex justify-center"
        >
          <button
            onClick={() => navigate("/find-jobs")}
            className="bg-teal-500 hover:bg-teal-400 text-white rounded-2xl px-8 py-3.5 font-semibold shadow-lg transition-all"
          >
            View Open Jobs →
          </button>
        </motion.div>
      </div>
    </div>
  );
}
