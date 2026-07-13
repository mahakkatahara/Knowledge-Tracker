// Central API client. Every backend router is mounted under /api on the server,
// so the base already includes it. Override with VITE_API_BASE if you host the
// backend elsewhere.
export const API_BASE =
  (import.meta.env && import.meta.env.VITE_API_BASE) ||
  "https://knowledge-tracker-a7d6.onrender.com/api";

/** Read the logged-in user's JWT from localStorage (set by AuthContext.login). */
export const getToken = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    return user && user.token ? user.token : null;
  } catch {
    return null;
  }
};

const authHeaders = (extra = {}) => {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
};

/**
 * Thin fetch wrapper: prefixes API_BASE, attaches auth headers, throws on
 * non-2xx with the backend's `detail` message, and returns parsed JSON
 * (or null for 204 No Content).
 */
export async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: authHeaders(options.headers),
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      /* non-JSON error body */
    }
    const err = new Error(detail || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }

  if (res.status === 204) return null;
  return res.json();
}
