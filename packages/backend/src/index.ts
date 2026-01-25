import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { checkConnection } from "./db";
import categoriesRouter from "./routes/categories";
import itemsRouter from "./routes/items";
import savesRouter from "./routes/saves";
import progressRouter from "./routes/progress";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
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

// 404 handler
app.notFound((c) => {
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
    GET  /health              - Health check
    GET  /api/categories      - List categories
    GET  /api/items           - List items (with filters)
    GET  /api/saves           - List save slots
    POST /api/saves           - Create save slot
    GET  /api/progress/:id    - Get progress for save slot
    PUT  /api/progress/:s/:i  - Update item progress
`);

export default {
  port,
  fetch: app.fetch,
};
