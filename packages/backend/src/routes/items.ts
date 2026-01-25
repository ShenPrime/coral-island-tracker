import { Hono } from "hono";
import { sql } from "../db";
import type { Item, ItemsQueryParams, Season, TimeOfDay, Weather, Rarity } from "@coral-tracker/shared";

const app = new Hono();

// GET /api/items - List items with filtering
app.get("/", async (c) => {
  const query = c.req.query() as ItemsQueryParams;
  const {
    category,
    season,
    time_of_day,
    weather,
    rarity,
    search,
    limit = 100,
    offset = 0,
  } = query;

  // Build dynamic query with conditions
  // Note: Empty arrays mean "any" (always available), so we use:
  // cardinality(array) = 0 OR value = ANY(array)
  let items;

  if (category) {
    items = await sql`
      SELECT i.*, c.name as category_name, c.slug as category_slug
      FROM items i
      JOIN categories c ON c.id = i.category_id
      WHERE c.slug = ${category}
      ${season ? sql`AND (cardinality(i.seasons) = 0 OR ${season} = ANY(i.seasons))` : sql``}
      ${time_of_day ? sql`AND (cardinality(i.time_of_day) = 0 OR ${time_of_day} = ANY(i.time_of_day))` : sql``}
      ${weather ? sql`AND (cardinality(i.weather) = 0 OR ${weather} = ANY(i.weather))` : sql``}
      ${rarity ? sql`AND i.rarity = ${rarity}` : sql``}
      ${search ? sql`AND i.name ILIKE ${"%" + search + "%"}` : sql``}
      ORDER BY i.name ASC
      LIMIT ${Number(limit)}
      OFFSET ${Number(offset)}
    `;
  } else {
    items = await sql`
      SELECT i.*, c.name as category_name, c.slug as category_slug
      FROM items i
      JOIN categories c ON c.id = i.category_id
      WHERE 1=1
      ${season ? sql`AND (cardinality(i.seasons) = 0 OR ${season} = ANY(i.seasons))` : sql``}
      ${time_of_day ? sql`AND (cardinality(i.time_of_day) = 0 OR ${time_of_day} = ANY(i.time_of_day))` : sql``}
      ${weather ? sql`AND (cardinality(i.weather) = 0 OR ${weather} = ANY(i.weather))` : sql``}
      ${rarity ? sql`AND i.rarity = ${rarity}` : sql``}
      ${search ? sql`AND i.name ILIKE ${"%" + search + "%"}` : sql``}
      ORDER BY c.display_order ASC, i.name ASC
      LIMIT ${Number(limit)}
      OFFSET ${Number(offset)}
    `;
  }

  // Get total count for pagination
  const countResult = await sql`
    SELECT COUNT(*)::int as total
    FROM items i
    JOIN categories c ON c.id = i.category_id
    WHERE 1=1
    ${category ? sql`AND c.slug = ${category}` : sql``}
    ${season ? sql`AND (cardinality(i.seasons) = 0 OR ${season} = ANY(i.seasons))` : sql``}
    ${time_of_day ? sql`AND (cardinality(i.time_of_day) = 0 OR ${time_of_day} = ANY(i.time_of_day))` : sql``}
    ${weather ? sql`AND (cardinality(i.weather) = 0 OR ${weather} = ANY(i.weather))` : sql``}
    ${rarity ? sql`AND i.rarity = ${rarity}` : sql``}
    ${search ? sql`AND i.name ILIKE ${"%" + search + "%"}` : sql``}
  `;

  return c.json({
    data: items,
    total: countResult[0]?.total ?? 0,
    limit: Number(limit),
    offset: Number(offset),
    success: true,
  });
});

// GET /api/items/:id - Get single item
app.get("/:id", async (c) => {
  const id = c.req.param("id");

  const result = await sql`
    SELECT i.*, c.name as category_name, c.slug as category_slug
    FROM items i
    JOIN categories c ON c.id = i.category_id
    WHERE i.id = ${Number(id)}
  `;

  if (result.length === 0) {
    return c.json({ error: "not_found", message: "Item not found", success: false }, 404);
  }

  return c.json({ data: result[0], success: true });
});

export default app;
