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

const app = new Hono();

// Middleware
app.use("*", logger());

// CORS - allow all origins in production (frontend served from same origin)
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(",") 
  : ["http://localhost:5173", "http://localhost:3000"];

app.use(
  "*",
  cors({
    origin: (origin) => {
      // Allow requests with no origin (same-origin, server-side, etc.)
      if (!origin) return null;
      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
        return origin;
      }
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

// Serve static frontend files in production
if (process.env.NODE_ENV === "production") {
  // Serve static assets
  app.use("/*", serveStatic({ root: "./public" }));
  
  // SPA fallback - serve index.html for non-API routes
  app.get("*", serveStatic({ path: "./public/index.html" }));
}

// 404 handler for API routes
app.notFound((c) => {
  // If it's an API request, return JSON error
  if (c.req.path.startsWith("/api")) {
    return c.json({ error: "not_found", message: "Endpoint not found", success: false }, 404);
  }
  // For non-API routes in production, this shouldn't be reached due to SPA fallback
  return c.json({ error: "not_found", message: "Endpoint not found", success: false }, 404);
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
  Coral Island Tracker API
  ========================
  Server running at http://localhost:${port}
  
  Endpoints:
    GET  /health                    - Health check
    GET  /api/categories            - List categories
    GET  /api/items                 - List items (with filters)
    GET  /api/saves                 - List save slots
    POST /api/saves                 - Create save slot
    GET  /api/progress/:id          - Get progress for save slot
    PUT  /api/progress/:s/:i        - Update item progress
    GET  /api/temple/altars         - Temple overview with altars
    GET  /api/temple/altars/:slug   - Altar detail with offerings
    PUT  /api/temple/progress/:id   - Update temple item offered status
    GET  /api/temple/item/:itemId   - Check if item is temple requirement
`);

export default {
  port,
  fetch: app.fetch,
};
