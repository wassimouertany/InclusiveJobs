import { API_BASE_URL } from "../config/api";

/** Public URL for recruiter company logo (GridFS). */
export function jobOfferCompanyLogoUrl(logoId?: string | null): string | null {
  if (!logoId?.trim()) return null;
  return `${API_BASE_URL}/job-offers/company-logo/${encodeURIComponent(logoId.trim())}`;
}
