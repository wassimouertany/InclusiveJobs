// Auth token, role, and user id are persisted with useAuthStore (zustand/persist).
// The Bearer token is applied on API requests by the axios instance in
// src/services/apiClient.ts (request interceptor). The former getStoredToken /
// getAuthHeaders helpers were removed in favor of that store + client.

export {
  AUTH_TOKEN_KEY,
  AUTH_ROLE_KEY,
  AUTH_USER_ID_KEY,
  useAuthStore,
} from "../store/authStore";
