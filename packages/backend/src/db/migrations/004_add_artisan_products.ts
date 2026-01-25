/**
 * Migration: Add Artisan Products category
 *
 * This migration adds the "Artisan Products" category to track processed goods
 * from artisan equipment (Aging Barrel, Keg, Cheese Press, Dehydrator, etc.)
 *
 * Run with: bun run migrate
 */

import postgres from "postgres";

const connectionString =
  process.env.DATABASE_URL || "postgres://postgres@localhost:5432/coral_tracker";
const sql = postgres(connectionString);

async function migrate() {
  console.log("=".repeat(60));
  console.log("  Migration: Add Artisan Products Category");
  console.log("=".repeat(60));
  console.log();

  try {
    // Check if artisan-products category already exists
    const existing = await sql`
      SELECT id FROM categories WHERE slug = 'artisan-products'
    `;

    if (existing.length > 0) {
      console.log("Artisan Products category already exists. Skipping...");
      await sql.end();
      return;
    }

    // Get the current max display_order for NPCs (should be 9)
    const npcsCategory = await sql`
      SELECT display_order FROM categories WHERE slug = 'npcs'
    `;

    const npcsOrder = npcsCategory[0]?.display_order ?? 9;
    const artisanOrder = npcsOrder + 1;

    // Insert the new artisan products category
    console.log("Inserting artisan products category...");
    await sql`
      INSERT INTO categories (name, slug, description, icon, display_order)
      VALUES (
        'Artisan Products',
        'artisan-products',
        'Processed goods from artisan equipment',
        'flask',
        ${artisanOrder}
      )
    `;

    // Verify the migration
    const categories = await sql`
      SELECT name, slug, display_order 
      FROM categories 
      ORDER BY display_order
    `;

    console.log("\nUpdated category order:");
    for (const cat of categories) {
      console.log(`  ${cat.display_order}. ${cat.name} (${cat.slug})`);
    }

    console.log("\nMigration completed successfully!");
    console.log("\nNext steps:");
    console.log("  1. Run 'bun run scrape artisan-products' to populate the data");

  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

migrate();
