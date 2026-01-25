import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serveStatic } from "hono/bun";
import { checkConnection } from "./db";
import categoriesRouter from "./routes/categories";
import itemsRouter from "./routes/items";
import savesRouter from "./routes/saves";
import progressRouter from "./routes/progress";
import templeRouter from "./routes/temple";
import path from "path";

const app = new Hono();

// Path to frontend build directory
const frontendDist = path.join(import.meta.dir, "../../frontend/dist");

// Middleware
app.use("*", logger());

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
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// Health check
app.get("/health", async (c) => {
  const dbConnected = await checkConnection();
  return c.json({
    status: dbConnected ? "healthy" : "unhealthy",
    database: dbConnected ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.route("/api/categories", categoriesRouter);
app.route("/api/items", itemsRouter);
app.route("/api/saves", savesRouter);
app.route("/api/progress", progressRouter);
app.route("/api/temple", templeRouter);

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

console.log(`
  Coral Island Tracker
  ====================
  Server running at http://localhost:${port}
  Frontend served from: ${frontendDist}
`);

export default {
  port,
  fetch: app.fetch,
};
