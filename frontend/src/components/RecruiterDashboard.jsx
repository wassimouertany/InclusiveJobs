import React, { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Building,
  Briefcase,
  Users,
  Search,
  PlusCircle,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Star,
  Filter,
  Eye,
  ChevronLeft,
  Loader2,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Heading1,
  Heading2,
} from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { Button, Input } from "./UI";
import { useToast } from "../context/ToastContext";
import { apiClient } from "../services/apiClient";
import { hasMeaningfulHtmlText, normalizeJobSkillTags } from "../pages/candidate/shared";

function readErrorDetailFromResponseLike(data, statusText) {
  if (data !== null && typeof data === "object" && !Array.isArray(data)) {
    const detail = data.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail.map((e) => e?.msg).filter(Boolean).join(", ") || "Request failed";
    }
  }
  return statusText || "Request failed";
}

function formatPostedDate(value) {
  if (!value) return "Unknown date";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Unknown date";
  return d.toLocaleDateString();
}

function htmlToPlainText(html) {
  return (html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeRichTextHtml(html) {
  const cleaned = (html || "").trim();
  if (!cleaned) return "";
  if (!htmlToPlainText(cleaned)) return "";
  return cleaned;
}

function RichTextDescription({ value, onChange }) {
  const toolbarButtonClass =
    "inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-2 text-gray-700 hover:bg-gray-50";
  const toolbarButtonActiveClass =
    "inline-flex items-center justify-center rounded-lg border border-primary bg-primary/10 p-2 text-primary";

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
      }),
      Underline,
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "min-h-[220px] w-full rounded-b-xl border-x-2 border-b-2 border-gray-200 bg-white px-4 py-3 text-gray-900 focus:outline-none prose prose-sm max-w-none",
      },
    },
    onUpdate: ({ editor: current }) => {
      onChange(current.getHTML());
    },
  });

  return (
    <div className="space-y-2">
      <label className="block text-sm font-bold text-gray-700">Mission Description</label>
      <div className="overflow-hidden rounded-xl">
        <div className="flex flex-wrap items-center gap-2 border-2 border-b-0 border-gray-200 bg-gray-50 px-3 py-2">
          <button
            type="button"
            className={editor?.isActive("bold") ? toolbarButtonActiveClass : toolbarButtonClass}
            onClick={() => editor?.chain().focus().toggleBold().run()}
            aria-label="Bold"
          >
            <Bold size={16} />
          </button>
          <button
            type="button"
            className={editor?.isActive("italic") ? toolbarButtonActiveClass : toolbarButtonClass}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            aria-label="Italic"
          >
            <Italic size={16} />
          </button>
          <button
            type="button"
            className={editor?.isActive("underline") ? toolbarButtonActiveClass : toolbarButtonClass}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            aria-label="Underline"
          >
            <UnderlineIcon size={16} />
          </button>
          <span className="mx-1 h-6 w-px bg-gray-200" />
          <button
            type="button"
            className={
              editor?.isActive("bulletList") ? toolbarButtonActiveClass : toolbarButtonClass
            }
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            aria-label="Bullet list"
          >
            <List size={16} />
          </button>
          <button
            type="button"
            className={
              editor?.isActive("orderedList") ? toolbarButtonActiveClass : toolbarButtonClass
            }
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            aria-label="Numbered list"
          >
            <ListOrdered size={16} />
          </button>
          <span className="mx-1 h-6 w-px bg-gray-200" />
          <button
            type="button"
            className={
              editor?.isActive("heading", { level: 1 })
                ? toolbarButtonActiveClass
                : toolbarButtonClass
            }
            onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
            aria-label="Heading 1"
          >
            <Heading1 size={16} />
          </button>
          <button
            type="button"
            className={
              editor?.isActive("heading", { level: 2 })
                ? toolbarButtonActiveClass
                : toolbarButtonClass
            }
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            aria-label="Heading 2"
          >
            <Heading2 size={16} />
          </button>
        </div>
        <EditorContent editor={editor} />
      </div>
      <p className="text-xs text-gray-500">Rich text is stored as clean HTML in backend.</p>
    </div>
  );
}

function SkillInput({ label, skills, onChange, placeholder = "Add a skill" }) {
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const addSkill = () => {
    const next = draft.trim();
    if (!next) return;
    if (!skills.some((s) => s.toLowerCase() === next.toLowerCase())) {
      onChange([...skills, next]);
    }
    setDraft("");
    setIsAdding(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-bold text-gray-700">{label}</label>
        <Button
          type="button"
          variant="outline"
          className="px-3 py-1 text-xs"
          onClick={() => setIsAdding(true)}
        >
          <Plus size={14} /> Add
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {skills.length === 0 ? (
          <span className="text-xs text-gray-400 italic">No skills added yet.</span>
        ) : (
          skills.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20"
            >
              {skill}
              <button
                type="button"
                className="text-primary/70 hover:text-primary"
                onClick={() => onChange(skills.filter((s) => s !== skill))}
                aria-label={`Remove ${skill}`}
              >
                <XCircle size={14} />
              </button>
            </span>
          ))
        )}
      </div>

      {isAdding && (
        <div className="flex gap-2">
          <input
            type="text"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSkill();
              }
              if (e.key === "Escape") {
                setIsAdding(false);
                setDraft("");
              }
            }}
            placeholder={placeholder}
            className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl bg-white text-gray-900 focus:border-primary outline-none"
          />
          <Button type="button" onClick={addSkill}>
            Add
          </Button>
        </div>
      )}
    </div>
  );
}

export default function RecruiterDashboard() {
  const [activeTab, setActiveTab] = useState("jobs");
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [offers, setOffers] = useState([]);
  const [offersLoading, setOffersLoading] = useState(false);
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

  const openCreateOffer = () => {
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

  const inactiveNav = "text-gray-600 hover:bg-gray-50";
  const activeNav = "bg-primary text-white shadow-md";

  const renderProfile = () => (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Company Profile</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Company Name" defaultValue="TechCorp Inc." />
          <Input label="Industry Sector" defaultValue="Technology" />
          <Input label="Location" defaultValue="Tunis, Tunisia" />
          <Input label="Website" defaultValue="https://techcorp.com" />
        </div>
        <div className="mt-6 space-y-2">
          <label className="block text-sm font-bold text-gray-700">Company Presentation</label>
          <textarea 
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-900 min-h-[120px] focus:border-primary outline-none"
            defaultValue="We are a leading technology company committed to inclusive hiring and building diverse teams."
          />
        </div>
        <Button className="mt-6" onClick={() => showToast('Company profile updated', 'success')}>Save Changes</Button>
      </div>
    </div>
  );

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
              return (
                <div
                  key={job._id}
                  className="bg-white p-6 rounded-2xl border border-border shadow-sm"
                >
                <div className="flex justify-between items-start gap-4">
                  <h4 className="font-bold text-lg text-gray-900">{job.title}</h4>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
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
                    <span className="flex items-center gap-1">
                      <Users size={16} /> {formatPostedDate(job.created_at)}
                    </span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="outline" className="p-2" disabled title="Edit soon">
                      <Edit size={18} />
                    </Button>
                    <Button
                      variant="outline"
                      className="p-2 text-red-500 hover:bg-red-50 border-red-200"
                      disabled
                      title="Delete soon"
                    >
                      <Trash2 size={18} />
                    </Button>
                  </div>
                </div>
                <div className="mt-4 border-t border-gray-100 pt-4 space-y-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
                      Description
                    </p>
                    {hasMeaningfulHtmlText(job.description) ? (
                      <div
                        className="prose prose-sm max-w-none text-gray-700"
                        dangerouslySetInnerHTML={{ __html: job.description }}
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
                      {skillTags.map((skill, index) => (
                        <span
                          key={`${skill}-${index}`}
                          className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-100"
                        >
                          {skill}
                        </span>
                      ))}
                      {skillTags.length === 0 ? (
                        <span className="text-sm text-gray-500">No skills listed.</span>
                      ) : null}
                    </div>
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

  const renderMatches = () => {
    if (selectedMatch) {
      return (
        <div className="bg-white p-8 rounded-2xl border border-border shadow-sm animate-in fade-in zoom-in-95 duration-200">
          <button type="button" onClick={() => setSelectedMatch(null)} className="text-primary font-bold flex items-center gap-2 mb-6 hover:underline">
            <ChevronLeft size={20} /> Back to matches
          </button>
          
          <div className="flex items-start gap-6 mb-8">
            <div className="w-24 h-24 rounded-full border-4 border-primary/20 flex items-center justify-center text-3xl font-bold text-primary bg-primary/5">
              {selectedMatch.score}%
            </div>
            <div>
              <h2 className="text-3xl font-black text-gray-900">{selectedMatch.name}</h2>
              <p className="text-lg text-gray-500">{selectedMatch.role}</p>
              <div className="flex gap-2 mt-3">
                {selectedMatch.accessible && <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-bold flex items-center gap-1"><CheckCircle size={16} /> Accommodations Match</span>}
                {!selectedMatch.accessible && <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-bold flex items-center gap-1"><XCircle size={16} /> Needs Review</span>}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-primary/5 border border-primary/20 p-6 rounded-xl">
              <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2"><Star size={20} className="text-primary" /> AI Analysis</h3>
              <p className="text-gray-700">
                {selectedMatch.name} is a strong fit for the Frontend Developer role. Their skills in React and TypeScript align perfectly with your requirements. 
                {selectedMatch.accessible 
                  ? " Furthermore, your company's remote work policy and flexible hours perfectly accommodate their needs." 
                  : " However, they require screen reader software which is not currently listed in your provided accommodations. Please review if this can be arranged."}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-bold text-gray-900 mb-2">Matched Skills</h4>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-gray-100 rounded-md text-sm font-medium text-gray-900">React</span>
                  <span className="px-2 py-1 bg-gray-100 rounded-md text-sm font-medium text-gray-900">TypeScript</span>
                  <span className="px-2 py-1 bg-gray-100 rounded-md text-sm font-medium text-gray-900">Tailwind CSS</span>
                </div>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-2">Accessibility Needs</h4>
                <ul className="list-disc pl-5 text-gray-700">
                  {selectedMatch.accessible ? (
                    <>
                      <li>Remote Work (Supported)</li>
                      <li>Flexible Hours (Supported)</li>
                    </>
                  ) : (
                    <>
                      <li>Screen Reader Software (Review Needed)</li>
                      <li>Remote Work (Supported)</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
            
            <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-border">
              <Button variant="outline">Reject</Button>
              <Button onClick={() => showToast('Interview invitation sent!', 'success')}>Invite to Interview</Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-900">AI Candidate Matches</h3>
          <select className="px-4 py-2 border-2 border-gray-200 rounded-xl bg-white text-gray-900 outline-none">
            <option>All Jobs</option>
            <option>Senior Frontend Developer</option>
            <option>UX/UI Designer</option>
          </select>
        </div>

        <div className="grid gap-4">
          {[
            { name: "Alex Johnson", role: "Frontend Developer", score: 95, accessible: true },
            { name: "Sarah Smith", role: "React Developer", score: 88, accessible: true },
            { name: "Mike Brown", role: "UI Engineer", score: 76, accessible: false },
          ].map((candidate, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-border shadow-sm flex justify-between items-center">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-primary/20 flex items-center justify-center text-xl font-bold text-primary">
                    {candidate.score}%
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-lg text-gray-900">{candidate.name}</h4>
                  <p className="text-sm text-gray-500">{candidate.role}</p>
                  <div className="flex gap-2 mt-2">
                    {candidate.accessible && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-bold flex items-center gap-1"><CheckCircle size={12} /> Needs Met</span>}
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-bold">React, TS</span>
                  </div>
                </div>
              </div>
              <Button variant="outline" className="flex items-center gap-2" onClick={() => setSelectedMatch(candidate)}><Eye size={16} /> View AI Analysis</Button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSearch = () => (
    <div className="space-y-6">
      <div className="flex gap-4">
        <div className="flex-grow relative">
          <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Search candidates by skills, experience, or keywords..." 
            className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-900 focus:border-primary outline-none"
          />
        </div>
        <Button variant="outline" className="flex items-center gap-2"><Filter size={20} /> Filters</Button>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-border shadow-sm text-center">
        <Users className="mx-auto text-gray-400 mb-4" size={48} />
        <h3 className="text-lg font-bold text-gray-900 mb-2">Global Talent Pool</h3>
        <p className="text-gray-500 max-w-md mx-auto">Use the search bar above to find specific profiles across our entire database of inclusive talent.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg-page py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-4 gap-8">
          
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-border p-6 sticky top-24">
              <div className="flex items-center space-x-4 mb-8">
                <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-xl">
                  TC
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">TechCorp</h3>
                  <p className="text-sm text-gray-500">Recruiter Account</p>
                </div>
              </div>
              
              <nav className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("jobs");
                    loadOffers();
                  }}
                  className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'jobs' ? activeNav : inactiveNav}`}
                >
                  <Briefcase className="w-5 h-5 mr-3" /> Manage Offers
                </button>
                <button 
                  type="button"
                  onClick={() => setActiveTab('matches')}
                  className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'matches' ? activeNav : inactiveNav}`}
                >
                  <Star className="w-5 h-5 mr-3" /> AI Matches
                </button>
                <button 
                  type="button"
                  onClick={() => setActiveTab('search')}
                  className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'search' ? activeNav : inactiveNav}`}
                >
                  <Search className="w-5 h-5 mr-3" /> Global Search
                </button>
                <button 
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'profile' ? activeNav : inactiveNav}`}
                >
                  <Building className="w-5 h-5 mr-3" /> Company Profile
                </button>
              </nav>
            </div>
          </div>

          <div className="lg:col-span-3">
            <motion.div
              key={activeTab + (isCreatingJob ? '-create' : '') + (selectedMatch ? '-match' : '')}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'profile' && renderProfile()}
              {activeTab === 'jobs' && renderJobs()}
              {activeTab === 'matches' && renderMatches()}
              {activeTab === 'search' && renderSearch()}
            </motion.div>
          </div>

        </div>
      </div>
    </div>
  );
}
