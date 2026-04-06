/** GET /ai/matches/for-candidate */
export type AiOfferMatch = {
  offer_id: string;
  title: string;
  vector_score: number;
  ai_score: number;
  explanation: string;
  strengths?: string[];
  concerns?: string[];
};

export type AiMatchesForCandidateResponse = {
  candidate_id: string;
  matches: AiOfferMatch[];
};

/**
 * GET /job-offers/ — public open offers (MongoDB documents, aligned with
 * backend `JobOfferDB` in models.py).
 *
 * UI mapping:
 * - `title` — job title (heading)
 * - `profile_title` — company / team line under the title (recruiter “profile” label)
 * - `recruiter_location` — city / office location (from recruiter profile; joined on list endpoints)
 * - `working_conditions` — work arrangement (remote policy, hours, etc.; free text)
 * - `contract_type` — employment type badge (`ContractType` enum, e.g. permanent → CDI)
 * - `key_skills` — tag chips (skills & accessibility keywords entered by recruiter)
 * - `required_skills` — optional extra skills list from the form
 * - `description` — role description column
 * - `possible_accommodations` — accessibility amenities (often one string; split on newlines / `;` in UI)
 * - Match % / “High Match” — not stored on the offer; use `GET /ai/matches/for-candidate` (`offer_id`, `ai_score`)
 */
export type JobOfferListItem = {
  _id: string;
  title: string;
  description?: string;
  profile_title?: string;
  /** From recruiter document (joined on list endpoints). */
  company_name?: string;
  company_logo_id?: string | null;
  recruiter_location?: string;
  contract_type?: string;
  working_conditions?: string;
  key_skills?: string[];
  required_skills?: string[];
  possible_accommodations?: string;
  status?: string;
  recruiter_id?: string;
  created_at?: string;
};
