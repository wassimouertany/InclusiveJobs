import React, { useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Plus,
  XCircle,
} from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { Button } from "../../components/UI";
import { apiClient } from "../../services/apiClient";

export function readErrorDetailFromResponseLike(data, statusText) {
  if (data !== null && typeof data === "object" && !Array.isArray(data)) {
    const detail = data.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail.map((e) => e?.msg).filter(Boolean).join(", ") || "Request failed";
    }
  }
  return statusText || "Request failed";
}

export function formatPostedDate(value) {
  if (!value) return "Unknown date";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Unknown date";
  return d.toLocaleDateString();
}

export function savedCandidateAvatarLetters(row) {
  const name = (row.name || "").trim();
  if (!name) return "?";
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0][0] || "";
    const b = parts[parts.length - 1][0] || "";
    return (a + b).toUpperCase();
  }
  const w = parts[0];
  return w.length >= 2 ? w.slice(0, 2).toUpperCase() : (w.charAt(0).toUpperCase() || "?");
}

export function SavedCandidateAvatar({ candidateId, profilePhotoId, letters, displayName }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [failed, setFailed] = useState(false);
  const blobUrlRef = useRef(null);

  useEffect(() => {
    setBlobUrl(null);
    setFailed(false);
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    if (!profilePhotoId || !candidateId) return undefined;

    let cancelled = false;

    (async () => {
      try {
        const res = await apiClient.get(
          `/job-offers/saved-candidate-avatar/${encodeURIComponent(candidateId)}`,
          { responseType: "blob", validateStatus: () => true }
        );
        if (cancelled) return;
        if (res.status >= 200 && res.status < 300 && res.data instanceof Blob && res.data.size > 0) {
          const url = URL.createObjectURL(res.data);
          if (cancelled) {
            URL.revokeObjectURL(url);
            return;
          }
          blobUrlRef.current = url;
          setBlobUrl(url);
        } else {
          setFailed(true);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [candidateId, profilePhotoId]);

  const showImg = Boolean(blobUrl && !failed);

  return (
    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-inner ring-1 ring-black/5">
      {showImg ? (
        <img
          src={blobUrl}
          alt={displayName ? `Profile photo — ${displayName}` : "Profile photo"}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center text-sm font-bold tracking-tight text-white"
          aria-hidden
        >
          {letters}
        </div>
      )}
    </div>
  );
}

function htmlToPlainText(html) {
  return (html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function normalizeRichTextHtml(html) {
  const cleaned = (html || "").trim();
  if (!cleaned) return "";
  if (!htmlToPlainText(cleaned)) return "";
  return cleaned;
}

export function RichTextDescription({ value, onChange }) {
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

export function scoreColor(score) {
  const n = Number(score) || 0;
  if (n >= 70) return "bg-green-100 text-green-700 border-green-200";
  if (n >= 40) return "bg-yellow-100 text-yellow-700 border-yellow-200";
  return "bg-red-100 text-red-700 border-red-200";
}

export function explanationPreview(text, maxLen = 100) {
  if (!text?.trim()) return "";
  const t = text.trim();
  return t.length > maxLen ? `${t.slice(0, maxLen).trim()}...` : t;
}

export function SkillInput({ label, skills, onChange, placeholder = "Add a skill" }) {
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
