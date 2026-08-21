import React, { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import {
  Bookmark,
  BookmarkCheck,
  Briefcase,
  Building,
  CheckCircle,
  ChevronLeft,
  Clock,
  Copy,
  Edit,
  Eye,
  Loader2,
  PlusCircle,
  Sparkles,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import { Button, Input } from "../../components/UI";
import ConfirmDialog from "../../components/ConfirmDialog";
import { useToast } from "../../context/ToastContext";
import { apiClient } from "../../services/apiClient";
import { API_BASE_URL } from "../../config/api";
import { emitGuideBlockage } from "../../features/guide/useBlockageDetector";
import { clearDraft, loadDraft, saveDraft } from "../../utils/formDraft";
import {
  formatEnumLabel,
  hasMeaningfulHtmlText,
  normalizeJobSkillTags,
} from "../candidate/shared";
import {
  readErrorDetailFromResponseLike,
  formatPostedDate,
  savedCandidateAvatarLetters,
  SavedCandidateAvatar,
  normalizeRichTextHtml,
  RichTextDescription,
  SkillInput,
} from "./recruiterShared";

// ---------------------------------------------------------------------------
// CandidateShortlistAvatar — photo → gradient initials fallback
// ---------------------------------------------------------------------------
function CandidateShortlistAvatar({ candidateId, name }) {
  const [failed, setFailed] = useState(false);
  if (!failed) {
    return (
      <img
        src={`${API_BASE_URL}/users/candidates/${candidateId}/photo`}
        alt=""
        className="w-12 h-12 rounded-full object-cover shrink-0"
        onError={() => setFailed(true)}
      />
    );
  }
  const initials = (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";
  return (
    <div className="w-12 h-12 rounded-full bg-linear-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold shrink-0">
      {initials}
    </div>
  );
}

// Draft of a new offer being composed — every field here describes the job,
// not a person, so none of it is health/disability data. Safe in
// localStorage. (Excludes `document`: a File can't survive JSON storage.)
const NEW_OFFER_DRAFT_KEY = "recruiter_new_offer";

// ---------------------------------------------------------------------------
// RecruiterJobsPage
// ---------------------------------------------------------------------------
export default function RecruiterJobsPage() {
  const navigate = useNavigate();
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState(null);
  const [offers, setOffers] = useState([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [offerDetail, setOfferDetail] = useState(null);
  const [offerDetailLoading, setOfferDetailLoading] = useState(false);
  const [offerStatusUpdating, setOfferStatusUpdating] = useState(false);
  const [deletingOfferId, setDeletingOfferId] = useState(null);
  const [copiedCandidateId, setCopiedCandidateId] = useState(null);
  const [removingSavedId, setRemovingSavedId] = useState(null);
  const [shortlistRemoveConfirm, setShortlistRemoveConfirm] = useState(null);
  const [deleteOfferConfirm, setDeleteOfferConfirm] = useState(null);
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const [offerForm, setOfferForm] = useState({
    title: "",
    profile_title: "",
    description: "",
    contract_type: "permanent",
    required_skills: [],
    key_skills: [],
    working_conditions: "",
    possible_accommodations: "",
    document: null,
  });
  const { showToast } = useToast();

  const contractOptions = useMemo(
    () => [
      { value: "permanent", label: "Permanent (CDI)" },
      { value: "fixed_term", label: "Fixed Term (CDD)" },
      { value: "civp", label: "CIVP" },
      { value: "karama", label: "Karama" },
      { value: "internship", label: "Internship" },
    ],
    []
  );

  useEffect(() => {
    loadOffers();
  }, []);

  // Escape is handled by ConfirmDialog itself now — these just keep the
  // background from scrolling under the dialog.
  useEffect(() => {
    if (!shortlistRemoveConfirm) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [shortlistRemoveConfirm]);

  useEffect(() => {
    if (!deleteOfferConfirm) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [deleteOfferConfirm]);

  const goToAiMatch = (offerId) => {
    navigate(`/dashboard/recruiter/matches?offer=${encodeURIComponent(offerId)}`);
  };
  const goToApplications = (offerId) => {
    navigate(`/dashboard/recruiter/applications?offer=${encodeURIComponent(offerId)}`);
  };
  const goToCandidate = (candidateId) =>
    navigate(`/dashboard/recruiter/candidate/${encodeURIComponent(String(candidateId))}`);

  const loadOffers = async () => {
    setOffersLoading(true);
    try {
      const response = await apiClient.get("/job-offers/my-offers/", {
        validateStatus: () => true,
      });
      if (response.status < 200 || response.status >= 300) {
        showToast(
          readErrorDetailFromResponseLike(response.data, response.statusText),
          "error"
        );
        return;
      }
      setOffers(Array.isArray(response.data) ? response.data : []);
    } catch {
      showToast("We couldn't load your offers. Try refreshing the page.", "error");
    } finally {
      setOffersLoading(false);
    }
  };

  const closeOfferDetail = () => {
    setCopiedCandidateId(null);
    setOfferDetail(null);
  };

  const openOfferDetail = async (offerId) => {
    setCopiedCandidateId(null);
    setOfferDetailLoading(true);
    setOfferDetail(null);
    try {
      const response = await apiClient.get(`/job-offers/${offerId}`, {
        validateStatus: () => true,
      });
      if (response.status >= 200 && response.status < 300) {
        setOfferDetail(response.data);
      } else {
        showToast(
          readErrorDetailFromResponseLike(response.data, response.statusText),
          "error"
        );
      }
    } catch {
      showToast("Could not load offer details.", "error");
    } finally {
      setOfferDetailLoading(false);
    }
  };

  const handleOfferStatusChange = async (newStatus) => {
    if (!offerDetail || newStatus === offerDetail.status) return;
    const id = offerDetail._id;
    const previous = offerDetail.status;
    setOfferStatusUpdating(true);
    setOfferDetail((d) => (d ? { ...d, status: newStatus } : null));
    try {
      const response = await apiClient.put(
        `/job-offers/${id}`,
        { status: newStatus },
        { validateStatus: () => true }
      );
      if (response.status >= 200 && response.status < 300) {
        setOffers((prev) =>
          prev.map((o) => (o._id === id ? { ...o, status: newStatus } : o))
        );
        showToast("Offer status updated.", "success");
      } else {
        setOfferDetail((d) => (d ? { ...d, status: previous } : null));
        showToast(
          readErrorDetailFromResponseLike(response.data, response.statusText),
          "error"
        );
      }
    } catch {
      setOfferDetail((d) => (d ? { ...d, status: previous } : null));
      showToast("Could not update status.", "error");
    } finally {
      setOfferStatusUpdating(false);
    }
  };

  const removeSavedCandidate = async (offerId, candidateId, candidateName, offerTitle) => {
    const cid = String(candidateId);
    const name = (candidateName || "").trim() || "This candidate";
    const title = (offerTitle || "").trim() || "this offer";
    setRemovingSavedId(cid);
    try {
      const response = await apiClient.delete(
        `/job-offers/${encodeURIComponent(offerId)}/save-candidate/${encodeURIComponent(cid)}`,
        { validateStatus: () => true }
      );
      if (response.status >= 200 && response.status < 300) {
        setOfferDetail((prev) => {
          if (!prev || prev._id !== offerId) return prev;
          const saved = (prev.saved_candidates || []).filter((s) => String(s) !== cid);
          const detail = (prev.saved_candidates_detail || []).filter(
            (r) => String(r.candidate_id) !== cid
          );
          return { ...prev, saved_candidates: saved, saved_candidates_detail: detail };
        });
        setOffers((prev) =>
          prev.map((o) =>
            o._id === offerId
              ? {
                  ...o,
                  saved_candidates: (o.saved_candidates || []).filter((s) => String(s) !== cid),
                }
              : o
          )
        );
        showToast({
          title: "Removed from shortlist",
          message: `${name} is no longer linked to "${title}". You can add them again anytime from AI Match.`,
          type: "success",
          duration: 4800,
        });
      } else {
        showToast({
          title: "Couldn't remove",
          message: readErrorDetailFromResponseLike(response.data, response.statusText),
          type: "error",
          duration: 5000,
        });
      }
    } catch {
      showToast({
        title: "Something went wrong",
        message: "We couldn't remove this person from the shortlist. Check your connection and try again.",
        type: "error",
        duration: 4800,
      });
    } finally {
      setRemovingSavedId(null);
    }
  };

  const requestDeleteOffer = (offer) => {
    setDeleteOfferConfirm({ offerId: offer._id, title: (offer.title || "").trim() || "this offer" });
  };

  const performDeleteOffer = async (offerId) => {
    setDeletingOfferId(offerId);
    try {
      const response = await apiClient.delete(`/job-offers/${offerId}`, {
        validateStatus: () => true,
      });
      if (response.status >= 200 && response.status < 300) {
        if (offerDetail?._id === offerId) setOfferDetail(null);
        showToast("Offer deleted.", "success");
        await loadOffers();
      } else {
        showToast(
          readErrorDetailFromResponseLike(response.data, response.statusText),
          "error"
        );
      }
    } catch {
      showToast("Could not delete offer.", "error");
    } finally {
      setDeletingOfferId(null);
    }
  };

  const resetOfferForm = () => ({
    title: "",
    profile_title: "",
    description: "",
    contract_type: "permanent",
    required_skills: [],
    key_skills: [],
    working_conditions: "",
    possible_accommodations: "",
    document: null,
  });

  const openCreateOffer = () => {
    setOfferDetail(null);
    setEditingOfferId(null);
    const draft = loadDraft(NEW_OFFER_DRAFT_KEY);
    setOfferForm(draft ? { ...resetOfferForm(), ...draft, document: null } : resetOfferForm());
    if (draft) showToast("Brouillon restauré depuis votre dernière visite.", "info");
    setIsCreatingJob(true);
  };

  const openEditOffer = (offer) => {
    setOfferDetail(null);
    setEditingOfferId(offer._id);
    setOfferForm({
      title: offer.title || "",
      profile_title: offer.profile_title || "",
      description: offer.description || "",
      contract_type: offer.contract_type || "permanent",
      required_skills: Array.isArray(offer.required_skills) ? offer.required_skills : [],
      key_skills: Array.isArray(offer.key_skills) ? offer.key_skills : [],
      working_conditions: offer.working_conditions || "",
      possible_accommodations: offer.possible_accommodations || "",
      document: null,
    });
    setIsCreatingJob(true);
  };

  const closeOfferForm = () => {
    setIsCreatingJob(false);
    setEditingOfferId(null);
    clearDraft(NEW_OFFER_DRAFT_KEY);
  };

  // Debounced local draft of a *new* offer being composed — never while
  // editing an existing one (that would overwrite the "new offer" draft with
  // unrelated data).
  useEffect(() => {
    if (!isCreatingJob || editingOfferId) return undefined;
    const id = window.setTimeout(() => {
      const { document: _file, ...draftable } = offerForm;
      saveDraft(NEW_OFFER_DRAFT_KEY, draftable);
    }, 800);
    return () => window.clearTimeout(id);
  }, [offerForm, isCreatingJob, editingOfferId]);

  const handleSubmitOfferForm = async () => {
    const title = offerForm.title.trim();
    const description = normalizeRichTextHtml(offerForm.description);
    if (!title) {
      showToast("Enter a job title to publish this offer.", "error");
      return;
    }

    const isEditing = Boolean(editingOfferId);
    setIsSubmittingOffer(true);
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("required_skills", JSON.stringify(offerForm.required_skills));
      formData.append("profile_title", offerForm.profile_title.trim());
      formData.append("contract_type", offerForm.contract_type);
      formData.append("key_skills", JSON.stringify(offerForm.key_skills));
      formData.append("working_conditions", offerForm.working_conditions.trim());
      formData.append(
        "possible_accommodations",
        offerForm.possible_accommodations.trim()
      );
      if (offerForm.document) {
        formData.append("document", offerForm.document);
      }

      const response = isEditing
        ? await apiClient.patch(`/job-offers/${editingOfferId}`, formData, {
            validateStatus: () => true,
          })
        : await apiClient.post("/job-offers/", formData, {
            validateStatus: () => true,
          });

      if (response.status < 200 || response.status >= 300) {
        showToast(
          readErrorDetailFromResponseLike(response.data, response.statusText),
          "error"
        );
        if (offerForm.document) emitGuideBlockage("upload_failure");
        return;
      }

      showToast(
        isEditing ? "Job offer updated successfully." : "Job offer published successfully.",
        "success"
      );
      closeOfferForm();
      await loadOffers();
    } catch {
      showToast(
        isEditing
          ? "We couldn't update this offer. Check your connection and try again."
          : "We couldn't publish this offer. Check your connection and try again.",
        "error"
      );
      if (offerForm.document) emitGuideBlockage("upload_failure");
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  // ── Status badge styles ───────────────────────────────────────────────────
  const statusStyle = (status) => {
    if (status === "open")
      return {
        badge: "bg-green-100 text-green-700 border border-green-200",
        dot: "bg-green-500",
      };
    if (status === "closed")
      return {
        badge: "bg-gray-100 text-gray-600 border border-gray-200",
        dot: "bg-gray-400",
      };
    return {
      badge: "bg-amber-100 text-amber-700 border border-amber-200",
      dot: "bg-amber-500",
    };
  };

  const renderJobs = () => {
    // ── Create / edit form ──────────────────────────────────────────────────
    if (isCreatingJob) {
      const isEditing = Boolean(editingOfferId);
      return (
        <div className="bg-white p-8 rounded-2xl border border-border shadow-sm animate-in fade-in zoom-in-95 duration-200">
          <button
            type="button"
            onClick={closeOfferForm}
            className="text-primary font-bold flex items-center gap-2 mb-6 hover:underline"
          >
            <ChevronLeft size={20} /> Back to jobs
          </button>
          <h3 className="text-2xl font-bold text-gray-900 mb-6">
            {isEditing ? "Edit Job Offer" : "Create New Job Offer"}
          </h3>
          <div className="space-y-6">
            <Input
              label="Job Title"
              placeholder="e.g., Senior Frontend Developer"
              value={offerForm.title}
              onChange={(e) => setOfferForm((prev) => ({ ...prev, title: e.target.value }))}
            />
            <Input
              label="Profile Title"
              placeholder="e.g., Frontend Engineer"
              value={offerForm.profile_title}
              onChange={(e) =>
                setOfferForm((prev) => ({ ...prev, profile_title: e.target.value }))
              }
            />
            <RichTextDescription
              value={offerForm.description}
              onChange={(html) => setOfferForm((prev) => ({ ...prev, description: html }))}
            />
            <SkillInput
              label="Required Skills"
              skills={offerForm.required_skills}
              onChange={(next) =>
                setOfferForm((prev) => ({ ...prev, required_skills: next }))
              }
              placeholder="e.g., React"
            />
            <SkillInput
              label="Key Skills"
              skills={offerForm.key_skills}
              onChange={(next) => setOfferForm((prev) => ({ ...prev, key_skills: next }))}
              placeholder="e.g., Communication"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Working Conditions"
                placeholder="e.g., Remote, Hybrid"
                value={offerForm.working_conditions}
                onChange={(e) =>
                  setOfferForm((prev) => ({ ...prev, working_conditions: e.target.value }))
                }
              />
              <div className="space-y-1">
                <label className="block text-sm font-bold text-gray-700">Contract Type</label>
                <select
                  value={offerForm.contract_type}
                  onChange={(e) =>
                    setOfferForm((prev) => ({ ...prev, contract_type: e.target.value }))
                  }
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-900 focus:border-primary outline-none"
                >
                  {contractOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">
                Possible Accommodations / Constraints
              </label>
              <textarea
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-900 min-h-25 focus:border-primary outline-none"
                placeholder="Describe the accommodations you can offer to candidates with specific needs."
                value={offerForm.possible_accommodations}
                onChange={(e) =>
                  setOfferForm((prev) => ({
                    ...prev,
                    possible_accommodations: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">
                Supporting document (PDF)
              </label>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) =>
                  setOfferForm((prev) => ({
                    ...prev,
                    document: e.target.files?.[0] ?? null,
                  }))
                }
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl bg-white text-gray-900 focus:border-primary outline-none"
              />
              {offerForm.document ? (
                <p className="text-xs text-gray-500">Selected: {offerForm.document.name}</p>
              ) : isEditing ? (
                <p className="text-xs text-gray-500">Leave empty to keep the current document.</p>
              ) : null}
            </div>
            <div className="flex justify-end gap-4 mt-8">
              <Button variant="outline" onClick={closeOfferForm}>
                Cancel
              </Button>
              <Button onClick={handleSubmitOfferForm} disabled={isSubmittingOffer}>
                {isSubmittingOffer ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    {isEditing ? "Saving..." : "Publishing..."}
                  </>
                ) : isEditing ? (
                  "Save Changes"
                ) : (
                  "Publish Offer"
                )}
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // ── Detail loading ──────────────────────────────────────────────────────
    if (offerDetailLoading) {
      return (
        <div className="bg-white p-8 rounded-2xl border border-border shadow-sm flex items-center gap-3 text-gray-600">
          <Loader2 className="animate-spin" size={22} /> Loading offer…
        </div>
      );
    }

    // ── Offer detail ────────────────────────────────────────────────────────
    if (offerDetail) {
      const d = offerDetail;
      const detailSkillTags = normalizeJobSkillTags(d.key_skills, d.required_skills);
      const contractLabel =
        contractOptions.find((o) => o.value === d.contract_type)?.label ??
        formatEnumLabel(d.contract_type);
      const savedDetail = Array.isArray(d.saved_candidates_detail)
        ? d.saved_candidates_detail
        : (d.saved_candidates || []).map((sid) => ({
            candidate_id: String(sid),
            name: null,
            profile_photo_id: null,
          }));

      return (
        <div className="bg-white p-8 rounded-2xl border border-border shadow-sm animate-in fade-in zoom-in-95 duration-200">
          <button
            type="button"
            onClick={closeOfferDetail}
            className="text-primary font-bold flex items-center gap-2 mb-6 hover:underline"
          >
            <ChevronLeft size={20} /> Back to jobs
          </button>

          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{d.title}</h3>
              {d.profile_title ? (
                <p className="text-gray-600 mt-1">{d.profile_title}</p>
              ) : null}
              <div className="flex flex-wrap gap-3 mt-3 text-sm text-gray-600">
                <span>{contractLabel}</span>
                <span className="text-gray-300">·</span>
                <span>Posted {formatPostedDate(d.created_at)}</span>
                {d.company_name ? (
                  <>
                    <span className="text-gray-300">·</span>
                    <span className="flex items-center gap-1">
                      <Building size={14} /> {d.company_name}
                    </span>
                  </>
                ) : null}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase text-gray-500">
                  Offer status
                </label>
                <select
                  value={d.status || "open"}
                  disabled={offerStatusUpdating}
                  onChange={(e) => handleOfferStatusChange(e.target.value)}
                  className="w-full min-w-45 px-4 py-2.5 border-2 border-gray-200 rounded-xl bg-white text-gray-900 focus:border-primary outline-none font-semibold text-sm disabled:opacity-60"
                >
                  <option value="open">Open (visible to candidates)</option>
                  <option value="closed">Closed</option>
                  <option value="archived">Archived</option>
                </select>
                {offerStatusUpdating ? (
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Loader2 className="animate-spin" size={12} /> Updating…
                  </p>
                ) : null}
              </div>
              <div className="flex items-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="text-purple-600 border-purple-200 hover:bg-purple-50 flex items-center gap-2"
                  onClick={() => {
                    goToAiMatch(d._id);
                    closeOfferDetail();
                  }}
                >
                  <Sparkles size={16} /> AI Match
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="text-slate-600 border-slate-200 hover:bg-slate-50 flex items-center gap-2"
                  onClick={() => openEditOffer(d)}
                >
                  <Edit size={16} /> Edit
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  disabled={deletingOfferId === d._id}
                  onClick={() => requestDeleteOffer(d)}
                >
                  {deletingOfferId === d._id ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Trash2 size={18} />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-8 border-t border-gray-100 pt-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
                Description
              </p>
              {hasMeaningfulHtmlText(d.description) ? (
                <div
                  className="prose prose-sm max-w-none text-gray-700"
                  dangerouslySetInnerHTML={{ __html: d.description }}
                />
              ) : (
                <p className="text-sm text-gray-500">No description provided.</p>
              )}
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
                Skills
              </p>
              <div className="flex flex-wrap gap-2">
                {detailSkillTags.map((skill, index) => (
                  <span
                    key={`${skill}-${index}`}
                    className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-100"
                  >
                    {skill}
                  </span>
                ))}
                {detailSkillTags.length === 0 ? (
                  <span className="text-sm text-gray-500">No skills listed.</span>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
                  Working conditions
                </p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                  {(d.working_conditions || "").trim() || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
                  Possible accommodations
                </p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                  {(d.possible_accommodations || "").trim() || "—"}
                </p>
              </div>
            </div>

            {/* ── Shortlisted candidates ───────────────────────────────── */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Bookmark size={18} className="text-slate-500" />
                <h4 className="text-lg font-bold text-slate-900">Shortlisted Candidates</h4>
                {savedDetail.length > 0 && (
                  <span className="ml-auto bg-indigo-100 text-indigo-700 rounded-full px-2.5 py-0.5 text-xs font-bold">
                    {savedDetail.length}
                  </span>
                )}
              </div>

              {savedDetail.length === 0 ? (
                <div className="bg-slate-50 rounded-2xl p-6 text-center">
                  <Bookmark size={32} className="text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">No candidates shortlisted yet</p>
                  <p className="text-slate-400 text-xs mt-1">
                    Use AI Match to find and save top candidates
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {savedDetail.map((row) => {
                    const displayName = row.name?.trim() || "Saved candidate";
                    const skills = Array.isArray(row.key_skills)
                      ? row.key_skills.slice(0, 2)
                      : [];
                    return (
                      <div
                        key={row.candidate_id}
                        className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition flex items-center gap-4"
                      >
                        <CandidateShortlistAvatar
                          candidateId={row.candidate_id}
                          name={displayName}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800 truncate">{displayName}</p>
                          {(row.profile_title || row.industry) && (
                            <p className="text-sm text-slate-500 truncate">
                              {row.profile_title || row.industry}
                            </p>
                          )}
                          {skills.length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {skills.map((s) => (
                                <span
                                  key={s}
                                  className="bg-indigo-50 text-indigo-600 rounded-full px-2 py-0.5 text-xs"
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => goToCandidate(row.candidate_id)}
                            className="p-2 rounded-xl border border-slate-200 hover:border-indigo-300 text-slate-500 hover:text-indigo-700 transition-colors"
                            title="View profile"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() =>
                              setShortlistRemoveConfirm({
                                offerId: d._id,
                                candidateId: row.candidate_id,
                                displayName,
                                offerTitle: d.title || "this offer",
                              })
                            }
                            disabled={removingSavedId === row.candidate_id}
                            className="p-2 rounded-xl border border-red-100 hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                            title="Remove from shortlist"
                          >
                            {removingSavedId === row.candidate_id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <X size={16} />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {d.document_id ? (
              <p className="text-sm text-gray-600">
                A supporting document is attached (ID: {String(d.document_id)}).
              </p>
            ) : null}
          </div>
        </div>
      );
    }

    // ── Offers list ─────────────────────────────────────────────────────────
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-900">Manage Job Offers</h3>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={loadOffers} disabled={offersLoading}>
              {offersLoading ? <Loader2 className="animate-spin" size={16} /> : "Refresh"}
            </Button>
            <Button
              data-guide="offer_accommodations"
              className="flex items-center gap-2"
              onClick={openCreateOffer}
            >
              <PlusCircle size={20} /> Create New Offer
            </Button>
          </div>
        </div>

        <div className="grid gap-4">
          {offersLoading ? (
            <div className="bg-white p-6 rounded-2xl border border-border shadow-sm text-gray-500 flex items-center gap-3">
              <Loader2 className="animate-spin" size={20} /> Loading your offers...
            </div>
          ) : offers.length === 0 ? (
            <div className="bg-white p-6 rounded-2xl border border-border shadow-sm text-gray-500">
              No offers yet. Create your first offer.
            </div>
          ) : (
            offers.map((job) => {
              const skillTags = normalizeJobSkillTags(job.key_skills, job.required_skills);
              const savedCount = Array.isArray(job.saved_candidates)
                ? job.saved_candidates.length
                : 0;
              const contractLabel =
                contractOptions.find((o) => o.value === job.contract_type)?.label ??
                formatEnumLabel(job.contract_type);
              const st = statusStyle(job.status);

              return (
                <div
                  key={job._id}
                  className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all duration-200"
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold inline-flex items-center gap-1 mb-2 ${st.badge}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                        {job.status}
                      </span>
                      <h4 className="text-xl font-bold text-slate-900 leading-tight">
                        {job.title}
                      </h4>
                      <span className="bg-indigo-50 text-indigo-700 rounded-full px-3 py-1 text-xs font-semibold inline-flex items-center gap-1 mt-1.5">
                        <Briefcase size={12} /> {contractLabel}
                      </span>
                      <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                        <Clock size={12} /> Posted {formatPostedDate(job.created_at)}
                      </p>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1.5">
                      <span className="text-sm font-medium text-slate-500 flex items-center gap-1">
                        <Bookmark size={14} /> {savedCount} saved
                      </span>
                      {job.sector && (
                        <span className="text-sm text-slate-400 flex items-center gap-1">
                          <Building size={14} /> {job.sector}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle row: skills */}
                  {skillTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {skillTags.slice(0, 5).map((skill, index) => (
                        <span
                          key={`${skill}-${index}`}
                          className="bg-slate-100 text-slate-600 rounded-full px-2.5 py-1 text-xs font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                      {skillTags.length > 5 && (
                        <span className="bg-indigo-50 text-indigo-600 rounded-full px-2.5 py-1 text-xs font-medium">
                          +{skillTags.length - 5} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Bottom row: actions */}
                  <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100 flex-wrap">
                    <button
                      onClick={() => openOfferDetail(job._id)}
                      className="bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 rounded-xl px-4 py-2.5 text-sm font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <Eye size={15} /> Details
                    </button>
                    <button
                      onClick={() => goToAiMatch(job._id)}
                      className="bg-linear-to-r from-indigo-600 to-purple-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:opacity-90 flex items-center gap-1.5 transition-opacity"
                    >
                      <Sparkles size={16} /> AI Match
                    </button>
                    <button
                      onClick={() => goToApplications(job._id)}
                      className="bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-xl px-4 py-2.5 text-sm font-medium border border-teal-100 flex items-center gap-1.5 transition-colors"
                    >
                      <Users size={15} /> Applications
                    </button>
                    <button
                      onClick={() => openEditOffer(job)}
                      title="Edit offer"
                      className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-2.5 text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => requestDeleteOffer(job)}
                      disabled={deletingOfferId === job._id}
                      className="bg-white border border-red-100 hover:bg-red-50 rounded-xl p-2.5 text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                      title="Delete offer"
                    >
                      {deletingOfferId === job._id ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <motion.div
        key={
          (isCreatingJob ? "create" : "") +
          (offerDetail ? `detail-${offerDetail._id}` : "list") +
          (offerDetailLoading ? "-loading" : "")
        }
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {renderJobs()}
      </motion.div>

      <ConfirmDialog
        open={Boolean(shortlistRemoveConfirm)}
        title={`Voulez-vous vraiment retirer ${shortlistRemoveConfirm?.displayName ?? "ce candidat"} de votre liste ?`}
        description={`Cette action est réversible. Vous pourrez l'ajouter à nouveau depuis "AI Match" pour "${shortlistRemoveConfirm?.offerTitle ?? "cette offre"}". Son compte n'est pas affecté.`}
        confirmLabel="Retirer"
        destructive={false}
        busy={removingSavedId === shortlistRemoveConfirm?.candidateId}
        onCancel={() => setShortlistRemoveConfirm(null)}
        onConfirm={() => {
          const p = shortlistRemoveConfirm;
          setShortlistRemoveConfirm(null);
          removeSavedCandidate(p.offerId, p.candidateId, p.displayName, p.offerTitle);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteOfferConfirm)}
        title={`Voulez-vous vraiment supprimer l'offre "${deleteOfferConfirm?.title ?? ""}" ?`}
        description="Cette action est définitive. Les candidatures et correspondances IA liées à cette offre seront aussi supprimées."
        confirmLabel="Supprimer"
        destructive
        busy={deletingOfferId === deleteOfferConfirm?.offerId}
        onCancel={() => setDeleteOfferConfirm(null)}
        onConfirm={() => {
          const p = deleteOfferConfirm;
          setDeleteOfferConfirm(null);
          performDeleteOffer(p.offerId);
        }}
      />
    </>
  );
}
