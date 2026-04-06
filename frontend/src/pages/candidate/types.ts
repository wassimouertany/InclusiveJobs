/** Candidate document from GET /users/candidates/me (password stripped). */
export type CandidateProfile = {
  _id: string;
  role?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  birth_date?: string;
  phone_number?: string;
  address?: string;
  industry?: string;
  gender?: string;
  years_of_experience?: number;
  education_level?: string;
  /** May be an array or a JSON string from the API. */
  work_accommodations?: string[] | string;
  profile_title?: string;
  /** May be an array or a JSON string from the API. */
  key_skills?: string[] | string;
  disability_type?: string;
  accessibility_needs?: string;
  work_preference?: string;
  availability_status?: string;
  logo_id?: string | null;
  disability_card_id?: string | null;
  resume_id?: string | null;
  created_at?: string;
};

/** Set via JobCard actions on Find Jobs / Home; drives `CandidateJobDetail`. */
export type SelectedJob = {
  offerId: string;
  title: string;
  company: string;
  /** Recruiter / company office location (MapPin). */
  location: string;
  /** Remote policy, schedule, tools, etc. */
  workingConditions?: string;
  /** AI score 0–100 when known (recommendations); omitted for browse-only. */
  match?: number;
  description?: string;
  contractType?: string;
  keySkills?: string[];
  possibleAccommodations?: string;
  aiExplanation?: string;
  aiStrengths?: string[];
};
