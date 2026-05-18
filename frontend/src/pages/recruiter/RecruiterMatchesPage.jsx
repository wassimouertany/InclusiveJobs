import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  BookmarkCheck,
  CheckCircle,
  ChevronLeft,
  Eye,
  Loader2,
  Sparkles,
  User,
} from "lucide-react";
import { Button } from "../../components/UI";
import { useToast } from "../../context/ToastContext";
import { apiClient } from "../../services/apiClient";
import {
  explanationPreview,
  readErrorDetailFromResponseLike,
  scoreColor,
} from "./recruiterShared";

export default function RecruiterMatchesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const offerId = searchParams.get("offer")?.trim() || null;
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
  const [matchResults, setMatchResults] = useState(() => cached?.matchResults || []);
  const [matchLoading, setMatchLoading] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [savedIds, setSavedIds] = useState(
    () => new Set((cached?.savedIds || []).map(String))
  );
  const { showToast } = useToast();

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

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load when `offer` query changes only
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
    navigate(`/dashboard/recruiter/candidate/${encodeURIComponent(String(candidateId))}`, {
      state: { from: `${location.pathname}${location.search}` },
    });

  if (selectedCandidate) {
    const score = Math.round(Number(selectedCandidate.ai_score) || 0);
    const strengths = Array.isArray(selectedCandidate.strengths)
      ? selectedCandidate.strengths
      : [];
    const concerns = Array.isArray(selectedCandidate.concerns)
      ? selectedCandidate.concerns
      : [];
    const cid = selectedCandidate.candidate_id;
    const isSaved = savedIds.has(cid);
    const isSaving = savingId === cid;

    return (
      <div className="bg-white p-8 rounded-2xl border border-border shadow-sm animate-in fade-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={() => setSelectedCandidate(null)}
          className="text-primary font-bold flex items-center gap-2 mb-6 hover:underline"
        >
          <ChevronLeft size={20} /> Back
        </button>

        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <h2 className="text-3xl font-black text-gray-900">
            {selectedCandidate.name || "Candidate"}
          </h2>
          <span
            className={`inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-bold ${scoreColor(score)}`}
          >
            {score}% match
          </span>
        </div>

        <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-5 mb-6">
          <h3 className="text-sm font-bold text-indigo-950 mb-2 flex items-center gap-2">
            <Sparkles className="text-indigo-600 shrink-0" size={18} />
            AI explanation
          </h3>
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
            {selectedCandidate.explanation?.trim() || "—"}
          </p>
        </div>

        {strengths.length > 0 ? (
          <div className="mb-6">
            <h4 className="font-bold text-gray-900 mb-2">Strengths</h4>
            <ul className="space-y-2">
              {strengths.map((s) => (
                <li key={s} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle className="text-green-600 shrink-0 mt-0.5" size={16} />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {concerns.length > 0 ? (
          <div className="mb-8">
            <h4 className="font-bold text-gray-900 mb-2">Concerns</h4>
            <ul className="space-y-2">
              {concerns.map((c) => (
                <li key={c} className="flex items-start gap-2 text-sm text-gray-700">
                  <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={16} />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3 pt-6 border-t border-border">
          <Button
            className="flex items-center gap-2"
            onClick={() => goToCandidate(selectedCandidate.candidate_id)}
          >
            <User size={16} /> View Full Profile & Resume
          </Button>
          <Button
            type="button"
            onClick={() => handleSaveCandidate(cid)}
            disabled={isSaved || isSaving}
            className="flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="animate-spin" size={18} /> Saving...
              </>
            ) : isSaved ? (
              <>
                <BookmarkCheck size={18} /> Saved ✓
              </>
            ) : (
              <>
                <BookmarkCheck size={18} /> Save Candidate
              </>
            )}
          </Button>
          <Button type="button" variant="outline" onClick={() => setSelectedCandidate(null)}>
            Back to Results
          </Button>
        </div>
      </div>
    );
  }

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

  if (matchLoading) {
    return (
      <div className="bg-white p-16 rounded-2xl border border-border shadow-sm flex flex-col items-center justify-center gap-4 text-gray-600">
        <Loader2 className="animate-spin text-purple-600" size={40} />
        <p className="text-sm font-medium text-center">
          Running AI analysis... This may take a few seconds.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-gray-900">
          AI Matches for: {matchingOfferTitle || "Offer"}
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          ({matchResults.length} candidate{matchResults.length === 1 ? "" : "s"} found)
        </p>
      </div>

      <div className="grid gap-4">
        {matchResults.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-border shadow-sm text-center text-gray-500">
            No matches returned for this offer yet.
          </div>
        ) : (
          matchResults.map((match) => {
            const score = Math.round(Number(match.ai_score) || 0);
            const cid = match.candidate_id;
            const isSaved = savedIds.has(cid);
            const isSaving = savingId === cid;
            return (
              <div
                key={cid}
                className="bg-white p-5 rounded-2xl border border-border shadow-sm flex flex-col sm:flex-row sm:items-center gap-4 justify-between"
              >
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div
                    className={`shrink-0 w-16 h-16 rounded-full border-2 flex items-center justify-center text-sm font-black ${scoreColor(score)}`}
                  >
                    {score}%
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-lg text-gray-900">{match.name}</h4>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {explanationPreview(match.explanation)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={() => setSelectedCandidate(match)}
                  >
                    <Eye size={16} /> View Details
                  </Button>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 text-xs"
                    onClick={() => goToCandidate(match.candidate_id)}
                  >
                    <User size={14} /> Full Profile
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex items-center gap-2 min-w-[7rem] justify-center"
                    onClick={() => handleSaveCandidate(cid)}
                    disabled={isSaved || isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : isSaved ? (
                      <>
                        <BookmarkCheck size={16} /> Saved ✓
                      </>
                    ) : (
                      "Save"
                    )}
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
