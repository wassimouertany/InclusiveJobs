import { useEffect, useState } from "react";
import { Lock, Trophy } from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { useToast } from "../../context/ToastContext";

// ---------------------------------------------------------------------------
// Types & config
// ---------------------------------------------------------------------------
type BadgeType =
  | "profile_complete"
  | "cv_champion"
  | "first_application"
  | "highly_matched"
  | "hired"
  | "community_voice"
  | "inclusion_advocate";

interface BadgeDoc {
  _id: string;
  badge_type: BadgeType;
  earned_at: string;
}

interface BadgeMeta {
  emoji: string;
  label: string;
  cardCls: string;
}

const ALL_BADGE_TYPES: BadgeType[] = [
  "profile_complete",
  "cv_champion",
  "first_application",
  "highly_matched",
  "hired",
  "community_voice",
  "inclusion_advocate",
];

const BADGE_META: Record<BadgeType, BadgeMeta> = {
  profile_complete:   { emoji: "✅", label: "Profile Complete",   cardCls: "bg-teal-50 border border-teal-200"    },
  cv_champion:        { emoji: "📄", label: "CV Champion",        cardCls: "bg-blue-50 border border-blue-200"    },
  first_application:  { emoji: "🚀", label: "First Application",  cardCls: "bg-purple-50 border border-purple-200" },
  highly_matched:     { emoji: "⭐", label: "Highly Matched",     cardCls: "bg-yellow-50 border border-yellow-200" },
  hired:              { emoji: "🏆", label: "Hired",              cardCls: "bg-amber-50 border border-amber-200"   },
  community_voice:    { emoji: "💬", label: "Community Voice",    cardCls: "bg-pink-50 border border-pink-200"     },
  inclusion_advocate: { emoji: "🤝", label: "Inclusion Advocate", cardCls: "bg-green-50 border border-green-200"   },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function earnedMonth(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

// ---------------------------------------------------------------------------
// BadgeCard
// ---------------------------------------------------------------------------
function BadgeCard({
  type,
  earnedAt,
  earned,
}: {
  type: BadgeType;
  earnedAt?: string;
  earned: boolean;
}) {
  const meta = BADGE_META[type];

  if (earned) {
    return (
      <div
        className={`${meta.cardCls} badge-earned rounded-2xl p-4 w-32 shrink-0 text-center flex flex-col items-center gap-2`}
        title={meta.label}
      >
        <span className="text-5xl leading-none select-none">{meta.emoji}</span>
        <p className="text-xs font-bold text-slate-700 leading-tight">{meta.label}</p>
        {earnedAt && (
          <p className="text-xs text-slate-400">Earned {earnedMonth(earnedAt)}</p>
        )}
      </div>
    );
  }

  return (
    <div
      className="bg-slate-50 border border-slate-200 rounded-2xl p-4 w-32 shrink-0 text-center flex flex-col items-center gap-2 opacity-40 grayscale relative"
      title="Keep going to earn this!"
    >
      <span className="text-5xl leading-none select-none">{meta.emoji}</span>
      <p className="text-xs font-bold text-slate-700 leading-tight">{meta.label}</p>
      <p className="text-xs text-slate-400">Locked</p>
      <div className="absolute top-2 right-2">
        <Lock size={10} className="text-slate-400" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CandidateBadges
// ---------------------------------------------------------------------------
export default function CandidateBadges() {
  const { showToast } = useToast();

  const [badges,       setBadges]       = useState<BadgeDoc[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [awarding,     setAwarding]     = useState(false);

  useEffect(() => {
    apiClient
      .get<{ badges: BadgeDoc[] }>("/badges/mine")
      .then((r) => setBadges(r.data.badges))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const earnedTypes = new Set(badges.map((b) => b.badge_type));
  const hasHired    = earnedTypes.has("hired");

  const handleAwardHired = async () => {
    if (awarding) return;
    setAwarding(true);
    try {
      const res = await apiClient.post<BadgeDoc>("/badges/award/hired");
      setBadges((prev) => [res.data, ...prev]);
      showToast({
        title: "Congratulations! 🎉",
        message: "We're so proud of you!",
        type: "success",
      });
    } catch {
      showToast({ message: "Could not award badge. Please try again.", type: "error" });
    } finally {
      setAwarding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-1">
        {ALL_BADGE_TYPES.map((t) => (
          <div key={t} className="w-32 h-28 shrink-0 rounded-2xl bg-slate-100 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Trophy size={20} className="text-amber-500 shrink-0" />
        <h3 className="text-lg font-bold text-slate-900">Your Achievements</h3>
      </div>

      {/* Badge row — scrollable on desktop, wraps on mobile */}
      <div className="flex gap-3 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-x-visible">
        {ALL_BADGE_TYPES.map((type) => {
          const doc = badges.find((b) => b.badge_type === type);
          return (
            <BadgeCard
              key={type}
              type={type}
              earned={!!doc}
              earnedAt={doc?.earned_at}
            />
          );
        })}
      </div>

      {/* Self-report hired button */}
      {!hasHired && (
        <div className="mt-4">
          <button
            type="button"
            onClick={handleAwardHired}
            disabled={awarding}
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-white rounded-2xl px-5 py-2.5 text-sm font-semibold shadow-sm transition-all"
          >
            {awarding ? "Saving…" : "Mark as Hired 🎉"}
          </button>
          <p className="text-xs text-slate-400 mt-1.5">
            Got a job through InclusiveJobs? Celebrate your win!
          </p>
        </div>
      )}
    </div>
  );
}
