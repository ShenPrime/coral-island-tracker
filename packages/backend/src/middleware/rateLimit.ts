/**
 * Rate Limiting Middleware
 *
 * Simple in-memory rate limiter using sliding window.
 * Limits requests per session to prevent API abuse.
 */

import { Context, Next } from "hono";
import { createMiddleware } from "hono/factory";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store for rate limits (per session)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Configuration
const WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS = 500; // 500 requests per minute per session

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Rate limiting middleware
 * Uses X-Session-ID header as the key, falls back to IP if no session
 */
export const rateLimit = createMiddleware(async (c: Context, next: Next) => {
  // Use session ID if available, otherwise use IP
  const sessionId = c.req.header("X-Session-ID");
  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || 
             c.req.header("x-real-ip") || 
             "unknown";
  
  const key = sessionId || `ip:${ip}`;
  const now = Date.now();

  // Get or create rate limit entry
  let entry = rateLimitStore.get(key);
  
  if (!entry || entry.resetAt < now) {
    // Create new window
    entry = {
      count: 0,
      resetAt: now + WINDOW_MS,
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);

  // Set rate limit headers
  const remaining = Math.max(0, MAX_REQUESTS - entry.count);
  const resetInSeconds = Math.ceil((entry.resetAt - now) / 1000);
  
  c.header("X-RateLimit-Limit", MAX_REQUESTS.toString());
  c.header("X-RateLimit-Remaining", remaining.toString());
  c.header("X-RateLimit-Reset", resetInSeconds.toString());

  // Check if over limit
  if (entry.count > MAX_REQUESTS) {
    c.header("Retry-After", resetInSeconds.toString());
    return c.json(
      {
        error: "too_many_requests",
        message: `Rate limit exceeded. Please wait ${resetInSeconds} seconds.`,
        retryAfter: resetInSeconds,
        success: false,
      },
      429
    );
  }

  await next();
});

/**
 * Stricter rate limit for specific endpoints (e.g., session creation)
 * 10 requests per minute
 */
export const strictRateLimit = createMiddleware(async (c: Context, next: Next) => {
  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || 
             c.req.header("x-real-ip") || 
             "unknown";
  
  const key = `strict:${ip}`;
  const now = Date.now();
  const strictMax = 10;
  const strictWindow = 60 * 1000; // 1 minute

  let entry = rateLimitStore.get(key);
  
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: now + strictWindow,
    };
  }

  entry.count++;
  rateLimitStore.set(key, entry);

  const remaining = Math.max(0, strictMax - entry.count);
  const resetInSeconds = Math.ceil((entry.resetAt - now) / 1000);
  
  c.header("X-RateLimit-Limit", strictMax.toString());
  c.header("X-RateLimit-Remaining", remaining.toString());
  c.header("X-RateLimit-Reset", resetInSeconds.toString());

  if (entry.count > strictMax) {
    c.header("Retry-After", resetInSeconds.toString());
    return c.json(
      {
        error: "too_many_requests",
        message: `Rate limit exceeded. Please wait ${resetInSeconds} seconds.`,
        retryAfter: resetInSeconds,
        success: false,
      },
      429
    );
  }

  await next();
});
