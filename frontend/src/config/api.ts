/** Base URL for the FastAPI backend (no trailing slash). */
export const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000";
