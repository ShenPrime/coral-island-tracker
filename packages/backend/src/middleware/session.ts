/**
 * Session Authentication Middleware
 *
 * Validates the X-Session-ID header and attaches session info to context.
 * Returns 401 if session is missing or invalid.
 */

import { Context, Next } from "hono";
import { createMiddleware } from "hono/factory";
import { sql } from "../db";

// Session type for context
export interface Session {
  id: string;
  created_at: Date;
  last_seen_at: Date;
}

// Extend Hono's context variables
declare module "hono" {
  interface ContextVariableMap {
    session: Session;
  }
}

/**
 * Middleware that requires a valid session
 * Use this for protected routes (saves, progress, temple)
 */
export const requireSession = createMiddleware(async (c: Context, next: Next) => {
  const sessionId = c.req.header("X-Session-ID");

  if (!sessionId) {
    return c.json({ error: "unauthorized", message: "Missing X-Session-ID header", success: false }, 401);
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(sessionId)) {
    return c.json({ error: "unauthorized", message: "Invalid session ID format", success: false }, 401);
  }

  try {
    // Look up session and update last_seen_at
    const sessions = await sql`
      UPDATE sessions
      SET last_seen_at = NOW()
      WHERE id = ${sessionId}
      RETURNING id, created_at, last_seen_at
    `;

    if (sessions.length === 0) {
      return c.json({ error: "unauthorized", message: "Invalid or expired session", success: false }, 401);
    }

    // Attach session to context
    c.set("session", sessions[0] as Session);

    await next();
  } catch (error) {
    console.error("Session validation error:", error);
    return c.json({ error: "server_error", message: "Session validation failed", success: false }, 500);
  }
});

/**
 * Optional session middleware - doesn't require session but attaches if present
 * Use this for routes that work with or without auth (like public data)
 */
export const optionalSession = createMiddleware(async (c: Context, next: Next) => {
  const sessionId = c.req.header("X-Session-ID");

  if (sessionId) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (uuidRegex.test(sessionId)) {
      try {
        const sessions = await sql`
          UPDATE sessions 
          SET last_seen_at = NOW() 
          WHERE id = ${sessionId}
          RETURNING id, created_at, last_seen_at
        `;

        if (sessions.length > 0) {
          c.set("session", sessions[0] as Session);
        }
      } catch (error) {
        // Silently ignore errors for optional session
        console.error("Optional session error:", error);
      }
    }
  }

  await next();
});

/**
 * Create a new session
 */
export async function createSession(): Promise<Session> {
  const sessions = await sql`
    INSERT INTO sessions DEFAULT VALUES
    RETURNING id, created_at, last_seen_at
  `;
  return sessions[0] as Session;
}

/**
 * Delete sessions not seen in the last 90 days
 */
export async function cleanupStaleSessions(): Promise<number> {
  try {
    const result = await sql`
      DELETE FROM sessions
      WHERE last_seen_at < NOW() - INTERVAL '6 months'
    `;
    return result.count;
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 15_000));
    const result = await sql`
      DELETE FROM sessions
      WHERE last_seen_at < NOW() - INTERVAL '6 months'
    `;
    return result.count;
  }
}

/**
 * Get session by ID (for validation endpoint)
 */
export async function getSession(sessionId: string): Promise<Session | null> {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(sessionId)) {
    return null;
  }

  const sessions = await sql`
    SELECT id, created_at, last_seen_at 
    FROM sessions 
    WHERE id = ${sessionId}
  `;
  
  return sessions.length > 0 ? (sessions[0] as Session) : null;
}
