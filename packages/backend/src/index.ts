import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { serveStatic } from "hono/bun";
import { checkConnection, closeConnection } from "./db";
import categoriesRouter from "./routes/categories";
import itemsRouter from "./routes/items";
import savesRouter from "./routes/saves";
import progressRouter from "./routes/progress";
import templeRouter from "./routes/temple";
import sessionRouter from "./routes/session";
import npcsRouter from "./routes/npcs";
import { rateLimit } from "./middleware/rateLimit";
import { cleanupStaleSessions } from "./middleware/session";
import path from "path";

const app = new Hono();

// Path to frontend build directory
const frontendDist = path.join(import.meta.dir, "../../frontend/dist");

// Build ID for version checking - Railway provides RAILWAY_DEPLOYMENT_ID automatically
const BUILD_ID = process.env.RAILWAY_DEPLOYMENT_ID || process.env.BUILD_ID || "dev";

// Middleware
app.use("*", logger());

// Add build ID to all responses for client version checking
app.use("*", async (c, next) => {
  await next();
  c.header("X-Build-ID", BUILD_ID);
});

// Secure headers (XSS protection, clickjacking prevention, etc.)
app.use("*", secureHeaders());

// Rate limiting - apply to all API routes
app.use("/api/*", rateLimit);

// CORS - allow origins from env var, or allow all if not set
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || ["*"];

app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return null;
      if (allowedOrigins.includes("*")) return origin;
      if (allowedOrigins.includes(origin)) return origin;
      return null;
    },
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Session-ID"],
    exposeHeaders: ["X-Build-ID"],
  })
);

// Health check (public, no auth required)
app.get("/health", async (c) => {
  const dbConnected = await checkConnection();
  return c.json({
    status: dbConnected ? "healthy" : "unhealthy",
    database: dbConnected ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
// Public routes (no session required)
app.route("/api/session", sessionRouter);
app.route("/api/categories", categoriesRouter);
app.route("/api/items", itemsRouter);

// Protected routes (session required - handled by middleware in each router)
app.route("/api/saves", savesRouter);
app.route("/api/progress", progressRouter);
app.route("/api/temple", templeRouter);
app.route("/api/npcs", npcsRouter);

// Serve frontend static files
app.use("/*", serveStatic({ root: frontendDist }));

// SPA fallback - serve index.html for client-side routing
app.get("*", async (c) => {
  // If it's an API route that wasn't matched, return 404
  if (c.req.path.startsWith("/api/")) {
    return c.json({ error: "not_found", message: "Endpoint not found", success: false }, 404);
  }
  // Otherwise serve index.html for SPA routing
  const indexPath = path.join(frontendDist, "index.html");
  const file = Bun.file(indexPath);
  if (await file.exists()) {
    return c.html(await file.text());
  }
  return c.json({ error: "not_found", message: "Frontend not built", success: false }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error("Server error:", err);
  return c.json(
    { error: "server_error", message: err.message || "Internal server error", success: false },
    500
  );
});

const port = Number(process.env.PORT) || 3001;

// Session cleanup: run once on startup, then every 24 hours
const CLEANUP_INTERVAL = 30 * 24 * 60 * 60 * 1000;
const cleanupTimer = setInterval(async () => {
  try {
    const deleted = await cleanupStaleSessions();
    if (deleted > 0) console.log(`Session cleanup: removed ${deleted} stale sessions`);
  } catch (e) {
    console.error("Session cleanup failed:", e);
  }
}, CLEANUP_INTERVAL);

// Run initial cleanup
cleanupStaleSessions().catch(() => {});

// Graceful shutdown
function shutdown() {
  console.log("\nShutting down...");
  clearInterval(cleanupTimer);
  closeConnection().then(() => process.exit(0)).catch(() => process.exit(1));
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

console.log(`
  Coral Island Tracker
  ====================
  Server running at http://localhost:${port}
  Frontend served from: ${frontendDist}
  Rate limiting: 500 requests/minute per session
`);

export default {
  port,
  fetch: app.fetch,
};
