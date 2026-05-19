import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import {
  Building,
  Users,
  PlusCircle,
  Edit,
  Trash2,
  Eye,
  ChevronLeft,
  Loader2,
  Sparkles,
  BookmarkCheck,
  BookmarkX,
  CheckCircle,
  Copy,
  AlertTriangle,
  User,
} from "lucide-react";
import { Button, Input } from "../../components/UI";
import { useToast } from "../../context/ToastContext";
import { apiClient } from "../../services/apiClient";
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

export default function RecruiterJobsPage() {
  const navigate = useNavigate();
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [offers, setOffers] = useState([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [offerDetail, setOfferDetail] = useState(null);
  const [offerDetailLoading, setOfferDetailLoading] = useState(false);
  const [offerStatusUpdating, setOfferStatusUpdating] = useState(false);
  const [deletingOfferId, setDeletingOfferId] = useState(null);
  const [copiedCandidateId, setCopiedCandidateId] = useState(null);
  const [removingSavedId, setRemovingSavedId] = useState(null);
  /** Pending shortlist removal confirmation (replaces browser `confirm`). */
  const [shortlistRemoveConfirm, setShortlistRemoveConfirm] = useState(null);
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

  useEffect(() => {
    if (!shortlistRemoveConfirm) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setShortlistRemoveConfirm(null);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [shortlistRemoveConfirm]);

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
      showToast("Could not load your offers. Is the API running?", "error");
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
          message: `${name} is no longer linked to “${title}”. You can add them again anytime from AI Match.`,
          type: "success",
          duration: 4800,
        });
      } else {
        showToast({
          title: "Couldn’t remove",
          message: readErrorDetailFromResponseLike(response.data, response.statusText),
          type: "error",
          duration: 5000,
        });
      }
    } catch {
      showToast({
        title: "Something went wrong",
        message: "We couldn’t remove this person from the shortlist. Check your connection and try again.",
        type: "error",
        duration: 4800,
      });
    } finally {
      setRemovingSavedId(null);
    }
  };

  const confirmDeleteOffer = async (offerId) => {
    if (!window.confirm("Delete this job offer permanently? This cannot be undone.")) {
      return;
    }
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

  const openCreateOffer = () => {
    setOfferDetail(null);
    setOfferForm({
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
    setIsCreatingJob(true);
  };

  const handleSubmitCreateOffer = async () => {
    const title = offerForm.title.trim();
    const description = normalizeRichTextHtml(offerForm.description);
    if (!title) {
      showToast("Job title is required.", "error");
      return;
    }

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

      const response = await apiClient.post("/job-offers/", formData, {
        validateStatus: () => true,
      });

      if (response.status < 200 || response.status >= 300) {
        showToast(
          readErrorDetailFromResponseLike(response.data, response.statusText),
          "error"
        );
        return;
      }

      showToast("Job offer published successfully.", "success");
      setIsCreatingJob(false);
      await loadOffers();
    } catch {
      showToast("Could not create offer. Please try again.", "error");
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  const renderJobs = () => {
    if (isCreatingJob) {
      return (
        <div className="bg-white p-8 rounded-2xl border border-border shadow-sm animate-in fade-in zoom-in-95 duration-200">
          <button
            type="button"
            onClick={() => setIsCreatingJob(false)}
            className="text-primary font-bold flex items-center gap-2 mb-6 hover:underline"
          >
            <ChevronLeft size={20} /> Back to jobs
          </button>
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Create New Job Offer</h3>
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
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-900 min-h-[100px] focus:border-primary outline-none"
                placeholder="Describe accommodations you can provide."
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
              {offerForm.document && (
                <p className="text-xs text-gray-500">Selected: {offerForm.document.name}</p>
              )}
            </div>
            <div className="flex justify-end gap-4 mt-8">
              <Button variant="outline" onClick={() => setIsCreatingJob(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitCreateOffer} disabled={isSubmittingOffer}>
                {isSubmittingOffer ? (
                  <>
                    <Loader2 className="animate-spin" size={18} /> Publishing...
                  </>
                ) : (
                  "Publish Offer"
                )}
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (offerDetailLoading) {
      return (
        <div className="bg-white p-8 rounded-2xl border border-border shadow-sm flex items-center gap-3 text-gray-600">
          <Loader2 className="animate-spin" size={22} /> Loading offer…
        </div>
      );
    }

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
                  className="w-full min-w-[180px] px-4 py-2.5 border-2 border-gray-200 rounded-xl bg-white text-gray-900 focus:border-primary outline-none font-semibold text-sm disabled:opacity-60"
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
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  disabled={deletingOfferId === d._id}
                  onClick={() => confirmDeleteOffer(d._id)}
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

            <div className="rounded-2xl border border-indigo-100/90 bg-gradient-to-br from-white via-indigo-50/20 to-violet-50/30 p-5 sm:p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                    aria-hidden
                  >
                    <BookmarkCheck size={22} strokeWidth={2.25} />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-gray-900 tracking-tight">
                      Shortlisted candidates
                    </h4>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {savedDetail.length === 0
                        ? "Save people from AI Match to build your shortlist here."
                        : `${savedDetail.length} candidate${savedDetail.length === 1 ? "" : "s"} saved for this role.`}
                    </p>
                  </div>
                </div>
                {savedDetail.length > 0 ? (
                  <span className="inline-flex items-center rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-indigo-700 shadow-sm ring-1 ring-indigo-100">
                    {savedDetail.length} saved
                  </span>
                ) : null}
              </div>
              {savedDetail.length === 0 ? (
                <div className="rounded-xl border border-dashed border-indigo-200/80 bg-white/60 px-4 py-8 text-center">
                  <p className="text-sm text-gray-600 max-w-md mx-auto">
                    Open <span className="font-semibold text-indigo-700">AI Match</span> for this offer,
                    then bookmark candidates you want to track.
                  </p>
                </div>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {savedDetail.map((row) => {
                    const displayName = row.name?.trim() || "Saved candidate";
                    const letters = savedCandidateAvatarLetters(row);
                    const isCopied = copiedCandidateId === row.candidate_id;
                    return (
                      <li key={row.candidate_id}>
                        <div className="group flex h-full items-center gap-4 rounded-xl border border-gray-100/90 bg-white p-4 shadow-sm ring-1 ring-black/[0.03] transition hover:border-indigo-200 hover:shadow-md hover:ring-indigo-100">
                          <button
                            type="button"
                            className="flex min-w-0 flex-1 items-center gap-4 cursor-pointer hover:bg-gray-50 rounded-xl transition-colors text-left"
                            onClick={() => goToCandidate(row.candidate_id)}
                          >
                            <SavedCandidateAvatar
                              candidateId={row.candidate_id}
                              profilePhotoId={row.profile_photo_id ?? null}
                              letters={letters}
                              displayName={displayName}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-gray-900 leading-snug truncate">
                                {displayName}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">Shortlisted · from AI Match</p>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => goToCandidate(row.candidate_id)}
                            className="inline-flex h-10 items-center rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                          >
                            View Profile
                          </button>
                          <button
                            type="button"
                            title="Remove from shortlist"
                            aria-label="Remove from shortlist"
                            disabled={removingSavedId === row.candidate_id}
                            onClick={() =>
                              setShortlistRemoveConfirm({
                                offerId: d._id,
                                candidateId: row.candidate_id,
                                displayName,
                                offerTitle: d.title || "this offer",
                              })
                            }
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          >
                            {removingSavedId === row.candidate_id ? (
                              <Loader2 className="animate-spin" size={18} aria-hidden />
                            ) : (
                              <BookmarkX size={18} aria-hidden />
                            )}
                          </button>
                          <button
                            type="button"
                            title="Copy internal ID (for support)"
                            aria-label="Copy candidate ID"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(row.candidate_id);
                                setCopiedCandidateId(row.candidate_id);
                                window.setTimeout(() => {
                                  setCopiedCandidateId((cur) =>
                                    cur === row.candidate_id ? null : cur
                                  );
                                }, 2000);
                              } catch {
                                showToast("Could not copy to clipboard.", "error");
                              }
                            }}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                          >
                            {isCopied ? (
                              <CheckCircle className="text-emerald-600" size={18} aria-hidden />
                            ) : (
                              <Copy size={18} aria-hidden />
                            )}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
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

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-900">Manage Job Offers</h3>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={loadOffers} disabled={offersLoading}>
              {offersLoading ? <Loader2 className="animate-spin" size={16} /> : "Refresh"}
            </Button>
            <Button className="flex items-center gap-2" onClick={openCreateOffer}>
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
              return (
                <div
                  key={job._id}
                  className="bg-white p-6 rounded-2xl border border-border shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-lg text-gray-900">{job.title}</h4>
                      <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-gray-600">
                        <span
                          className={`px-2 py-1 rounded-md text-xs font-bold ${
                            job.status === "open"
                              ? "bg-green-100 text-green-700"
                              : job.status === "closed"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {job.status}
                        </span>
                        <span className="text-gray-300">·</span>
                        <span className="flex items-center gap-1 text-gray-500">
                          <Users size={16} /> {formatPostedDate(job.created_at)}
                        </span>
                        {savedCount > 0 ? (
                          <>
                            <span className="text-gray-300">·</span>
                            <span className="flex items-center gap-1 text-indigo-700 font-semibold text-xs">
                              <BookmarkCheck size={14} /> {savedCount} saved
                            </span>
                          </>
                        ) : null}
                      </div>
                      {skillTags.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {skillTags.slice(0, 6).map((skill, index) => (
                            <span
                              key={`${skill}-${index}`}
                              className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-100"
                            >
                              {skill}
                            </span>
                          ))}
                          {skillTags.length > 6 ? (
                            <span className="text-xs text-gray-500 self-center">
                              +{skillTags.length - 6} more
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex items-center gap-2 text-xs font-bold"
                        onClick={() => openOfferDetail(job._id)}
                      >
                        <Eye size={16} /> Details
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="p-2 text-purple-600 hover:bg-purple-50 border-purple-200 flex items-center gap-2 text-xs font-bold"
                        onClick={() => goToAiMatch(job._id)}
                      >
                        <Sparkles size={16} /> AI Match
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="p-2 text-indigo-600 hover:bg-indigo-50 border-indigo-200 flex items-center gap-2 text-xs font-bold"
                        onClick={() => goToApplications(job._id)}
                      >
                        <Users size={16} /> View Applications
                      </Button>
                      <Button variant="outline" className="p-2" disabled title="Edit soon">
                        <Edit size={18} />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="p-2 text-red-500 hover:bg-red-50 border-red-200"
                        disabled={deletingOfferId === job._id}
                        title="Delete offer"
                        onClick={() => confirmDeleteOffer(job._id)}
                      >
                        {deletingOfferId === job._id ? (
                          <Loader2 className="animate-spin" size={18} />
                        ) : (
                          <Trash2 size={18} />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const shortlistRemoveModal =
    shortlistRemoveConfirm &&
    createPortal(
      <div
        className="fixed inset-0 z-[110] flex items-end justify-center p-4 sm:items-center sm:p-6"
        role="presentation"
      >
        <button
          type="button"
          className="absolute inset-0 bg-gray-900/50 backdrop-blur-[2px] transition-opacity"
          aria-label="Close dialog"
          onClick={() => setShortlistRemoveConfirm(null)}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="shortlist-remove-title"
          className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-2xl shadow-gray-900/20"
        >
          <div className="border-b border-amber-100 bg-gradient-to-r from-amber-50/90 to-orange-50/50 px-6 py-4">
            <div className="flex items-start gap-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 ring-1 ring-amber-200/80"
                aria-hidden
              >
                <AlertTriangle className="h-5 w-5" strokeWidth={2.25} />
              </div>
              <div className="min-w-0 pt-0.5">
                <h2
                  id="shortlist-remove-title"
                  className="text-lg font-bold tracking-tight text-gray-900"
                >
                  Remove from shortlist?
                </h2>
                <p className="mt-1 text-sm text-amber-950/80">
                  This only updates your saved list for this job — nothing is deleted from their
                  account.
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 py-5">
            <p className="text-sm leading-relaxed text-gray-700">
              <span className="font-semibold text-gray-900">{shortlistRemoveConfirm.displayName}</span>
              {" will be removed from your shortlist for "}
              <span className="font-semibold text-indigo-700">
                {shortlistRemoveConfirm.offerTitle}
              </span>
              .
            </p>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50/80 px-6 py-4 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              type="button"
              variant="outline"
              className="w-full border-gray-300 text-gray-800 hover:bg-white sm:w-auto"
              onClick={() => setShortlistRemoveConfirm(null)}
            >
              Cancel
            </Button>
            <button
              type="button"
              disabled={
                removingSavedId === shortlistRemoveConfirm.candidateId
              }
              onClick={() => {
                const p = shortlistRemoveConfirm;
                setShortlistRemoveConfirm(null);
                removeSavedCandidate(p.offerId, p.candidateId, p.displayName, p.offerTitle);
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-transparent bg-rose-600 px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-rose-700 focus:ring-4 focus:ring-rose-300/50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {removingSavedId === shortlistRemoveConfirm.candidateId ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Removing…
                </>
              ) : (
                <>
                  <BookmarkX size={18} strokeWidth={2.25} />
                  Remove from shortlist
                </>
              )}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );

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
      {shortlistRemoveModal}
    </>
  );
}
