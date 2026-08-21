import axios from "axios";
import { API_BASE_URL } from "../config/api";
import { useAuthStore } from "../store/authStore";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// No brutal redirect on an expired/invalid token: flag it on the auth store
// instead. SessionExpiredScreen (mounted in App.tsx) reacts to that flag and
// shows an explicit "your session ended, sign back in" screen — never yanks
// the user out of a form mid-keystroke. Only fires for a request that was
// actually authenticated (had a token) — a 401 on a public/guest request
// (e.g. a bad login attempt) is not a session expiry.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const hadToken = Boolean(useAuthStore.getState().token);
    if (status === 401 && hadToken) {
      useAuthStore.getState().markSessionExpired();
    }
    return Promise.reject(error);
  }
);
