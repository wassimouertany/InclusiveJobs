import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Calendar,
  CheckCircle,
  Clock,
  Heart,
  MessageCircle,
} from "lucide-react";
import { apiClient } from "../services/apiClient";
import type { Notification, NotificationType } from "../types/application";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

const TYPE_STYLE: Record<
  NotificationType,
  { border: string; bg: string; Icon: React.FC<{ size?: number; className?: string }> }
> = {
  application_received:      { border: "border-blue-400",   bg: "bg-blue-50",   Icon: Bell },
  application_status_changed:{ border: "border-yellow-400", bg: "bg-yellow-50", Icon: Clock },
  interview_scheduled:       { border: "border-purple-400", bg: "bg-purple-50", Icon: Calendar },
  new_ai_match:              { border: "border-green-400",  bg: "bg-green-50",  Icon: CheckCircle },
  story_reaction:            { border: "border-rose-400",   bg: "bg-rose-50",   Icon: Heart },
  story_comment:             { border: "border-purple-400", bg: "bg-purple-50", Icon: MessageCircle },
};

const STORY_TYPES = new Set<NotificationType>(["story_reaction", "story_comment"]);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NotificationBell() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch unread count silently (used by the poller)
  const fetchUnreadCount = useCallback(async () => {
    try {
      const { data } = await apiClient.get<{ count: number }>(
        "/notifications/unread-count"
      );
      setUnreadCount(data.count);
    } catch {
      // silently ignore — user may not be logged in yet
    }
  }, []);

  // Fetch full notification list (used when opening the dropdown)
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<{
        notifications: Notification[];
        unread_count: number;
      }>("/notifications/");
      setNotifications(data.notifications.slice(0, 15));
      setUnreadCount(data.unread_count);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll unread count every 30 s
  useEffect(() => {
    fetchUnreadCount();
    const id = setInterval(fetchUnreadCount, 30_000);
    return () => clearInterval(id);
  }, [fetchUnreadCount]);

  // Load notifications when dropdown opens
  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  async function handleMarkRead(notif: Notification) {
    if (!notif.is_read) {
      try {
        await apiClient.patch(`/notifications/${notif._id}/read`);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        // ignore
      }
    }
    if (STORY_TYPES.has(notif.type)) {
      setOpen(false);
      navigate("/community");
    }
  }

  async function handleMarkAllRead() {
    try {
      await apiClient.patch("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  }

  const badgeLabel = unreadCount > 9 ? "9+" : String(unreadCount);

  return (
    <div ref={containerRef} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-full p-2 hover:bg-gray-100 transition-colors focus:outline-none"
        aria-label="Notifications"
      >
        <Bell size={22} className="text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4.5 h-4.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none">
            {badgeLabel}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-gray-800 text-sm">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 text-xs font-normal text-gray-400">
                  {unreadCount} unread
                </span>
              )}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
                <Bell size={36} className="opacity-30" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const style = TYPE_STYLE[notif.type] ?? TYPE_STYLE.application_received;
                const { Icon } = style;
                return (
                  <button
                    key={notif._id}
                    onClick={() => handleMarkRead(notif)}
                    className={`w-full text-left flex gap-3 px-4 py-3 border-l-4 ${style.border} transition-colors hover:bg-gray-50 ${
                      !notif.is_read ? "bg-indigo-50" : "bg-white"
                    }`}
                  >
                    <div
                      className={`mt-0.5 shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${style.bg}`}
                    >
                      <Icon size={14} className="text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 leading-snug truncate">
                        {notif.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-snug line-clamp-2">
                        {notif.message}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {relativeTime(notif.created_at)}
                      </p>
                    </div>
                    {!notif.is_read && (
                      <span className="mt-1.5 shrink-0 w-2 h-2 rounded-full bg-indigo-500" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
