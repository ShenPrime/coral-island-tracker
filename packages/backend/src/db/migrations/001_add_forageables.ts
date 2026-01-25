/**
 * Migration: Add Forageables category
 * 
 * This migration adds the "Forageables" category to track foraged items
 * including land forageables (mushrooms, flowers, herbs) and ocean
 * scavengeables (shells, clams, oysters, mussels, sea urchins, seaweed).
 * 
 * Run with: bun run migrate
 */

import postgres from "postgres";

const connectionString =
  process.env.DATABASE_URL || "postgres://postgres@localhost:5432/coral_tracker";
const sql = postgres(connectionString);

async function migrate() {
  console.log("=".repeat(60));
  console.log("  Migration: Add Forageables Category");
  console.log("=".repeat(60));
  console.log();

  try {
    // Check if forageables category already exists
    const existing = await sql`
      SELECT id FROM categories WHERE slug = 'forageables'
    `;

    if (existing.length > 0) {
      console.log("Forageables category already exists. Skipping...");
      await sql.end();
      return;
    }

    // Get the current max display_order for gems (should be 6)
    const gemsCategory = await sql`
      SELECT display_order FROM categories WHERE slug = 'gems'
    `;
    
    const gemsOrder = gemsCategory[0]?.display_order ?? 6;
    const forageablesOrder = gemsOrder + 1;

    // Update display_order for categories that come after gems
    console.log("Updating display order for existing categories...");
    await sql`
      UPDATE categories 
      SET display_order = display_order + 1 
      WHERE display_order > ${gemsOrder}
    `;

    // Insert the new forageables category
    console.log("Inserting forageables category...");
    await sql`
      INSERT INTO categories (name, slug, description, icon, display_order)
      VALUES (
        'Forageables',
        'forageables',
        'Foraged items from land and ocean including mushrooms, flowers, shells, and more',
        'leaf',
        ${forageablesOrder}
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
    console.log("  1. Run 'bun run scrape forageables' to populate the data");

  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

migrate();
