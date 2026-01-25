import { sql, closeConnection } from "./index";

async function setupDatabase() {
  console.log("Setting up database...\n");

  try {
    // Drop existing tables (in reverse dependency order)
    console.log("Dropping existing tables...");
    await sql`DROP TABLE IF EXISTS progress CASCADE`;
    await sql`DROP TABLE IF EXISTS save_slots CASCADE`;
    await sql`DROP TABLE IF EXISTS items CASCADE`;
    await sql`DROP TABLE IF EXISTS categories CASCADE`;

    // Create categories table
    console.log("Creating categories table...");
    await sql`
      CREATE TABLE categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        icon VARCHAR(50),
        display_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create items table
    console.log("Creating items table...");
    await sql`
      CREATE TABLE items (
        id SERIAL PRIMARY KEY,
        category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        slug VARCHAR(200) NOT NULL,
        image_url TEXT,
        rarity VARCHAR(20),
        seasons TEXT[] DEFAULT '{}',
        time_of_day TEXT[] DEFAULT '{}',
        weather TEXT[] DEFAULT '{}',
        locations TEXT[] DEFAULT '{}',
        base_price INT,
        description TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(category_id, slug)
      )
    `;

    // Create save_slots table
    console.log("Creating save_slots table...");
    await sql`
      CREATE TABLE save_slots (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create progress table
    console.log("Creating progress table...");
    await sql`
      CREATE TABLE progress (
        id SERIAL PRIMARY KEY,
        save_slot_id INT NOT NULL REFERENCES save_slots(id) ON DELETE CASCADE,
        item_id INT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
        completed BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(save_slot_id, item_id)
      )
    `;

    // Create indexes
    console.log("Creating indexes...");
    await sql`CREATE INDEX idx_items_category ON items(category_id)`;
    await sql`CREATE INDEX idx_items_rarity ON items(rarity)`;
    await sql`CREATE INDEX idx_items_seasons ON items USING GIN(seasons)`;
    await sql`CREATE INDEX idx_progress_save_slot ON progress(save_slot_id)`;
    await sql`CREATE INDEX idx_progress_completed ON progress(save_slot_id, completed)`;

    // Insert default categories
    // Note: Lake Temple is handled separately via temple_requirements table
    console.log("Inserting default categories...");
    await sql`
      INSERT INTO categories (name, slug, description, icon, display_order) VALUES
        ('Fish', 'fish', 'All catchable fish in the ocean, rivers, and lakes', 'fish', 1),
        ('Insects', 'insects', 'Bugs and insects to catch with a net', 'bug', 2),
        ('Critters', 'critters', 'Small animals that can be caught', 'rabbit', 3),
        ('Crops', 'crops', 'Plantable crops by season', 'carrot', 4),
        ('Artifacts', 'artifacts', 'Museum donation artifacts', 'scroll', 5),
        ('Gems', 'gems', 'Minerals and gems from mining', 'gem', 6),
        ('Forageables', 'forageables', 'Foraged items from land and ocean including mushrooms, flowers, shells, and more', 'leaf', 7),
        ('Cooking', 'cooking', 'Recipes and cooked dishes', 'utensils', 8),
        ('NPCs', 'npcs', 'Town residents and relationship tracking', 'users', 9)
    `;

    // Create a default save slot
    console.log("Creating default save slot...");
    await sql`INSERT INTO save_slots (name) VALUES ('My First Playthrough')`;

    console.log("\nDatabase schema created successfully!");

    // Verify tables were created
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

    console.log("\nCreated tables:");
    tables.forEach((t) => console.log(`  - ${t.table_name}`));

    // Show category count
    const categories = await sql`SELECT COUNT(*) as count FROM categories`;
    console.log(`\nInserted ${categories[0]?.count} categories`);

    console.log("\nNext steps:");
    console.log("  1. Run 'bun run db:seed' to add sample game data");
    console.log("  2. Run 'bun run dev' to start the app");

  } catch (error) {
    console.error("Error setting up database:", error);
    process.exit(1);
  } finally {
    await closeConnection();
  }
}

setupDatabase();
