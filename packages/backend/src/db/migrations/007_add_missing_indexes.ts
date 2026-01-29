/**
 * Migration: Add missing database indexes
 *
 * Adds indexes for frequently queried columns:
 * - items(slug) — used in item lookups
 * - temple_progress(temple_requirement_id) — FK not indexed
 *
 * Run with: bun run packages/backend/src/db/migrations/007_add_missing_indexes.ts
 */

import postgres from "postgres";

const connectionString =
  process.env.DATABASE_URL || "postgres://postgres@localhost:5432/coral_tracker";
const sql = postgres(connectionString);

async function migrate() {
  console.log("=".repeat(60));
  console.log("  Migration: Add Missing Indexes");
  console.log("=".repeat(60));
  console.log();

  try {
    const indexes = [
      {
        name: "idx_items_slug",
        query: sql`CREATE INDEX IF NOT EXISTS idx_items_slug ON items(slug)`,
      },
      {
        name: "idx_temple_progress_requirement",
        query: sql`CREATE INDEX IF NOT EXISTS idx_temple_progress_requirement ON temple_progress(temple_requirement_id)`,
      },
    ];

    for (const index of indexes) {
      console.log(`Creating ${index.name}...`);
      await index.query;
      console.log(`  ✓ ${index.name}`);
    }

    console.log("\nMigration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

migrate();
