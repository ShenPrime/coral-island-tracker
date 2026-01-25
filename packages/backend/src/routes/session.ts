/**
 * Session Routes
 *
 * Handles session creation and validation.
 * These endpoints are public (no session required).
 */

import { Hono } from "hono";
import { createSession, getSession } from "../middleware/session";
import { strictRateLimit } from "../middleware/rateLimit";

const session = new Hono();

/**
 * POST /api/session
 * Create a new session
 * Rate limited to prevent abuse
 */
session.post("/", strictRateLimit, async (c) => {
  try {
    const newSession = await createSession();
    
    return c.json({
      id: newSession.id,
      created_at: newSession.created_at,
      message: "Session created successfully",
    }, 201);
  } catch (error) {
    console.error("Failed to create session:", error);
    return c.json({ error: "Failed to create session" }, 500);
  }
});

/**
 * GET /api/session
 * Validate an existing session
 * Requires X-Session-ID header
 */
session.get("/", async (c) => {
  const sessionId = c.req.header("X-Session-ID");

  if (!sessionId) {
    return c.json({ error: "Missing X-Session-ID header" }, 401);
  }

  try {
    const existingSession = await getSession(sessionId);

    if (!existingSession) {
      return c.json({ error: "Invalid or expired session" }, 401);
    }

    return c.json({
      id: existingSession.id,
      created_at: existingSession.created_at,
      last_seen_at: existingSession.last_seen_at,
      valid: true,
    });
  } catch (error) {
    console.error("Failed to validate session:", error);
    return c.json({ error: "Failed to validate session" }, 500);
  }
});

export default session;
