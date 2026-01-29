import { Hono } from "hono";
import { sql } from "../db";
import { requireSession } from "../middleware/session";
import { ensureParsedMetadata } from "../utils/parseMetadata";
import { verifySaveOwnership } from "../utils/ownership";
import { errorResponse, successResponse } from "../utils/responses";
import type { UpdateNPCProgressRequest, RelationshipStatus } from "@coral-tracker/shared";

const app = new Hono();

// Apply session middleware to all routes
app.use("*", requireSession);

/**
 * Calculate max hearts for an NPC based on relationship status and marriage candidate flag
 */
function getMaxHearts(isMarriageCandidate: boolean, relationshipStatus: RelationshipStatus): number {
  if (isMarriageCandidate && relationshipStatus === "married") {
    return 14; // Married marriage candidates have 14 hearts
  }
  return 10; // All others have 10 hearts max
}

// GET /api/npcs/:saveId - Get all NPCs with progress for a save slot
app.get("/:saveId", async (c) => {
  const session = c.get("session");
  const saveId = Number(c.req.param("saveId"));

  // Verify ownership
  if (!(await verifySaveOwnership(saveId, session.id))) {
    return errorResponse.notFound(c, "Save slot");
  }

  // Get all NPCs (from items table where category is 'npcs') with progress
  const npcs = await sql`
    SELECT 
      i.id,
      i.name,
      i.slug,
      i.image_url,
      i.description,
      i.seasons,
      i.locations,
      i.metadata,
      c.name as category_name,
      c.slug as category_slug,
      COALESCE(np.hearts, 0) as hearts,
      COALESCE(np.relationship_status, 'default') as relationship_status,
      np.notes,
      np.updated_at as progress_updated_at
    FROM items i
    JOIN categories c ON c.id = i.category_id
    LEFT JOIN npc_progress np ON np.item_id = i.id AND np.save_slot_id = ${saveId}
    WHERE c.slug = 'npcs'
    ORDER BY i.name ASC
  `;

  // Add computed max_hearts to each NPC
  const npcsWithMaxHearts = npcs.map((npc) => {
    const metadata = ensureParsedMetadata(npc.metadata);
    const isMarriageCandidate = Boolean(metadata?.is_marriage_candidate);
    const maxHearts = getMaxHearts(isMarriageCandidate, npc.relationship_status as RelationshipStatus);
    
    return {
      ...npc,
      metadata,
      max_hearts: maxHearts,
      is_max_hearts: npc.hearts >= maxHearts,
    };
  });

  return successResponse(c, npcsWithMaxHearts);
});

// GET /api/npcs/:saveId/stats - Get NPC completion stats for a save slot
app.get("/:saveId/stats", async (c) => {
  const session = c.get("session");
  const saveId = Number(c.req.param("saveId"));

  // Verify ownership
  if (!(await verifySaveOwnership(saveId, session.id))) {
    return errorResponse.notFound(c, "Save slot");
  }

  // Get NPC stats
  const stats = await sql`
    WITH npc_data AS (
      SELECT 
        i.id,
        i.metadata,
        COALESCE(np.hearts, 0) as hearts,
        COALESCE(np.relationship_status, 'default') as relationship_status
      FROM items i
      JOIN categories c ON c.id = i.category_id
      LEFT JOIN npc_progress np ON np.item_id = i.id AND np.save_slot_id = ${saveId}
      WHERE c.slug = 'npcs'
    )
    SELECT 
      COUNT(*)::int as total_npcs,
      COUNT(CASE WHEN hearts > 0 THEN 1 END)::int as npcs_with_progress,
      COUNT(CASE WHEN hearts >= 10 THEN 1 END)::int as npcs_max_hearts,
      COUNT(CASE WHEN relationship_status = 'dating' THEN 1 END)::int as dating_count,
      COUNT(CASE WHEN relationship_status = 'married' THEN 1 END)::int as married_count,
      SUM(hearts)::int as total_hearts
    FROM npc_data
  `;

  // Get marriage candidate stats separately
  const marriageStats = await sql`
    WITH marriage_data AS (
      SELECT 
        i.id,
        i.metadata,
        COALESCE(np.hearts, 0) as hearts,
        COALESCE(np.relationship_status, 'default') as relationship_status
      FROM items i
      JOIN categories c ON c.id = i.category_id
      LEFT JOIN npc_progress np ON np.item_id = i.id AND np.save_slot_id = ${saveId}
      WHERE c.slug = 'npcs'
      AND i.metadata->>'is_marriage_candidate' = 'true'
    )
    SELECT 
      COUNT(*)::int as total_marriage_candidates,
      COUNT(CASE WHEN hearts >= 8 THEN 1 END)::int as datable_count,
      COUNT(CASE WHEN hearts >= 10 THEN 1 END)::int as marriageable_count
    FROM marriage_data
  `;

  return successResponse(c, {
    ...stats[0],
    ...marriageStats[0],
  });
});

// PUT /api/npcs/:saveId/:itemId - Update NPC progress (hearts, relationship status)
app.put("/:saveId/:itemId", async (c) => {
  const session = c.get("session");
  const saveId = Number(c.req.param("saveId"));
  const itemId = Number(c.req.param("itemId"));
  const body = await c.req.json<UpdateNPCProgressRequest>();

  // Verify ownership
  if (!(await verifySaveOwnership(saveId, session.id))) {
    return errorResponse.notFound(c, "Save slot");
  }

  // Check if item exists and is an NPC
  const item = await sql`
    SELECT i.id, i.metadata, c.slug as category_slug
    FROM items i
    JOIN categories c ON c.id = i.category_id
    WHERE i.id = ${itemId}
  `;
  
  if (item.length === 0) {
    return errorResponse.notFound(c, "Item");
  }
  
  if (item[0]!.category_slug !== "npcs") {
    return errorResponse.validationError(c, "Item is not an NPC");
  }

  // Get metadata to validate hearts
  const metadata = ensureParsedMetadata(item[0]!.metadata);
  const isMarriageCandidate = Boolean(metadata?.is_marriage_candidate);

  // Get current progress to determine relationship status
  const currentProgress = await sql`
    SELECT hearts, relationship_status FROM npc_progress 
    WHERE save_slot_id = ${saveId} AND item_id = ${itemId}
  `;
  
  const currentStatus = (currentProgress[0]?.relationship_status || "default") as RelationshipStatus;
  const newStatus = body.relationship_status ?? currentStatus;
  
  // Calculate max hearts based on relationship status
  const maxHearts = getMaxHearts(isMarriageCandidate, newStatus);

  // Validate hearts if provided
  let hearts = body.hearts;
  if (hearts !== undefined) {
    if (hearts < 0) hearts = 0;
    if (hearts > maxHearts) hearts = maxHearts;
  }

  // Validate relationship status changes
  if (body.relationship_status) {
    // Can only set dating/married status for marriage candidates
    if ((body.relationship_status === "dating" || body.relationship_status === "married") && !isMarriageCandidate) {
      return errorResponse.validationError(c, "Can only date or marry marriage candidates");
    }
    
    // Dating requires 8+ hearts
    if (body.relationship_status === "dating") {
      const currentHearts = hearts ?? currentProgress[0]?.hearts ?? 0;
      if (currentHearts < 8) {
        return errorResponse.validationError(c, "Need at least 8 hearts to start dating");
      }
    }
    
    // Marriage requires 10+ hearts
    if (body.relationship_status === "married") {
      const currentHearts = hearts ?? currentProgress[0]?.hearts ?? 0;
      if (currentHearts < 10) {
        return errorResponse.validationError(c, "Need at least 10 hearts to marry");
      }
    }
  }

  // Build update query dynamically based on provided fields
  const notes = body.notes ?? null;
  const heartsValue = hearts ?? 0;
  
  const result = await sql.begin(async (tx) => {
    const rows = await tx`
      INSERT INTO npc_progress (save_slot_id, item_id, hearts, relationship_status, notes)
      VALUES (
        ${saveId},
        ${itemId},
        ${heartsValue},
        ${newStatus},
        ${notes}
      )
      ON CONFLICT (save_slot_id, item_id)
      DO UPDATE SET
        hearts = ${hearts !== undefined ? heartsValue : sql`npc_progress.hearts`},
        relationship_status = ${newStatus},
        notes = COALESCE(${notes}, npc_progress.notes),
        updated_at = NOW()
      RETURNING *
    `;
    await tx`UPDATE save_slots SET updated_at = NOW() WHERE id = ${saveId}`;
    return rows;
  });

  const updatedMaxHearts = getMaxHearts(isMarriageCandidate, result[0]!.relationship_status as RelationshipStatus);
  
  return successResponse(c, {
    ...result[0],
    max_hearts: updatedMaxHearts,
    is_max_hearts: result[0]!.hearts >= updatedMaxHearts,
  });
});

// POST /api/npcs/:saveId/:itemId/increment - Quick increment hearts by 1
app.post("/:saveId/:itemId/increment", async (c) => {
  const session = c.get("session");
  const saveId = Number(c.req.param("saveId"));
  const itemId = Number(c.req.param("itemId"));

  // Verify ownership
  if (!(await verifySaveOwnership(saveId, session.id))) {
    return errorResponse.notFound(c, "Save slot");
  }

  // Get item metadata
  const item = await sql`
    SELECT i.id, i.metadata, c.slug as category_slug
    FROM items i
    JOIN categories c ON c.id = i.category_id
    WHERE i.id = ${itemId} AND c.slug = 'npcs'
  `;
  
  if (item.length === 0) {
    return errorResponse.notFound(c, "NPC");
  }

  const metadata = ensureParsedMetadata(item[0]!.metadata);
  const isMarriageCandidate = Boolean(metadata?.is_marriage_candidate);

  // Get current progress
  const current = await sql`
    SELECT hearts, relationship_status FROM npc_progress 
    WHERE save_slot_id = ${saveId} AND item_id = ${itemId}
  `;
  
  const currentHearts = current[0]?.hearts ?? 0;
  const currentStatus = (current[0]?.relationship_status ?? "default") as RelationshipStatus;
  const maxHearts = getMaxHearts(isMarriageCandidate, currentStatus);
  
  // Don't exceed max hearts
  const newHearts = Math.min(currentHearts + 1, maxHearts);

  const result = await sql.begin(async (tx) => {
    const rows = await tx`
      INSERT INTO npc_progress (save_slot_id, item_id, hearts, relationship_status)
      VALUES (${saveId}, ${itemId}, ${newHearts}, ${currentStatus})
      ON CONFLICT (save_slot_id, item_id)
      DO UPDATE SET
        hearts = ${newHearts},
        updated_at = NOW()
      RETURNING *
    `;
    await tx`UPDATE save_slots SET updated_at = NOW() WHERE id = ${saveId}`;
    return rows;
  });

  return successResponse(c, {
    ...result[0],
    max_hearts: maxHearts,
    is_max_hearts: newHearts >= maxHearts,
  });
});

// POST /api/npcs/:saveId/:itemId/decrement - Quick decrement hearts by 1
app.post("/:saveId/:itemId/decrement", async (c) => {
  const session = c.get("session");
  const saveId = Number(c.req.param("saveId"));
  const itemId = Number(c.req.param("itemId"));

  // Verify ownership
  if (!(await verifySaveOwnership(saveId, session.id))) {
    return errorResponse.notFound(c, "Save slot");
  }

  // Get item metadata
  const item = await sql`
    SELECT i.id, i.metadata, c.slug as category_slug
    FROM items i
    JOIN categories c ON c.id = i.category_id
    WHERE i.id = ${itemId} AND c.slug = 'npcs'
  `;
  
  if (item.length === 0) {
    return errorResponse.notFound(c, "NPC");
  }

  const metadata = ensureParsedMetadata(item[0]!.metadata);
  const isMarriageCandidate = Boolean(metadata?.is_marriage_candidate);

  // Get current progress
  const current = await sql`
    SELECT hearts, relationship_status FROM npc_progress 
    WHERE save_slot_id = ${saveId} AND item_id = ${itemId}
  `;
  
  const currentHearts = current[0]?.hearts ?? 0;
  const currentStatus = (current[0]?.relationship_status ?? "default") as RelationshipStatus;
  const maxHearts = getMaxHearts(isMarriageCandidate, currentStatus);
  
  // Don't go below 0
  const newHearts = Math.max(currentHearts - 1, 0);

  const result = await sql.begin(async (tx) => {
    const rows = await tx`
      INSERT INTO npc_progress (save_slot_id, item_id, hearts, relationship_status)
      VALUES (${saveId}, ${itemId}, ${newHearts}, ${currentStatus})
      ON CONFLICT (save_slot_id, item_id)
      DO UPDATE SET
        hearts = ${newHearts},
        updated_at = NOW()
      RETURNING *
    `;
    await tx`UPDATE save_slots SET updated_at = NOW() WHERE id = ${saveId}`;
    return rows;
  });

  return successResponse(c, {
    ...result[0],
    max_hearts: maxHearts,
    is_max_hearts: newHearts >= maxHearts,
  });
});

export default app;
