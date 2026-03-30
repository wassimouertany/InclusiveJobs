export const AUTH_TOKEN_KEY = "inclusivejobs_access_token";
export const AUTH_ROLE_KEY = "inclusivejobs_role";
export const AUTH_USER_ID_KEY = "inclusivejobs_user_id";

export function getStoredToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function getAuthHeaders(): HeadersInit {
  const token = getStoredToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}
