import { Hono } from "hono";
import { sql } from "../db";
import { requireSession } from "../middleware/session";
import { withParsedMetadata } from "../utils/parseMetadata";
import { verifySaveOwnership } from "../utils/ownership";
import { errorResponse, successResponse } from "../utils/responses";
import type { UpdateProgressRequest, BulkUpdateProgressRequest } from "@coral-tracker/shared";

const app = new Hono();

// Apply session middleware to all routes
app.use("*", requireSession);

// GET /api/progress/:saveId - Get all progress for a save slot
app.get("/:saveId", async (c) => {
  const session = c.get("session");
  const saveId = Number(c.req.param("saveId"));
  const category = c.req.query("category");

  // Verify ownership
  if (!(await verifySaveOwnership(saveId, session.id))) {
    return errorResponse.notFound(c, "Save slot");
  }

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

  return successResponse(c, progress);
});

// GET /api/progress/:saveId/items - Get items with progress status for a save slot
app.get("/:saveId/items", async (c) => {
  const session = c.get("session");
  const saveId = Number(c.req.param("saveId"));
  const category = c.req.query("category");
  const completed = c.req.query("completed"); // "true", "false", or undefined for all

  // Verify ownership
  if (!(await verifySaveOwnership(saveId, session.id))) {
    return errorResponse.notFound(c, "Save slot");
  }

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

  return successResponse(c, withParsedMetadata(items));
});

// PUT /api/progress/:saveId/:itemId - Update single item progress
app.put("/:saveId/:itemId", async (c) => {
  const session = c.get("session");
  const saveId = Number(c.req.param("saveId"));
  const itemId = Number(c.req.param("itemId"));
  const body = await c.req.json<UpdateProgressRequest>();

  // Verify ownership
  if (!(await verifySaveOwnership(saveId, session.id))) {
    return errorResponse.notFound(c, "Save slot");
  }

  // Check if item exists
  const itemExists = await sql`SELECT id FROM items WHERE id = ${itemId}`;
  if (itemExists.length === 0) {
    return errorResponse.notFound(c, "Item");
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

  return successResponse(c, result[0]);
});

// POST /api/progress/:saveId/bulk - Bulk update progress
app.post("/:saveId/bulk", async (c) => {
  const session = c.get("session");
  const saveId = Number(c.req.param("saveId"));
  const body = await c.req.json<BulkUpdateProgressRequest>();

  if (!body.updates || body.updates.length === 0) {
    return errorResponse.validationError(c, "Updates array is required");
  }

  // Verify ownership
  if (!(await verifySaveOwnership(saveId, session.id))) {
    return errorResponse.notFound(c, "Save slot");
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

  return successResponse(c, results);
});

export default app;
