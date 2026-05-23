import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Send } from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { API_BASE_URL } from "../../config/api";
import { useAuthStore } from "../../store/authStore";
import { useToast } from "../../context/ToastContext";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Tab = "stories" | "champions";
type ReactionKey = "inspiring" | "solidarity" | "achievement" | "supportive";

interface Comment {
  _id: string;
  author_id: string;
  author_role: string;
  author_name: string;
  author_avatar_id: string | null;
  content: string;
  is_anonymous: boolean;
  created_at: string;
}

interface Story {
  _id: string;
  author_id: string;
  author_role: string;
  author_name: string;
  author_avatar_id: string | null;
  content: string;
  is_anonymous: boolean;
  reactions: Partial<Record<ReactionKey, string[]>>;
  comments: Comment[];
  created_at: string;
}

interface Recruiter {
  _id: string;
  company_name: string;
  company_industry: string;
  location: string;
  logo_id: string | null;
  total_offers: number;
  total_hires: number;
  inclusion_score: number;
  inclusion_level: "Champion" | "Gold" | "Silver" | "Bronze";
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const REACTIONS: { key: ReactionKey; emoji: string; label: string }[] = [
  { key: "inspiring",   emoji: "💪", label: "Inspiring" },
  { key: "solidarity",  emoji: "❤️",  label: "Solidarity" },
  { key: "achievement", emoji: "🏆", label: "Achievement" },
  { key: "supportive",  emoji: "🤝", label: "Supportive" },
];

const PODIUM_CARD: Record<number, string> = {
  0: "border border-yellow-400/50 bg-gradient-to-br from-yellow-900/30 to-slate-800 shadow-[0_0_40px_rgba(250,204,21,0.15)]",
  1: "border border-gray-400/40 bg-gradient-to-br from-gray-700/20 to-slate-800 shadow-[0_0_40px_rgba(156,163,175,0.1)]",
  2: "border border-orange-700/40 bg-gradient-to-br from-orange-900/20 to-slate-800 shadow-[0_0_40px_rgba(194,65,12,0.1)]",
};

const PODIUM_MEDAL = ["🥇", "🥈", "🥉"];

const LEVEL_STYLES: Record<string, string> = {
  Champion: "bg-gradient-to-r from-yellow-400 to-orange-400 text-white",
  Gold:     "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
  Silver:   "bg-gray-400/20 text-gray-300 border border-gray-400/30",
  Bronze:   "bg-orange-800/20 text-orange-400 border border-orange-700/30",
};

const RING_R    = 22;
const RING_CIRC = 2 * Math.PI * RING_R;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function timeAgo(iso?: string): string {
  if (!iso) return "";
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1)  return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7)  return `${days}d ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function nameInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

// ---------------------------------------------------------------------------
// Tiny sub-components
// ---------------------------------------------------------------------------
const AnonymousAvatar = ({ size = 40 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
    <circle cx="20" cy="20" r="20" fill="url(#anonGrad)" />
    <defs>
      <radialGradient id="anonGrad" cx="50%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#475569" />
        <stop offset="100%" stopColor="#1e293b" />
      </radialGradient>
    </defs>
    {/* Hood shape */}
    <path d="M20 6 C11 6 6 13 6 19 C6 22 7 24 8 25 C10 20 14 17 20 17 C26 17 30 20 32 25 C33 24 34 22 34 19 C34 13 29 6 20 6Z" fill="#64748b" />
    {/* Face circle */}
    <circle cx="20" cy="15" r="5" fill="#64748b" />
    {/* Body/cloak */}
    <path d="M6 34 C6 28 12 24 20 24 C28 24 34 28 34 34 L34 40 L6 40Z" fill="#334155" />
    {/* Mask/mystery lines */}
    <path d="M14 19 Q20 21 26 19" stroke="#94a3b8" strokeWidth="1" strokeLinecap="round" fill="none" />
    <circle cx="16" cy="16" r="1.5" fill="#1e293b" />
    <circle cx="24" cy="16" r="1.5" fill="#1e293b" />
  </svg>
);

function LevelBadge({ level }: { level: string }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${LEVEL_STYLES[level] ?? LEVEL_STYLES.Bronze}`}>
      {level}
    </span>
  );
}

function ScoreRing({ score }: { score: number }) {
  return (
    <div className="relative flex items-center justify-center w-14 h-14">
      <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90" aria-hidden>
        <circle cx="28" cy="28" r={RING_R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
        <circle
          cx="28" cy="28" r={RING_R}
          fill="none" stroke="#14B8A6" strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={RING_CIRC}
          strokeDashoffset={RING_CIRC * (1 - score / 100)}
          style={{ transition: "stroke-dashoffset 0.7s ease" }}
        />
      </svg>
      <span className="absolute text-white font-bold text-xs">{score}</span>
    </div>
  );
}

function CompanyAvatar({ name, size = "w-12 h-12" }: { name: string; size?: string }) {
  return (
    <div className={`${size} rounded-full bg-linear-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shrink-0`}>
      {nameInitials(name)}
    </div>
  );
}

function AuthorAvatar({ story }: { story: Story }) {
  const [err, setErr] = useState(false);

  if (story.is_anonymous) {
    return <AnonymousAvatar size={40} />;
  }

  if (!err) {
    const src =
      story.author_role === "CANDIDATE"
        ? `${API_BASE_URL}/users/candidates/${story.author_id}/photo`
        : `${API_BASE_URL}/users/recruiters/${story.author_id}/logo`;
    return (
      <img
        src={src}
        alt={story.author_name}
        className="w-10 h-10 rounded-full object-cover shrink-0"
        onError={() => setErr(true)}
      />
    );
  }

  return (
    <div className="w-10 h-10 rounded-full bg-linear-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
      {nameInitials(story.author_name)}
    </div>
  );
}

function CommentAvatar({ comment }: { comment: Comment }) {
  const [err, setErr] = useState(false);

  if (comment.is_anonymous) return <AnonymousAvatar size={28} />;

  if (!err) {
    const src =
      comment.author_role === "CANDIDATE"
        ? `${API_BASE_URL}/users/candidates/${comment.author_id}/photo`
        : `${API_BASE_URL}/users/recruiters/${comment.author_id}/logo`;
    return (
      <img
        src={src}
        alt={comment.author_name}
        className="w-7 h-7 rounded-full object-cover shrink-0"
        onError={() => setErr(true)}
      />
    );
  }

  return (
    <div className="w-7 h-7 rounded-full bg-linear-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold text-[10px] shrink-0">
      {nameInitials(comment.author_name)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// StoryCard
// ---------------------------------------------------------------------------
function StoryCard({
  story,
  currentUserId,
  currentUserRole,
  isLoggedIn,
  index,
  onReact,
  onDelete,
  onPostComment,
  onDeleteComment,
}: {
  story: Story;
  currentUserId: string | null;
  currentUserRole: string | null;
  isLoggedIn: boolean;
  index: number;
  onReact: (id: string, r: ReactionKey) => void;
  onDelete: (id: string) => void;
  onPostComment: (storyId: string, content: string, anon: boolean) => Promise<Comment | null>;
  onDeleteComment: (storyId: string, commentId: string) => Promise<boolean>;
}) {
  const isOwner = !!currentUserId && currentUserId === story.author_id;
  const [expanded, setExpanded] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const [commentAnon, setCommentAnon] = useState(false);
  const [posting, setPosting] = useState(false);

  const commentCount = story.comments?.length ?? 0;

  async function handlePostComment() {
    const content = commentInput.trim();
    if (!content || !isLoggedIn || posting) return;
    setPosting(true);
    try {
      await onPostComment(story._id, content, commentAnon);
      setCommentInput("");
    } finally {
      setPosting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.07, 0.42) }}
      className="bg-white/5 backdrop-blur border border-white/10 rounded-3xl p-6 text-white card-hover relative"
    >
      {isOwner && (
        <button
          onClick={() => onDelete(story._id)}
          aria-label="Delete story"
          title="Delete story"
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/5 hover:bg-red-500/20 text-white/30 hover:text-red-400 flex items-center justify-center transition-all text-sm"
        >
          ✕
        </button>
      )}

      {/* Author row */}
      <div className="flex items-center gap-3 pr-8">
        <AuthorAvatar story={story} />
        <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm text-white">
            {story.is_anonymous ? "Anonymous Member" : story.author_name}
          </span>
          {!story.is_anonymous && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              story.author_role === "CANDIDATE"
                ? "bg-teal-500/20 text-teal-300"
                : "bg-blue-500/20 text-blue-300"
            }`}>
              {story.author_role === "CANDIDATE" ? "Candidate" : "Recruiter"}
            </span>
          )}
        </div>
        <span className="text-white/40 text-xs shrink-0">{timeAgo(story.created_at)}</span>
      </div>

      {/* Content */}
      <p className="text-white/80 leading-relaxed text-base my-4">{story.content}</p>

      {/* Reactions */}
      <div className="flex flex-wrap gap-2">
        {REACTIONS.map(({ key, emoji, label }) => {
          const users   = story.reactions[key] ?? [];
          const count   = users.length;
          const reacted = isLoggedIn && !!currentUserId && users.includes(currentUserId);
          const cls = reacted
            ? "bg-teal-500 text-white shadow-sm shadow-teal-500/30"
            : count > 0
            ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
            : "bg-white/5 text-white/50 hover:bg-white/10";
          return (
            <div key={key} className="relative group">
              {count > 0 && (
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-white/20 shadow-lg z-10">
                  {count} {label}
                </span>
              )}
              <button
                onClick={() => isLoggedIn && onReact(story._id, key)}
                title={isLoggedIn ? undefined : "Sign in to react"}
                className={`rounded-full px-3 py-1.5 text-sm flex items-center gap-1.5 transition-all ${cls} ${!isLoggedIn ? "cursor-default" : "cursor-pointer"}`}
              >
                <span>{emoji}</span>
                <span>{label}</span>
                {count > 0 && (
                  <span className={`font-bold text-sm ${reacted ? "text-white" : "text-teal-300"}`}>
                    {count}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Comment toggle bar */}
      <div className="border-t border-white/10 mt-4 pt-3 flex items-center justify-between">
        <span className="text-white/50 text-sm">
          💬 {commentCount} comment{commentCount !== 1 ? "s" : ""}
        </span>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="text-teal-400 text-sm font-medium hover:text-teal-300 transition-colors"
        >
          {expanded ? "Hide ▴" : "View comments ▾"}
        </button>
      </div>

      {/* Comments section */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-3">
              {/* Comment list */}
              {commentCount === 0 ? (
                <p className="text-white/30 text-sm text-center py-3">
                  No comments yet — be the first!
                </p>
              ) : (
                (story.comments ?? []).map((comment) => {
                  const isCommentOwner = !!currentUserId && comment.author_id === currentUserId;
                  return (
                    <div key={comment._id} className="group">
                      <div className="flex items-start gap-2">
                        <CommentAvatar comment={comment} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white/80 text-xs font-semibold">
                              {comment.is_anonymous ? "Anonymous Member" : comment.author_name}
                            </span>
                            {!comment.is_anonymous && (
                              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                                comment.author_role === "CANDIDATE"
                                  ? "bg-teal-500/20 text-teal-300"
                                  : "bg-blue-500/20 text-blue-300"
                              }`}>
                                {comment.author_role === "CANDIDATE" ? "Candidate" : "Recruiter"}
                              </span>
                            )}
                            <span className="text-white/30 text-[10px] ml-auto shrink-0">
                              {timeAgo(comment.created_at)}
                            </span>
                            {isCommentOwner && (
                              <button
                                onClick={() => onDeleteComment(story._id, comment._id)}
                                className="text-white/30 hover:text-red-400 text-xs transition-colors opacity-0 group-hover:opacity-100"
                                title="Delete comment"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                          <p className="text-white/70 text-sm leading-relaxed mt-0.5">
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Comment input */}
              {isLoggedIn ? (
                <div className="mt-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-linear-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold text-[10px] shrink-0">
                      {currentUserRole === "CANDIDATE" ? "C" : "R"}
                    </div>
                    <input
                      type="text"
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handlePostComment();
                        }
                      }}
                      placeholder="Add a comment..."
                      className="flex-1 bg-white/10 border border-white/20 rounded-full px-4 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:border-teal-500/50 focus:bg-white/15 transition-all"
                    />
                    {commentInput.trim() && (
                      <button
                        onClick={handlePostComment}
                        disabled={posting}
                        className="shrink-0 rounded-full p-2 bg-teal-500 hover:bg-teal-400 text-white transition-all disabled:opacity-50 ml-2"
                      >
                        {posting ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Send size={14} />
                        )}
                      </button>
                    )}
                  </div>
                  <label className="flex items-center gap-2 mt-2 ml-8 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={commentAnon}
                      onChange={(e) => setCommentAnon(e.target.checked)}
                      className="w-3 h-3 accent-teal-500"
                    />
                    <span className="text-white/40 text-xs">Post anonymously</span>
                  </label>
                </div>
              ) : (
                <p className="text-white/30 text-sm text-center py-2">Sign in to comment</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// StoriesFeed
// ---------------------------------------------------------------------------
function StoriesFeed({
  stories,
  loading,
  hasMore,
  loadingMore,
  isLoggedIn,
  currentUserId,
  currentUserRole,
  onReact,
  onDelete,
  onLoadMore,
  onOpenModal,
  onPostComment,
  onDeleteComment,
}: {
  stories: Story[];
  loading: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  isLoggedIn: boolean;
  currentUserId: string | null;
  currentUserRole: string | null;
  onReact: (id: string, r: ReactionKey) => void;
  onDelete: (id: string) => void;
  onLoadMore: () => void;
  onOpenModal: () => void;
  onPostComment: (storyId: string, content: string, anon: boolean) => Promise<Comment | null>;
  onDeleteComment: (storyId: string, commentId: string) => Promise<boolean>;
}) {
  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-white/5 rounded-3xl h-40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (stories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="font-display text-9xl font-bold text-teal-500/20 leading-none select-none mb-6">"</div>
        <p className="text-white/60 text-xl font-semibold mb-2">Be the first to share your story</p>
        <p className="text-white/40 text-sm mb-8">Your experience could inspire someone today.</p>
        {isLoggedIn && (
          <button
            onClick={onOpenModal}
            className="bg-teal-500 hover:bg-teal-400 text-white rounded-2xl px-6 py-3 font-semibold shadow-lg transition-all"
          >
            Share Story
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-4">
        {stories.map((story, i) => (
          <StoryCard
            key={story._id}
            story={story}
            index={i}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            isLoggedIn={isLoggedIn}
            onReact={onReact}
            onDelete={onDelete}
            onPostComment={onPostComment}
            onDeleteComment={onDeleteComment}
          />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center mt-8">
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="bg-white/10 hover:bg-white/20 text-white rounded-2xl px-8 py-3 font-semibold transition-all disabled:opacity-50"
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ChampionsTab
// ---------------------------------------------------------------------------
function ChampionsTab({
  recruiters,
  loading,
  onNavigate,
}: {
  recruiters: Recruiter[];
  loading: boolean;
  onNavigate: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-white/5 rounded-3xl h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  if (recruiters.length === 0) {
    return (
      <div className="text-center py-24 text-white/40">No company data yet.</div>
    );
  }

  const podium = recruiters.slice(0, 3);
  const rest   = recruiters.slice(3);

  return (
    <div>
      <div className="mb-10 text-center">
        <h2 className="text-white font-display text-3xl font-bold mb-2">
          Companies Leading Inclusion
        </h2>
        <p className="text-white/60">
          Ranked by their commitment to hiring people with disabilities
        </p>
      </div>

      {/* Podium top 3 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {podium.map((r, i) => (
          <motion.div
            key={r._id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            onClick={() => onNavigate(r._id)}
            className={`rounded-3xl p-8 cursor-pointer transition-all hover:scale-[1.02] ${PODIUM_CARD[i] ?? ""}`}
          >
            <div className="flex flex-col items-center text-center gap-3">
              <div className="relative">
                <CompanyAvatar name={r.company_name} size="w-16 h-16" />
                <span className="absolute -top-2 -right-2 text-xl">{PODIUM_MEDAL[i]}</span>
              </div>
              <div>
                <p className="text-white font-bold text-base mb-2">{r.company_name}</p>
                <LevelBadge level={r.inclusion_level} />
              </div>
              <ScoreRing score={r.inclusion_score} />
              <p className="text-white/50 text-xs">
                {r.total_hires} hires · {r.total_offers} offers
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Rank 4+ list */}
      {rest.length > 0 && (
        <div className="flex flex-col gap-3">
          {rest.map((r, i) => (
            <motion.div
              key={r._id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: 0.35 }}
              onClick={() => onNavigate(r._id)}
              className="bg-white/5 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:bg-white/10 transition-all"
            >
              <span className="text-white/30 font-bold text-lg w-8 shrink-0 text-center">
                {i + 4}
              </span>
              <CompanyAvatar name={r.company_name} size="w-10 h-10" />
              <div className="min-w-0 flex-1">
                <p className="text-white font-semibold text-sm truncate">{r.company_name}</p>
                <p className="text-white/40 text-xs truncate">{r.company_industry}</p>
              </div>
              <LevelBadge level={r.inclusion_level} />
              <div className="w-24 shrink-0 hidden sm:block">
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-500 rounded-full transition-all duration-700"
                    style={{ width: `${r.inclusion_score}%` }}
                  />
                </div>
              </div>
              <span className="text-teal-400 font-bold text-sm shrink-0 w-8 text-right">
                {r.inclusion_score}
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// WriteStoryModal
// ---------------------------------------------------------------------------
function WriteStoryModal({
  content,
  anonymous,
  posting,
  onContentChange,
  onAnonymousChange,
  onClose,
  onSubmit,
}: {
  content: string;
  anonymous: boolean;
  posting: boolean;
  onContentChange: (v: string) => void;
  onAnonymousChange: (v: boolean) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl"
      >
        <h2 className="font-bold text-2xl text-slate-900 mb-2">Share Your Story</h2>
        <p className="text-slate-500 mb-6">Inspire others in the InclusiveJobs community</p>

        <div className="relative mb-4">
          <textarea
            value={content}
            onChange={(e) => onContentChange(e.target.value.slice(0, 500))}
            rows={4}
            placeholder="Tell your story — a milestone reached, a company that impressed you, advice for others..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-slate-400"
          />
          <span className="absolute bottom-3 right-4 text-slate-400 text-xs pointer-events-none">
            {content.length} / 500
          </span>
        </div>

        <div className="flex items-center justify-between mb-8 bg-slate-50 rounded-2xl px-4 py-3">
          <div>
            <p className="text-slate-700 font-semibold text-sm">Post anonymously</p>
            <p className="text-slate-400 text-xs">Your name won't be shown</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={anonymous}
            onClick={() => onAnonymousChange(!anonymous)}
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${anonymous ? "bg-teal-500" : "bg-slate-200"}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${anonymous ? "translate-x-5" : "translate-x-0"}`}
            />
          </button>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl border border-slate-200 text-slate-600 py-3 font-semibold hover:bg-slate-50 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={!content.trim() || posting}
            className="flex-1 rounded-2xl bg-linear-to-r from-teal-500 to-emerald-500 text-white py-3 font-semibold shadow-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {posting ? "Posting…" : "Post Story"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// CommunityPage (main)
// ---------------------------------------------------------------------------
export default function CommunityPage() {
  const navigate = useNavigate();
  const { token, userId, role } = useAuthStore();
  const isLoggedIn = !!token;
  const { showToast } = useToast();

  // tab
  const [tab, setTab] = useState<Tab>("stories");

  // stories
  const [stories,       setStories]       = useState<Story[]>([]);
  const [loadingStories, setLoadingStories] = useState(true);
  const [page,          setPage]          = useState(0);
  const [hasMore,       setHasMore]       = useState(true);
  const [loadingMore,   setLoadingMore]   = useState(false);

  // modal
  const [showWriteModal,    setShowWriteModal]    = useState(false);
  const [newStoryContent,   setNewStoryContent]   = useState("");
  const [newStoryAnonymous, setNewStoryAnonymous] = useState(false);
  const [posting,           setPosting]           = useState(false);

  // champions
  const [recruiters,        setRecruiters]        = useState<Recruiter[]>([]);
  const [loadingRecruiters, setLoadingRecruiters] = useState(false);
  const recruitersLoaded = useRef(false);

  // ── Fetch stories ──────────────────────────────────────────────────────
  const fetchStories = useCallback(async (skip: number, append: boolean) => {
    const res = await apiClient.get<{ stories: Story[] }>(`/stories/?skip=${skip}&limit=20`);
    const fetched = res.data.stories.map((s) => ({
      ...s,
      comments: s.comments ?? [],
    }));
    setStories((prev) => (append ? [...prev, ...fetched] : fetched));
    setHasMore(fetched.length === 20);
  }, []);

  useEffect(() => {
    setLoadingStories(true);
    fetchStories(0, false).finally(() => setLoadingStories(false));
  }, [fetchStories]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    const next = page + 1;
    try { await fetchStories(next * 20, true); } catch { /* silent */ }
    setPage(next);
    setLoadingMore(false);
  };

  // ── Fetch recruiters (lazy, once) ──────────────────────────────────────
  useEffect(() => {
    if (tab !== "champions" || recruitersLoaded.current) return;
    setLoadingRecruiters(true);
    apiClient
      .get<{ recruiters: Recruiter[] }>("/users/recruiters/public/")
      .then((r) => { setRecruiters(r.data.recruiters); recruitersLoaded.current = true; })
      .catch(() => {})
      .finally(() => setLoadingRecruiters(false));
  }, [tab]);

  // ── Post story ─────────────────────────────────────────────────────────
  const handlePostStory = async () => {
    if (!newStoryContent.trim() || posting) return;
    setPosting(true);
    try {
      const res = await apiClient.post<Story>("/stories/", {
        content: newStoryContent.trim(),
        is_anonymous: newStoryAnonymous,
      });
      setStories((prev) => [{ ...res.data, comments: [] }, ...prev]);
      setShowWriteModal(false);
      setNewStoryContent("");
      setNewStoryAnonymous(false);
      showToast({ message: "Your story was shared! 🎉", type: "success" });
    } catch {
      showToast({ message: "Failed to post story. Please try again.", type: "error" });
    } finally {
      setPosting(false);
    }
  };

  // ── React ──────────────────────────────────────────────────────────────
  const handleReact = async (storyId: string, reaction: ReactionKey) => {
    if (!isLoggedIn) return;
    try {
      const res = await apiClient.post<{ ok: boolean; reactions: Story["reactions"] }>(
        `/stories/${storyId}/react`,
        { reaction },
      );
      setStories((prev) =>
        prev.map((s) => s._id === storyId ? { ...s, reactions: res.data.reactions } : s),
      );
    } catch { /* silent */ }
  };

  // ── Delete story ───────────────────────────────────────────────────────
  const handleDelete = async (storyId: string) => {
    if (!window.confirm("Delete this story?")) return;
    try {
      await apiClient.delete(`/stories/${storyId}`);
      setStories((prev) => prev.filter((s) => s._id !== storyId));
      showToast({ message: "Story deleted.", type: "info" });
    } catch {
      showToast({ message: "Failed to delete story.", type: "error" });
    }
  };

  // ── Post comment ───────────────────────────────────────────────────────
  const handlePostComment = async (
    storyId: string,
    content: string,
    anon: boolean,
  ): Promise<Comment | null> => {
    try {
      const res = await apiClient.post<Comment>(`/stories/${storyId}/comments`, {
        content,
        is_anonymous: anon,
      });
      setStories((prev) =>
        prev.map((s) =>
          s._id === storyId
            ? { ...s, comments: [...(s.comments ?? []), res.data] }
            : s,
        ),
      );
      return res.data;
    } catch {
      showToast({ message: "Failed to post comment", type: "error" });
      return null;
    }
  };

  // ── Delete comment ─────────────────────────────────────────────────────
  const handleDeleteComment = async (
    storyId: string,
    commentId: string,
  ): Promise<boolean> => {
    try {
      await apiClient.delete(`/stories/${storyId}/comments/${commentId}`);
      setStories((prev) =>
        prev.map((s) =>
          s._id === storyId
            ? { ...s, comments: (s.comments ?? []).filter((c) => c._id !== commentId) }
            : s,
        ),
      );
      return true;
    } catch {
      showToast({ message: "Failed to delete comment", type: "error" });
      return false;
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-900">

      {/* Page header */}
      <div className="bg-linear-to-br from-slate-900 via-slate-800 to-teal-900 py-16 px-4 text-white text-center">
        <p className="text-teal-400 tracking-widest text-xs font-bold mb-4 uppercase">
          ✦ Our Community
        </p>
        <h1 className="font-display text-5xl font-bold mb-4">
          Stories of <span className="gradient-text">Inclusion</span>
        </h1>
        <p className="text-white/60 text-lg max-w-2xl mx-auto mb-8">
          Real experiences from candidates and companies building a more accessible world
        </p>
        {isLoggedIn && (
          <button
            onClick={() => setShowWriteModal(true)}
            className="bg-teal-500 hover:bg-teal-400 text-white rounded-2xl px-6 py-3 font-semibold shadow-lg transition-all"
          >
            Share Your Story
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur border-b border-white/5 px-4 py-4">
        <div className="max-w-4xl mx-auto flex gap-3">
          {(["stories", "champions"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-6 py-2.5 font-semibold text-sm transition-all ${
                tab === t
                  ? "bg-teal-500 text-white shadow-lg"
                  : "bg-white/10 text-white/70 hover:bg-white/20"
              }`}
            >
              {t === "stories" ? "Stories Feed" : "Inclusion Champions"}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-4xl mx-auto px-4 py-10">
        {tab === "stories" ? (
          <StoriesFeed
            stories={stories}
            loading={loadingStories}
            hasMore={hasMore}
            loadingMore={loadingMore}
            isLoggedIn={isLoggedIn}
            currentUserId={userId}
            currentUserRole={role}
            onReact={handleReact}
            onDelete={handleDelete}
            onLoadMore={handleLoadMore}
            onOpenModal={() => setShowWriteModal(true)}
            onPostComment={handlePostComment}
            onDeleteComment={handleDeleteComment}
          />
        ) : (
          <ChampionsTab
            recruiters={recruiters}
            loading={loadingRecruiters}
            onNavigate={(id) => navigate(`/community/company/${id}`)}
          />
        )}
      </div>

      {/* Write story modal */}
      <AnimatePresence>
        {showWriteModal && (
          <WriteStoryModal
            content={newStoryContent}
            anonymous={newStoryAnonymous}
            posting={posting}
            onContentChange={setNewStoryContent}
            onAnonymousChange={setNewStoryAnonymous}
            onClose={() => setShowWriteModal(false)}
            onSubmit={handlePostStory}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
