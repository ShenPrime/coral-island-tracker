import { Hono } from "hono";
import { sql } from "../db";
import type {
  AltarSummary,
  AltarWithOfferings,
  OfferingWithItems,
  TempleItemWithProgress,
  TempleOverview,
  ItemTempleStatus,
} from "@coral-tracker/shared";

const templeRouter = new Hono();

/**
 * GET /api/temple/altars
 * Get temple overview with all altars and their progress
 */
templeRouter.get("/altars", async (c) => {
  const saveId = c.req.query("saveId");

  if (!saveId) {
    return c.json({ error: "bad_request", message: "saveId is required", success: false }, 400);
  }

  try {
    // Get altar summaries with progress
    const altarData = await sql`
      WITH altar_stats AS (
        SELECT 
          tr.altar_slug,
          tr.altar_name,
          COUNT(DISTINCT tr.id) as total_items,
          COUNT(DISTINCT CASE WHEN tp.offered = true THEN tr.id END) as offered_items,
          COUNT(DISTINCT tr.offering_slug) as total_offerings
        FROM temple_requirements tr
        LEFT JOIN temple_progress tp ON tp.temple_requirement_id = tr.id 
          AND tp.save_slot_id = ${saveId}
        GROUP BY tr.altar_slug, tr.altar_name
      ),
      offering_completion AS (
        SELECT 
          tr.altar_slug,
          tr.offering_slug,
          COUNT(tr.id) as total,
          COUNT(CASE WHEN tp.offered = true THEN 1 END) as offered
        FROM temple_requirements tr
        LEFT JOIN temple_progress tp ON tp.temple_requirement_id = tr.id 
          AND tp.save_slot_id = ${saveId}
        GROUP BY tr.altar_slug, tr.offering_slug
      ),
      completed_offerings AS (
        SELECT 
          altar_slug,
          COUNT(*) as completed
        FROM offering_completion
        WHERE total = offered
        GROUP BY altar_slug
      )
      SELECT 
        a.altar_slug as slug,
        a.altar_name as name,
        a.total_items::int,
        a.offered_items::int,
        a.total_offerings::int,
        COALESCE(co.completed, 0)::int as completed_offerings
      FROM altar_stats a
      LEFT JOIN completed_offerings co ON co.altar_slug = a.altar_slug
      ORDER BY 
        CASE a.altar_slug 
          WHEN 'crop-altar' THEN 1
          WHEN 'catch-altar' THEN 2
          WHEN 'advanced-altar' THEN 3
          WHEN 'rare-altar' THEN 4
        END
    `;

    const altars: AltarSummary[] = altarData.map((row) => ({
      slug: row.slug,
      name: row.name,
      total_items: row.total_items,
      offered_items: row.offered_items,
      total_offerings: row.total_offerings,
      completed_offerings: row.completed_offerings,
    }));

    // Calculate totals
    const totals = altars.reduce(
      (acc, altar) => ({
        total_items: acc.total_items + altar.total_items,
        offered_items: acc.offered_items + altar.offered_items,
        total_offerings: acc.total_offerings + altar.total_offerings,
        completed_offerings: acc.completed_offerings + altar.completed_offerings,
      }),
      { total_items: 0, offered_items: 0, total_offerings: 0, completed_offerings: 0 }
    );

    const overview: TempleOverview = {
      altars,
      ...totals,
    };

    return c.json({ data: overview, success: true });
  } catch (error) {
    console.error("Error fetching temple overview:", error);
    return c.json({ error: "server_error", message: "Failed to fetch temple data", success: false }, 500);
  }
});

/**
 * GET /api/temple/altars/:altarSlug
 * Get detailed altar data with offerings and items
 */
templeRouter.get("/altars/:altarSlug", async (c) => {
  const { altarSlug } = c.req.param();
  const saveId = c.req.query("saveId");

  if (!saveId) {
    return c.json({ error: "bad_request", message: "saveId is required", success: false }, 400);
  }

  try {
    // Get all requirements for this altar with progress and linked item data
    const requirements = await sql`
      SELECT 
        tr.id,
        tr.altar_slug,
        tr.altar_name,
        tr.offering_slug,
        tr.offering_name,
        tr.offering_image_url,
        tr.reward,
        tr.item_name,
        tr.item_id,
        tr.quantity,
        tr.quality,
        tr.note,
        tr.display_order,
        COALESCE(tp.offered, false) as offered,
        tp.offered_at,
        -- Linked item details
        i.name as linked_item_name,
        i.slug as linked_item_slug,
        i.image_url as linked_item_image,
        i.rarity as linked_item_rarity,
        i.seasons as linked_item_seasons,
        i.time_of_day as linked_item_time,
        i.weather as linked_item_weather,
        i.locations as linked_item_locations,
        i.base_price as linked_item_price,
        i.description as linked_item_description,
        i.metadata as linked_item_metadata
      FROM temple_requirements tr
      LEFT JOIN temple_progress tp ON tp.temple_requirement_id = tr.id 
        AND tp.save_slot_id = ${saveId}
      LEFT JOIN items i ON i.id = tr.item_id
      WHERE tr.altar_slug = ${altarSlug}
      ORDER BY tr.offering_slug, tr.display_order
    `;

    if (requirements.length === 0) {
      return c.json({ error: "not_found", message: "Altar not found", success: false }, 404);
    }

    // Group by offering
    const offeringsMap = new Map<string, OfferingWithItems>();

    for (const row of requirements) {
      if (!offeringsMap.has(row.offering_slug)) {
        offeringsMap.set(row.offering_slug, {
          slug: row.offering_slug,
          name: row.offering_name,
          image_url: row.offering_image_url,
          reward: row.reward,
          items: [],
          total_items: 0,
          offered_items: 0,
          is_complete: false,
        });
      }

      const offering = offeringsMap.get(row.offering_slug)!;
      
      const templeItem: TempleItemWithProgress = {
        id: row.id,
        altar_slug: row.altar_slug,
        altar_name: row.altar_name,
        offering_slug: row.offering_slug,
        offering_name: row.offering_name,
        offering_image_url: row.offering_image_url,
        reward: row.reward,
        item_name: row.item_name,
        item_id: row.item_id,
        quantity: row.quantity,
        quality: row.quality,
        note: row.note,
        display_order: row.display_order,
        offered: row.offered,
        offered_at: row.offered_at,
        linked_item: row.item_id ? {
          id: row.item_id,
          category_id: 0, // Not needed for display
          name: row.linked_item_name,
          slug: row.linked_item_slug,
          image_url: row.linked_item_image,
          rarity: row.linked_item_rarity,
          seasons: row.linked_item_seasons || [],
          time_of_day: row.linked_item_time || [],
          weather: row.linked_item_weather || [],
          locations: row.linked_item_locations || [],
          base_price: row.linked_item_price,
          description: row.linked_item_description,
          metadata: row.linked_item_metadata || {},
        } : null,
      };

      offering.items.push(templeItem);
      offering.total_items++;
      if (row.offered) {
        offering.offered_items++;
      }
    }

    // Calculate completion status for each offering
    const offerings = Array.from(offeringsMap.values()).map((offering) => ({
      ...offering,
      is_complete: offering.offered_items === offering.total_items,
    }));

    // Sort offerings by typical order (based on first item's display order logic)
    offerings.sort((a, b) => {
      const orderMap: Record<string, number> = {
        // Crop Altar
        "essential-resources": 1,
        "spring-sesajen": 2,
        "summer-sesajen": 3,
        "fall-sesajen": 4,
        "winter-sesajen": 5,
        "ocean-scavengables": 6,
        // Catch Altar
        "fresh-water-fish": 1,
        "salt-water-fish": 2,
        "rare-fish": 3,
        "day-insect": 4,
        "night-insect": 5,
        "ocean-critters": 6,
        // Advanced Altar
        "barn-animals": 1,
        "coop-animals": 2,
        "basic-cooking": 3,
        "basic-artisan": 4,
        "fruit-plant": 5,
        "monster-drop": 6,
        // Rare Altar
        "rare-crops": 1,
        "greenhouse-crops": 2,
        "advanced-cooking": 3,
        "master-artisan": 4,
        "rare-animal-products": 5,
        "kelp-essence": 6,
      };
      return (orderMap[a.slug] || 99) - (orderMap[b.slug] || 99);
    });

    const altar: AltarWithOfferings = {
      slug: altarSlug,
      name: requirements[0].altar_name,
      offerings,
      total_items: offerings.reduce((sum, o) => sum + o.total_items, 0),
      offered_items: offerings.reduce((sum, o) => sum + o.offered_items, 0),
      total_offerings: offerings.length,
      completed_offerings: offerings.filter((o) => o.is_complete).length,
    };

    return c.json({ data: altar, success: true });
  } catch (error) {
    console.error("Error fetching altar:", error);
    return c.json({ error: "server_error", message: "Failed to fetch altar data", success: false }, 500);
  }
});

/**
 * PUT /api/temple/progress/:requirementId
 * Update temple progress (offered status)
 */
templeRouter.put("/progress/:requirementId", async (c) => {
  const { requirementId } = c.req.param();
  const saveId = c.req.query("saveId");
  const body = await c.req.json();

  if (!saveId) {
    return c.json({ error: "bad_request", message: "saveId is required", success: false }, 400);
  }

  const { offered } = body;

  if (typeof offered !== "boolean") {
    return c.json({ error: "bad_request", message: "offered must be a boolean", success: false }, 400);
  }

  try {
    // Upsert progress
    await sql`
      INSERT INTO temple_progress (save_slot_id, temple_requirement_id, offered, offered_at)
      VALUES (${saveId}, ${requirementId}, ${offered}, ${offered ? new Date() : null})
      ON CONFLICT (save_slot_id, temple_requirement_id)
      DO UPDATE SET 
        offered = ${offered},
        offered_at = ${offered ? new Date() : null}
    `;

    return c.json({ data: { offered }, success: true });
  } catch (error) {
    console.error("Error updating temple progress:", error);
    return c.json({ error: "server_error", message: "Failed to update progress", success: false }, 500);
  }
});

/**
 * GET /api/temple/item/:itemId
 * Check if an item is required for temple offerings
 */
templeRouter.get("/item/:itemId", async (c) => {
  const { itemId } = c.req.param();
  const saveId = c.req.query("saveId");

  if (!saveId) {
    return c.json({ error: "bad_request", message: "saveId is required", success: false }, 400);
  }

  try {
    const requirements = await sql`
      SELECT 
        tr.id as requirement_id,
        tr.altar_name,
        tr.offering_name,
        tr.quantity,
        tr.quality,
        COALESCE(tp.offered, false) as offered
      FROM temple_requirements tr
      LEFT JOIN temple_progress tp ON tp.temple_requirement_id = tr.id 
        AND tp.save_slot_id = ${saveId}
      WHERE tr.item_id = ${itemId}
    `;

    const status: ItemTempleStatus = {
      is_temple_requirement: requirements.length > 0,
      requirements: requirements.map((r) => ({
        requirement_id: r.requirement_id,
        altar_name: r.altar_name,
        offering_name: r.offering_name,
        quantity: r.quantity,
        quality: r.quality,
        offered: r.offered,
      })),
    };

    return c.json({ data: status, success: true });
  } catch (error) {
    console.error("Error checking item temple status:", error);
    return c.json({ error: "server_error", message: "Failed to check temple status", success: false }, 500);
  }
});

/**
 * GET /api/temple/items-status
 * Batch check multiple items for temple requirement status
 */
templeRouter.get("/items-status", async (c) => {
  const saveId = c.req.query("saveId");
  const itemIds = c.req.query("itemIds");

  if (!saveId) {
    return c.json({ error: "bad_request", message: "saveId is required", success: false }, 400);
  }

  if (!itemIds) {
    return c.json({ error: "bad_request", message: "itemIds is required", success: false }, 400);
  }

  try {
    const ids = itemIds.split(",").map(Number).filter(Boolean);
    
    if (ids.length === 0) {
      return c.json({ data: {}, success: true });
    }

    const requirements = await sql`
      SELECT 
        tr.item_id,
        tr.id as requirement_id,
        tr.altar_name,
        tr.offering_name,
        tr.quantity,
        tr.quality,
        COALESCE(tp.offered, false) as offered
      FROM temple_requirements tr
      LEFT JOIN temple_progress tp ON tp.temple_requirement_id = tr.id 
        AND tp.save_slot_id = ${saveId}
      WHERE tr.item_id = ANY(${ids})
    `;

    // Group by item_id
    const statusMap: Record<number, ItemTempleStatus> = {};
    
    for (const r of requirements) {
      if (!statusMap[r.item_id]) {
        statusMap[r.item_id] = {
          is_temple_requirement: true,
          requirements: [],
        };
      }
      statusMap[r.item_id].requirements.push({
        requirement_id: r.requirement_id,
        altar_name: r.altar_name,
        offering_name: r.offering_name,
        quantity: r.quantity,
        quality: r.quality,
        offered: r.offered,
      });
    }

    return c.json({ data: statusMap, success: true });
  } catch (error) {
    console.error("Error checking items temple status:", error);
    return c.json({ error: "server_error", message: "Failed to check temple status", success: false }, 500);
  }
});

export default templeRouter;
