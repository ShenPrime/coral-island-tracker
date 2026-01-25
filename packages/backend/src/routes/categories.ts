import { Hono } from "hono";
import { sql } from "../db";
import type { Category } from "@coral-tracker/shared";

const app = new Hono();

// GET /api/categories - List all categories
app.get("/", async (c) => {
  const categories = await sql<Category[]>`
    SELECT id, name, slug, description, icon, display_order
    FROM categories
    ORDER BY display_order ASC
  `;

  return c.json({ data: categories, success: true });
});

// GET /api/categories/:slug - Get single category with item count
app.get("/:slug", async (c) => {
  const slug = c.req.param("slug");

  const result = await sql`
    SELECT 
      c.id, c.name, c.slug, c.description, c.icon, c.display_order,
      COUNT(i.id)::int as item_count
    FROM categories c
    LEFT JOIN items i ON i.category_id = c.id
    WHERE c.slug = ${slug}
    GROUP BY c.id
  `;

  if (result.length === 0) {
    return c.json({ error: "not_found", message: "Category not found", success: false }, 404);
  }

  return c.json({ data: result[0], success: true });
});

export default app;
