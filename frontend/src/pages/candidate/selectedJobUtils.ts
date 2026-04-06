import type { AiOfferMatch, JobOfferListItem } from "./apiTypes";
import type { SelectedJob } from "./types";
import { normalizeJobSkillTags } from "./shared";

export function selectedJobFromOffer(
  job: JobOfferListItem,
  extra?: Partial<
    Pick<SelectedJob, "match" | "aiExplanation" | "aiStrengths">
  >
): SelectedJob {
  const companyLine =
    job.company_name?.trim() ||
    job.profile_title?.trim() ||
    "InclusiveJobs partner";
  return {
    offerId: job._id,
    title: job.title ?? "Job",
    company: companyLine,
    location: job.recruiter_location?.trim() || "—",
    workingConditions: job.working_conditions?.trim(),
    description: job.description,
    contractType: job.contract_type,
    keySkills: normalizeJobSkillTags(job.key_skills, job.required_skills),
    possibleAccommodations: job.possible_accommodations,
    ...extra,
  };
}

export function selectedJobFromAiMatch(
  m: AiOfferMatch,
  offer?: JobOfferListItem
): SelectedJob {
  const score = Math.round(
    typeof m.ai_score === "number" ? m.ai_score : m.vector_score ?? 0
  );
  if (offer) {
    return selectedJobFromOffer(offer, {
      match: score,
      aiExplanation: m.explanation,
      aiStrengths: m.strengths,
    });
  }
  return {
    offerId: m.offer_id,
    title: m.title ?? "Job",
    company: "—",
    location: "—",
    match: score,
    aiExplanation: m.explanation,
    aiStrengths: m.strengths,
  };
}
