import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  BookmarkCheck,
  CheckCircle,
  ChevronLeft,
  Loader2,
  Sparkles,
  User,
} from "lucide-react";
import { useToast } from "../../context/ToastContext";
import { apiClient } from "../../services/apiClient";
import { API_BASE_URL } from "../../config/api";
import {
  explanationPreview,
  readErrorDetailFromResponseLike,
} from "./recruiterShared";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const AI_MESSAGES = [
  "Analyzing candidate profiles...",
  "Computing accessibility compatibility...",
  "Ranking best matches for your offer...",
  "Almost ready...",
];

const AVATAR_GRADIENTS = [
  "from-indigo-400 to-purple-500",
  "from-teal-400 to-indigo-500",
  "from-purple-400 to-pink-500",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function nameInitials(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return "?";
}

// ---------------------------------------------------------------------------
// ScoreRing — SVG circular progress ring
// ---------------------------------------------------------------------------
function ScoreRing({ score, size = 64 }) {
  const R      = size * 0.4;
  const circ   = 2 * Math.PI * R;
  const offset = circ * (1 - score / 100);
  const sw     = size < 70 ? 5 : 6;
  const color  = score >= 70 ? "#4f46e5" : score >= 40 ? "#f59e0b" : "#ef4444";
  const fontSize = size >= 80 ? "1rem" : "0.75rem";
  return (
    <div
      className="relative shrink-0 flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden
      >
        <circle
          cx={size / 2} cy={size / 2} r={R}
          fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={sw}
        />
        <circle
          cx={size / 2} cy={size / 2} r={R}
          fill="none" stroke={color} strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <span
        className="absolute font-extrabold"
        style={{ color, fontSize }}
      >
        {score}%
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CandidateAvatar — tries photo, falls back to gradient initials
// ---------------------------------------------------------------------------
function CandidateAvatar({ candidateId, name, index }) {
  const [failed, setFailed] = useState(false);
  if (!failed) {
    return (
      <img
        src={`${API_BASE_URL}/users/candidates/${candidateId}/photo`}
        alt=""
        className="w-14 h-14 rounded-full object-cover shrink-0"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div
      className={`w-14 h-14 rounded-full bg-linear-to-br ${AVATAR_GRADIENTS[index % 3]} flex items-center justify-center text-white text-xl font-bold shrink-0`}
    >
      {nameInitials(name)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MatchCard
// ---------------------------------------------------------------------------
function MatchCard({ match, index, isSaved, isSaving, onSelect, onGoTo, onSave }) {
  const score = Math.round(Number(match.ai_score) || 0);
  const cid   = match.candidate_id;

  const scoreLabel =
    score >= 70
      ? { text: "High Match",    color: "text-indigo-600" }
      : score >= 40
      ? { text: "Partial Match", color: "text-amber-600" }
      : { text: "Low Match",     color: "text-red-500" };

  const skills = Array.isArray(match.skills) ? match.skills.slice(0, 3) : [];

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-lg hover:border-indigo-100 transition-all duration-200">
      {/* Row 1 */}
      <div className="flex items-start gap-4">
        <CandidateAvatar candidateId={cid} name={match.name} index={index} />

        <div className="flex-1 min-w-0">
          <h4 className="text-xl font-bold text-slate-900 leading-tight">
            {match.name || "Candidate"}
          </h4>
          {match.profile_title && (
            <p className="text-sm text-slate-500 mt-0.5 truncate">{match.profile_title}</p>
          )}
          {skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {skills.map((s) => (
                <span
                  key={s}
                  className="bg-indigo-50 text-indigo-700 rounded-full px-2.5 py-0.5 text-xs font-medium"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0 flex flex-col items-center gap-1">
          <ScoreRing score={score} size={64} />
          <span className={`text-xs font-semibold ${scoreLabel.color}`}>
            {scoreLabel.text}
          </span>
        </div>
      </div>

      {/* Row 2: AI explanation preview */}
      <div className="bg-slate-50 rounded-xl p-3 mt-3 flex items-start gap-2">
        <Sparkles size={14} className="text-indigo-400 shrink-0 mt-0.5" />
        <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">
          {explanationPreview(match.explanation) || "No explanation available."}
        </p>
      </div>

      {/* Row 3: Actions */}
      <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100 flex-wrap">
        <button
          onClick={() => onSelect(match)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
        >
          View AI Analysis
        </button>
        <button
          onClick={() => onGoTo(cid)}
          className="bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 rounded-xl px-4 py-2 text-sm font-medium transition-colors"
        >
          Full Profile
        </button>
        {isSaved ? (
          <button
            disabled
            className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-2 text-sm font-medium flex items-center gap-1.5"
          >
            <BookmarkCheck size={14} /> Saved
          </button>
        ) : (
          <button
            onClick={() => onSave(cid)}
            disabled={isSaving}
            className="bg-white border border-slate-200 hover:border-indigo-300 text-slate-600 hover:text-indigo-700 rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : "Save"}
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RecruiterMatchesPage
// ---------------------------------------------------------------------------
export default function RecruiterMatchesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const offerId  = searchParams.get("offer")?.trim() || null;
  const cacheKey = offerId ? `recruiter-matches:${offerId}` : "";

  const readCached = () => {
    if (!cacheKey) return null;
    try {
      const raw = sessionStorage.getItem(cacheKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return {
        matchingOfferTitle:
          typeof parsed.matchingOfferTitle === "string" ? parsed.matchingOfferTitle : "",
        matchResults: Array.isArray(parsed.matchResults) ? parsed.matchResults : [],
        savedIds: Array.isArray(parsed.savedIds) ? parsed.savedIds.map(String) : [],
      };
    } catch {
      return null;
    }
  };
  const cached = readCached();

  const [matchingOfferTitle, setMatchingOfferTitle] = useState(
    () => cached?.matchingOfferTitle || ""
  );
  const [matchResults,    setMatchResults]    = useState(() => cached?.matchResults || []);
  const [matchLoading,    setMatchLoading]    = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [savingId,        setSavingId]        = useState(null);
  const [savedIds,        setSavedIds]        = useState(
    () => new Set((cached?.savedIds || []).map(String))
  );
  const { showToast } = useToast();
  const [msgIndex,   setMsgIndex]   = useState(0);
  const [msgVisible, setMsgVisible] = useState(true);

  useEffect(() => {
    setSelectedCandidate(null);

    if (!offerId) {
      setMatchResults([]);
      setMatchingOfferTitle("");
      setSavedIds(new Set());
      return;
    }

    let cancelled = false;
    setMatchLoading(true);

    (async () => {
      try {
        const [offerRes, matchRes] = await Promise.all([
          apiClient.get(`/job-offers/${encodeURIComponent(offerId)}`, {
            validateStatus: () => true,
          }),
          apiClient.get(
            `/ai/matches/for-offer/${encodeURIComponent(offerId)}?top_k=5`,
            { validateStatus: () => true }
          ),
        ]);
        if (cancelled) return;

        if (offerRes.status >= 200 && offerRes.status < 300) {
          const o = offerRes.data;
          setMatchingOfferTitle(o.title || "");
          const saved = o.saved_candidates;
          setSavedIds(new Set(Array.isArray(saved) ? saved.map(String) : []));
        } else {
          showToast(
            readErrorDetailFromResponseLike(offerRes.data, offerRes.statusText),
            "error"
          );
        }

        if (matchRes.status >= 200 && matchRes.status < 300) {
          setMatchResults(matchRes.data.matches || []);
        } else {
          showToast(
            readErrorDetailFromResponseLike(matchRes.data, matchRes.statusText),
            "error"
          );
        }
      } catch {
        if (!cancelled) {
          showToast("AI matching failed. Is the API running?", "error");
        }
      } finally {
        if (!cancelled) setMatchLoading(false);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offerId]);

  useEffect(() => {
    if (!cacheKey) return;
    try {
      sessionStorage.setItem(
        cacheKey,
        JSON.stringify({
          matchingOfferTitle,
          matchResults,
          savedIds: Array.from(savedIds).map(String),
        })
      );
    } catch {
      // ignore storage errors
    }
  }, [cacheKey, matchingOfferTitle, matchResults, savedIds]);

  useEffect(() => {
    if (!matchLoading) {
      setMsgIndex(0);
      setMsgVisible(true);
      return;
    }
    const id = setInterval(() => {
      setMsgVisible(false);
      setTimeout(() => {
        setMsgIndex((i) => (i + 1) % AI_MESSAGES.length);
        setMsgVisible(true);
      }, 300);
    }, 2000);
    return () => clearInterval(id);
  }, [matchLoading]);

  const handleSaveCandidate = async (candidateId) => {
    if (!offerId) return;
    setSavingId(candidateId);
    try {
      const response = await apiClient.post(
        `/job-offers/${offerId}/save-candidate/${candidateId}`,
        {},
        { validateStatus: () => true }
      );
      if (response.status >= 200 && response.status < 300) {
        setSavedIds((prev) => new Set([...prev, candidateId]));
        showToast("Candidate saved to this offer!", "success");
      } else {
        showToast(
          readErrorDetailFromResponseLike(response.data, response.statusText),
          "error"
        );
      }
    } catch {
      showToast("Could not save candidate.", "error");
    } finally {
      setSavingId(null);
    }
  };

  const goToCandidate = (candidateId) =>
    navigate(
      `/dashboard/recruiter/candidate/${encodeURIComponent(String(candidateId))}`,
      { state: { from: `${location.pathname}${location.search}` } }
    );

  // ── Selected candidate detail view ───────────────────────────────────────
  if (selectedCandidate) {
    const score     = Math.round(Number(selectedCandidate.ai_score) || 0);
    const cid       = selectedCandidate.candidate_id;
    const isSaved   = savedIds.has(cid);
    const isSaving  = savingId === cid;
    const strengths = Array.isArray(selectedCandidate.strengths) ? selectedCandidate.strengths : [];
    const concerns  = Array.isArray(selectedCandidate.concerns)  ? selectedCandidate.concerns  : [];

    const scoreLabel =
      score >= 70
        ? { text: "High Match",    color: "text-indigo-600",  bg: "bg-indigo-50  border-indigo-100" }
        : score >= 40
        ? { text: "Partial Match", color: "text-amber-600",   bg: "bg-amber-50   border-amber-100" }
        : { text: "Low Match",     color: "text-red-500",     bg: "bg-red-50     border-red-100" };

    return (
      <div>
        <button
          onClick={() => setSelectedCandidate(null)}
          className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-semibold text-sm mb-6 transition-colors"
        >
          <ChevronLeft size={18} /> Back to Results
        </button>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* ── Left column (2/3) ─────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">
            {/* Header card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center gap-5">
              <ScoreRing score={score} size={80} />
              <div>
                <h2 className="text-3xl font-black text-slate-900 leading-tight">
                  {selectedCandidate.name || "Candidate"}
                </h2>
                <span className={`inline-block mt-2 rounded-full px-3 py-1 text-xs font-bold border ${scoreLabel.bg} ${scoreLabel.color}`}>
                  {scoreLabel.text}
                </span>
              </div>
            </div>

            {/* AI Analysis */}
            <div className="bg-linear-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={18} className="text-indigo-600 shrink-0" />
                <h3 className="font-bold text-slate-800">AI Analysis</h3>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {selectedCandidate.explanation?.trim() || "—"}
              </p>
            </div>

            {/* Strengths */}
            {strengths.length > 0 && (
              <div>
                <h4 className="font-bold text-slate-800 mb-3">Strengths</h4>
                {strengths.map((s) => (
                  <div
                    key={s}
                    className="bg-green-50 rounded-xl p-3 mb-2 flex items-start gap-2"
                  >
                    <CheckCircle size={16} className="text-green-600 shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-700">{s}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Concerns */}
            {concerns.length > 0 && (
              <div>
                <h4 className="font-bold text-slate-800 mb-3">Concerns</h4>
                {concerns.map((c) => (
                  <div
                    key={c}
                    className="bg-amber-50 rounded-xl p-3 mb-2 flex items-start gap-2"
                  >
                    <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-700">{c}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Right column (1/3) ─────────────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm sticky top-24 space-y-3">
              <h4 className="font-bold text-slate-800 mb-1">Actions</h4>

              <button
                onClick={() => goToCandidate(cid)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-3 font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <User size={16} /> View Full Profile & Resume
              </button>

              {isSaved ? (
                <button
                  disabled
                  className="w-full bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 font-medium flex items-center justify-center gap-2"
                >
                  <BookmarkCheck size={16} /> Saved ✓
                </button>
              ) : (
                <button
                  onClick={() => handleSaveCandidate(cid)}
                  disabled={isSaving}
                  className="w-full bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 rounded-xl px-4 py-3 font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <><BookmarkCheck size={16} /> Save Candidate</>
                  )}
                </button>
              )}

              <button
                onClick={() => setSelectedCandidate(null)}
                className="w-full text-slate-500 hover:text-slate-700 py-2 text-sm font-medium transition-colors"
              >
                ← Back to Results
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── No offer selected ────────────────────────────────────────────────────
  if (!offerId) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-border shadow-sm text-center">
        <Sparkles className="mx-auto text-purple-400 mb-4" size={48} />
        <h3 className="text-xl font-bold text-gray-900 mb-2">AI Candidate Matching</h3>
        <p className="text-gray-500 max-w-md mx-auto mb-6">
          Go to <strong>Manage Offers</strong>, then click <strong>AI Match</strong> on an offer, or
          open a link with <code className="text-xs bg-gray-100 px-1 rounded">?offer=</code> and your
          offer id.
        </p>
        <Link
          to="/dashboard/recruiter/jobs"
          className="inline-flex px-6 py-3 rounded-xl font-bold transition-all bg-primary text-white hover:bg-primary-dark shadow-lg hover:shadow-primary/30 focus:ring-4 focus:ring-offset-2 focus:ring-primary outline-none"
        >
          Manage Offers
        </Link>
      </div>
    );
  }

  // ── AI loading animation ─────────────────────────────────────────────────
  if (matchLoading) {
    return (
      <div className="bg-white rounded-3xl p-16 border border-border shadow-sm flex flex-col items-center justify-center">
        <style>{`
          @keyframes ai-spin     { from { transform: rotate(0deg);   } to { transform: rotate(360deg);  } }
          @keyframes ai-spin-rev { from { transform: rotate(0deg);   } to { transform: rotate(-360deg); } }
          @keyframes ai-pulse-glow {
            0%, 100% { box-shadow: 0 0 20px rgba(99,102,241,0.4); transform: translate(-50%,-50%) scale(1); }
            50%       { box-shadow: 0 0 40px rgba(99,102,241,0.8); transform: translate(-50%,-50%) scale(1.05); }
          }
          @keyframes ai-dot-pulse {
            0%, 100% { opacity: 0.3; transform: rotate(var(--r)) translateX(52px) translateY(-50%) scale(0.8); }
            50%       { opacity: 1;   transform: rotate(var(--r)) translateX(52px) translateY(-50%) scale(1.2); }
          }
          .ai-orbit-1 { animation: ai-spin     8s  linear infinite; }
          .ai-orbit-2 { animation: ai-spin-rev 12s linear infinite; }
          .ai-orbit-3 { animation: ai-spin     20s linear infinite; }
          .ai-center  { animation: ai-pulse-glow 2s ease-in-out infinite; }
        `}</style>

        <div className="relative w-48 h-48 mx-auto mb-8">
          <div className="ai-orbit-3 absolute inset-0 rounded-full border-2 border-indigo-100/60" />
          <div className="ai-orbit-2 absolute inset-4 rounded-full border-2 border-indigo-200/50" />
          <div className="ai-orbit-1 absolute inset-10 rounded-full border-2 border-indigo-300/60" />
          {[0, 90, 180, 270].map((deg, i) => (
            <div
              key={deg}
              className="absolute w-3 h-3 rounded-full bg-indigo-400"
              style={{
                top: "50%", left: "50%",
                transform: `rotate(${deg}deg) translateX(52px) translateY(-50%)`,
                animation: "ai-dot-pulse 1.5s ease-in-out infinite",
                "--r": `${deg}deg`,
                animationDelay: `${i * 375}ms`,
              }}
            />
          ))}
          <div className="ai-center absolute top-1/2 left-1/2 w-16 h-16 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/40 flex items-center justify-center">
            <Sparkles size={24} className="text-white" />
          </div>
        </div>

        <p
          className="text-lg font-semibold text-slate-700 text-center transition-opacity duration-300"
          style={{ opacity: msgVisible ? 1 : 0 }}
        >
          {AI_MESSAGES[msgIndex]}
        </p>

        <div className="flex items-center gap-2 mt-4">
          {[0, 150, 300].map((delay) => (
            <div
              key={delay}
              className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </div>

        <p className="text-sm text-slate-400 text-center mt-4 max-w-sm mx-auto">
          {matchingOfferTitle
            ? `Our AI is analyzing candidates for "${matchingOfferTitle}". This usually takes 5–10 seconds.`
            : "Our AI is analyzing candidates. This usually takes 5–10 seconds."}
        </p>
      </div>
    );
  }

  // ── Results list ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-2xl font-bold text-slate-900">
            AI Matches for {matchingOfferTitle || "Offer"}
          </h3>
          <p className="text-slate-500 text-sm mt-1">
            {matchResults.length} candidate{matchResults.length === 1 ? "" : "s"} analyzed
          </p>
        </div>
        <span className="bg-indigo-100 text-indigo-700 rounded-full px-3 py-1 text-xs font-bold">
          Powered by Gemini AI
        </span>
      </div>

      {/* Cards */}
      <div className="grid gap-4">
        {matchResults.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-border shadow-sm text-center text-gray-500">
            No matches returned for this offer yet.
          </div>
        ) : (
          matchResults.map((match, i) => (
            <MatchCard
              key={match.candidate_id}
              match={match}
              index={i}
              isSaved={savedIds.has(match.candidate_id)}
              isSaving={savingId === match.candidate_id}
              onSelect={setSelectedCandidate}
              onGoTo={goToCandidate}
              onSave={handleSaveCandidate}
            />
          ))
        )}
      </div>
    </div>
  );
}
