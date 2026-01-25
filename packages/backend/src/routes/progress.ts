import { Hono } from "hono";
import { sql } from "../db";
import type { UpdateProgressRequest, BulkUpdateProgressRequest } from "@coral-tracker/shared";

const app = new Hono();

// GET /api/progress/:saveId - Get all progress for a save slot
app.get("/:saveId", async (c) => {
  const saveId = Number(c.req.param("saveId"));
  const category = c.req.query("category");

  let progress;
  if (category) {
    progress = await sql`
      SELECT 
        p.*,
        i.name as item_name,
        i.slug as item_slug,
        i.image_url,
        i.rarity,
        i.seasons,
        i.time_of_day,
        i.weather,
        i.locations,
        c.name as category_name,
        c.slug as category_slug
      FROM progress p
      JOIN items i ON i.id = p.item_id
      JOIN categories c ON c.id = i.category_id
      WHERE p.save_slot_id = ${saveId}
      AND c.slug = ${category}
      ORDER BY i.name ASC
    `;
  } else {
    progress = await sql`
      SELECT 
        p.*,
        i.name as item_name,
        i.slug as item_slug,
        i.image_url,
        i.rarity,
        i.seasons,
        i.time_of_day,
        i.weather,
        i.locations,
        c.name as category_name,
        c.slug as category_slug
      FROM progress p
      JOIN items i ON i.id = p.item_id
      JOIN categories c ON c.id = i.category_id
      WHERE p.save_slot_id = ${saveId}
      ORDER BY c.display_order ASC, i.name ASC
    `;
  }

  return c.json({ data: progress, success: true });
});

// GET /api/progress/:saveId/items - Get items with progress status for a save slot
app.get("/:saveId/items", async (c) => {
  const saveId = Number(c.req.param("saveId"));
  const category = c.req.query("category");
  const completed = c.req.query("completed"); // "true", "false", or undefined for all

  let items;
  if (category) {
    items = await sql`
      SELECT 
        i.*,
        c.name as category_name,
        c.slug as category_slug,
        COALESCE(p.completed, false) as completed,
        p.completed_at,
        p.notes
      FROM items i
      JOIN categories c ON c.id = i.category_id
      LEFT JOIN progress p ON p.item_id = i.id AND p.save_slot_id = ${saveId}
      WHERE c.slug = ${category}
      ${completed === "true" ? sql`AND p.completed = true` : sql``}
      ${completed === "false" ? sql`AND (p.completed = false OR p.completed IS NULL)` : sql``}
      ORDER BY i.name ASC
    `;
  } else {
    items = await sql`
      SELECT 
        i.*,
        c.name as category_name,
        c.slug as category_slug,
        COALESCE(p.completed, false) as completed,
        p.completed_at,
        p.notes
      FROM items i
      JOIN categories c ON c.id = i.category_id
      LEFT JOIN progress p ON p.item_id = i.id AND p.save_slot_id = ${saveId}
      WHERE 1=1
      ${completed === "true" ? sql`AND p.completed = true` : sql``}
      ${completed === "false" ? sql`AND (p.completed = false OR p.completed IS NULL)` : sql``}
      ORDER BY c.display_order ASC, i.name ASC
    `;
  }

  return c.json({ data: items, success: true });
});

// PUT /api/progress/:saveId/:itemId - Update single item progress
app.put("/:saveId/:itemId", async (c) => {
  const saveId = Number(c.req.param("saveId"));
  const itemId = Number(c.req.param("itemId"));
  const body = await c.req.json<UpdateProgressRequest>();

  // Check if save slot exists
  const saveExists = await sql`SELECT id FROM save_slots WHERE id = ${saveId}`;
  if (saveExists.length === 0) {
    return c.json({ error: "not_found", message: "Save slot not found", success: false }, 404);
  }

  // Check if item exists
  const itemExists = await sql`SELECT id FROM items WHERE id = ${itemId}`;
  if (itemExists.length === 0) {
    return c.json({ error: "not_found", message: "Item not found", success: false }, 404);
  }

  // Upsert progress
  const completedAt = body.completed ? new Date() : null;
  const notes = body.notes ?? null;
  
  const result = await sql`
    INSERT INTO progress (save_slot_id, item_id, completed, completed_at, notes)
    VALUES (${saveId}, ${itemId}, ${body.completed}, ${completedAt}, ${notes})
    ON CONFLICT (save_slot_id, item_id) 
    DO UPDATE SET 
      completed = ${body.completed},
      completed_at = ${completedAt},
      notes = COALESCE(${notes}, progress.notes),
      updated_at = NOW()
    RETURNING *
  `;

  // Update save slot's updated_at
  await sql`UPDATE save_slots SET updated_at = NOW() WHERE id = ${saveId}`;

  return c.json({ data: result[0], success: true });
});

// POST /api/progress/:saveId/bulk - Bulk update progress
app.post("/:saveId/bulk", async (c) => {
  const saveId = Number(c.req.param("saveId"));
  const body = await c.req.json<BulkUpdateProgressRequest>();

  if (!body.updates || body.updates.length === 0) {
    return c.json(
      { error: "validation_error", message: "Updates array is required", success: false },
      400
    );
  }

  // Check if save slot exists
  const saveExists = await sql`SELECT id FROM save_slots WHERE id = ${saveId}`;
  if (saveExists.length === 0) {
    return c.json({ error: "not_found", message: "Save slot not found", success: false }, 404);
  }

  // Perform bulk upsert
  const results = [];
  for (const update of body.updates) {
    const completedAt = update.completed ? new Date() : null;
    const notes = update.notes ?? null;
    
    const result = await sql`
      INSERT INTO progress (save_slot_id, item_id, completed, completed_at, notes)
      VALUES (${saveId}, ${update.item_id}, ${update.completed}, ${completedAt}, ${notes})
      ON CONFLICT (save_slot_id, item_id) 
      DO UPDATE SET 
        completed = ${update.completed},
        completed_at = ${completedAt},
        notes = COALESCE(${notes}, progress.notes),
        updated_at = NOW()
      RETURNING *
    `;
    results.push(result[0]);
  }

  // Update save slot's updated_at
  await sql`UPDATE save_slots SET updated_at = NOW() WHERE id = ${saveId}`;

  return c.json({ data: results, success: true });
});

export default app;
