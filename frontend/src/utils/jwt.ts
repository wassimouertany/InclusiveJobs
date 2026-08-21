// jwt.ts
//
// Client-side JWT payload reader — decode only, no signature verification
// (the backend already verifies every request; this is purely so the UI can
// warn "your session expires soon" before that happens). No dependency
// added on purpose: a JWT payload is just base64url JSON.

export type JwtPayload = {
  exp?: number; // seconds since epoch (see backend/core-service/auth.py)
  email?: string;
  role?: string;
  [key: string]: unknown;
};

function base64UrlToBase64(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (base64.length % 4)) % 4;
  return base64 + "=".repeat(padLength);
}

/** Returns the decoded payload, or null if the token is missing/malformed —
 * never throws. */
export function decodeJwtPayload(token: string | null | undefined): JwtPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const json = atob(base64UrlToBase64(parts[1]));
    // Handle UTF-8 payloads (accented names, etc.) correctly.
    const decoded = decodeURIComponent(
      Array.from(json)
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed === "object") return parsed as JwtPayload;
    return null;
  } catch {
    return null;
  }
}

/** Milliseconds-since-epoch the token expires at, or null if unreadable. */
export function getTokenExpiryMs(token: string | null | undefined): number | null {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") return null;
  return payload.exp * 1000;
}
