/**
 * Migration: Add Sessions for Authentication
 *
 * This migration adds anonymous session-based authentication:
 * - Creates sessions table with UUID primary key
 * - Links save_slots to sessions
 * - Clears user-specific data (save_slots, progress, temple_progress)
 * - PRESERVES shared game data (categories, items, temple_requirements)
 *
 * Run with: bun run packages/backend/src/db/migrations/005_add_sessions.ts
 */

import postgres from "postgres";

const connectionString =
  process.env.DATABASE_URL || "postgres://postgres@localhost:5432/coral_tracker";
const sql = postgres(connectionString);

async function migrate() {
  console.log("=".repeat(60));
  console.log("  Migration: Add Sessions for Authentication");
  console.log("=".repeat(60));
  console.log();

  try {
    // Check if sessions table already exists
    const existing = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'sessions'
      ) as exists
    `;

    if (existing[0]?.exists) {
      console.log("Sessions table already exists. Skipping...");
      await sql.end();
      return;
    }

    // Create sessions table
    console.log("Creating sessions table...");
    await sql`
      CREATE TABLE sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Clear user-specific data only (preserve game data)
    console.log("Clearing user-specific data (preserving game data)...");
    
    // Check if temple_progress exists before trying to delete
    const templeProgressExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'temple_progress'
      ) as exists
    `;
    
    if (templeProgressExists[0]?.exists) {
      await sql`DELETE FROM temple_progress`;
      console.log("  - Cleared temple_progress (user data)");
    }
    
    await sql`DELETE FROM progress`;
    console.log("  - Cleared progress (user data)");
    
    await sql`DELETE FROM save_slots`;
    console.log("  - Cleared save_slots (user data)");

    // Note: We DO NOT delete these shared game data tables:
    // - categories (game data)
    // - items (scraped wiki data)
    // - temple_requirements (game data)
    console.log("  - Preserved categories, items, temple_requirements (shared game data)");

    // Add session_id column to save_slots
    console.log("Adding session_id column to save_slots...");
    await sql`
      ALTER TABLE save_slots 
      ADD COLUMN session_id UUID REFERENCES sessions(id) ON DELETE CASCADE
    `;

    // Create index for performance
    console.log("Creating index on save_slots.session_id...");
    await sql`
      CREATE INDEX idx_save_slots_session ON save_slots(session_id)
    `;

    // Verify the migration
    console.log("\nVerifying migration...");
    
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('sessions', 'save_slots')
      ORDER BY table_name
    `;
    
    console.log("Tables verified:");
    for (const table of tables) {
      console.log(`  - ${table.table_name}`);
    }

    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'save_slots' 
      AND column_name = 'session_id'
    `;
    
    if (columns.length > 0) {
      console.log(`  - save_slots.session_id column added (${columns[0]?.data_type})`);
    }

    // Show preserved data counts
    const itemCount = await sql`SELECT COUNT(*)::int as count FROM items`;
    const categoryCount = await sql`SELECT COUNT(*)::int as count FROM categories`;
    
    console.log("\nPreserved game data:");
    console.log(`  - ${categoryCount[0]?.count || 0} categories`);
    console.log(`  - ${itemCount[0]?.count || 0} items`);

    console.log("\nMigration completed successfully!");
    console.log("\nNext steps:");
    console.log("  1. Deploy the updated backend with session middleware");
    console.log("  2. Users will automatically get new sessions on first visit");

  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

migrate();
