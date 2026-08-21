import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { motion } from "motion/react";
import {
  Camera,
  CheckCircle,
  Compass,
  Eye,
  FileText,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Save,
  Upload,
  X,
} from "lucide-react";
import { useCandidateDashboard } from "./CandidateDashboardContext";
import { useToast } from "../../context/ToastContext";
import { apiClient } from "../../services/apiClient";
import { API_BASE_URL } from "../../config/api";
import { formatEnumLabel, initials, normalizeToStringArray } from "./shared";
import CandidateBadges from "./CandidateBadges";
import { emitGuideBlockage } from "../../features/guide/useBlockageDetector";
import { useShadowGuide } from "../../features/guide/guideContext";

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

type Section = "personal" | "professional" | "accessibility" | "documents";

type FormState = {
  first_name: string;
  last_name: string;
  phone_number: string;
  address: string;
  industry: string;
  profile_title: string;
  years_of_experience: number;
  education_level: string;
  work_preference: string;
  availability_status: string;
  disability_type: string;
  accessibility_needs: string;
  key_skills: string[];
  work_accommodations: string[];
};

const EMPTY_FORM: FormState = {
  first_name: "", last_name: "", phone_number: "", address: "",
  industry: "", profile_title: "", years_of_experience: 0,
  education_level: "", work_preference: "", availability_status: "",
  disability_type: "", accessibility_needs: "",
  key_skills: [], work_accommodations: [],
};

const EDUCATION_LEVELS = [
  "no_degree", "vocational_training", "high_school",
  "bachelors", "masters", "engineering_degree", "doctorate", "other",
];
const WORK_PREFERENCES = ["fully_remote", "hybrid", "on_site", "flexible_hours", "part_time"];
const AVAILABILITY_STATUSES = ["actively_looking", "unavailable"];
const DISABILITY_TYPES = ["motor", "visual", "hearing", "cognitive", "psychological", "other"];
const ACCOMMODATION_OPTIONS = [
  "Visual Aid", "Hearing Aid", "Wheelchair Access", "Neurodiverse Friendly",
  "Ergonomic Workstation", "Flexible Scheduling", "Remote Work", "Screen Reader Compatible",
];
const SECTION_LABELS: Record<Section, string> = {
  personal: "Personal Info",
  professional: "Professional",
  accessibility: "Accessibility",
  documents: "Documents",
};

// Shadow Guide anchors — the tabs stay in the DOM regardless of which
// section is active, unlike the section content itself, so the guide
// targets these buttons rather than the (conditionally rendered) panels.
const SECTION_GUIDE_ID: Partial<Record<Section, string>> = {
  personal: "ai_profile_review",
  accessibility: "accessibility_needs",
  documents: "cv_upload",
};

// ---------------------------------------------------------------------------
// Style helpers
// ---------------------------------------------------------------------------

const INPUT_BASE =
  "w-full border border-gray-200 rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all bg-white";
const INPUT_DISABLED = "bg-gray-50 text-text-secondary cursor-not-allowed";
const LABEL = "block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2";
const SAVE_BTN =
  "inline-flex items-center gap-2 bg-linear-to-r from-primary to-primary-light text-white rounded-2xl px-8 py-3 font-semibold shadow-lg hover:shadow-xl hover:opacity-95 transition-all disabled:opacity-60";

function ic(disabled = false, hasError = false) {
  return `${INPUT_BASE} ${disabled ? INPUT_DISABLED : ""} ${hasError ? "border-red-300 focus:ring-red-200" : ""}`;
}

// ---------------------------------------------------------------------------
// Diff helpers
// ---------------------------------------------------------------------------

function changed(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
): boolean {
  return String(a ?? "") !== String(b ?? "");
}

function arrChanged(a: string[], b: string[]): boolean {
  return JSON.stringify([...a].sort()) !== JSON.stringify([...b].sort());
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CandidateProfile() {
  const {
    profile,
    profileLoading,
    profileError,
    loadProfile,
    avatarBlobUrl,
    avatarLoadFailed,
    setAvatarLoadFailed,
  } = useCandidateDashboard();
  const { showToast } = useToast();
  const { startTour } = useShadowGuide();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [activeSection, setActiveSection] = useState<Section>("personal");
  const [newSkill, setNewSkill] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [disabilityCardFile, setDisabilityCardFile] = useState<File | null>(null);
  // Tracks the previous validation pass so we can tell the Shadow Guide's
  // blockage detector about a field that keeps failing (not just failing once).
  const prevFieldErrorsRef = useRef<Record<string, string>>({});

  // Sync form from profile on mount and whenever profile refreshes
  useEffect(() => {
    if (!profile) return;
    setForm({
      first_name:          profile.first_name          ?? "",
      last_name:           profile.last_name           ?? "",
      phone_number:        profile.phone_number        ?? "",
      address:             profile.address             ?? "",
      industry:            profile.industry            ?? "",
      profile_title:       profile.profile_title       ?? "",
      years_of_experience: profile.years_of_experience ?? 0,
      education_level:     profile.education_level     ?? "",
      work_preference:     profile.work_preference     ?? "",
      availability_status: profile.availability_status ?? "",
      disability_type:     profile.disability_type     ?? "",
      accessibility_needs: profile.accessibility_needs ?? "",
      key_skills:          normalizeToStringArray(profile.key_skills),
      work_accommodations: normalizeToStringArray(profile.work_accommodations),
    });
  }, [profile]);

  // ── Immediate photo upload from banner ────────────────────────────────────

  const handlePhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    const fd = new FormData();
    fd.append("photo", file);
    try {
      await apiClient.patch("/users/candidates/me", fd);
      await loadProfile();
      showToast("Photo updated successfully!", "success");
    } catch {
      showToast("Failed to upload photo.", "error");
    } finally {
      setPhotoUploading(false);
      e.target.value = "";
    }
  };

  // ── Validation ────────────────────────────────────────────────────────────

  const validate = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (form.first_name !== "" && !form.first_name.trim())
      errors.first_name = "First name cannot be empty.";
    if (form.last_name !== "" && !form.last_name.trim())
      errors.last_name = "Last name cannot be empty.";
    const yoe = Number(form.years_of_experience);
    if (!Number.isInteger(yoe) || yoe < 0 || yoe > 50)
      errors.years_of_experience = "Must be between 0 and 50.";
    if (form.phone_number.trim() && form.phone_number.trim().length < 6)
      errors.phone_number = "Enter a valid phone number.";
    return errors;
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    const errors = validate();
    setFieldErrors(errors);
    const prevErrors = prevFieldErrorsRef.current;
    for (const field of Object.keys(errors)) {
      if (prevErrors[field] && prevErrors[field] === errors[field]) {
        emitGuideBlockage("form_error", { field });
      }
    }
    prevFieldErrorsRef.current = errors;
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    const fd = new FormData();
    let hasAnyChange = false;

    const maybeText = (key: string, val: string, ref: string | null | undefined) => {
      if (changed(val, ref)) { fd.append(key, val); hasAnyChange = true; }
    };

    maybeText("first_name",          form.first_name,          profile?.first_name);
    maybeText("last_name",           form.last_name,           profile?.last_name);
    maybeText("phone_number",        form.phone_number,        profile?.phone_number);
    maybeText("address",             form.address,             profile?.address);
    maybeText("industry",            form.industry,            profile?.industry);
    maybeText("profile_title",       form.profile_title,       profile?.profile_title);
    maybeText("work_preference",     form.work_preference,     profile?.work_preference);
    maybeText("availability_status", form.availability_status, profile?.availability_status);
    maybeText("disability_type",     form.disability_type,     profile?.disability_type);
    maybeText("accessibility_needs", form.accessibility_needs, profile?.accessibility_needs);
    maybeText("education_level",     form.education_level,     profile?.education_level);

    if (changed(form.years_of_experience, profile?.years_of_experience ?? 0)) {
      fd.append("years_of_experience", String(form.years_of_experience));
      hasAnyChange = true;
    }
    if (arrChanged(form.key_skills, normalizeToStringArray(profile?.key_skills))) {
      fd.append("key_skills", JSON.stringify(form.key_skills));
      hasAnyChange = true;
    }
    if (arrChanged(form.work_accommodations, normalizeToStringArray(profile?.work_accommodations))) {
      fd.append("work_accommodations", JSON.stringify(form.work_accommodations));
      hasAnyChange = true;
    }
    if (photoFile)        { fd.append("photo",           photoFile);        hasAnyChange = true; }
    if (resumeFile)       { fd.append("resume",          resumeFile);       hasAnyChange = true; }
    if (disabilityCardFile) { fd.append("disability_card", disabilityCardFile); hasAnyChange = true; }

    if (!hasAnyChange) {
      showToast("No changes to save.", "info");
      setSaving(false);
      return;
    }

    try {
      await apiClient.patch("/users/candidates/me", fd);
      await loadProfile();
      setPhotoFile(null);
      setResumeFile(null);
      setDisabilityCardFile(null);
      showToast("Profile updated successfully!", "success");
      const profileComplete =
        !!(profile?.logo_id || photoFile) &&
        !!(profile?.resume_id || resumeFile) &&
        form.key_skills.length > 0 &&
        !!form.accessibility_needs.trim() &&
        !!form.profile_title.trim();
      if (profileComplete) {
        apiClient.post("/badges/award/profile_complete").catch(() => {});
      }
      if (resumeFile) {
        apiClient.post("/badges/award/cv_champion").catch(() => {});
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Failed to save profile.";
      showToast(msg, "error");
      if (resumeFile || disabilityCardFile) {
        emitGuideBlockage("upload_failure");
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Early returns ─────────────────────────────────────────────────────────

  if (profileLoading && !profile) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col items-center justify-center py-20 gap-4 text-gray-500"
      >
        <Loader2 className="animate-spin text-primary" size={40} />
        <p className="font-medium">Loading your profile…</p>
      </motion.div>
    );
  }

  if (profileError && !profile) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-white p-8 rounded-2xl border border-red-200 text-center space-y-4 shadow-sm"
      >
        <p className="text-red-600 font-medium">{profileError}</p>
        <button
          type="button"
          onClick={() => loadProfile()}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors"
        >
          <RefreshCw size={16} /> Retry
        </button>
      </motion.div>
    );
  }

  if (!profile) return null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {/* ================================================================ */}
      {/* BANNER                                                           */}
      {/* ================================================================ */}
      <div className="bg-linear-to-r from-indigo-600 to-teal-500 rounded-3xl p-8 text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">

          {/* Photo + change button */}
          <div className="flex flex-col items-center gap-3 shrink-0">
            <div className="relative w-24 h-24">
              {avatarBlobUrl && !avatarLoadFailed ? (
                <img
                  src={avatarBlobUrl}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover border-4 border-white/30 shadow-lg"
                  onError={() => setAvatarLoadFailed(true)}
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-white/20 border-4 border-white/30 flex items-center justify-center text-3xl font-bold shadow-lg select-none">
                  {initials(profile.first_name, profile.last_name)}
                </div>
              )}
              {photoUploading && (
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                  <Loader2 className="animate-spin text-white" size={24} />
                </div>
              )}
            </div>
            <label
              className={`cursor-pointer bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5 ${
                photoUploading ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              <Camera size={12} />
              Change Photo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
                disabled={photoUploading}
              />
            </label>
          </div>

          {/* Name + title + badges */}
          <div className="flex-1 min-w-0">
            <h2 className="text-3xl font-bold truncate">
              {[profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Your Name"}
            </h2>
            <p className="text-lg text-white/80 mt-1 truncate">
              {profile.profile_title || "No job title set"}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {profile.work_preference && (
                <span className="bg-white/20 rounded-full px-3 py-1 text-sm">
                  {formatEnumLabel(profile.work_preference)}
                </span>
              )}
              {profile.availability_status && (
                <span className="bg-white/20 rounded-full px-3 py-1 text-sm">
                  {formatEnumLabel(profile.availability_status)}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={startTour}
              title="Revoir la visite guidée de votre espace"
              className="mt-4 inline-flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/25"
            >
              <Compass className="h-4 w-4" aria-hidden="true" />
              Revoir le guide
            </button>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* ACHIEVEMENTS                                                     */}
      {/* ================================================================ */}
      <div className="bg-white rounded-3xl p-6 border border-teal-50 shadow-sm">
        <CandidateBadges />
      </div>

      {/* ================================================================ */}
      {/* SECTION TABS                                                     */}
      {/* ================================================================ */}
      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 overflow-x-auto">
        {(Object.keys(SECTION_LABELS) as Section[]).map((s) => (
          <button
            key={s}
            type="button"
            data-guide={SECTION_GUIDE_ID[s]}
            onClick={() => setActiveSection(s)}
            className={`flex-1 min-w-max px-5 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
              activeSection === s
                ? "bg-primary text-white shadow-sm"
                : "text-text-secondary hover:text-primary"
            }`}
          >
            {SECTION_LABELS[s]}
          </button>
        ))}
      </div>

      {/* ================================================================ */}
      {/* SECTION: PERSONAL INFO                                           */}
      {/* ================================================================ */}
      {activeSection === "personal" && (
        <div className="bg-white rounded-3xl p-8 border border-indigo-50 shadow-sm">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div>
              <label className={LABEL}>First Name</label>
              <input
                type="text"
                value={form.first_name}
                onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                disabled={saving}
                className={ic(saving, !!fieldErrors.first_name)}
              />
              {fieldErrors.first_name && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.first_name}</p>
              )}
            </div>

            <div>
              <label className={LABEL}>Last Name</label>
              <input
                type="text"
                value={form.last_name}
                onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                disabled={saving}
                className={ic(saving, !!fieldErrors.last_name)}
              />
              {fieldErrors.last_name && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.last_name}</p>
              )}
            </div>

            <div>
              <label className={LABEL}>
                Email <Lock size={10} className="inline ml-1 text-text-secondary/60" />
              </label>
              <input type="email" value={profile.email ?? ""} disabled className={ic(true)} />
            </div>

            <div>
              <label className={LABEL}>
                Birth Date <Lock size={10} className="inline ml-1 text-text-secondary/60" />
              </label>
              <input type="text" value={profile.birth_date ?? "—"} disabled className={ic(true)} />
            </div>

            <div>
              <label className={LABEL}>Phone Number</label>
              <input
                type="tel"
                value={form.phone_number}
                onChange={(e) => setForm((f) => ({ ...f, phone_number: e.target.value }))}
                disabled={saving}
                className={ic(saving, !!fieldErrors.phone_number)}
              />
              {fieldErrors.phone_number && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.phone_number}</p>
              )}
            </div>

            <div>
              <label className={LABEL}>Address</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                disabled={saving}
                className={ic(saving)}
              />
            </div>

            <div>
              <label className={LABEL}>
                Gender <Lock size={10} className="inline ml-1 text-text-secondary/60" />
              </label>
              <input
                type="text"
                value={formatEnumLabel(profile.gender)}
                disabled
                className={ic(true)}
              />
            </div>

          </div>

          <div className="mt-8 flex justify-end">
            <button type="button" onClick={handleSave} disabled={saving} className={SAVE_BTN}>
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* SECTION: PROFESSIONAL                                            */}
      {/* ================================================================ */}
      {activeSection === "professional" && (
        <div className="bg-white rounded-3xl p-8 border border-indigo-50 shadow-sm">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Professional Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div>
              <label className={LABEL}>Job Title</label>
              <input
                type="text"
                value={form.profile_title}
                onChange={(e) => setForm((f) => ({ ...f, profile_title: e.target.value }))}
                disabled={saving}
                className={ic(saving)}
              />
            </div>

            <div>
              <label className={LABEL}>Industry</label>
              <input
                type="text"
                value={form.industry}
                onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
                disabled={saving}
                className={ic(saving)}
              />
            </div>

            <div>
              <label className={LABEL}>Years of Experience</label>
              <input
                type="number"
                min={0}
                max={50}
                value={form.years_of_experience}
                onChange={(e) =>
                  setForm((f) => ({ ...f, years_of_experience: Number(e.target.value) }))
                }
                disabled={saving}
                className={ic(saving, !!fieldErrors.years_of_experience)}
              />
              {fieldErrors.years_of_experience && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.years_of_experience}</p>
              )}
            </div>

            <div>
              <label className={LABEL}>Education Level</label>
              <select
                value={form.education_level}
                onChange={(e) => setForm((f) => ({ ...f, education_level: e.target.value }))}
                disabled={saving}
                className={ic(saving)}
              >
                <option value="">Select…</option>
                {EDUCATION_LEVELS.map((v) => (
                  <option key={v} value={v}>{formatEnumLabel(v)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={LABEL}>Work Preference</label>
              <select
                value={form.work_preference}
                onChange={(e) => setForm((f) => ({ ...f, work_preference: e.target.value }))}
                disabled={saving}
                className={ic(saving)}
              >
                <option value="">Select…</option>
                {WORK_PREFERENCES.map((v) => (
                  <option key={v} value={v}>{formatEnumLabel(v)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={LABEL}>Availability Status</label>
              <select
                value={form.availability_status}
                onChange={(e) => setForm((f) => ({ ...f, availability_status: e.target.value }))}
                disabled={saving}
                className={ic(saving)}
              >
                <option value="">Select…</option>
                {AVAILABILITY_STATUSES.map((v) => (
                  <option key={v} value={v}>{formatEnumLabel(v)}</option>
                ))}
              </select>
            </div>

          </div>

          {/* Key Skills tag input */}
          <div className="mt-6">
            <label className={LABEL}>Key Skills</label>
            <div className="min-h-14 flex flex-wrap gap-2 items-center p-3 border border-gray-200 rounded-xl bg-white focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-all">
              {form.key_skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 rounded-full px-3 py-1 text-sm"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        key_skills: f.key_skills.filter((s) => s !== skill),
                      }))
                    }
                    disabled={saving}
                    className="text-indigo-400 hover:text-indigo-700 disabled:opacity-50"
                    aria-label={`Remove ${skill}`}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              {form.key_skills.length < 20 && (
                <div className="flex items-center gap-1 flex-1 min-w-28">
                  <Plus size={13} className="text-gray-400 shrink-0" />
                  <input
                    type="text"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.key === "Enter" || e.key === ",") && newSkill.trim()) {
                        e.preventDefault();
                        const skill = newSkill.trim().replace(/,$/, "");
                        if (skill && !form.key_skills.includes(skill)) {
                          setForm((f) => ({ ...f, key_skills: [...f.key_skills, skill] }));
                        }
                        setNewSkill("");
                      }
                    }}
                    placeholder={
                      form.key_skills.length === 0
                        ? "Add a skill, press Enter or comma…"
                        : "Add more…"
                    }
                    className="outline-none text-sm flex-1 bg-transparent text-text-primary placeholder:text-gray-400"
                    disabled={saving}
                  />
                </div>
              )}
            </div>
            <p className="text-xs text-text-secondary mt-1.5">
              {form.key_skills.length}/20 skills · Press Enter or comma to add
            </p>
          </div>

          <div className="mt-8 flex justify-end">
            <button type="button" onClick={handleSave} disabled={saving} className={SAVE_BTN}>
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* SECTION: ACCESSIBILITY                                           */}
      {/* ================================================================ */}
      {activeSection === "accessibility" && (
        <div className="bg-white rounded-3xl p-8 border border-indigo-50 shadow-sm">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Accessibility &amp; Needs</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div>
              <label className={LABEL}>Disability Type</label>
              <select
                value={form.disability_type}
                onChange={(e) => setForm((f) => ({ ...f, disability_type: e.target.value }))}
                disabled={saving}
                className={ic(saving)}
              >
                <option value="">Select…</option>
                {DISABILITY_TYPES.map((v) => (
                  <option key={v} value={v}>{formatEnumLabel(v)}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className={LABEL}>Accessibility Needs</label>
              <textarea
                rows={4}
                value={form.accessibility_needs}
                onChange={(e) => setForm((f) => ({ ...f, accessibility_needs: e.target.value }))}
                disabled={saving}
                placeholder="Describe your specific accessibility requirements…"
                className={`${INPUT_BASE} resize-none ${saving ? INPUT_DISABLED : ""}`}
              />
            </div>

            <div className="md:col-span-2">
              <label className={LABEL}>Work Accommodations</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {ACCOMMODATION_OPTIONS.map((opt) => {
                  const selected = form.work_accommodations.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          work_accommodations: selected
                            ? f.work_accommodations.filter((a) => a !== opt)
                            : [...f.work_accommodations, opt],
                        }))
                      }
                      disabled={saving}
                      className={`border-2 rounded-full px-4 py-2 text-sm font-medium transition-all disabled:opacity-60 ${
                        selected
                          ? "bg-indigo-100 border-primary text-primary"
                          : "bg-white border-gray-200 text-text-secondary hover:border-gray-300"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          <div className="mt-8 flex justify-end">
            <button type="button" onClick={handleSave} disabled={saving} className={SAVE_BTN}>
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* SECTION: DOCUMENTS                                               */}
      {/* ================================================================ */}
      {activeSection === "documents" && (
        <div className="bg-white rounded-3xl p-8 border border-indigo-50 shadow-sm">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Documents</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">

            {/* Profile Photo card */}
            <div className="rounded-2xl p-6 border-2 border-dashed border-indigo-100 hover:border-primary/40 transition-colors text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                {avatarBlobUrl && !avatarLoadFailed ? (
                  <img
                    src={avatarBlobUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={() => setAvatarLoadFailed(true)}
                  />
                ) : (
                  <Camera size={24} className="text-gray-400" />
                )}
              </div>
              <p className="font-semibold text-text-primary text-sm mb-2">Profile Photo</p>
              {profile.logo_id && (
                <p className="text-xs text-green-600 flex items-center justify-center gap-1 mb-3">
                  <CheckCircle size={12} /> Photo uploaded
                </p>
              )}
              {photoFile && (
                <p className="text-xs text-indigo-600 truncate mb-2">{photoFile.name}</p>
              )}
              <label className="cursor-pointer inline-flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-primary rounded-xl px-4 py-2 text-sm font-medium transition-colors">
                <Upload size={14} /> Choose Photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                  disabled={saving}
                />
              </label>
              <p className="text-xs text-text-secondary mt-3">
                Photo will be saved when you click Save Changes
              </p>
            </div>

            {/* Resume card */}
            <div className="rounded-2xl p-6 border-2 border-dashed border-indigo-100 hover:border-primary/40 transition-colors text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
                <FileText size={24} className="text-gray-400" />
              </div>
              <p className="font-semibold text-text-primary text-sm mb-2">Resume (PDF)</p>
              {profile.resume_id && (
                <div className="flex items-center justify-center gap-3 mb-3">
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle size={12} /> Resume uploaded
                  </span>
                  <a
                    href={`${API_BASE_URL}/users/candidates/${profile._id}/resume`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary flex items-center gap-1 hover:underline"
                  >
                    <Eye size={12} /> View
                  </a>
                </div>
              )}
              {resumeFile && (
                <p className="text-xs text-indigo-600 truncate mb-2">{resumeFile.name}</p>
              )}
              <label className="cursor-pointer inline-flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-primary rounded-xl px-4 py-2 text-sm font-medium transition-colors">
                <Upload size={14} /> Upload PDF
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
                  disabled={saving}
                />
              </label>
            </div>

            {/* Disability Card card */}
            <div className="rounded-2xl p-6 border-2 border-dashed border-indigo-100 hover:border-primary/40 transition-colors text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
                <FileText size={24} className="text-gray-400" />
              </div>
              <p className="font-semibold text-text-primary text-sm mb-2">Disability Card</p>
              {profile.disability_card_id && (
                <p className="text-xs text-green-600 flex items-center justify-center gap-1 mb-3">
                  <CheckCircle size={12} /> Card uploaded
                </p>
              )}
              {disabilityCardFile && (
                <p className="text-xs text-indigo-600 truncate mb-2">{disabilityCardFile.name}</p>
              )}
              <label className="cursor-pointer inline-flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-primary rounded-xl px-4 py-2 text-sm font-medium transition-colors">
                <Upload size={14} /> Upload Card
                <input
                  type="file"
                  accept=".pdf,image/*"
                  className="hidden"
                  onChange={(e) => setDisabilityCardFile(e.target.files?.[0] ?? null)}
                  disabled={saving}
                />
              </label>
            </div>

          </div>

          <div className="mt-8 flex justify-end">
            <button type="button" onClick={handleSave} disabled={saving} className={SAVE_BTN}>
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
