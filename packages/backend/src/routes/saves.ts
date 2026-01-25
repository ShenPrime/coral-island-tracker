import { Hono } from "hono";
import { sql } from "../db";
import { requireSession } from "../middleware/session";
import type { SaveSlot, CreateSaveSlotRequest, CategoryStats } from "@coral-tracker/shared";

const app = new Hono();

// Apply session middleware to all routes
app.use("*", requireSession);

// GET /api/saves - List all save slots for this session
app.get("/", async (c) => {
  const session = c.get("session");

  const saves = await sql`
    SELECT 
      s.*,
      COUNT(DISTINCT p.item_id) FILTER (WHERE p.completed = true)::int as completed_count,
      (SELECT COUNT(*)::int FROM items) as total_items
    FROM save_slots s
    LEFT JOIN progress p ON p.save_slot_id = s.id
    WHERE s.session_id = ${session.id}
    GROUP BY s.id
    ORDER BY s.updated_at DESC
  `;

  const savesWithStats = saves.map((save) => ({
    ...save,
    stats: {
      total_items: save.total_items,
      completed_items: save.completed_count,
      completion_percentage:
        save.total_items > 0
          ? Math.round((save.completed_count / save.total_items) * 100)
          : 0,
    },
  }));

  return c.json({ data: savesWithStats, success: true });
});

// POST /api/saves - Create new save slot for this session
app.post("/", async (c) => {
  const session = c.get("session");
  const body = await c.req.json<CreateSaveSlotRequest>();

  if (!body.name || body.name.trim().length === 0) {
    return c.json(
      { error: "validation_error", message: "Name is required", success: false },
      400
    );
  }

  const result = await sql`
    INSERT INTO save_slots (name, session_id)
    VALUES (${body.name.trim()}, ${session.id})
    RETURNING *
  `;

  return c.json({ data: result[0], success: true }, 201);
});

// GET /api/saves/:id - Get save slot with full progress (only if owned by session)
app.get("/:id", async (c) => {
  const session = c.get("session");
  const id = Number(c.req.param("id"));

  // Get save slot (only if belongs to this session)
  const saveResult = await sql`
    SELECT * FROM save_slots WHERE id = ${id} AND session_id = ${session.id}
  `;

  if (saveResult.length === 0) {
    return c.json({ error: "not_found", message: "Save slot not found", success: false }, 404);
  }

  const save = saveResult[0];

  // Get category stats
  const categoryStats = await sql<CategoryStats[]>`
    SELECT 
      c.id as category_id,
      c.name as category_name,
      c.slug as category_slug,
      COUNT(i.id)::int as total,
      COUNT(p.id) FILTER (WHERE p.completed = true)::int as completed,
      CASE 
        WHEN COUNT(i.id) > 0 
        THEN ROUND((COUNT(p.id) FILTER (WHERE p.completed = true)::float / COUNT(i.id)::float) * 100)
        ELSE 0 
      END::int as percentage
    FROM categories c
    LEFT JOIN items i ON i.category_id = c.id
    LEFT JOIN progress p ON p.item_id = i.id AND p.save_slot_id = ${id}
    GROUP BY c.id
    ORDER BY c.display_order ASC
  `;

  // Calculate overall stats
  const totalItems = categoryStats.reduce((sum, cat) => sum + cat.total, 0);
  const completedItems = categoryStats.reduce((sum, cat) => sum + cat.completed, 0);

  return c.json({
    data: {
      ...save,
      stats: {
        total_items: totalItems,
        completed_items: completedItems,
        completion_percentage: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
        by_category: categoryStats,
      },
    },
    success: true,
  });
});

// DELETE /api/saves/:id - Delete save slot (only if owned by session)
app.delete("/:id", async (c) => {
  const session = c.get("session");
  const id = Number(c.req.param("id"));

  const result = await sql`
    DELETE FROM save_slots WHERE id = ${id} AND session_id = ${session.id} RETURNING id
  `;

  if (result.length === 0) {
    return c.json({ error: "not_found", message: "Save slot not found", success: false }, 404);
  }

  return c.json({ data: { id }, success: true });
});

// PATCH /api/saves/:id - Update save slot name (only if owned by session)
app.patch("/:id", async (c) => {
  const session = c.get("session");
  const id = Number(c.req.param("id"));
  const body = await c.req.json<{ name: string }>();

  if (!body.name || body.name.trim().length === 0) {
    return c.json(
      { error: "validation_error", message: "Name is required", success: false },
      400
    );
  }

  const result = await sql`
    UPDATE save_slots 
    SET name = ${body.name.trim()}, updated_at = NOW()
    WHERE id = ${id} AND session_id = ${session.id}
    RETURNING *
  `;

  if (result.length === 0) {
    return c.json({ error: "not_found", message: "Save slot not found", success: false }, 404);
  }

  return c.json({ data: result[0], success: true });
});

export default app;
