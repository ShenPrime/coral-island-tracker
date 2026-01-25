/**
 * Migration: Add Lake Temple (Offerings) category
 * 
 * This migration adds the "Lake Temple" category to track goddess temple
 * offerings. Each offering is an item that requires multiple other items
 * to complete. Players can filter by altar (Crop, Catch, Advanced, Rare).
 * 
 * Run with: bun run db:migrate:temple
 */

import postgres from "postgres";

const connectionString =
  process.env.DATABASE_URL || "postgres://postgres@localhost:5432/coral_tracker";
const sql = postgres(connectionString);

async function migrate() {
  console.log("=".repeat(60));
  console.log("  Migration: Add Lake Temple Category");
  console.log("=".repeat(60));
  console.log();

  try {
    // Check if lake-temple category already exists
    const existing = await sql`
      SELECT id FROM categories WHERE slug = 'lake-temple'
    `;

    if (existing.length > 0) {
      console.log("Lake Temple category already exists. Skipping...");
      await sql.end();
      return;
    }

    // Get the current max display_order for forageables (should be 7)
    const forageablesCategory = await sql`
      SELECT display_order FROM categories WHERE slug = 'forageables'
    `;
    
    const forageablesOrder = forageablesCategory[0]?.display_order ?? 7;
    const lakeTempleOrder = forageablesOrder + 1;

    // Update display_order for categories that come after forageables
    console.log("Updating display order for existing categories...");
    await sql`
      UPDATE categories 
      SET display_order = display_order + 1 
      WHERE display_order > ${forageablesOrder}
    `;

    // Insert the new lake-temple category
    console.log("Inserting Lake Temple category...");
    await sql`
      INSERT INTO categories (name, slug, description, icon, display_order)
      VALUES (
        'Lake Temple',
        'lake-temple',
        'Track your goddess temple altar offerings and unlock rewards',
        'sun',
        ${lakeTempleOrder}
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
    console.log("  1. Run 'bun run scrape lake-temple' to populate the data");

  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

migrate();
