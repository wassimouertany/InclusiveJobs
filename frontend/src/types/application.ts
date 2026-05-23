export type ApplicationStatus =
  | "submitted"
  | "under_review"
  | "interview_scheduled"
  | "accepted"
  | "rejected";

export type NotificationType =
  | "application_received"
  | "application_status_changed"
  | "interview_scheduled"
  | "new_ai_match"
  | "story_reaction"
  | "story_comment";

export interface Application {
  _id: string;
  offer_id: string;
  candidate_id: string;
  recruiter_id: string;
  status: ApplicationStatus;
  cover_letter: string;
  interview_date?: string | null;
  interview_location?: string;
  interview_notes?: string;
  created_at: string;
  updated_at: string;
  // enriched fields
  offer_title?: string;
  company_name?: string;
  candidate?: Record<string, any>;
}

export interface Notification {
  _id: string;
  user_id: string;
  user_role: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  related_offer_id?: string | null;
  related_application_id?: string | null;
  created_at: string;
}

export const STATUS_CONFIG: Record<
  ApplicationStatus,
  { label: string; color: string; icon: string }
> = {
  submitted:           { label: "Submitted",           color: "blue",   icon: "Clock" },
  under_review:        { label: "Under Review",        color: "yellow", icon: "Search" },
  interview_scheduled: { label: "Interview Scheduled", color: "purple", icon: "Calendar" },
  accepted:            { label: "Accepted",            color: "green",  icon: "CheckCircle" },
  rejected:            { label: "Rejected",            color: "red",    icon: "XCircle" },
};
