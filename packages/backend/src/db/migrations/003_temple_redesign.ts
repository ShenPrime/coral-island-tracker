/**
 * Migration: Redesign Lake Temple tracking
 * 
 * This migration:
 * 1. Creates temple_requirements table to store items needed for each offering
 * 2. Creates temple_progress table to track which items have been offered
 * 3. Populates temple_requirements with all offering items
 * 4. Links requirements to existing items in the database by name matching
 * 5. Removes the old lake-temple category and its items
 * 
 * Run with: bun run db:migrate:temple-redesign
 */

import postgres from "postgres";

const connectionString =
  process.env.DATABASE_URL || "postgres://postgres@localhost:5432/coral_tracker";
const sql = postgres(connectionString);

// Offering data with all required items
const LAKE_TEMPLE_OFFERINGS = {
  "crop-altar": {
    name: "Crop Altar",
    offerings: [
      {
        slug: "essential-resources",
        name: "Essential Resources",
        image: "https://static.wikia.nocookie.net/coralisland/images/b/b8/Essential_Resources_Offering.png",
        reward: "Recycling Machine",
        items: [
          { name: "Wood", quantity: 10 },
          { name: "Stone", quantity: 10 },
          { name: "Fiber", quantity: 10 },
          { name: "Sap", quantity: 10 },
          { name: "Any tree seed", quantity: 3, note: "Maple Seeds, Oak Seeds, or Pine Cone" },
        ],
      },
      {
        slug: "spring-sesajen",
        name: "Spring Sesajen",
        image: "https://static.wikia.nocookie.net/coralisland/images/d/d2/Spring_Sesajen_Offering.png",
        reward: "Sugarcane Seeds",
        items: [
          { name: "Turnip", quantity: 1 },
          { name: "Carrot", quantity: 1 },
          { name: "Daisy", quantity: 1 },
          { name: "Wasabi", quantity: 1 },
          { name: "Morel", quantity: 1 },
        ],
      },
      {
        slug: "summer-sesajen",
        name: "Summer Sesajen",
        image: "https://static.wikia.nocookie.net/coralisland/images/d/de/Summer_Sesajen_Offering.png",
        reward: "Tomato Seeds",
        items: [
          { name: "Blueberry", quantity: 1 },
          { name: "Hot Pepper", quantity: 1 },
          { name: "Sunflower", quantity: 1 },
          { name: "Shallot", quantity: 1 },
          { name: "Hibiscus", quantity: 1 },
        ],
      },
      {
        slug: "fall-sesajen",
        name: "Fall Sesajen",
        image: "https://static.wikia.nocookie.net/coralisland/images/b/b6/Fall_Sesajen_Offering.png",
        reward: "Barley Seeds",
        items: [
          { name: "Pumpkin", quantity: 1 },
          { name: "Rice", quantity: 1, quality: "bronze" },
          { name: "Orchid", quantity: 1 },
          { name: "Black Trumpet", quantity: 1 },
          { name: "Fig", quantity: 1 },
        ],
      },
      {
        slug: "winter-sesajen",
        name: "Winter Sesajen",
        image: "https://static.wikia.nocookie.net/coralisland/images/e/e7/Winter_Sesajen_Offering.png",
        reward: "Tea Seed",
        items: [
          { name: "Brussel Sprouts", quantity: 1 },
          { name: "Kale", quantity: 1 },
          { name: "Rose Hip", quantity: 1 },
          { name: "Snowdrop", quantity: 1, quality: "osmium" },
          { name: "Tea Leaf", quantity: 1 },
        ],
      },
      {
        slug: "ocean-scavengables",
        name: "Ocean Scavengables",
        image: "https://static.wikia.nocookie.net/coralisland/images/1/1b/Ocean_Scavengables_Offering.png",
        reward: "Dehydrator",
        items: [
          { name: "Sea Salt", quantity: 5 },
          { name: "Eastern Oyster", quantity: 5 },
          { name: "Blue Mussel", quantity: 5 },
          { name: "Any Kelp", quantity: 10, note: "Kelp, Sea Lettuce, Wakame, etc." },
          { name: "Any Shell", quantity: 10, note: "Cowry, Conch, etc." },
        ],
      },
    ],
  },
  "catch-altar": {
    name: "Catch Altar",
    offerings: [
      {
        slug: "fresh-water-fish",
        name: "Fresh Water Fish",
        image: "https://static.wikia.nocookie.net/coralisland/images/f/f6/Fresh_Water_Fish_Offering.png",
        reward: "Large Fish Bait",
        items: [
          { name: "Catfish", quantity: 1 },
          { name: "Tilapia", quantity: 1 },
          { name: "Rainbow Fish", quantity: 1 },
          { name: "Silver Arowana", quantity: 1 },
          { name: "Koi", quantity: 1 },
        ],
      },
      {
        slug: "salt-water-fish",
        name: "Salt Water Fish",
        image: "https://static.wikia.nocookie.net/coralisland/images/3/35/Salt_Water_Fish_Offering.png",
        reward: "Small Fish Bait",
        items: [
          { name: "Pink Snapper", quantity: 1 },
          { name: "Lionfish", quantity: 1 },
          { name: "Asian Sheepshead", quantity: 1 },
          { name: "Yellowfin Tuna", quantity: 1 },
          { name: "Sardine", quantity: 1 },
        ],
      },
      {
        slug: "rare-fish",
        name: "Rare Fish",
        image: "https://static.wikia.nocookie.net/coralisland/images/f/f6/Rare_Fish_Offering.png",
        reward: "Fish Pond",
        items: [
          { name: "Sturgeon", quantity: 1 },
          { name: "Gator Gar", quantity: 1 },
          { name: "Arapaima", quantity: 1 },
          { name: "Giant Sea Bass", quantity: 1 },
          { name: "Yellow Moray Eel", quantity: 1 },
        ],
      },
      {
        slug: "day-insect",
        name: "Day Insect",
        image: "https://static.wikia.nocookie.net/coralisland/images/6/64/Day_Insect_Offering.png",
        reward: "Bee House",
        items: [
          { name: "Pipevine Swallowtail Butterfly", quantity: 1 },
          { name: "Tiger Beetle", quantity: 1 },
          { name: "Yucca Moth", quantity: 1 },
          { name: "Assam Silk Moth", quantity: 1 },
          { name: "Monarch Caterpillar", quantity: 1 },
        ],
      },
      {
        slug: "night-insect",
        name: "Night Insect",
        image: "https://static.wikia.nocookie.net/coralisland/images/c/c6/Night_Insect_Offering.png",
        reward: "Tap",
        items: [
          { name: "Firefly", quantity: 1 },
          { name: "Cecropia Caterpillar", quantity: 1 },
          { name: "Centipede", quantity: 1 },
          { name: "Rove Beetle", quantity: 1 },
          { name: "Atlas Moth", quantity: 1 },
        ],
      },
      {
        slug: "ocean-critters",
        name: "Ocean Critters",
        image: "https://static.wikia.nocookie.net/coralisland/images/1/16/Ocean_Critters_Offering.png",
        reward: "Crawler Trap",
        items: [
          { name: "Cannonball Jellyfish", quantity: 1 },
          { name: "Hermit Crab", quantity: 1 },
          { name: "Sexy Shrimp", quantity: 1 },
          { name: "Sunflower Sea Star", quantity: 1 },
          { name: "Pom-pom Crab", quantity: 1 },
        ],
      },
    ],
  },
  "advanced-altar": {
    name: "Advanced Altar",
    offerings: [
      {
        slug: "barn-animals",
        name: "Barn Animals",
        image: "https://static.wikia.nocookie.net/coralisland/images/7/70/Barn_Animals_Offering.png",
        reward: "Cheese Press",
        items: [
          { name: "Milk", quantity: 1 },
          { name: "Goat Milk", quantity: 1 },
          { name: "Wool", quantity: 1 },
          { name: "Large Goat Milk", quantity: 1 },
          { name: "Large Wool", quantity: 1 },
          { name: "Large Milk", quantity: 1 },
        ],
      },
      {
        slug: "coop-animals",
        name: "Coop Animals",
        image: "https://static.wikia.nocookie.net/coralisland/images/2/22/Coop_Animals_Offering.png",
        reward: "Mayonnaise Machine",
        items: [
          { name: "Egg", quantity: 1 },
          { name: "Duck Egg", quantity: 1 },
          { name: "Large Egg", quantity: 1 },
          { name: "Large Duck Egg", quantity: 1 },
        ],
      },
      {
        slug: "basic-cooking",
        name: "Basic Cooking",
        image: "https://static.wikia.nocookie.net/coralisland/images/9/93/Basic_Cooking_Offering.png",
        reward: "Oil Press",
        items: [
          { name: "Smoothie", quantity: 1 },
          { name: "Grilled Fish", quantity: 1 },
          { name: "Tomato Soup", quantity: 1 },
          { name: "Onigiri", quantity: 1 },
          { name: "Fried Rice", quantity: 1 },
        ],
      },
      {
        slug: "basic-artisan",
        name: "Basic Artisan",
        image: "https://static.wikia.nocookie.net/coralisland/images/6/69/Basic_Artisan_Offering.png",
        reward: "Keg",
        items: [
          { name: "Any Mayonnaise", quantity: 1 },
          { name: "Any Fruit Juice", quantity: 1 },
          { name: "Any Butter", quantity: 1 },
          { name: "Any Dried Scavengeable", quantity: 1 },
          { name: "Any Pickle", quantity: 1 },
        ],
      },
      {
        slug: "fruit-plant",
        name: "Fruit Plant",
        image: "https://static.wikia.nocookie.net/coralisland/images/3/37/Fruit_Plant_Offering.png",
        reward: "Sprinkler II",
        items: [
          { name: "Rambutan", quantity: 1, quality: "silver" },
          { name: "Durian", quantity: 1, quality: "silver" },
          { name: "Mango", quantity: 1, quality: "silver" },
          { name: "Dragonfruit", quantity: 1, quality: "silver" },
          { name: "Apple", quantity: 1, quality: "silver" },
        ],
      },
      {
        slug: "monster-drop",
        name: "Monster Drop",
        image: "https://static.wikia.nocookie.net/coralisland/images/0/0e/Monster_Drop_Offering.png",
        reward: "Explosive III",
        items: [
          { name: "Silky Fur", quantity: 5 },
          { name: "Monster Essence", quantity: 5 },
          { name: "Bat Wing", quantity: 5 },
          { name: "Tough Meat", quantity: 5 },
          { name: "Slime Goop", quantity: 5 },
        ],
      },
    ],
  },
  "rare-altar": {
    name: "Rare Altar",
    offerings: [
      {
        slug: "rare-crops",
        name: "Rare Crops",
        image: "https://static.wikia.nocookie.net/coralisland/images/9/96/Rare_Crops_Offering.png",
        reward: "Sprinkler III",
        items: [
          { name: "Snowdrop", quantity: 1, quality: "osmium" },
          { name: "Lemon", quantity: 1, quality: "osmium" },
          { name: "Almond", quantity: 1, quality: "osmium" },
          { name: "Cocoa Bean", quantity: 1, quality: "osmium" },
          { name: "Coffee Bean", quantity: 1, quality: "osmium" },
        ],
      },
      {
        slug: "greenhouse-crops",
        name: "Greenhouse Crops",
        image: "https://static.wikia.nocookie.net/coralisland/images/4/4a/Greenhouse_Crops_Offering.png",
        reward: "Slime of Replication",
        items: [
          { name: "Garlic", quantity: 1 },
          { name: "Cotton", quantity: 1 },
          { name: "Cactus", quantity: 1 },
          { name: "Vanilla", quantity: 1 },
          { name: "Saffron", quantity: 1 },
        ],
      },
      {
        slug: "advanced-cooking",
        name: "Advanced Cooking",
        image: "https://static.wikia.nocookie.net/coralisland/images/a/a1/Advanced_Cooking_Offering.png",
        reward: "Jamu Recipe",
        items: [
          { name: "Vegan Taco", quantity: 1 },
          { name: "Apple Pie", quantity: 1 },
          { name: "Serabi", quantity: 1 },
          { name: "Pad Thai", quantity: 1 },
          { name: "Es Cendol", quantity: 1 },
        ],
      },
      {
        slug: "master-artisan",
        name: "Master Artisan",
        image: "https://static.wikia.nocookie.net/coralisland/images/5/5a/Master_Artisan_Offering.png",
        reward: "Aging Barrel",
        items: [
          { name: "Titan Arum Black Honey", quantity: 1 },
          { name: "Any Kimchi", quantity: 1 },
          { name: "Any Wine", quantity: 1 },
          { name: "Fermented Goat Cheese Wheel", quantity: 1 },
          { name: "White Truffle Oil", quantity: 1 },
        ],
      },
      {
        slug: "rare-animal-products",
        name: "Rare Animal Products",
        image: "https://static.wikia.nocookie.net/coralisland/images/e/e2/Rare_Animal_Products_Offering.png",
        reward: "Auto Petter",
        items: [
          { name: "Black Truffle", quantity: 1 },
          { name: "Large Quail Egg", quantity: 1 },
          { name: "Large Llama Wool", quantity: 1 },
          { name: "Large Feather", quantity: 1 },
          { name: "Large Gesha Coffee Bean", quantity: 1 },
        ],
      },
      {
        slug: "kelp-essence",
        name: "Kelp Essence",
        image: "https://static.wikia.nocookie.net/coralisland/images/8/8c/Kelp_Essence_Offering.png",
        reward: "Osmium Kelp Essence",
        items: [
          { name: "Gold Bar", quantity: 1 },
          { name: "Silver Bar", quantity: 1 },
          { name: "Bronze Bar", quantity: 1 },
          { name: "Gold Kelp Essence", quantity: 1 },
          { name: "Silver Kelp Essence", quantity: 1 },
          { name: "Bronze Kelp Essence", quantity: 1 },
        ],
      },
    ],
  },
};

async function migrate() {
  console.log("=".repeat(60));
  console.log("  Migration: Redesign Lake Temple Tracking");
  console.log("=".repeat(60));
  console.log();

  try {
    // Check if temple_requirements table already exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'temple_requirements'
      )
    `;

    if (tableExists[0]?.exists) {
      console.log("Temple tables already exist. Skipping table creation...");
    } else {
      // Create temple_requirements table
      console.log("Creating temple_requirements table...");
      await sql`
        CREATE TABLE temple_requirements (
          id SERIAL PRIMARY KEY,
          altar_slug VARCHAR(50) NOT NULL,
          altar_name VARCHAR(100) NOT NULL,
          offering_slug VARCHAR(100) NOT NULL,
          offering_name VARCHAR(100) NOT NULL,
          offering_image_url TEXT,
          reward VARCHAR(200),
          item_name VARCHAR(200) NOT NULL,
          item_id INT REFERENCES items(id) ON DELETE SET NULL,
          quantity INT DEFAULT 1,
          quality VARCHAR(20),
          note TEXT,
          display_order INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;

      // Create indexes
      await sql`CREATE INDEX idx_temple_req_altar ON temple_requirements(altar_slug)`;
      await sql`CREATE INDEX idx_temple_req_offering ON temple_requirements(offering_slug)`;
      await sql`CREATE INDEX idx_temple_req_item ON temple_requirements(item_id)`;

      // Create temple_progress table
      console.log("Creating temple_progress table...");
      await sql`
        CREATE TABLE temple_progress (
          id SERIAL PRIMARY KEY,
          save_slot_id INT NOT NULL REFERENCES save_slots(id) ON DELETE CASCADE,
          temple_requirement_id INT NOT NULL REFERENCES temple_requirements(id) ON DELETE CASCADE,
          offered BOOLEAN DEFAULT FALSE,
          offered_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(save_slot_id, temple_requirement_id)
        )
      `;

      await sql`CREATE INDEX idx_temple_progress_save ON temple_progress(save_slot_id)`;
      await sql`CREATE INDEX idx_temple_progress_offered ON temple_progress(save_slot_id, offered)`;
    }

    // Clear existing temple requirements (for re-running migration)
    console.log("Clearing existing temple requirements...");
    await sql`DELETE FROM temple_requirements`;

    // Populate temple_requirements
    console.log("Populating temple_requirements...");
    let totalItems = 0;
    let linkedItems = 0;

    for (const [altarSlug, altar] of Object.entries(LAKE_TEMPLE_OFFERINGS)) {
      for (const offering of altar.offerings) {
        let displayOrder = 0;
        for (const item of offering.items) {
          // Try to find matching item in items table
          const matchingItems = await sql`
            SELECT id FROM items 
            WHERE LOWER(name) = LOWER(${item.name})
            LIMIT 1
          `;
          const itemId = matchingItems[0]?.id || null;
          if (itemId) linkedItems++;

          await sql`
            INSERT INTO temple_requirements (
              altar_slug, altar_name, offering_slug, offering_name, 
              offering_image_url, reward, item_name, item_id,
              quantity, quality, note, display_order
            ) VALUES (
              ${altarSlug}, ${altar.name}, ${offering.slug}, ${offering.name},
              ${offering.image}, ${offering.reward}, ${item.name}, ${itemId},
              ${item.quantity}, ${(item as any).quality || null}, ${(item as any).note || null}, ${displayOrder}
            )
          `;
          displayOrder++;
          totalItems++;
        }
      }
    }

    console.log(`  Inserted ${totalItems} temple requirements`);
    console.log(`  Linked ${linkedItems} items to existing database entries`);

    // Remove old lake-temple category and items
    console.log("\nRemoving old lake-temple category...");
    const oldCategory = await sql`
      SELECT id FROM categories WHERE slug = 'lake-temple'
    `;
    
    if (oldCategory.length > 0) {
      const categoryId = oldCategory[0].id;
      const deletedItems = await sql`
        DELETE FROM items WHERE category_id = ${categoryId}
        RETURNING id
      `;
      console.log(`  Deleted ${deletedItems.length} old offering items`);
      
      await sql`DELETE FROM categories WHERE id = ${categoryId}`;
      console.log("  Deleted lake-temple category");
    } else {
      console.log("  lake-temple category not found (already removed)");
    }

    // Show summary
    const requirements = await sql`
      SELECT altar_name, COUNT(*) as count 
      FROM temple_requirements 
      GROUP BY altar_slug, altar_name 
      ORDER BY altar_slug
    `;

    console.log("\nTemple Requirements Summary:");
    for (const row of requirements) {
      console.log(`  ${row.altar_name}: ${row.count} items`);
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
