/**
 * Session Management
 *
 * Handles anonymous session authentication.
 * Sessions are stored in localStorage and persist across page reloads.
 */

const SESSION_KEY = "coral-tracker-session";
const API_BASE = import.meta.env.VITE_API_URL || "";

interface Session {
  id: string;
  created_at: string;
  last_seen_at?: string;
}

interface SessionResponse {
  id: string;
  created_at: string;
  last_seen_at?: string;
  valid?: boolean;
  message?: string;
}

/**
 * Get session ID from localStorage
 */
export function getSessionId(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    // localStorage might be unavailable (e.g., private browsing)
    return null;
  }
}

/**
 * Store session ID in localStorage
 */
function setSessionId(sessionId: string): void {
  try {
    localStorage.setItem(SESSION_KEY, sessionId);
  } catch {
    // Silently fail if localStorage is unavailable
    console.warn("Could not save session to localStorage");
  }
}

/**
 * Clear session from localStorage
 */
export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // Silently fail
  }
}

/**
 * Create a new session on the server
 */
async function createSession(): Promise<string> {
  const response = await fetch(`${API_BASE}/api/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to create session");
  }

  const data: SessionResponse = await response.json();
  return data.id;
}

/**
 * Validate an existing session
 */
async function validateSession(sessionId: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/session`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Session-ID": sessionId,
      },
    });

    if (!response.ok) {
      return false;
    }

    const data: SessionResponse = await response.json();
    return data.valid === true;
  } catch {
    return false;
  }
}

/**
 * Initialize session
 *
 * 1. Check localStorage for existing session ID
 * 2. If exists, validate it with the server
 * 3. If invalid or missing, create a new session
 * 4. Store the session ID in localStorage
 *
 * @returns The session ID
 */
export async function initSession(): Promise<string> {
  // Check for existing session
  let sessionId = getSessionId();

  if (sessionId) {
    // Validate existing session
    const isValid = await validateSession(sessionId);
    if (isValid) {
      return sessionId;
    }
    // Invalid session, clear it
    clearSession();
  }

  // Create new session
  sessionId = await createSession();
  setSessionId(sessionId);

  return sessionId;
}

/**
 * Get session info (for debugging/display)
 */
export async function getSessionInfo(): Promise<Session | null> {
  const sessionId = getSessionId();
  if (!sessionId) return null;

  try {
    const response = await fetch(`${API_BASE}/api/session`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Session-ID": sessionId,
      },
    });

    if (!response.ok) return null;

    return await response.json();
  } catch {
    return null;
  }
}
