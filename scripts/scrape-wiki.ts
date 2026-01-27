/**
 * Wiki Scraper for Coral Island
 *
 * Scrapes data from the Coral Island Fandom wiki using the MediaWiki API.
 * Fetches individual item pages for accurate data extraction.
 *
 * Usage:
 *   bun run scrape              # Scrape all categories
 *   bun run scrape fish         # Scrape specific category
 *   bun run scrape --clear      # Clear existing data before scraping
 *   bun run scrape --fast       # Skip individual page fetching (less data)
 *
 * Note: Please be respectful to the wiki servers.
 */

import postgres from "postgres";

const connectionString =
  process.env.DATABASE_URL || "postgres://postgres@localhost:5432/coral_tracker";
const sql = postgres(connectionString);

const WIKI_BASE = "https://coralisland.fandom.com";
const API_URL = `${WIKI_BASE}/api.php`;

// Rate limiting - be respectful to wiki servers
const DELAY_MS = 300;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ============ Types ============

interface ScrapedItem {
  name: string;
  rarity?: string;
  seasons?: string[];
  time_of_day?: string[];
  weather?: string[];
  locations?: string[];
  base_price?: number;
  image_url?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

interface CategoryMember {
  title: string;
  ns: number;
  pageid: number;
}

// ============ Utility Functions ============

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#\d+;/g, "")
    .replace(/\u2022/g, ",") // bullet point to comma
    .replace(/\s+/g, " ")
    .trim();
}

// ============ Parsing Helpers ============

function parseSeasons(text: string): string[] {
  const seasons: string[] = [];
  const lower = text.toLowerCase();

  if (lower.includes("spring") || lower.includes("spr")) seasons.push("spring");
  if (lower.includes("summer") || lower.includes("sum")) seasons.push("summer");
  if (lower.includes("fall") || lower.includes("fal") || lower.includes("autumn")) seasons.push("fall");
  if (lower.includes("winter") || lower.includes("win")) seasons.push("winter");

  return seasons;
}

function parseTimeOfDay(text: string): string[] {
  const times: string[] = [];
  const lower = text.toLowerCase();

  if (lower.includes("all day") || lower.includes("any time") || lower.includes("anytime")) {
    return ["morning", "afternoon", "evening", "night"];
  }

  if (lower.includes("morning")) times.push("morning");
  if (lower.includes("afternoon")) times.push("afternoon");
  if (lower.includes("evening")) times.push("evening");
  if (lower.includes("night")) times.push("night");

  // Handle "Day" as morning+afternoon+evening
  if (times.length === 0 && lower.includes("day") && !lower.includes("night")) {
    return ["morning", "afternoon", "evening"];
  }

  return times;
}

function parseWeather(text: string): string[] {
  const weather: string[] = [];
  const lower = text.toLowerCase();

  if (lower.includes("any") || lower.includes("all")) {
    return []; // Empty = any weather
  }

  if (lower.includes("sunny") || lower.includes("clear")) weather.push("sunny");
  if (lower.includes("windy") || lower.includes("wind")) weather.push("windy");
  if (lower.includes("rain") && !lower.includes("storm")) weather.push("rain");
  if (lower.includes("storm") || lower.includes("thunder")) weather.push("storm");
  if (lower.includes("snow")) weather.push("snow");
  if (lower.includes("blizzard")) weather.push("blizzard");

  return weather;
}

function parseRarity(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("legendary")) return "legendary";
  if (lower.includes("super rare")) return "super_rare";
  if (lower.includes("rare")) return "rare";
  if (lower.includes("uncommon")) return "uncommon";
  return "common";
}

function parsePrice(text: string): number | undefined {
  const cleaned = text.replace(/,/g, "").replace(/\s/g, "");
  // Look for "Base: X" pattern or just a number
  const baseMatch = cleaned.match(/[Bb]ase:?\s*(\d+)/);
  if (baseMatch) return parseInt(baseMatch[1]!, 10);
  
  const numMatch = cleaned.match(/^(\d+)/);
  return numMatch ? parseInt(numMatch[1]!, 10) : undefined;
}

function parseLocations(text: string): string[] {
  // Split by bullet points, commas, or line breaks
  return text
    .split(/[,\u2022\n\r]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length < 100 && !s.match(/^\d+$/));
}

// ============ API Functions ============

/**
 * Fetch page categories from the wiki API
 * Returns an array of category names (without "Category:" prefix)
 */
async function fetchPageCategories(title: string): Promise<string[]> {
  const params = new URLSearchParams({
    action: "query",
    titles: title,
    prop: "categories",
    cllimit: "500",
    format: "json",
  });

  await delay(DELAY_MS);

  try {
    const response = await fetch(`${API_URL}?${params}`);
    if (!response.ok) return [];

    const data = (await response.json()) as {
      query?: {
        pages?: Record<string, { categories?: Array<{ title: string }> }>;
      };
    };

    const pages = data.query?.pages;
    if (!pages) return [];

    const pageData = Object.values(pages)[0];
    if (!pageData?.categories) return [];

    return pageData.categories.map((c) =>
      c.title.replace(/^Category:/, "")
    );
  } catch {
    return [];
  }
}

/**
 * Parse rarity from page categories
 * Looks for patterns like "Super rare gem", "Rare fish", "Common artifact"
 */
function parseRarityFromCategories(categories: string[]): string | null {
  for (const cat of categories) {
    const lower = cat.toLowerCase();
    if (lower.includes("legendary")) return "legendary";
    if (lower.includes("super rare")) return "super_rare";
    if (lower.includes("rare")) return "rare";
    if (lower.includes("uncommon")) return "uncommon";
    if (lower.includes("common")) return "common";
  }
  return null;
}

/**
 * Fetch members of a wiki category
 */
async function fetchCategoryMembers(category: string): Promise<Set<string>> {
  const members = new Set<string>();
  
  const params = new URLSearchParams({
    action: "query",
    list: "categorymembers",
    cmtitle: category,
    cmlimit: "500",
    format: "json",
  });

  await delay(DELAY_MS);
  const response = await fetch(`${API_URL}?${params}`);
  
  if (!response.ok) {
    console.error(`    Failed to fetch ${category}: ${response.status}`);
    return members;
  }

  const data = (await response.json()) as {
    query?: { categorymembers?: CategoryMember[] };
  };

  for (const member of data.query?.categorymembers || []) {
    if (member.ns === 0) { // Only include main namespace pages
      members.add(member.title);
    }
  }

  return members;
}

/**
 * Fetch a wiki page's HTML content
 */
async function fetchPageHtml(title: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: "parse",
    page: title,
    format: "json",
    prop: "text",
  });

  await delay(DELAY_MS);
  
  try {
    const response = await fetch(`${API_URL}?${params}`);
    if (!response.ok) return null;

    const data = (await response.json()) as { 
      parse?: { text?: { "*"?: string } };
      error?: { code: string };
    };
    
    if (data.error) return null;
    return data.parse?.text?.["*"] || null;
  } catch {
    return null;
  }
}

/**
 * Fetch list of sections from a wiki page
 * Returns array of { index, line } where line is section title like "Gifts"
 */
async function fetchPageSections(title: string): Promise<Array<{ index: string; line: string }>> {
  const params = new URLSearchParams({
    action: "parse",
    page: title,
    format: "json",
    prop: "sections",
  });

  await delay(DELAY_MS);

  try {
    const response = await fetch(`${API_URL}?${params}`);
    if (!response.ok) return [];

    const data = (await response.json()) as {
      parse?: { sections?: Array<{ index: string; line: string }> };
      error?: { code: string };
    };

    if (data.error) return [];
    return data.parse?.sections || [];
  } catch {
    return [];
  }
}

/**
 * Fetch HTML content of a specific section from a wiki page
 */
async function fetchPageSectionHtml(title: string, sectionIndex: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: "parse",
    page: title,
    format: "json",
    prop: "text",
    section: sectionIndex,
  });

  await delay(DELAY_MS);

  try {
    const response = await fetch(`${API_URL}?${params}`);
    if (!response.ok) return null;

    const data = (await response.json()) as {
      parse?: { text?: { "*"?: string } };
      error?: { code: string };
    };

    if (data.error) return null;
    return data.parse?.text?.["*"] || null;
  } catch {
    return null;
  }
}

/**
 * Fetch item details from individual wiki page with retry
 */
async function fetchItemDetails(
  itemName: string,
  retries = 1
): Promise<Partial<ScrapedItem> | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const html = await fetchPageHtml(itemName);
    if (html) {
      return parseInfobox(html);
    }
    if (attempt < retries) {
      await delay(1000); // Wait longer before retry
    }
  }
  return null;
}

/**
 * Parse price tables from infobox
 * Returns { prices: {base, bronze, silver, gold, osmium}, prices_with_perk: {...} }
 */
function parsePriceTables(html: string): { 
  prices?: Record<string, number>; 
  prices_with_perk?: Record<string, number>;
  base_price?: number;
} {
  const result: { 
    prices?: Record<string, number>; 
    prices_with_perk?: Record<string, number>;
    base_price?: number;
  } = {};

  // Find all price tables (horizontal groups with "Sell price" in caption)
  const tableRegex = /<table[^>]*class="[^"]*pi-horizontal-group[^"]*"[^>]*>[\s\S]*?<caption[^>]*>([\s\S]*?)<\/caption>[\s\S]*?<\/table>/gi;
  let tableMatch;
  let tableIndex = 0;

  while ((tableMatch = tableRegex.exec(html)) !== null) {
    const caption = stripHtml(tableMatch[1]).toLowerCase();
    const tableHtml = tableMatch[0];

    // Check if this is a price table
    if (!caption.includes("sell price") && !caption.includes("prices")) {
      continue;
    }

    const prices: Record<string, number> = {};
    
    // Extract prices from table cells
    const priceFields = ["sell", "base", "bronze", "silver", "gold", "osmium"];
    for (const field of priceFields) {
      const cellRegex = new RegExp(
        `data-source="${field}"[^>]*>[\\s\\S]*?<td[^>]*>([\\s\\S]*?)</td>`,
        "i"
      );
      const cellMatch = tableHtml.match(cellRegex);
      if (cellMatch?.[1]) {
        const value = parseInt(stripHtml(cellMatch[1]).replace(/,/g, ""), 10);
        if (!isNaN(value) && value > 0) {
          // Map "sell" to "base" for consistency
          const key = field === "sell" ? "base" : field;
          prices[key] = value;
        }
      }
    }

    if (Object.keys(prices).length > 0) {
      // Check if this is the Fish Price perk table
      if (caption.includes("fish price") || caption.includes("perk")) {
        result.prices_with_perk = prices;
      } else if (!result.prices) {
        // First price table is normal prices
        result.prices = prices;
        result.base_price = prices.base;
      }
    }
    
    tableIndex++;
  }

  return result;
}

/**
 * Parse seasons from text format (e.g., "Fall • Winter" or "Spring, Summer")
 */
function parseSeasonsFromText(text: string): string[] {
  const seasons: string[] = [];
  const lower = text.toLowerCase();

  // Check for each season
  if (lower.includes("spring") || lower.match(/\bspr\b/)) seasons.push("spring");
  if (lower.includes("summer") || lower.match(/\bsum\b/)) seasons.push("summer");
  if (lower.includes("fall") || lower.includes("autumn") || lower.match(/\bfal\b/)) seasons.push("fall");
  if (lower.includes("winter") || lower.match(/\bwin\b/)) seasons.push("winter");

  // Check for "all seasons" or "any season"
  if (lower.includes("all season") || lower.includes("any season")) {
    return ["spring", "summer", "fall", "winter"];
  }

  return seasons;
}

/**
 * Parse the portable-infobox from a wiki page
 * Extracts comprehensive data including prices, seasons, and metadata
 */
function parseInfobox(html: string): Partial<ScrapedItem> {
  const item: Partial<ScrapedItem> = {};
  const metadata: Record<string, unknown> = {};

  // ============ IMAGE ============
  // Extract image URL from infobox figure
  const figureMatch = html.match(
    /<figure[^>]*class="[^"]*pi-image[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[\s\S]*?<\/figure>/i
  );
  if (figureMatch?.[1]) {
    item.image_url = figureMatch[1];
  } else {
    // Fallback: look for data-src in img tags within infobox
    const imgMatch = html.match(
      /portable-infobox[\s\S]*?data-src="(https:\/\/static\.wikia\.nocookie\.net[^"]+)"/i
    );
    if (imgMatch?.[1]) {
      item.image_url = imgMatch[1];
    }
  }

  // ============ DESCRIPTION ============
  const captionMatch = html.match(/<figcaption[^>]*class="[^"]*pi-caption[^"]*"[^>]*>([\s\S]*?)<\/figcaption>/i);
  if (captionMatch?.[1]) {
    item.description = stripHtml(captionMatch[1]);
  }

  // ============ HELPER: Extract data-source values ============
  const extractDataValue = (source: string): string | null => {
    const regex = new RegExp(
      `data-source="${source}"[^>]*>[\\s\\S]*?<div[^>]*class="[^"]*pi-data-value[^"]*"[^>]*>([\\s\\S]*?)</div>`,
      "i"
    );
    const match = html.match(regex);
    return match ? stripHtml(match[1]) : null;
  };

  // ============ COMMON FIELDS ============
  
  // Location
  const location = extractDataValue("location");
  if (location) {
    item.locations = parseLocations(location);
  }

  // Weather
  const weather = extractDataValue("weather");
  if (weather) {
    item.weather = parseWeather(weather);
  }

  // Time of day
  const time = extractDataValue("time");
  if (time) {
    item.time_of_day = parseTimeOfDay(time);
  }

  // Rarity
  const rarity = extractDataValue("rarity");
  if (rarity) {
    item.rarity = parseRarity(rarity);
  }

  // Type (store in metadata)
  const itemType = extractDataValue("type");
  if (itemType) {
    metadata.type = itemType;
  }

  // ============ PRICE TABLES ============
  const priceData = parsePriceTables(html);
  if (priceData.base_price) {
    item.base_price = priceData.base_price;
  }
  if (priceData.prices && Object.keys(priceData.prices).length > 0) {
    metadata.prices = priceData.prices;
  }
  if (priceData.prices_with_perk && Object.keys(priceData.prices_with_perk).length > 0) {
    metadata.prices_with_perk = priceData.prices_with_perk;
  }

  // Fallback: try simple price extraction if no table found
  if (!item.base_price) {
    const price = extractDataValue("price") || extractDataValue("sell") || extractDataValue("base");
    if (price) {
      item.base_price = parsePrice(price);
    }
  }

  // ============ SEASONS (Two formats) ============
  
  // Format 1: Table with checkmarks (fish use this)
  const seasons: string[] = [];
  const seasonTableMatch = html.match(
    /<table[^>]*class="[^"]*pi-horizontal-group[^"]*"[^>]*>[\s\S]*?<caption[^>]*>Season<\/caption>[\s\S]*?<\/table>/i
  );
  
  if (seasonTableMatch) {
    const tableHtml = seasonTableMatch[0];
    
    const checkSeason = (season: string): void => {
      // Match <td ... data-source="season" ...>content</td>
      const cellRegex = new RegExp(
        `<td[^>]*data-source="${season}"[^>]*>([\\s\\S]*?)</td>`,
        "i"
      );
      const cellMatch = tableHtml.match(cellRegex);
      if (cellMatch?.[1]) {
        const content = cellMatch[1];
        // Check for checkmark (✓ or \u2713) or image (checkmark image) or non-empty non-dash content
        if (content.includes("✓") || content.includes("\u2713") || 
            content.includes("<img") ||
            (stripHtml(content).trim().length > 0 && !stripHtml(content).includes("—"))) {
          seasons.push(season);
        }
      }
    };

    checkSeason("spring");
    checkSeason("summer");
    checkSeason("fall");
    checkSeason("winter");
  }

  // Format 2: Text field (insects/critters/crops use this)
  if (seasons.length === 0) {
    const seasonText = extractDataValue("season");
    if (seasonText) {
      const parsedSeasons = parseSeasonsFromText(seasonText);
      seasons.push(...parsedSeasons);
    }
  }

  if (seasons.length > 0) {
    item.seasons = seasons;
  }

  // ============ FISH-SPECIFIC FIELDS ============
  
  // Difficulty (Easy, Medium, Hard)
  const difficulty = extractDataValue("difficulty");
  if (difficulty) {
    metadata.difficulty = difficulty;
  }

  // Size (Small, Medium, Large)
  const size = extractDataValue("size");
  if (size) {
    metadata.size = size;
  }

  // Pattern (Straight, Sinker, Dart, Mixed, Floater)
  const pattern = extractDataValue("pattern");
  if (pattern) {
    metadata.pattern = pattern;
  }

  // ============ CROP-SPECIFIC FIELDS ============

  // Seed info (extract name and price)
  const seed = extractDataValue("seed");
  if (seed) {
    const seedInfo: { name?: string; price?: number } = {};
    seedInfo.name = seed.replace(/\d+\s*[Gg]?$/g, "").trim(); // Remove trailing price
    const seedPriceMatch = seed.match(/(\d+)\s*[Gg]?$/);
    if (seedPriceMatch) {
      seedInfo.price = parseInt(seedPriceMatch[1], 10);
    }
    if (seedInfo.name) {
      metadata.seed = seedInfo;
    }
  }

  // Growth time
  const growthTime = extractDataValue("growth") || extractDataValue("grow");
  if (growthTime) {
    const daysMatch = growthTime.match(/(\d+)\s*days?/i);
    if (daysMatch) {
      metadata.growth_days = parseInt(daysMatch[1], 10);
    }
    // Check for regrowth
    const regrowthMatch = growthTime.match(/regrow[^\d]*(\d+)/i);
    if (regrowthMatch) {
      metadata.regrowth_days = parseInt(regrowthMatch[1], 10);
    }
  }

  // Regrowth (sometimes separate field)
  const regrowth = extractDataValue("regrowth") || extractDataValue("regrow");
  if (regrowth && !metadata.regrowth_days) {
    const daysMatch = regrowth.match(/(\d+)/);
    if (daysMatch) {
      metadata.regrowth_days = parseInt(daysMatch[1], 10);
    }
  }

  // Unlock requirement
  const unlock = extractDataValue("unlock") || extractDataValue("unlocked");
  if (unlock) {
    metadata.unlock_requirement = unlock;
  }

  // ============ ARTISAN-SPECIFIC FIELDS ============

  // Machine (equipment used to craft)
  const machine = extractDataValue("machine");
  if (machine) {
    metadata.equipment = machine;
  }

  // Input ingredient
  const input = extractDataValue("input");
  if (input) {
    metadata.input = input;
  }

  // Processing time (careful not to overwrite time_of_day parsing)
  const processingTime = extractDataValue("time");
  if (processingTime && !item.time_of_day?.length) {
    const daysMatch = processingTime.match(/(\d+)\s*days?/i);
    const hoursMatch = processingTime.match(/(\d+)\s*hours?/i);
    const minutesMatch = processingTime.match(/(\d+)\s*min/i);
    if (daysMatch) {
      metadata.processing_time = `${daysMatch[1]} days`;
      metadata.processing_days = parseInt(daysMatch[1], 10);
    } else if (hoursMatch) {
      metadata.processing_time = `${hoursMatch[1]} hours`;
      metadata.processing_hours = parseInt(hoursMatch[1], 10);
    } else if (minutesMatch) {
      metadata.processing_time = `${minutesMatch[1]} min`;
      metadata.processing_minutes = parseInt(minutesMatch[1], 10);
    }
  }

  // Item group (Wine, Cheese, Oil, etc.)
  const itemGroup = extractDataValue("item_group");
  if (itemGroup) {
    metadata.item_group = itemGroup;
  }

  // ============ STORE METADATA ============
  if (Object.keys(metadata).length > 0) {
    item.metadata = metadata;
  }

  return item;
}

// ============ Progress Display ============

function showProgress(current: number, total: number, itemName: string): void {
  const pct = Math.round((current / total) * 100);
  const bar = "█".repeat(Math.floor(pct / 5)) + "░".repeat(20 - Math.floor(pct / 5));
  process.stdout.write(`\r  [${bar}] ${current}/${total} (${pct}%) - ${itemName.substring(0, 30).padEnd(30)}`);
}

function clearProgress(): void {
  process.stdout.write("\r" + " ".repeat(80) + "\r");
}

// ============ Category Scrapers ============

/**
 * Scrape fish - fetch individual pages for accurate season/time/weather data
 */
async function scrapeFish(fastMode: boolean): Promise<ScrapedItem[]> {
  const items: ScrapedItem[] = [];
  const skipItems = new Set(["Fish", "Fish/beta"]);

  console.log("  Fetching fish list from Category:Fish...");
  const fishNames = await fetchCategoryMembers("Category:Fish");
  
  // Filter out non-fish pages
  const validFish = [...fishNames].filter(name => !skipItems.has(name));
  console.log(`  Found ${validFish.length} fish`);

  if (fastMode) {
    // Fast mode: just return names with no details
    for (const name of validFish) {
      items.push({ name, seasons: [], time_of_day: [], weather: [] });
    }
    return items;
  }

  // Fetch individual pages for details
  console.log("  Fetching individual fish pages...");
  
  for (let i = 0; i < validFish.length; i++) {
    const name = validFish[i]!;
    showProgress(i + 1, validFish.length, name);

    const details = await fetchItemDetails(name);
    
    const item: ScrapedItem = {
      name,
      seasons: details?.seasons || [],
      time_of_day: details?.time_of_day || [],
      weather: details?.weather || [],
      locations: details?.locations || [],
      rarity: details?.rarity || "common",
      base_price: details?.base_price,
      image_url: details?.image_url,
      description: details?.description,
      metadata: details?.metadata || {},
    };

    items.push(item);
  }

  clearProgress();
  return items;
}

/**
 * Scrape insects - use category cross-referencing for seasons/time + individual pages
 */
async function scrapeInsects(fastMode: boolean): Promise<ScrapedItem[]> {
  const items: ScrapedItem[] = [];
  const skipItems = new Set(["Insect", "Bug catching"]);

  console.log("  Fetching insect list from Category:Insects...");
  const insectNames = await fetchCategoryMembers("Category:Insects");
  
  const validInsects = [...insectNames].filter(name => !skipItems.has(name));
  console.log(`  Found ${validInsects.length} insects`);

  // Fetch season categories
  console.log("  Fetching season categories...");
  const springInsects = await fetchCategoryMembers("Category:Spring_insects");
  const summerInsects = await fetchCategoryMembers("Category:Summer_insects");
  const fallInsects = await fetchCategoryMembers("Category:Fall_insects");
  const winterInsects = await fetchCategoryMembers("Category:Winter_insects");

  // Fetch time categories
  console.log("  Fetching time categories...");
  const dayInsects = await fetchCategoryMembers("Category:Day_insects");
  const nightInsects = await fetchCategoryMembers("Category:Night_insects");

  if (fastMode) {
    // Fast mode: use category data only
    for (const name of validInsects) {
      const seasons: string[] = [];
      if (springInsects.has(name)) seasons.push("spring");
      if (summerInsects.has(name)) seasons.push("summer");
      if (fallInsects.has(name)) seasons.push("fall");
      if (winterInsects.has(name)) seasons.push("winter");

      const timeOfDay: string[] = [];
      if (dayInsects.has(name)) timeOfDay.push("morning", "afternoon", "evening");
      if (nightInsects.has(name)) timeOfDay.push("night");

      items.push({
        name,
        seasons: seasons.length > 0 ? seasons : [], // Empty = any
        time_of_day: timeOfDay.length > 0 ? [...new Set(timeOfDay)] : [], // Empty = any
        weather: [],
      });
    }
    return items;
  }

  // Full mode: fetch individual pages too
  console.log("  Fetching individual insect pages...");
  
  for (let i = 0; i < validInsects.length; i++) {
    const name = validInsects[i]!;
    showProgress(i + 1, validInsects.length, name);

    // Get seasons from categories (as fallback)
    const categorySeasons: string[] = [];
    if (springInsects.has(name)) categorySeasons.push("spring");
    if (summerInsects.has(name)) categorySeasons.push("summer");
    if (fallInsects.has(name)) categorySeasons.push("fall");
    if (winterInsects.has(name)) categorySeasons.push("winter");

    // Get time from categories (as fallback)
    const categoryTime: string[] = [];
    if (dayInsects.has(name)) categoryTime.push("morning", "afternoon", "evening");
    if (nightInsects.has(name)) categoryTime.push("night");

    // Fetch individual page for full details
    const details = await fetchItemDetails(name);

    // Prefer infobox data over category data when available
    const seasons = details?.seasons && details.seasons.length > 0 
      ? details.seasons 
      : categorySeasons;
    
    const timeOfDay = details?.time_of_day && details.time_of_day.length > 0
      ? details.time_of_day
      : categoryTime.length > 0 ? [...new Set(categoryTime)] : [];

    const item: ScrapedItem = {
      name,
      seasons: seasons.length > 0 ? seasons : [], // Empty = any season
      time_of_day: timeOfDay.length > 0 ? timeOfDay : [], // Empty = any time
      weather: details?.weather || [],
      locations: details?.locations || [],
      rarity: details?.rarity || "common",
      base_price: details?.base_price,
      image_url: details?.image_url,
      description: details?.description,
      metadata: details?.metadata || {},
    };

    items.push(item);
  }

  clearProgress();
  return items;
}

/**
 * Scrape critters - underwater creatures, always available (no season/time filtering)
 */
async function scrapeCritters(fastMode: boolean): Promise<ScrapedItem[]> {
  const items: ScrapedItem[] = [];
  const skipItems = new Set(["Critter"]);

  console.log("  Fetching critter list from Category:Critters...");
  const critterNames = await fetchCategoryMembers("Category:Critters");
  
  const validCritters = [...critterNames].filter(name => !skipItems.has(name));
  console.log(`  Found ${validCritters.length} critters`);

  if (fastMode) {
    for (const name of validCritters) {
      items.push({
        name,
        seasons: [], // Empty = any (always available underwater)
        time_of_day: [], // Empty = any
        weather: [],
        locations: ["Ocean", "Diving"],
      });
    }
    return items;
  }

  // Fetch individual pages
  console.log("  Fetching individual critter pages...");
  
  for (let i = 0; i < validCritters.length; i++) {
    const name = validCritters[i]!;
    showProgress(i + 1, validCritters.length, name);

    const details = await fetchItemDetails(name);

    const item: ScrapedItem = {
      name,
      // Use parsed seasons from infobox, empty array means "any season"
      seasons: details?.seasons || [],
      time_of_day: details?.time_of_day || [],
      weather: details?.weather || [],
      locations: details?.locations || ["Ocean", "Diving"],
      rarity: details?.rarity || "common",
      base_price: details?.base_price,
      image_url: details?.image_url,
      description: details?.description,
      metadata: details?.metadata || {},
    };

    items.push(item);
  }

  clearProgress();
  return items;
}

/**
 * Scrape crops - use season categories + individual pages for images/prices
 */
async function scrapeCrops(fastMode: boolean): Promise<ScrapedItem[]> {
  const itemsMap = new Map<string, ScrapedItem>();
  const skipItems = new Set(["Crop", "Fruit plant", "Fruit tree", "Artisan product."]);

  // Get crops by season category
  const seasonCategories = [
    { category: "Category:Spring_crops", season: "spring" },
    { category: "Category:Summer_crops", season: "summer" },
    { category: "Category:Fall_crops", season: "fall" },
    { category: "Category:Winter_crops", season: "winter" },
    { category: "Category:Any_season_crops", season: "all" },
    { category: "Category:Ocean_crops", season: "ocean" },
  ];

  console.log("  Fetching crop categories...");
  
  for (const { category, season } of seasonCategories) {
    const members = await fetchCategoryMembers(category);
    
    for (const name of members) {
      if (skipItems.has(name)) continue;

      const existing = itemsMap.get(name);
      if (existing) {
        if (season === "all") {
          existing.seasons = ["spring", "summer", "fall", "winter"];
        } else if (season === "ocean") {
          existing.metadata = { ...existing.metadata, ocean: true };
        } else if (!existing.seasons?.includes(season)) {
          existing.seasons?.push(season);
        }
      } else {
        const item: ScrapedItem = {
          name,
          seasons: season === "all" ? ["spring", "summer", "fall", "winter"] : 
                   season === "ocean" ? ["spring", "summer", "fall", "winter"] : [season],
          time_of_day: [], // N/A for crops
          weather: [], // N/A for crops
          metadata: season === "ocean" ? { ocean: true } : {},
        };
        itemsMap.set(name, item);
      }
    }
  }

  const cropNames = [...itemsMap.keys()];
  console.log(`  Found ${cropNames.length} crops`);

  if (fastMode) {
    return [...itemsMap.values()];
  }

  // Fetch individual pages for images, prices, and crop-specific data
  console.log("  Fetching individual crop pages...");
  
  for (let i = 0; i < cropNames.length; i++) {
    const name = cropNames[i]!;
    showProgress(i + 1, cropNames.length, name);

    const details = await fetchItemDetails(name);
    const item = itemsMap.get(name)!;

    if (details) {
      item.base_price = details.base_price;
      item.image_url = details.image_url;
      item.description = details.description;
      item.locations = details.locations;
      
      // Merge metadata (preserve existing ocean flag, add crop-specific data)
      item.metadata = {
        ...item.metadata,
        ...details.metadata,
      };
    }
  }

  clearProgress();
  return [...itemsMap.values()];
}

/**
 * Scrape artifacts
 */
async function scrapeArtifacts(fastMode: boolean): Promise<ScrapedItem[]> {
  const items: ScrapedItem[] = [];
  const skipItems = new Set(["Artifact"]);

  console.log("  Fetching artifact list from Category:Artifacts...");
  const artifactNames = await fetchCategoryMembers("Category:Artifacts");
  
  const validArtifacts = [...artifactNames].filter(name => !skipItems.has(name));
  console.log(`  Found ${validArtifacts.length} artifacts`);

  if (fastMode) {
    for (const name of validArtifacts) {
      items.push({
        name,
        seasons: [], // N/A
        time_of_day: [], // N/A
        weather: [],
        locations: ["Digging", "Geodes"],
      });
    }
    return items;
  }

  // Fetch individual pages
  console.log("  Fetching individual artifact pages...");
  
  for (let i = 0; i < validArtifacts.length; i++) {
    const name = validArtifacts[i]!;
    showProgress(i + 1, validArtifacts.length, name);

    const details = await fetchItemDetails(name);

    const item: ScrapedItem = {
      name,
      seasons: [], // N/A for artifacts
      time_of_day: [], // N/A
      weather: [],
      locations: details?.locations || ["Digging", "Geodes"],
      rarity: details?.rarity || "common",
      base_price: details?.base_price,
      image_url: details?.image_url,
      description: details?.description,
      metadata: details?.metadata || {},
    };

    items.push(item);
  }

  clearProgress();
  return items;
}

/**
 * Scrape gems
 */
async function scrapeGems(fastMode: boolean): Promise<ScrapedItem[]> {
  const items: ScrapedItem[] = [];
  const skipItems = new Set(["Gem"]);

  console.log("  Fetching gem list from Category:Gems...");
  const gemNames = await fetchCategoryMembers("Category:Gems");
  
  const validGems = [...gemNames].filter(name => !skipItems.has(name));
  console.log(`  Found ${validGems.length} gems`);

  if (fastMode) {
    for (const name of validGems) {
      items.push({
        name,
        seasons: [], // N/A
        time_of_day: [], // N/A
        weather: [],
        locations: ["Mining", "Geodes"],
      });
    }
    return items;
  }

  // Fetch individual pages
  console.log("  Fetching individual gem pages...");
  
  for (let i = 0; i < validGems.length; i++) {
    const name = validGems[i]!;
    showProgress(i + 1, validGems.length, name);

    // Fetch page details and categories in parallel-ish (with delay between)
    const details = await fetchItemDetails(name);
    const categories = await fetchPageCategories(name);
    
    // For gems, rarity is in page categories (e.g., "Super rare gem", "Rare gem")
    const categoryRarity = parseRarityFromCategories(categories);
    const rarity = categoryRarity || details?.rarity || "common";

    const item: ScrapedItem = {
      name,
      seasons: [], // N/A for gems
      time_of_day: [], // N/A
      weather: [],
      locations: details?.locations || ["Mining", "Geodes"],
      rarity,
      base_price: details?.base_price,
      image_url: details?.image_url,
      description: details?.description,
      metadata: details?.metadata || {},
    };

    items.push(item);
  }

  clearProgress();
  return items;
}

/**
 * Scrape forageables - land forageables and ocean scavengeables
 * Uses season categories to determine availability
 */
async function scrapeForageables(fastMode: boolean): Promise<ScrapedItem[]> {
  const itemsMap = new Map<string, ScrapedItem>();
  const oceanItems = new Set<string>();
  
  // Skip non-item pages and items that belong to other categories
  const skipItems = new Set([
    "Foraging",
    "Trees",
    "Scavengeables",
    "Category:Scavengeables",
  ]);

  // First, get the list of ocean scavengeables to flag them
  console.log("  Fetching ocean scavengeables list...");
  const oceanScavengeables = await fetchCategoryMembers("Category:Ocean_scavengeables");
  for (const name of oceanScavengeables) {
    oceanItems.add(name);
  }
  console.log(`  Found ${oceanItems.size} ocean items`);

  // Get forageables by season category
  const seasonCategories = [
    { category: "Category:Spring_scavengeables", season: "spring" },
    { category: "Category:Summer_scavengeables", season: "summer" },
    { category: "Category:Fall_scavengeables", season: "fall" },
    { category: "Category:Winter_scavengeables", season: "winter" },
    { category: "Category:Any_season_scavengeables", season: "all" },
  ];

  console.log("  Fetching seasonal scavengeable categories...");
  
  for (const { category, season } of seasonCategories) {
    const members = await fetchCategoryMembers(category);
    
    for (const name of members) {
      if (skipItems.has(name) || name.startsWith("Category:")) continue;

      const existing = itemsMap.get(name);
      const isOcean = oceanItems.has(name);
      
      if (existing) {
        // Add season if not already present
        if (season === "all") {
          existing.seasons = ["spring", "summer", "fall", "winter"];
        } else if (!existing.seasons?.includes(season)) {
          existing.seasons?.push(season);
        }
      } else {
        const item: ScrapedItem = {
          name,
          seasons: season === "all" ? ["spring", "summer", "fall", "winter"] : [season],
          time_of_day: [], // N/A for forageables
          weather: [], // N/A for forageables
          locations: isOcean ? ["Ocean (Diving)"] : [],
          metadata: isOcean ? { is_ocean: true } : {},
        };
        itemsMap.set(name, item);
      }
    }
  }

  // Also fetch from main Scavengeables category to catch any missed items
  console.log("  Fetching main scavengeables category...");
  const allScavengeables = await fetchCategoryMembers("Category:Scavengeables");
  
  for (const name of allScavengeables) {
    if (skipItems.has(name) || name.startsWith("Category:")) continue;
    
    if (!itemsMap.has(name)) {
      const isOcean = oceanItems.has(name);
      const item: ScrapedItem = {
        name,
        seasons: isOcean ? ["spring", "summer", "fall", "winter"] : [], // Ocean items available all seasons
        time_of_day: [],
        weather: [],
        locations: isOcean ? ["Ocean (Diving)"] : [],
        metadata: isOcean ? { is_ocean: true } : {},
      };
      itemsMap.set(name, item);
    }
  }

  const forageableNames = [...itemsMap.keys()];
  console.log(`  Found ${forageableNames.length} forageables total`);

  if (fastMode) {
    return [...itemsMap.values()];
  }

  // Fetch individual pages for detailed info
  console.log("  Fetching individual forageable pages...");
  
  for (let i = 0; i < forageableNames.length; i++) {
    const name = forageableNames[i]!;
    showProgress(i + 1, forageableNames.length, name);

    const details = await fetchItemDetails(name);
    const item = itemsMap.get(name)!;

    if (details) {
      item.base_price = details.base_price;
      item.image_url = details.image_url;
      item.description = details.description;
      
      // Use locations from wiki if available, otherwise keep default
      if (details.locations && details.locations.length > 0) {
        item.locations = details.locations;
      }
      
      // Merge metadata (preserve is_ocean flag, add other details)
      item.metadata = {
        ...item.metadata,
        ...details.metadata,
      };

      // Try to determine item group from type or infer from name/category
      if (!item.metadata.item_group) {
        item.metadata.item_group = inferItemGroup(name, details);
      }
    }
  }

  clearProgress();
  return [...itemsMap.values()];
}

/**
 * Infer the item group (Shell, Mushroom, Flower, etc.) from name and details
 */
function inferItemGroup(name: string, details: Partial<ScrapedItem> | null): string {
  const nameLower = name.toLowerCase();
  const typeLower = (details?.metadata?.type as string || "").toLowerCase();
  
  // Check for specific patterns
  if (nameLower.includes("shell") || nameLower.includes("cowry")) return "Shell";
  if (nameLower.includes("clam") || nameLower.includes("quahog") || nameLower.includes("geoduck")) return "Clam";
  if (nameLower.includes("oyster")) return "Oyster";
  if (nameLower.includes("mussel")) return "Mussel";
  if (nameLower.includes("scallop")) return "Scallop";
  if (nameLower.includes("urchin")) return "Sea Urchin";
  if (nameLower.includes("barnacle")) return "Clam";
  if (nameLower.includes("seaweed") || nameLower.includes("kelp") || nameLower.includes("arame") || 
      nameLower.includes("kombu") || nameLower.includes("wakame") || nameLower.includes("lettuce") ||
      nameLower.includes("grapes")) return "Seaweed";
  if (nameLower.includes("mushroom") || nameLower.includes("morel") || nameLower.includes("shiitake") ||
      nameLower.includes("matsutake") || nameLower.includes("trumpet")) return "Mushroom";
  if (nameLower.includes("coconut")) return "Coconut";
  if (typeLower.includes("flower") || nameLower.includes("hibiscus") || nameLower.includes("lotus") ||
      nameLower.includes("tulip") || nameLower.includes("daffodil") || nameLower.includes("violet") ||
      nameLower.includes("pansy") || nameLower.includes("larkspur") || nameLower.includes("cosmo") ||
      nameLower.includes("jepun") || nameLower.includes("rafflesia") || nameLower.includes("titan arum")) return "Flower";
  if (nameLower.includes("ginger") || nameLower.includes("ginseng") || nameLower.includes("wasabi") ||
      nameLower.includes("bamboo")) return "Herb";
  if (nameLower.includes("cherry") || nameLower.includes("fig") || nameLower.includes("mangosteen") ||
      nameLower.includes("chestnut") || nameLower.includes("berry")) return "Fruit";
  if (nameLower.includes("kale") || nameLower.includes("celery") || nameLower.includes("brussels") ||
      nameLower.includes("eggplant") || nameLower.includes("canola") || nameLower.includes("shallot") ||
      nameLower.includes("watercress")) return "Vegetable";
  
  // Default based on metadata type if available
  if (typeLower) {
    if (typeLower.includes("herb")) return "Herb";
    if (typeLower.includes("vegetable")) return "Vegetable";
    if (typeLower.includes("fruit")) return "Fruit";
  }
  
  return "Other";
}

// ============ Artisan Products Scraper ============

/**
 * Equipment categories for artisan products
 */
const EQUIPMENT_CATEGORIES = [
  "Category:Aging_barrel",
  "Category:Bee_house",
  "Category:Cheese_press",
  "Category:Dehydrator",
  "Category:Keg",
  "Category:Loom",
  "Category:Mason_jar",
  "Category:Mayonnaise_machine",
  "Category:Mill",
  "Category:Oil_press",
  "Category:Tap",
] as const;

/**
 * Map equipment category names to display names
 */
const EQUIPMENT_NAMES: Record<string, string> = {
  "Category:Aging_barrel": "Aging Barrel",
  "Category:Bee_house": "Bee House",
  "Category:Cheese_press": "Cheese Press",
  "Category:Dehydrator": "Dehydrator",
  "Category:Keg": "Keg",
  "Category:Loom": "Loom",
  "Category:Mason_jar": "Mason Jar",
  "Category:Mayonnaise_machine": "Mayonnaise Machine",
  "Category:Mill": "Mill",
  "Category:Oil_press": "Oil Press",
  "Category:Tap": "Tap",
};

/**
 * Scrape artisan products - processed goods from artisan equipment
 */
async function scrapeArtisanProducts(fastMode: boolean): Promise<ScrapedItem[]> {
  const itemsMap = new Map<string, ScrapedItem>();
  const equipmentMap = new Map<string, string>(); // item name -> equipment type

  const skipItems = new Set([
    "Artisan product",
    "Artisan products",
    "Artisan_product",
    "Artisan_products",
  ]);

  // Build equipment mapping by fetching each equipment category
  console.log("  Fetching equipment categories...");
  for (const category of EQUIPMENT_CATEGORIES) {
    const members = await fetchCategoryMembers(category);
    const equipmentName = EQUIPMENT_NAMES[category] || category.replace("Category:", "").replace(/_/g, " ");

    for (const name of members) {
      if (!name.startsWith("Category:") && !skipItems.has(name)) {
        equipmentMap.set(name, equipmentName);
      }
    }
  }
  console.log(`  Found ${equipmentMap.size} items with equipment mapping`);

  // Fetch all artisan products from main category
  console.log("  Fetching artisan products list...");
  const allProducts = await fetchCategoryMembers("Category:Artisan_products");

  for (const name of allProducts) {
    if (skipItems.has(name) || name.startsWith("Category:")) continue;

    const equipment = equipmentMap.get(name);

    const item: ScrapedItem = {
      name,
      seasons: [], // N/A for artisan products
      time_of_day: [],
      weather: [],
      locations: [],
      metadata: equipment ? { equipment } : {},
    };

    itemsMap.set(name, item);
  }

  const productNames = [...itemsMap.keys()];
  console.log(`  Found ${productNames.length} artisan products total`);

  if (fastMode) {
    return [...itemsMap.values()];
  }

  // Fetch individual pages for detailed info
  console.log("  Fetching individual product pages...");

  for (let i = 0; i < productNames.length; i++) {
    const name = productNames[i]!;
    showProgress(i + 1, productNames.length, name);

    const details = await fetchItemDetails(name);
    const item = itemsMap.get(name)!;

    if (details) {
      item.base_price = details.base_price;
      item.image_url = details.image_url;
      item.description = details.description;

      // Merge metadata (preserve equipment from category, add other details)
      item.metadata = {
        ...item.metadata,
        ...details.metadata,
      };

      // Use equipment from page if we didn't get it from category
      if (!item.metadata.equipment && details.metadata?.equipment) {
        item.metadata.equipment = details.metadata.equipment;
      }
    }
  }

  clearProgress();
  return [...itemsMap.values()];
}

// ============ Database Functions ============

async function clearCategory(categorySlug: string): Promise<void> {
  const category = await sql`SELECT id FROM categories WHERE slug = ${categorySlug}`;
  if (category.length > 0) {
    await sql`DELETE FROM items WHERE category_id = ${category[0]!.id}`;
    console.log(`  Cleared existing ${categorySlug} items`);
  }
}

async function insertItems(categorySlug: string, items: ScrapedItem[]): Promise<number> {
  const category = await sql`SELECT id FROM categories WHERE slug = ${categorySlug}`;
  if (category.length === 0) {
    console.error(`  Category ${categorySlug} not found`);
    return 0;
  }

  const categoryId = category[0]!.id;
  let inserted = 0;

  for (const item of items) {
    if (!item.name) continue;

    const slug = slugify(item.name);

    try {
      await sql`
        INSERT INTO items (
          category_id, name, slug, rarity, seasons, time_of_day,
          weather, locations, base_price, image_url, description, metadata
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
          ${item.image_url || null},
          ${item.description || null},
          ${item.metadata || {}}
        )
        ON CONFLICT (category_id, slug) DO UPDATE SET
          name = EXCLUDED.name,
          rarity = COALESCE(EXCLUDED.rarity, items.rarity),
          seasons = EXCLUDED.seasons,
          time_of_day = EXCLUDED.time_of_day,
          weather = EXCLUDED.weather,
          locations = EXCLUDED.locations,
          base_price = COALESCE(EXCLUDED.base_price, items.base_price),
          image_url = COALESCE(EXCLUDED.image_url, items.image_url),
          description = COALESCE(EXCLUDED.description, items.description),
          metadata = EXCLUDED.metadata
      `;
      inserted++;
    } catch (error) {
      console.error(`  Error inserting ${item.name}:`, error);
    }
  }

  return inserted;
}

// ============ Lake Temple Offerings Constants ============

// Hardcoded offerings data - scraped from wiki but stored here for reliability
// The wiki page structure is complex and changes frequently
const LAKE_TEMPLE_OFFERINGS = {
  "Crop Altar": [
    {
      name: "Essential Resources",
      items: [
        { name: "Wood", quantity: 10 },
        { name: "Stone", quantity: 10 },
        { name: "Fiber", quantity: 10 },
        { name: "Sap", quantity: 10 },
        { name: "Any tree seed", quantity: 3, note: "Maple Seeds, Oak Seeds, or Pine Cone" },
      ],
      reward: "Recycling Machine",
    },
    {
      name: "Spring Sesajen",
      items: [
        { name: "Turnip", quantity: 1 },
        { name: "Carrot", quantity: 1 },
        { name: "Daisy", quantity: 1 },
        { name: "Wasabi", quantity: 1 },
        { name: "Morel", quantity: 1 },
      ],
      reward: "Sugarcane Seeds",
    },
    {
      name: "Summer Sesajen",
      items: [
        { name: "Blueberry", quantity: 1 },
        { name: "Hot Pepper", quantity: 1 },
        { name: "Sunflower", quantity: 1 },
        { name: "Shallot", quantity: 1 },
        { name: "Hibiscus", quantity: 1 },
      ],
      reward: "Tomato Seeds",
    },
    {
      name: "Fall Sesajen",
      items: [
        { name: "Pumpkin", quantity: 1 },
        { name: "Rice", quantity: 1, quality: "bronze" },
        { name: "Orchid", quantity: 1 },
        { name: "Black Trumpet", quantity: 1 },
        { name: "Fig", quantity: 1 },
      ],
      reward: "Barley Seeds",
    },
    {
      name: "Winter Sesajen",
      items: [
        { name: "Brussel Sprouts", quantity: 1 },
        { name: "Kale", quantity: 1 },
        { name: "Rose Hip", quantity: 1 },
        { name: "Snowdrop", quantity: 1, quality: "osmium" },
        { name: "Tea Leaf", quantity: 1 },
      ],
      reward: "Tea Seed",
    },
    {
      name: "Ocean Scavengables",
      items: [
        { name: "Sea Salt", quantity: 5 },
        { name: "Eastern Oyster", quantity: 5 },
        { name: "Blue Mussel", quantity: 5 },
        { name: "Any Kelp", quantity: 10, note: "Kelp, Sea Lettuce, Wakame, etc." },
        { name: "Any Shell", quantity: 10, note: "Cowry, Conch, etc." },
      ],
      reward: "Dehydrator",
    },
  ],
  "Catch Altar": [
    {
      name: "Fresh Water Fish",
      items: [
        { name: "Catfish", quantity: 1 },
        { name: "Tilapia", quantity: 1 },
        { name: "Rainbow Fish", quantity: 1 },
        { name: "Silver Arowana", quantity: 1 },
        { name: "Koi", quantity: 1 },
      ],
      reward: "Large Fish Bait",
    },
    {
      name: "Salt Water Fish",
      items: [
        { name: "Pink Snapper", quantity: 1 },
        { name: "Lionfish", quantity: 1 },
        { name: "Asian Sheepshead", quantity: 1 },
        { name: "Yellowfin Tuna", quantity: 1 },
        { name: "Sardine", quantity: 1 },
      ],
      reward: "Small Fish Bait",
    },
    {
      name: "Rare Fish",
      items: [
        { name: "Sturgeon", quantity: 1 },
        { name: "Gator Gar", quantity: 1 },
        { name: "Arapaima", quantity: 1 },
        { name: "Giant Sea Bass", quantity: 1 },
        { name: "Yellow Moray Eel", quantity: 1 },
      ],
      reward: "Fish Pond",
    },
    {
      name: "Day Insect",
      items: [
        { name: "Pipevine Swallowtail Butterfly", quantity: 1 },
        { name: "Tiger Beetle", quantity: 1 },
        { name: "Yucca Moth", quantity: 1 },
        { name: "Assam Silk Moth", quantity: 1 },
        { name: "Monarch Caterpillar", quantity: 1 },
      ],
      reward: "Bee House",
    },
    {
      name: "Night Insect",
      items: [
        { name: "Firefly", quantity: 1 },
        { name: "Cecropia Caterpillar", quantity: 1 },
        { name: "Centipede", quantity: 1 },
        { name: "Rove Beetle", quantity: 1 },
        { name: "Atlas Moth", quantity: 1 },
      ],
      reward: "Tap",
    },
    {
      name: "Ocean Critters",
      items: [
        { name: "Cannonball Jellyfish", quantity: 1 },
        { name: "Hermit Crab", quantity: 1 },
        { name: "Sexy Shrimp", quantity: 1 },
        { name: "Sunflower Sea Star", quantity: 1 },
        { name: "Pom-pom Crab", quantity: 1 },
      ],
      reward: "Crawler Trap",
    },
  ],
  "Advanced Altar": [
    {
      name: "Barn Animals",
      items: [
        { name: "Milk", quantity: 1 },
        { name: "Goat Milk", quantity: 1 },
        { name: "Wool", quantity: 1 },
        { name: "Large Goat Milk", quantity: 1 },
        { name: "Large Wool", quantity: 1 },
        { name: "Large Milk", quantity: 1 },
      ],
      reward: "Cheese Press",
    },
    {
      name: "Coop Animals",
      items: [
        { name: "Egg", quantity: 1 },
        { name: "Duck Egg", quantity: 1 },
        { name: "Large Egg", quantity: 1 },
        { name: "Large Duck Egg", quantity: 1 },
      ],
      reward: "Mayonnaise Machine",
    },
    {
      name: "Basic Cooking",
      items: [
        { name: "Smoothie", quantity: 1 },
        { name: "Grilled Fish", quantity: 1 },
        { name: "Tomato Soup", quantity: 1 },
        { name: "Onigiri", quantity: 1 },
        { name: "Fried Rice", quantity: 1 },
      ],
      reward: "Oil Press",
    },
    {
      name: "Basic Artisan",
      items: [
        { name: "Any Mayonnaise", quantity: 1 },
        { name: "Any Fruit Juice", quantity: 1 },
        { name: "Any Butter", quantity: 1 },
        { name: "Any Dried Scavengeable", quantity: 1 },
        { name: "Any Pickle", quantity: 1 },
      ],
      reward: "Keg",
    },
    {
      name: "Fruit Plant",
      items: [
        { name: "Rambutan", quantity: 1, quality: "silver" },
        { name: "Durian", quantity: 1, quality: "silver" },
        { name: "Mango", quantity: 1, quality: "silver" },
        { name: "Dragonfruit", quantity: 1, quality: "silver" },
        { name: "Apple", quantity: 1, quality: "silver" },
      ],
      reward: "Sprinkler II",
    },
    {
      name: "Monster Drop",
      items: [
        { name: "Silky Fur", quantity: 5 },
        { name: "Monster Essence", quantity: 5 },
        { name: "Bat Wing", quantity: 5 },
        { name: "Tough Meat", quantity: 5 },
        { name: "Slime Goop", quantity: 5 },
      ],
      reward: "Explosive III",
    },
  ],
  "Rare Altar": [
    {
      name: "Rare Crops",
      items: [
        { name: "Snowdrop", quantity: 1, quality: "osmium" },
        { name: "Lemon", quantity: 1, quality: "osmium" },
        { name: "Almond", quantity: 1, quality: "osmium" },
        { name: "Cocoa Bean", quantity: 1, quality: "osmium" },
        { name: "Coffee Bean", quantity: 1, quality: "osmium" },
      ],
      reward: "Sprinkler III",
    },
    {
      name: "Greenhouse Crops",
      items: [
        { name: "Garlic", quantity: 1 },
        { name: "Cotton", quantity: 1 },
        { name: "Cactus", quantity: 1 },
        { name: "Vanilla", quantity: 1 },
        { name: "Saffron", quantity: 1 },
      ],
      reward: "Slime of Replication",
    },
    {
      name: "Advanced Cooking",
      items: [
        { name: "Vegan Taco", quantity: 1 },
        { name: "Apple Pie", quantity: 1 },
        { name: "Serabi", quantity: 1 },
        { name: "Pad Thai", quantity: 1 },
        { name: "Es Cendol", quantity: 1 },
      ],
      reward: "Jamu Recipe",
    },
    {
      name: "Master Artisan",
      items: [
        { name: "Titan Arum Black Honey", quantity: 1 },
        { name: "Any Kimchi", quantity: 1 },
        { name: "Any Wine", quantity: 1 },
        { name: "Fermented Goat Cheese Wheel", quantity: 1 },
        { name: "White Truffle Oil", quantity: 1 },
      ],
      reward: "Aging Barrel",
    },
    {
      name: "Rare Animal Products",
      items: [
        { name: "Black Truffle", quantity: 1 },
        { name: "Large Quail Egg", quantity: 1 },
        { name: "Large Llama Wool", quantity: 1 },
        { name: "Large Feather", quantity: 1 },
        { name: "Large Gesha Coffee Bean", quantity: 1 },
      ],
      reward: "Auto Petter",
    },
    {
      name: "Kelp Essence",
      items: [
        { name: "Gold Bar", quantity: 1 },
        { name: "Silver Bar", quantity: 1 },
        { name: "Bronze Bar", quantity: 1 },
        { name: "Gold Kelp Essence", quantity: 1 },
        { name: "Silver Kelp Essence", quantity: 1 },
        { name: "Bronze Kelp Essence", quantity: 1 },
      ],
      reward: "Osmium Kelp Essence",
    },
  ],
};

// Image URLs for offerings (scraped from wiki)
const OFFERING_IMAGES: Record<string, string> = {
  "Essential Resources": "https://static.wikia.nocookie.net/coralisland/images/b/b8/Essential_Resources_Offering.png",
  "Spring Sesajen": "https://static.wikia.nocookie.net/coralisland/images/d/d2/Spring_Sesajen_Offering.png",
  "Summer Sesajen": "https://static.wikia.nocookie.net/coralisland/images/d/de/Summer_Sesajen_Offering.png",
  "Fall Sesajen": "https://static.wikia.nocookie.net/coralisland/images/b/b6/Fall_Sesajen_Offering.png",
  "Winter Sesajen": "https://static.wikia.nocookie.net/coralisland/images/e/e7/Winter_Sesajen_Offering.png",
  "Ocean Scavengables": "https://static.wikia.nocookie.net/coralisland/images/1/1b/Ocean_Scavengables_Offering.png",
  "Fresh Water Fish": "https://static.wikia.nocookie.net/coralisland/images/f/f6/Fresh_Water_Fish_Offering.png",
  "Salt Water Fish": "https://static.wikia.nocookie.net/coralisland/images/3/35/Salt_Water_Fish_Offering.png",
  "Rare Fish": "https://static.wikia.nocookie.net/coralisland/images/f/f6/Rare_Fish_Offering.png",
  "Day Insect": "https://static.wikia.nocookie.net/coralisland/images/6/64/Day_Insect_Offering.png",
  "Night Insect": "https://static.wikia.nocookie.net/coralisland/images/c/c6/Night_Insect_Offering.png",
  "Ocean Critters": "https://static.wikia.nocookie.net/coralisland/images/1/16/Ocean_Critters_Offering.png",
  "Barn Animals": "https://static.wikia.nocookie.net/coralisland/images/7/70/Barn_Animals_Offering.png",
  "Coop Animals": "https://static.wikia.nocookie.net/coralisland/images/2/22/Coop_Animals_Offering.png",
  "Basic Cooking": "https://static.wikia.nocookie.net/coralisland/images/9/93/Basic_Cooking_Offering.png",
  "Basic Artisan": "https://static.wikia.nocookie.net/coralisland/images/6/69/Basic_Artisan_Offering.png",
  "Fruit Plant": "https://static.wikia.nocookie.net/coralisland/images/3/37/Fruit_Plant_Offering.png",
  "Monster Drop": "https://static.wikia.nocookie.net/coralisland/images/0/0e/Monster_Drop_Offering.png",
  "Rare Crops": "https://static.wikia.nocookie.net/coralisland/images/9/96/Rare_Crops_Offering.png",
  "Greenhouse Crops": "https://static.wikia.nocookie.net/coralisland/images/4/4a/Greenhouse_Crops_Offering.png",
  "Advanced Cooking": "https://static.wikia.nocookie.net/coralisland/images/a/a1/Advanced_Cooking_Offering.png",
  "Master Artisan": "https://static.wikia.nocookie.net/coralisland/images/5/5a/Master_Artisan_Offering.png",
  "Rare Animal Products": "https://static.wikia.nocookie.net/coralisland/images/e/e2/Rare_Animal_Products_Offering.png",
  "Kelp Essence": "https://static.wikia.nocookie.net/coralisland/images/8/8c/Kelp_Essence_Offering.png",
};

/**
 * Scrape Lake Temple offerings - uses hardcoded data as wiki structure is complex
 */
async function scrapeLakeTemple(_fastMode: boolean): Promise<ScrapedItem[]> {
  const items: ScrapedItem[] = [];

  console.log("  Processing Lake Temple offerings from hardcoded data...");
  
  for (const [altarName, offerings] of Object.entries(LAKE_TEMPLE_OFFERINGS)) {
    for (const offering of offerings) {
      const item: ScrapedItem = {
        name: offering.name,
        locations: [altarName], // Use locations field as altar filter
        image_url: OFFERING_IMAGES[offering.name],
        metadata: {
          altar: altarName,
          required_items: offering.items,
          reward: offering.reward,
          item_count: offering.items.length,
        },
      };
      items.push(item);
    }
  }

  console.log(`  Found ${items.length} offerings across 4 altars`);
  return items;
}

// ============ Cooking Scraper ============

/**
 * Recipe source categories for filtering
 */
type RecipeSourceCategory = "Starting" | "General Store" | "Friendship" | "Quest" | "Other";

/**
 * Categorize recipe source text for filtering
 */
function categorizeRecipeSource(source: string): RecipeSourceCategory {
  const lower = source.toLowerCase();
  
  // Check for friendship patterns like "Sam 3 hearts", "Aaliyah ♥♥♥", "Raj 3"
  if (lower.includes("heart") || source.includes("♥") || /\b\d+\s*♥/.test(source) || 
      /^[a-z]+\s+\d+$/i.test(source.trim())) {
    return "Friendship";
  }
  
  // Check for store purchases - "General Store", "store", "shop", prices like "2500g"
  if (lower.includes("store") || lower.includes("shop") || lower.includes("purchase") || 
      lower.includes("buy") || /\d+\s*g\b/.test(lower)) {
    return "General Store";
  }
  
  // Check for quests
  if (lower.includes("quest") || lower.includes("reward") || lower.includes("complete") ||
      lower.includes("mission")) {
    return "Quest";
  }
  
  // Check for starting/default recipes
  if (lower.includes("start") || lower.includes("default") || lower.includes("known") ||
      lower.includes("initial") || lower === "-" || lower === "n/a") {
    return "Starting";
  }
  
  return "Other";
}

/**
 * Parse recipe source HTML into clean, display-friendly text
 * Examples:
 *   - "Emily 4 ♥" (from friendship)
 *   - "Catching level 2" (from skill)
 *   - "Manual cooking" (when no specific source)
 */
function parseRecipeSource(html: string): {
  display: string;
  character?: string;
  hearts?: number;
  source_type: RecipeSourceCategory;
} {
  // First, get the stripped text for analysis
  const text = stripHtml(html);
  
  // Extract character name from title attribute (first link is usually the character)
  const charMatch = html.match(/<a[^>]*title="([^"/]+)"[^>]*>/i);
  let character = charMatch?.[1]?.trim();
  
  // Filter out non-character links (like "Friendship", "Letters", etc.)
  if (character && (
    character.toLowerCase().includes("letter") ||
    character.toLowerCase().includes("friendship") ||
    character.toLowerCase().includes("heart") ||
    character.toLowerCase() === "mail"
  )) {
    character = undefined;
  }
  
  // Extract heart level - patterns like "4 ♥", "(4 hearts)", "4 hearts", or just "4" after a name
  const heartsMatch = text.match(/(\d+)\s*(?:♥|hearts?|\((\d+)\s*hearts?\))/i) ||
                      (character ? text.match(new RegExp(`${character}\\s*(\\d+)`, "i")) : null);
  const hearts = heartsMatch ? parseInt(heartsMatch[1] || heartsMatch[2]!, 10) : undefined;
  
  // Check for skill level pattern like "Catching level 2"
  const skillMatch = text.match(/(Catching|Fishing|Farming|Mining|Foraging|Combat|Ranching|Diving)\s*(?:level|mastery)?\s*(\d+)/i);
  
  // Build clean display text
  let display = "";
  if (character && hearts) {
    display = `${character} ${hearts} ♥`;
  } else if (skillMatch) {
    display = `${skillMatch[1]} level ${skillMatch[2]}`;
  } else {
    // Clean up any remaining text
    display = text
      .replace(/\/Letters.*$/i, "")           // Remove "/Letters#Recipe_name"
      .replace(/\([^)]*hearts?\)/gi, "")      // Remove "(X hearts)" patterns
      .replace(/♥+/g, "")                     // Remove heart symbols
      .replace(/\s+/g, " ")                   // Collapse whitespace
      .trim();
  }
  
  // If display is empty, just whitespace, or unhelpful, default to "Manual cooking"
  if (!display || display === "-" || display === "N/A" || display.length < 2) {
    display = "Manual cooking";
  }
  
  const source_type = categorizeRecipeSource(html + " " + text);
  
  return { display, character, hearts, source_type };
}

/**
 * Parse buffs from text like "+2 Farming (7 min)" or "Farming +2 for 7 min"
 * Returns array of { type, value, duration }
 */
function parseBuffs(text: string): Array<{ type: string; value: number; duration: string }> {
  const buffs: Array<{ type: string; value: number; duration: string }> = [];
  
  // Known buff types
  const buffTypes = [
    "Farming", "Fishing", "Mining", "Foraging", "Combat", 
    "Speed", "Luck", "Defense", "Max Energy", "Attack",
    "Max Stamina", "Max Health"
  ];
  
  for (const buffType of buffTypes) {
    // Pattern 1: "+2 Farming (7 min)" or "+2 Farming 7 min"
    const pattern1 = new RegExp(`[+]?(\\d+)\\s*${buffType}[^\\d]*(\\d+\\s*(?:min|hour|sec|m|h|s))`, "i");
    // Pattern 2: "Farming +2 (7 min)" or "Farming +2 for 7 min"
    const pattern2 = new RegExp(`${buffType}\\s*[+]?(\\d+)[^\\d]*(\\d+\\s*(?:min|hour|sec|m|h|s))`, "i");
    // Pattern 3: Just "+2 Farming" without duration (assume standard duration)
    const pattern3 = new RegExp(`[+](\\d+)\\s*${buffType}(?!\\d)`, "i");
    
    let match = text.match(pattern1) || text.match(pattern2);
    if (match) {
      buffs.push({
        type: buffType,
        value: parseInt(match[1]!, 10),
        duration: match[2]!.replace(/\s+/g, " ").trim(),
      });
    } else {
      match = text.match(pattern3);
      if (match) {
        buffs.push({
          type: buffType,
          value: parseInt(match[1]!, 10),
          duration: "7 min", // Default duration
        });
      }
    }
  }
  
  return buffs;
}

/**
 * Parse ingredients from the icon-list HTML structure used in the cooking table
 * Returns array of { name, quantity }
 */
function parseCookingIngredients(html: string): Array<{ name: string; quantity: number }> {
  const ingredients: Array<{ name: string; quantity: number }> = [];
  
  // Look for custom-icon elements within the cell
  // Pattern: <a ... title="ItemName">...</a> followed by optional quantity like "× 2" or "x2"
  const iconRegex = /<a[^>]*title="([^"]+)"[^>]*>[\s\S]*?<\/a>(?:[\s\S]*?(?:×|x)\s*(\d+))?/gi;
  
  let match;
  while ((match = iconRegex.exec(html)) !== null) {
    const name = match[1]?.trim();
    if (name && !name.includes(":") && name.length < 100) {
      const quantity = match[2] ? parseInt(match[2], 10) : 1;
      // Avoid duplicates
      if (!ingredients.some(i => i.name === name)) {
        ingredients.push({ name, quantity });
      }
    }
  }
  
  // Fallback: try extracting from plain text if no icons found
  if (ingredients.length === 0) {
    const text = stripHtml(html);
    // Split by bullet points or line breaks
    const parts = text.split(/[•\n,]+/);
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed && trimmed.length > 1 && trimmed.length < 50) {
        // Check for quantity pattern "Item × 2" or "2× Item"
        const qtyMatch = trimmed.match(/^(.+?)\s*(?:×|x)\s*(\d+)$/i) || 
                        trimmed.match(/^(\d+)\s*(?:×|x)\s*(.+)$/i);
        if (qtyMatch) {
          const name = (qtyMatch[1]!.match(/^\d+$/) ? qtyMatch[2] : qtyMatch[1])!.trim();
          const qty = parseInt(qtyMatch[1]!.match(/^\d+$/) ? qtyMatch[1]! : qtyMatch[2]!, 10);
          ingredients.push({ name, quantity: qty });
        } else {
          ingredients.push({ name: trimmed, quantity: 1 });
        }
      }
    }
  }
  
  return ingredients;
}

/**
 * Parse energy and health restoration from the "Restores" column
 * Returns { energy, health } or nulls
 */
function parseRestoration(text: string): { energy: number | null; health: number | null } {
  const result: { energy: number | null; health: number | null } = { energy: null, health: null };
  
  // Clean up the text
  const cleaned = stripHtml(text).toLowerCase();
  
  // Pattern: "125 energy" or "energy: 125" or just a number
  const energyMatch = cleaned.match(/(\d+)\s*(?:energy|stamina)/i) || 
                      cleaned.match(/(?:energy|stamina)[:\s]*(\d+)/i);
  if (energyMatch) {
    result.energy = parseInt(energyMatch[1]!, 10);
  }
  
  // Pattern: "56 health" or "health: 56"
  const healthMatch = cleaned.match(/(\d+)\s*(?:health|hp)/i) ||
                      cleaned.match(/(?:health|hp)[:\s]*(\d+)/i);
  if (healthMatch) {
    result.health = parseInt(healthMatch[1]!, 10);
  }
  
  // If only one number and no keywords, assume it's energy
  if (result.energy === null && result.health === null) {
    const numMatch = cleaned.match(/(\d+)/);
    if (numMatch) {
      result.energy = parseInt(numMatch[1]!, 10);
    }
  }
  
  return result;
}

/**
 * Parse cooking-specific data from an individual recipe page's infobox
 * Extracts energy, health, buffs, and buff durations by quality tier
 */
function parseCookingInfobox(html: string): {
  buffs: Array<{ type: string; bonus: string; durations?: { base?: string; bronze?: string; silver?: string; gold?: string; osmium?: string } }>;
  energy_restored: number | null;
  health_restored: number | null;
  item_type: string | null;
} {
  const result: {
    buffs: Array<{ type: string; bonus: string; durations?: { base?: string; bronze?: string; silver?: string; gold?: string; osmium?: string } }>;
    energy_restored: number | null;
    health_restored: number | null;
    item_type: string | null;
  } = {
    buffs: [],
    energy_restored: null,
    health_restored: null,
    item_type: null,
  };
  
  // Helper to extract data-source values from div format
  const extractDataValue = (source: string): string | null => {
    const regex = new RegExp(
      `data-source="${source}"[^>]*>[\\s\\S]*?<div[^>]*class="[^"]*pi-data-value[^"]*"[^>]*>([\\s\\S]*?)</div>`,
      "i"
    );
    const match = html.match(regex);
    return match ? stripHtml(match[1]) : null;
  };
  
  // Helper to extract data-source values from td format (horizontal tables)
  const extractTdValue = (source: string): string | null => {
    const regex = new RegExp(
      `<td[^>]*data-source="${source}"[^>]*>([\\s\\S]*?)</td>`,
      "i"
    );
    const match = html.match(regex);
    return match ? stripHtml(match[1]) : null;
  };
  
  // Try various field names for energy/stamina
  const energy = extractDataValue("energy") || extractDataValue("stamina") || 
                 extractDataValue("restore") || extractDataValue("restores");
  if (energy) {
    const restoration = parseRestoration(energy);
    result.energy_restored = restoration.energy;
    result.health_restored = restoration.health;
  }
  
  // Try health separately if not found
  if (result.health_restored === null) {
    const health = extractDataValue("health") || extractDataValue("hp");
    if (health) {
      const numMatch = health.match(/(\d+)/);
      if (numMatch) {
        result.health_restored = parseInt(numMatch[1]!, 10);
      }
    }
  }
  
  // Extract item type (e.g., "Consumable")
  const itemType = extractDataValue("type");
  if (itemType) {
    result.item_type = itemType;
  }
  
  // Extract buff type and bonus value
  const buffType = extractDataValue("buff") || extractDataValue("buff type");
  const buffBonus = extractDataValue("buff bonus") || extractDataValue("bonus");
  
  // Extract buff durations by quality tier from horizontal table
  // Wiki uses data-source attributes: duration, bronzeduration, silverduration, goldduration, osmiumduration
  const baseDuration = extractTdValue("duration") || extractDataValue("duration");
  const bronzeDuration = extractTdValue("bronzeduration") || extractDataValue("bronzeduration");
  const silverDuration = extractTdValue("silverduration") || extractDataValue("silverduration");
  const goldDuration = extractTdValue("goldduration") || extractDataValue("goldduration");
  const osmiumDuration = extractTdValue("osmiumduration") || extractDataValue("osmiumduration");
  
  // Build buff object if we have buff type info
  if (buffType && buffType !== "-" && buffType.toLowerCase() !== "none") {
    const durations: { base?: string; bronze?: string; silver?: string; gold?: string; osmium?: string } = {};
    
    if (baseDuration && baseDuration !== "-") durations.base = baseDuration;
    if (bronzeDuration && bronzeDuration !== "-") durations.bronze = bronzeDuration;
    if (silverDuration && silverDuration !== "-") durations.silver = silverDuration;
    if (goldDuration && goldDuration !== "-") durations.gold = goldDuration;
    if (osmiumDuration && osmiumDuration !== "-") durations.osmium = osmiumDuration;
    
    result.buffs.push({
      type: buffType,
      bonus: buffBonus || "+?",
      durations: Object.keys(durations).length > 0 ? durations : undefined,
    });
  }
  
  // Fallback: try parsing buffs from text if no structured data found
  if (result.buffs.length === 0) {
    const buffText = extractDataValue("buff") || extractDataValue("buffs") || extractDataValue("effect");
    if (buffText) {
      const parsedBuffs = parseBuffs(buffText);
      // Convert old format to new format
      result.buffs = parsedBuffs.map(b => ({
        type: b.type,
        bonus: `+${b.value}`,
        durations: { base: b.duration },
      }));
    }
  }
  
  return result;
}

/**
 * Scrape cooking recipes from the wiki
 * Uses the main Cooking page table for basic data, then fetches individual pages for details
 */
async function scrapeCooking(fastMode: boolean): Promise<ScrapedItem[]> {
  const items: ScrapedItem[] = [];
  const processedNames = new Set<string>();
  
  console.log("  Fetching Cooking page...");
  const cookingPageHtml = await fetchPageHtml("Cooking");
  
  if (!cookingPageHtml) {
    console.error("  Failed to fetch Cooking page");
    return items;
  }
  
  // Find the recipe table - it has class "fandom-table article-table sortable"
  // and contains columns: Product, Ingredients, Crafting medium, Restores, Recipe source
  const tableMatch = cookingPageHtml.match(
    /<table[^>]*class="[^"]*fandom-table[^"]*article-table[^"]*sortable[^"]*"[^>]*>([\s\S]*?)<\/table>/i
  );
  
  if (!tableMatch) {
    console.error("  Could not find recipe table on Cooking page");
    // Fallback: try fetching from category
    console.log("  Falling back to Category:Cooked_dishes...");
    const recipeNames = await fetchCategoryMembers("Category:Cooked_dishes");
    for (const name of recipeNames) {
      if (!processedNames.has(name)) {
        processedNames.add(name);
        items.push({ name, seasons: [], time_of_day: [], weather: [] });
      }
    }
    return items;
  }
  
  const tableHtml = tableMatch[0];
  
  // Parse table rows
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  let rowIndex = 0;
  
  // Temporary storage for table data
  const tableData: Array<{
    name: string;
    outputQuantity: number;
    ingredients: Array<{ name: string; quantity: number }>;
    utensil: string;
    energy: number | null;
    health: number | null;
    recipeSource: string;
    recipeSourceCharacter?: string;
    recipeSourceHearts?: number;
    recipeSourceCategory: RecipeSourceCategory;
  }> = [];
  
  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    rowIndex++;
    if (rowIndex === 1) continue; // Skip header row
    
    const rowHtml = rowMatch[1]!;
    
    // Extract cells
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells: string[] = [];
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      cells.push(cellMatch[1]!);
    }
    
    if (cells.length < 5) continue;
    
    // Column 0: Product - extract name from link title and quantity
    const productCell = cells[0]!;
    const nameMatch = productCell.match(/<a[^>]*title="([^"]+)"[^>]*>/i);
    if (!nameMatch) continue;
    
    const name = nameMatch[1]!.trim();
    if (processedNames.has(name)) continue;
    processedNames.add(name);
    
    // Extract output quantity (e.g., "× 2")
    const quantityMatch = productCell.match(/(?:×|x)\s*(\d+)/i);
    const outputQuantity = quantityMatch ? parseInt(quantityMatch[1]!, 10) : 1;
    
    // Column 1: Ingredients
    const ingredientsCell = cells[1]!;
    const ingredients = parseCookingIngredients(ingredientsCell);
    
    // Column 2: Crafting medium (utensil)
    const utensilCell = cells[2]!;
    const utensilMatch = utensilCell.match(/<a[^>]*title="([^"]+)"[^>]*>/i);
    const utensil = utensilMatch ? utensilMatch[1]!.trim() : stripHtml(utensilCell).trim();
    
    // Column 3: Restores (energy/health)
    const restoresCell = cells[3]!;
    const restoration = parseRestoration(restoresCell);
    
    // Column 4: Recipe source - parse the HTML for clean display
    const recipeSourceCell = cells[4]!;
    const parsedSource = parseRecipeSource(recipeSourceCell);
    
    tableData.push({
      name,
      outputQuantity,
      ingredients,
      utensil,
      energy: restoration.energy,
      health: restoration.health,
      recipeSource: parsedSource.display,
      recipeSourceCharacter: parsedSource.character,
      recipeSourceHearts: parsedSource.hearts,
      recipeSourceCategory: parsedSource.source_type,
    });
  }
  
  console.log(`  Found ${tableData.length} recipes in table`);
  
  if (fastMode) {
    // Fast mode: use table data only
    for (const data of tableData) {
      const metadata: Record<string, unknown> = {
        ingredients: data.ingredients,
        utensil: data.utensil,
        recipe_source: data.recipeSource,
        recipe_source_category: data.recipeSourceCategory,
      };
      
      // Add optional recipe source fields
      if (data.recipeSourceCharacter) metadata.recipe_source_character = data.recipeSourceCharacter;
      if (data.recipeSourceHearts) metadata.recipe_source_hearts = data.recipeSourceHearts;
      
      if (data.energy !== null) metadata.energy_restored = data.energy;
      if (data.health !== null) metadata.health_restored = data.health;
      if (data.outputQuantity > 1) metadata.output_quantity = data.outputQuantity;
      
      items.push({
        name: data.name,
        seasons: [],
        time_of_day: [],
        weather: [],
        metadata,
      });
    }
    return items;
  }
  
  // Full mode: fetch individual pages for images, prices, descriptions, and buffs
  console.log("  Fetching individual recipe pages...");
  
  for (let i = 0; i < tableData.length; i++) {
    const data = tableData[i]!;
    showProgress(i + 1, tableData.length, data.name);
    
    // Fetch page details
    const pageHtml = await fetchPageHtml(data.name);
    let details: Partial<ScrapedItem> | null = null;
    let cookingDetails: ReturnType<typeof parseCookingInfobox> | null = null;
    
    if (pageHtml) {
      details = parseInfobox(pageHtml);
      cookingDetails = parseCookingInfobox(pageHtml);
    }
    
    // Build metadata
    const metadata: Record<string, unknown> = {
      ingredients: data.ingredients,
      utensil: data.utensil,
      recipe_source: data.recipeSource,
      recipe_source_category: data.recipeSourceCategory,
    };
    
    // Add optional recipe source fields
    if (data.recipeSourceCharacter) metadata.recipe_source_character = data.recipeSourceCharacter;
    if (data.recipeSourceHearts) metadata.recipe_source_hearts = data.recipeSourceHearts;
    
    // Use page data for energy/health if available, fall back to table data
    const energy = cookingDetails?.energy_restored ?? data.energy;
    const health = cookingDetails?.health_restored ?? data.health;
    
    if (energy !== null) metadata.energy_restored = energy;
    if (health !== null) metadata.health_restored = health;
    if (data.outputQuantity > 1) metadata.output_quantity = data.outputQuantity;
    
    // Add item type from page if available
    if (cookingDetails?.item_type) {
      metadata.item_type = cookingDetails.item_type;
    }
    
    // Add buffs from page (now includes durations by quality)
    if (cookingDetails?.buffs && cookingDetails.buffs.length > 0) {
      metadata.buffs = cookingDetails.buffs;
    }
    
    // Merge prices from details (calculate per-item if output > 1)
    if (details?.metadata?.prices) {
      const prices = details.metadata.prices as Record<string, number>;
      if (data.outputQuantity > 1) {
        // Convert to per-item prices
        const perItemPrices: Record<string, number> = {};
        for (const [quality, price] of Object.entries(prices)) {
          perItemPrices[quality] = Math.floor(price / data.outputQuantity);
        }
        metadata.prices = perItemPrices;
      } else {
        metadata.prices = prices;
      }
    }
    
    // Calculate base_price (per item)
    let basePrice = details?.base_price;
    if (basePrice && data.outputQuantity > 1) {
      basePrice = Math.floor(basePrice / data.outputQuantity);
    }
    
    const item: ScrapedItem = {
      name: data.name,
      seasons: [],
      time_of_day: [],
      weather: [],
      base_price: basePrice,
      image_url: details?.image_url,
      description: details?.description,
      metadata,
    };
    
    items.push(item);
  }
  
  clearProgress();
  return items;
}

// ============ NPC Scraper ============

/**
 * Parse NPC birthday from infobox
 * Returns { season, day } or null
 */
function parseNPCBirthday(html: string): { season: string; day: number } | null {
  // The wiki infobox can use either <td> (horizontal layout) or <div> (vertical layout)
  // Try multiple patterns to find the birthday data
  const patterns = [
    // Pattern 1: Direct td element with data-source="birthday" (horizontal table layout)
    /<td[^>]*data-source="birthday"[^>]*>([\s\S]*?)<\/td>/i,
    // Pattern 2: Nested in div with pi-data-value class (vertical layout)
    /data-source="birthday"[^>]*>[\s\S]*?<div[^>]*class="[^"]*pi-data-value[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    // Pattern 3: Any element with data-source="birthday" followed by content
    /data-source="birthday"[^>]*>([^<]*(?:<a[^>]*>[^<]*<\/a>[^<]*)*)/i,
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      const text = stripHtml(match[1]).toLowerCase().trim();
      
      // Parse patterns like "Spring 15", "Summer 3", "Fall 28", "Winter 1"
      const seasonMatch = text.match(/(spring|summer|fall|winter)\s*(\d+)/i);
      if (seasonMatch) {
        return {
          season: seasonMatch[1]!.toLowerCase(),
          day: parseInt(seasonMatch[2]!, 10),
        };
      }
    }
  }
  
  return null;
}

/**
 * Parse NPC residence from infobox or categories
 */
function parseNPCResidence(html: string, categories: string[]): string | null {
  // Try multiple patterns for residence/residency
  const patterns = [
    // Pattern 1: div with data-source and pi-data-value class
    /data-source="(?:residency|residence|address|home)"[^>]*>[\s\S]*?<div[^>]*class="[^"]*pi-data-value[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    // Pattern 2: td element with data-source
    /<td[^>]*data-source="(?:residency|residence|address|home)"[^>]*>([\s\S]*?)<\/td>/i,
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      const residence = stripHtml(match[1]).trim();
      if (residence && residence.length < 100) {
        return residence;
      }
    }
  }
  
  // Try categories like "Lives at Fishensips"
  for (const cat of categories) {
    const livesMatch = cat.match(/Lives at (.+)/i);
    if (livesMatch) {
      return livesMatch[1]!.trim();
    }
  }
  
  return null;
}

/**
 * Parse NPC gender from categories
 */
function parseNPCGender(categories: string[]): string {
  for (const cat of categories) {
    const lower = cat.toLowerCase();
    if (lower.includes("female")) return "female";
    if (lower.includes("male") && !lower.includes("female")) return "male";
  }
  return "unknown";
}

/**
 * Parse NPC character type from categories
 * Order matters - check more specific categories first
 */
function parseNPCCharacterType(categories: string[]): string {
  for (const cat of categories) {
    const lower = cat.toLowerCase();
    // Check specific categories first
    if (lower.includes("townie")) return "townie";
    if (lower.includes("merfolk") || lower.includes("merperson")) return "merperson";
    if (lower.includes("giant")) return "giant";
    if (lower.includes("adoptable pet")) return "pet";
    if (lower.includes("stranger")) return "stranger";
  }
  return "other";
}

/**
 * Check if NPC is a marriage candidate from categories
 */
function isMarriageCandidate(categories: string[]): boolean {
  for (const cat of categories) {
    if (cat.toLowerCase().includes("marriage candidate")) {
      return true;
    }
  }
  return false;
}

/**
 * Parse gift preferences from the Gifts section HTML (wikitable format)
 * Excludes universally liked/loved items (in collapsible sections)
 * Returns { loved, liked, disliked, hated } arrays
 */
function parseGiftPreferencesFromSection(html: string): {
  loved: string[];
  liked: string[];
  disliked: string[];
  hated: string[];
} {
  const gifts: {
    loved: string[];
    liked: string[];
    disliked: string[];
    hated: string[];
  } = {
    loved: [],
    liked: [],
    disliked: [],
    hated: [],
  };

  // The gifts section uses a wikitable with rows for each category
  // Each row has: <th> with category icon (data-image-key="Loved_gift.png") and <td> with items
  
  // Split HTML into rows
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  
  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const rowHtml = rowMatch[1]!;
    
    // Determine category from the header cell's icon
    let category: "loved" | "liked" | "disliked" | "hated" | null = null;
    
    // Check for category icon in data-image-key attribute
    if (rowHtml.includes('data-image-key="Loved_gift.png"') || 
        rowHtml.includes('data-image-name="Loved gift.png"') ||
        (rowHtml.includes('>Loved<') || rowHtml.includes('Loved</span>'))) {
      category = "loved";
    } else if (rowHtml.includes('data-image-key="Liked_gift.png"') || 
               rowHtml.includes('data-image-name="Liked gift.png"') ||
               (rowHtml.includes('>Liked<') || rowHtml.includes('Liked</span>'))) {
      category = "liked";
    } else if (rowHtml.includes('data-image-key="Disliked_gift.png"') || 
               rowHtml.includes('data-image-name="Disliked gift.png"') ||
               (rowHtml.includes('>Disliked<') || rowHtml.includes('Disliked</span>'))) {
      category = "disliked";
    } else if (rowHtml.includes('data-image-key="Hated_gift.png"') || 
               rowHtml.includes('data-image-name="Hated gift.png"') ||
               (rowHtml.includes('>Hated<') || rowHtml.includes('Hated</span>'))) {
      category = "hated";
    }
    
    if (!category) continue;
    
    // Extract the <td> content (items list)
    const tdMatch = rowHtml.match(/<td[^>]*>([\s\S]*?)<\/td>/i);
    if (!tdMatch?.[1]) continue;
    
    let itemsHtml = tdMatch[1];
    
    // Remove universally liked/loved items (inside collapsible sections)
    // These are in <div class="ci-collapsible ..."> elements
    itemsHtml = itemsHtml.replace(/<div[^>]*class="[^"]*ci-collapsible[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>/gi, "");
    
    // Also remove by data-expandtext pattern (backup)
    itemsHtml = itemsHtml.replace(/<div[^>]*data-expandtext="Universal[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>/gi, "");
    
    // Extract item names from title attributes of links
    const itemRegex = /<a[^>]*title="([^"]+)"[^>]*>/gi;
    let itemMatch;
    const foundItems = new Set<string>();
    
    while ((itemMatch = itemRegex.exec(itemsHtml)) !== null) {
      const itemName = itemMatch[1]!.trim();
      // Filter out non-item links (categories, special pages, etc.)
      if (itemName && 
          !itemName.includes(":") && 
          !itemName.startsWith("File:") &&
          !itemName.startsWith("Category:") &&
          itemName.length < 50) {
        foundItems.add(itemName);
      }
    }
    
    // Add to appropriate category
    gifts[category].push(...foundItems);
  }
  
  // Deduplicate (in case of any duplicates)
  gifts.loved = [...new Set(gifts.loved)];
  gifts.liked = [...new Set(gifts.liked)];
  gifts.disliked = [...new Set(gifts.disliked)];
  gifts.hated = [...new Set(gifts.hated)];
  
  return gifts;
}

/**
 * Extract item names from HTML (from links or plain text)
 */
function extractItemNames(html: string): string[] {
  const items: string[] = [];
  
  // Extract from links first
  const linkRegex = /<a[^>]*title="([^"]+)"[^>]*>/gi;
  let linkMatch;
  while ((linkMatch = linkRegex.exec(html)) !== null) {
    const title = linkMatch[1]!.trim();
    // Filter out non-item links (pages, categories, etc.)
    if (title && !title.includes(":") && title.length < 50) {
      items.push(title);
    }
  }
  
  // If no links found, try comma-separated text
  if (items.length === 0) {
    const text = stripHtml(html);
    const parts = text.split(/[,\u2022\n]+/);
    for (const part of parts) {
      const cleaned = part.trim();
      if (cleaned && cleaned.length > 1 && cleaned.length < 50 && !cleaned.match(/^\d+$/)) {
        items.push(cleaned);
      }
    }
  }
  
  return items;
}

/**
 * Scrape NPCs - characters, marriage candidates, merfolk, etc.
 */
async function scrapeNPCs(fastMode: boolean): Promise<ScrapedItem[]> {
  const items: ScrapedItem[] = [];
  const processedNames = new Set<string>();
  
  // Skip non-character pages
  const skipItems = new Set([
    "Characters",
    "Character",
    "NPC",
    "NPCs",
    "Marriage",
    "Marriage candidates",
    "Gifts",
    "Gift preferences",
    "Friendship",
    "Romance",
    "Dating",
    "Children",
    "Spouse",
  ]);

  console.log("  Fetching character list from Category:Characters...");
  const characterNames = await fetchCategoryMembers("Category:Characters");
  
  // Filter out non-character pages
  const validCharacters = [...characterNames].filter(
    (name) => !skipItems.has(name) && !name.startsWith("Category:")
  );
  console.log(`  Found ${validCharacters.length} characters`);

  // Fetch marriage candidates to flag them
  console.log("  Fetching marriage candidates...");
  const marriageCandidates = await fetchCategoryMembers("Category:Marriage_candidates");
  console.log(`  Found ${marriageCandidates.size} marriage candidates`);

  // Fetch character type categories
  console.log("  Fetching character type categories...");
  const townies = await fetchCategoryMembers("Category:Townie_characters");
  const merfolk = await fetchCategoryMembers("Category:Merfolk");
  const children = await fetchCategoryMembers("Category:Child_characters");

  if (fastMode) {
    // Fast mode: use category data only
    for (const name of validCharacters) {
      if (processedNames.has(name)) continue;
      processedNames.add(name);

      let characterType = "other";
      if (townies.has(name)) characterType = "townie";
      else if (merfolk.has(name)) characterType = "merperson";
      else if (children.has(name)) characterType = "child";

      const item: ScrapedItem = {
        name,
        seasons: [],
        time_of_day: [],
        weather: [],
        locations: [],
        metadata: {
          is_marriage_candidate: marriageCandidates.has(name),
          character_type: characterType,
        },
      };
      items.push(item);
    }
    return items;
  }

  // Full mode: fetch individual pages
  console.log("  Fetching individual character pages...");

  for (let i = 0; i < validCharacters.length; i++) {
    const name = validCharacters[i]!;
    if (processedNames.has(name)) continue;
    processedNames.add(name);

    showProgress(i + 1, validCharacters.length, name);

    // Fetch page HTML and categories
    const html = await fetchPageHtml(name);
    const categories = await fetchPageCategories(name);

    // Determine character type from categories
    let characterType = parseNPCCharacterType(categories);
    // Override with pre-fetched category data if available
    if (townies.has(name)) characterType = "townie";
    else if (merfolk.has(name)) characterType = "merperson";
    else if (children.has(name)) characterType = "child";

    // Parse page data
    let birthday: { season: string; day: number } | null = null;
    let residence: string | null = null;
    let gender = "unknown";
    let imageUrl: string | undefined;
    let description: string | undefined;
    let giftPreferences: {
      loved: string[];
      liked: string[];
      disliked: string[];
      hated: string[];
    } = { loved: [], liked: [], disliked: [], hated: [] };

    if (html) {
      birthday = parseNPCBirthday(html);
      residence = parseNPCResidence(html, categories);
      gender = parseNPCGender(categories);

      // Parse infobox for image and description
      const infoboxData = parseInfobox(html);
      imageUrl = infoboxData.image_url;
      description = infoboxData.description;
    }

    // Fetch gift preferences from the Gifts section (separate API call)
    // This is more reliable than parsing from the main page
    const sections = await fetchPageSections(name);
    const giftsSection = sections.find((s) => s.line === "Gifts");
    
    if (giftsSection) {
      const giftsHtml = await fetchPageSectionHtml(name, giftsSection.index);
      if (giftsHtml) {
        giftPreferences = parseGiftPreferencesFromSection(giftsHtml);
      }
    }

    const metadata: Record<string, unknown> = {
      is_marriage_candidate: marriageCandidates.has(name) || isMarriageCandidate(categories),
      character_type: characterType,
      gender,
      wiki_url: `${WIKI_BASE}/wiki/${encodeURIComponent(name.replace(/ /g, "_"))}`,
    };

    if (birthday) {
      metadata.birthday_season = birthday.season;
      metadata.birthday_day = birthday.day;
    }

    if (residence) {
      metadata.residence = residence;
    }

    // Only add gift preferences if we found any
    if (
      giftPreferences.loved.length > 0 ||
      giftPreferences.liked.length > 0 ||
      giftPreferences.disliked.length > 0 ||
      giftPreferences.hated.length > 0
    ) {
      metadata.gift_preferences = giftPreferences;
    }

    const item: ScrapedItem = {
      name,
      seasons: birthday ? [birthday.season] : [], // Season for birthday filtering
      time_of_day: [],
      weather: [],
      locations: residence ? [residence] : [],
      image_url: imageUrl,
      description,
      metadata,
    };

    items.push(item);
  }

  clearProgress();
  return items;
}

// ============ Main ============

async function main() {
  console.log("=".repeat(60));
  console.log("  Coral Island Wiki Scraper");
  console.log("=".repeat(60));
  console.log();

  const args = process.argv.slice(2);
  const clearFirst = args.includes("--clear");
  const fastMode = args.includes("--fast");
  const categories = args.filter((a) => !a.startsWith("--"));

  type ScraperFn = (fastMode: boolean) => Promise<ScrapedItem[]>;
  
  const scrapers: Record<string, ScraperFn> = {
    fish: scrapeFish,
    insects: scrapeInsects,
    critters: scrapeCritters,
    crops: scrapeCrops,
    artifacts: scrapeArtifacts,
    gems: scrapeGems,
    forageables: scrapeForageables,
    "artisan-products": scrapeArtisanProducts,
    cooking: scrapeCooking,
    npcs: scrapeNPCs,
    // Note: lake-temple is now handled via migration, not scraper
  };

  const categoriesToScrape =
    categories.length > 0 ? categories : Object.keys(scrapers);

  console.log(`Categories: ${categoriesToScrape.join(", ")}`);
  console.log(`Mode: ${fastMode ? "FAST (categories only)" : "FULL (individual pages)"}`);
  if (clearFirst) console.log("Will clear existing items before inserting");
  console.log();

  const startTime = Date.now();
  let totalInserted = 0;

  for (const categorySlug of categoriesToScrape) {
    const scraper = scrapers[categorySlug];
    if (!scraper) {
      console.log(`Unknown category: ${categorySlug}`);
      continue;
    }

    console.log(`[${categorySlug.toUpperCase()}]`);

    try {
      if (clearFirst) {
        await clearCategory(categorySlug);
      }

      const items = await scraper(fastMode);
      
      if (items.length > 0) {
        const inserted = await insertItems(categorySlug, items);
        console.log(`  Inserted/updated ${inserted} items`);
        totalInserted += inserted;

        // Show sample with data quality info
        const withImages = items.filter(i => i.image_url).length;
        const withPrices = items.filter(i => i.base_price).length;
        const withSeasons = items.filter(i => i.seasons && i.seasons.length > 0).length;
        console.log(`  Data: ${withImages} images, ${withPrices} prices, ${withSeasons} with seasons`);
      }
    } catch (error) {
      console.error(`  Error processing ${categorySlug}:`, error);
    }

    console.log();
  }

  // Final summary
  const counts = await sql`
    SELECT c.name, c.slug, COUNT(i.id)::int as count
    FROM categories c
    LEFT JOIN items i ON i.category_id = c.id
    GROUP BY c.id, c.name, c.slug, c.display_order
    ORDER BY c.display_order
  `;

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("=".repeat(60));
  console.log("  DATABASE SUMMARY");
  console.log("=".repeat(60));

  let total = 0;
  for (const row of counts) {
    console.log(`  ${row.name.padEnd(12)}: ${row.count} items`);
    total += row.count;
  }
  console.log("-".repeat(60));
  console.log(`  TOTAL: ${total} items`);
  console.log();
  console.log(`  Inserted/updated ${totalInserted} items in ${elapsed}s`);

  await sql.end();
}

main().catch(console.error);
