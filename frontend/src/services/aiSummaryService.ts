// aiSummaryService.ts
//
// POST /ai/jobs/{jobId}/summary?lang=xx through the shared apiClient (which
// attaches the Bearer token). The endpoint requires a JWT — guests must not
// reach it.
//
// There is no react-query/SWR in this app, so the three things such a library
// would give us are hand-rolled here:
//   1. an in-memory cache keyed (jobId, lang) — reopening the drawer refetches
//      nothing;
//   2. an in-flight promise map — React StrictMode mounts effects twice in
//      dev, and the backend rate-limits at 20 requests/hour/user, so a double
//      effect must never become a second HTTP call;
//   3. AbortController support, so closing the drawer cancels a pending call.
//
// The backend answers errors as {"detail": "...", "code": "..."}. Only `code`
// is ever consumed: the raw `detail` string is never rendered, since it is
// server-authored English prose and may carry internal wording.

import { apiClient } from "./apiClient";
import { Language } from "../types";

export type JobSummaryContent = {
  main_missions: string[];
  key_skills: string[];
  accommodations: string[];
};

export type JobSummaryResponse = {
  job_id: string;
  lang: string;
  cached: boolean;
  model: string;
  prompt_version: string;
  generated_at: string;
  summary: JobSummaryContent;
};

export const SUMMARY_ERROR_CODES = [
  "INVALID_JOB_ID",
  "INVALID_LANG",
  "JOB_NOT_FOUND",
  "JOB_NOT_AVAILABLE",
  "RATE_LIMITED",
  "SUMMARY_UNAVAILABLE",
  "NETWORK",
] as const;

export type SummaryErrorCode = (typeof SUMMARY_ERROR_CODES)[number];

export class SummaryError extends Error {
  readonly code: SummaryErrorCode;

  constructor(code: SummaryErrorCode) {
    super(code);
    this.name = "SummaryError";
    this.code = code;
  }
}

/** Status → code fallback, used only when the body carries no `code`. */
const CODE_BY_STATUS: Record<number, SummaryErrorCode> = {
  400: "INVALID_JOB_ID",
  404: "JOB_NOT_FOUND",
  409: "JOB_NOT_AVAILABLE",
  429: "RATE_LIMITED",
  503: "SUMMARY_UNAVAILABLE",
};

function isSummaryErrorCode(value: unknown): value is SummaryErrorCode {
  return (
    typeof value === "string" &&
    (SUMMARY_ERROR_CODES as readonly string[]).includes(value)
  );
}

/**
 * Read the backend's machine-readable error code out of an axios error.
 * Falls back to the HTTP status, then to NETWORK. Never reads `detail`.
 */
export function readErrorCode(error: unknown): SummaryErrorCode {
  const response = (error as { response?: { status?: number; data?: unknown } })
    ?.response;
  const data = response?.data;
  if (data !== null && typeof data === "object" && !Array.isArray(data)) {
    const code = (data as { code?: unknown }).code;
    if (isSummaryErrorCode(code)) return code;
  }
  const status = response?.status;
  if (typeof status === "number" && CODE_BY_STATUS[status]) {
    return CODE_BY_STATUS[status];
  }
  return "NETWORK";
}

/** True for a request we cancelled ourselves — callers should stay silent. */
export function isAbortError(error: unknown): boolean {
  const name = (error as { name?: string })?.name;
  const code = (error as { code?: string })?.code;
  return name === "CanceledError" || name === "AbortError" || code === "ERR_CANCELED";
}

const cache = new Map<string, JobSummaryResponse>();
const inFlight = new Map<string, Promise<JobSummaryResponse>>();

function cacheKey(jobId: string, lang: Language): string {
  return `${jobId}::${lang}`;
}

/** Synchronous cache probe — lets a caller render instantly with no request. */
export function getCachedSummary(
  jobId: string,
  lang: Language,
): JobSummaryResponse | undefined {
  return cache.get(cacheKey(jobId, lang));
}

/** Test/reset helper. Not used by the UI. */
export function clearSummaryCache(): void {
  cache.clear();
  inFlight.clear();
}

/**
 * Fetch (or replay from cache) the summary for one job in one language.
 * Throws SummaryError with a typed code on failure; rethrows abort errors
 * unchanged so callers can tell a cancel from a failure via isAbortError.
 */
export async function fetchJobSummary(
  jobId: string,
  lang: Language,
  signal?: AbortSignal,
): Promise<JobSummaryResponse> {
  const key = cacheKey(jobId, lang);

  const cached = cache.get(key);
  if (cached) return cached;

  const pending = inFlight.get(key);
  if (pending) return pending;

  const request = apiClient
    .post<JobSummaryResponse>(
      `/ai/jobs/${encodeURIComponent(jobId)}/summary`,
      null,
      { params: { lang }, signal },
    )
    .then((response) => {
      cache.set(key, response.data);
      return response.data;
    })
    .catch((error) => {
      if (isAbortError(error)) throw error;
      throw new SummaryError(readErrorCode(error));
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, request);
  return request;
}
