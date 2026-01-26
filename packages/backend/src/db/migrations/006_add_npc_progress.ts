/**
 * Migration: Add NPC Progress Table
 *
 * This migration adds support for NPC relationship tracking:
 * - Creates npc_progress table with hearts and relationship_status
 * - Supports 0-10 hearts for regular NPCs, 0-14 for married marriage candidates
 * - Relationship status: default, dating, married
 *
 * Run with: bun run packages/backend/src/db/migrations/006_add_npc_progress.ts
 */

import postgres from "postgres";

const connectionString =
  process.env.DATABASE_URL || "postgres://postgres@localhost:5432/coral_tracker";
const sql = postgres(connectionString);

async function migrate() {
  console.log("=".repeat(60));
  console.log("  Migration: Add NPC Progress Table");
  console.log("=".repeat(60));
  console.log();

  try {
    // Check if npc_progress table already exists
    const existing = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'npc_progress'
      ) as exists
    `;

    if (existing[0]?.exists) {
      console.log("npc_progress table already exists. Skipping...");
      await sql.end();
      return;
    }

    // Create npc_progress table
    console.log("Creating npc_progress table...");
    await sql`
      CREATE TABLE npc_progress (
        id SERIAL PRIMARY KEY,
        save_slot_id INT NOT NULL REFERENCES save_slots(id) ON DELETE CASCADE,
        item_id INT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
        hearts INT DEFAULT 0 CHECK (hearts >= 0 AND hearts <= 20),
        relationship_status VARCHAR(20) DEFAULT 'default' CHECK (relationship_status IN ('default', 'dating', 'married')),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(save_slot_id, item_id)
      )
    `;

    // Create indexes for performance
    console.log("Creating indexes...");
    await sql`
      CREATE INDEX idx_npc_progress_save_slot ON npc_progress(save_slot_id)
    `;
    await sql`
      CREATE INDEX idx_npc_progress_item ON npc_progress(item_id)
    `;

    // Verify the migration
    console.log("\nVerifying migration...");
    
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'npc_progress'
    `;
    
    if (tables.length > 0) {
      console.log("  - npc_progress table created successfully");
    }

    const columns = await sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'npc_progress'
      ORDER BY ordinal_position
    `;
    
    console.log("\nTable columns:");
    for (const col of columns) {
      console.log(`  - ${col.column_name}: ${col.data_type}${col.column_default ? ` (default: ${col.column_default})` : ""}`);
    }

    console.log("\nMigration completed successfully!");
    console.log("\nNext steps:");
    console.log("  1. Run the NPC scraper to populate items table with NPCs");
    console.log("  2. Deploy the updated backend with NPC routes");

  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

migrate();
