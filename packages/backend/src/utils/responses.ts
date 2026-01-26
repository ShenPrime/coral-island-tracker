import type { Context } from "hono";

/**
 * Standard error response helpers for consistent API responses.
 */
export const errorResponse = {
  notFound: (c: Context, resource = "Resource") =>
    c.json({ error: "not_found", message: `${resource} not found`, success: false }, 404),

  badRequest: (c: Context, message: string) =>
    c.json({ error: "bad_request", message, success: false }, 400),

  validationError: (c: Context, message: string) =>
    c.json({ error: "validation_error", message, success: false }, 400),

  serverError: (c: Context, message = "Internal server error") =>
    c.json({ error: "server_error", message, success: false }, 500),

  unauthorized: (c: Context, message = "Unauthorized") =>
    c.json({ error: "unauthorized", message, success: false }, 401),
};

/**
 * Standard success response helper.
 */
export function successResponse<T>(c: Context, data: T, extra?: Record<string, unknown>) {
  return c.json({ data, success: true, ...extra });
}
