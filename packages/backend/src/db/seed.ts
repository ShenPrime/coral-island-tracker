import { sql, closeConnection } from "./index";

// Sample data - this would be populated by the wiki scraper
const sampleFish = [
  {
    name: "Angelfish",
    rarity: "uncommon",
    seasons: ["spring", "summer", "fall", "winter"],
    time_of_day: ["morning", "afternoon", "evening"],
    weather: ["sunny", "rain"],
    locations: ["Deep Forest", "River (Forest)"],
    base_price: 70,
  },
  {
    name: "Arapaima",
    rarity: "rare",
    seasons: ["spring", "fall", "winter"],
    time_of_day: ["morning", "afternoon", "evening", "night"],
    weather: ["sunny", "rain"],
    locations: ["Deep Forest", "River (Forest)", "Savannah"],
    base_price: 240,
  },
  {
    name: "Barracuda",
    rarity: "uncommon",
    seasons: ["spring", "summer", "fall"],
    time_of_day: ["morning", "afternoon", "evening"],
    weather: ["sunny", "rain"],
    locations: ["Ocean (Beach, Dock)"],
    base_price: 60,
  },
  {
    name: "Catfish",
    rarity: "common",
    seasons: ["spring", "summer"],
    time_of_day: ["evening", "night"],
    weather: ["rain", "storm"],
    locations: ["Rice Field", "Pond", "River (Forest)"],
    base_price: 45,
  },
  {
    name: "Clownfish",
    rarity: "common",
    seasons: ["spring", "summer"],
    time_of_day: ["afternoon", "evening", "night"],
    weather: ["sunny", "windy"],
    locations: ["Ocean (Dock)"],
    base_price: 35,
  },
  {
    name: "Blue Tang",
    rarity: "common",
    seasons: ["spring", "fall", "winter"],
    time_of_day: ["morning", "afternoon", "evening", "night"],
    weather: ["sunny", "rain"],
    locations: ["Ocean (Beach)", "Earth Mine"],
    base_price: 40,
  },
  {
    name: "Crab",
    rarity: "uncommon",
    seasons: ["summer", "fall"],
    time_of_day: ["morning", "afternoon"],
    weather: ["sunny"],
    locations: ["Ocean (Beach)"],
    base_price: 70,
  },
  {
    name: "Sturgeon",
    rarity: "rare",
    seasons: ["winter"],
    time_of_day: ["morning", "afternoon", "evening"],
    weather: ["snow", "blizzard"],
    locations: ["Lake"],
    base_price: 200,
  },
];

const sampleInsects = [
  {
    name: "Monarch Butterfly",
    rarity: "common",
    seasons: ["spring", "summer"],
    time_of_day: ["morning", "afternoon"],
    weather: ["sunny"],
    locations: ["Farm", "Forest", "Town"],
    base_price: 30,
  },
  {
    name: "Atlas Moth",
    rarity: "rare",
    seasons: ["summer"],
    time_of_day: ["evening", "night"],
    weather: ["sunny", "windy"],
    locations: ["Forest", "Deep Forest"],
    base_price: 150,
  },
  {
    name: "Firefly",
    rarity: "uncommon",
    seasons: ["summer"],
    time_of_day: ["night"],
    weather: ["sunny"],
    locations: ["Forest", "Farm"],
    base_price: 50,
  },
  {
    name: "Dragonfly",
    rarity: "common",
    seasons: ["spring", "summer", "fall"],
    time_of_day: ["morning", "afternoon"],
    weather: ["sunny", "windy"],
    locations: ["Lake", "Pond", "River"],
    base_price: 35,
  },
  {
    name: "Hercules Beetle",
    rarity: "epic",
    seasons: ["summer"],
    time_of_day: ["night"],
    weather: ["sunny"],
    locations: ["Deep Forest"],
    base_price: 300,
  },
];

const sampleCrops = [
  {
    name: "Turnip",
    rarity: "common",
    seasons: ["spring"],
    locations: ["Farm"],
    base_price: 35,
    metadata: { growth_days: 4 },
  },
  {
    name: "Potato",
    rarity: "common",
    seasons: ["spring"],
    locations: ["Farm"],
    base_price: 80,
    metadata: { growth_days: 6 },
  },
  {
    name: "Strawberry",
    rarity: "uncommon",
    seasons: ["spring"],
    locations: ["Farm"],
    base_price: 120,
    metadata: { growth_days: 8, regrows: true },
  },
  {
    name: "Tomato",
    rarity: "common",
    seasons: ["summer"],
    locations: ["Farm"],
    base_price: 60,
    metadata: { growth_days: 11, regrows: true },
  },
  {
    name: "Corn",
    rarity: "common",
    seasons: ["summer", "fall"],
    locations: ["Farm"],
    base_price: 50,
    metadata: { growth_days: 14, regrows: true },
  },
  {
    name: "Pumpkin",
    rarity: "uncommon",
    seasons: ["fall"],
    locations: ["Farm"],
    base_price: 320,
    metadata: { growth_days: 13 },
  },
];

const sampleArtifacts = [
  {
    name: "Ancient Coin",
    rarity: "uncommon",
    locations: ["Dig Sites", "Mining"],
    base_price: 100,
  },
  {
    name: "Fossil Fragment",
    rarity: "common",
    locations: ["Dig Sites"],
    base_price: 50,
  },
  {
    name: "Obsidian Arrowhead",
    rarity: "rare",
    locations: ["Dig Sites", "Cave"],
    base_price: 200,
  },
  {
    name: "Ancient Pottery",
    rarity: "uncommon",
    locations: ["Dig Sites"],
    base_price: 150,
  },
];

const sampleGems = [
  {
    name: "Amethyst",
    rarity: "common",
    locations: ["Earth Mine (Floors 1-20)"],
    base_price: 100,
  },
  {
    name: "Emerald",
    rarity: "uncommon",
    locations: ["Earth Mine (Floors 21-40)"],
    base_price: 250,
  },
  {
    name: "Ruby",
    rarity: "rare",
    locations: ["Earth Mine (Floors 41-60)"],
    base_price: 400,
  },
  {
    name: "Diamond",
    rarity: "epic",
    locations: ["Earth Mine (Floors 61+)"],
    base_price: 750,
  },
  {
    name: "Coral Pearl",
    rarity: "rare",
    locations: ["Diving", "Ocean"],
    base_price: 500,
  },
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function seedItems(categorySlug: string, items: any[]) {
  const category = await sql`
    SELECT id FROM categories WHERE slug = ${categorySlug}
  `;

  if (category.length === 0) {
    console.error(`Category ${categorySlug} not found`);
    return;
  }

  const categoryId = category[0]!.id;

  for (const item of items) {
    const slug = await slugify(item.name);
    await sql`
      INSERT INTO items (
        category_id, name, slug, rarity, seasons, time_of_day, 
        weather, locations, base_price, metadata
      )
      VALUES (
        ${categoryId},
        ${item.name},
        ${slug},
        ${item.rarity || null},
        ${item.seasons || []},
        ${item.time_of_day || []},
        ${item.weather || []},
        ${item.locations || []},
        ${item.base_price || null},
        ${JSON.stringify(item.metadata || {})}
      )
      ON CONFLICT (category_id, slug) DO UPDATE SET
        name = EXCLUDED.name,
        rarity = EXCLUDED.rarity,
        seasons = EXCLUDED.seasons,
        time_of_day = EXCLUDED.time_of_day,
        weather = EXCLUDED.weather,
        locations = EXCLUDED.locations,
        base_price = EXCLUDED.base_price,
        metadata = EXCLUDED.metadata
    `;
  }

  console.log(`  Seeded ${items.length} ${categorySlug}`);
}

async function seed() {
  console.log("Seeding database with sample data...\n");

  try {
    await seedItems("fish", sampleFish);
    await seedItems("insects", sampleInsects);
    await seedItems("crops", sampleCrops);
    await seedItems("artifacts", sampleArtifacts);
    await seedItems("gems", sampleGems);

    // Get total count
    const count = await sql`SELECT COUNT(*)::int as count FROM items`;
    console.log(`\nTotal items seeded: ${count[0]?.count}`);

    console.log("\nSeed completed successfully!");
    console.log("\nNote: For full game data, run: bun run scrape");
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  } finally {
    await closeConnection();
  }
}

seed();
