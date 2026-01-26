// ============================================
// Database Types
// ============================================

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  display_order: number;
}

export interface Item {
  id: number;
  category_id: number;
  name: string;
  slug: string;
  image_url: string | null;
  rarity: Rarity | null;
  seasons: Season[];
  time_of_day: TimeOfDay[];
  weather: Weather[];
  locations: string[];
  base_price: number | null;
  description: string | null;
  metadata: Record<string, unknown>;
}

export interface SaveSlot {
  id: number;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export interface Progress {
  id: number;
  save_slot_id: number;
  item_id: number;
  completed: boolean;
  completed_at: Date | null;
  notes: string | null;
}

// ============================================
// Enums / Constants
// ============================================

export type Season = "spring" | "summer" | "fall" | "winter";
export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";
export type Weather = "sunny" | "windy" | "rain" | "storm" | "snow" | "blizzard";
export type Rarity = "common" | "uncommon" | "rare" | "super_rare" | "epic" | "legendary";

export const SEASONS: Season[] = ["spring", "summer", "fall", "winter"];
export const TIMES_OF_DAY: TimeOfDay[] = ["morning", "afternoon", "evening", "night"];
export const WEATHERS: Weather[] = ["sunny", "windy", "rain", "storm", "snow", "blizzard"];
export const RARITIES: Rarity[] = ["common", "uncommon", "rare", "super_rare", "epic", "legendary"];

export const FISHING_LOCATIONS = [
  "River (Forest)",
  "River (Town)",
  "River (Farm)",
  "Rice Field",
  "Ocean (Forest)",
  "Ocean (Dock)",
  "Ocean (Lookout)",
  "Ocean (Beach)",
  "Pond",
  "Estuary",
  "Lake",
  "Cavern Entrance",
] as const;

export type FishingLocation = (typeof FISHING_LOCATIONS)[number];

export const FORAGING_LOCATIONS = [
  "Beach",
  "Forest",
  "Lake",
  "Town",
  "Woodlands",
  "Lookout",
  "Vineyard",
  "Hot Spring",
  "Garden Lane",
  "Ocean (Diving)",
] as const;

export type ForagingLocation = (typeof FORAGING_LOCATIONS)[number];

export const LAKE_TEMPLE_ALTARS = [
  "Crop Altar",
  "Catch Altar",
  "Advanced Altar",
  "Rare Altar",
] as const;

export type LakeTempleAltar = (typeof LAKE_TEMPLE_ALTARS)[number];

export const CATEGORY_SLUGS = [
  "fish",
  "insects",
  "critters",
  "crops",
  "artifacts",
  "gems",
  "forageables",
  "cooking",
  "npcs",
] as const;

export const ALTAR_SLUGS = [
  "crop-altar",
  "catch-altar", 
  "advanced-altar",
  "rare-altar",
] as const;

export type AltarSlug = (typeof ALTAR_SLUGS)[number];

export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

// ============================================
// API Types
// ============================================

export interface ItemWithCategory extends Item {
  category: Category;
}

export interface ProgressWithItem extends Progress {
  item: ItemWithCategory;
}

export interface SaveSlotWithProgress extends SaveSlot {
  progress: ProgressWithItem[];
  stats: SaveSlotStats;
}

export interface SaveSlotStats {
  total_items: number;
  completed_items: number;
  completion_percentage: number;
  by_category: CategoryStats[];
}

export interface CategoryStats {
  category_id: number;
  category_name: string;
  category_slug: string;
  total: number;
  completed: number;
  percentage: number;
}

// ============================================
// API Request/Response Types
// ============================================

export interface CreateSaveSlotRequest {
  name: string;
}

export interface UpdateProgressRequest {
  completed: boolean;
  notes?: string | null;
}

export interface BulkUpdateProgressRequest {
  updates: {
    item_id: number;
    completed: boolean;
    notes?: string | null;
  }[];
}

export interface ItemsQueryParams {
  category?: string;
  season?: Season;
  time_of_day?: TimeOfDay;
  weather?: Weather;
  rarity?: Rarity;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ApiResponse<T> {
  data: T;
  success: true;
}

export interface ApiError {
  error: string;
  message: string;
  success: false;
}

// ============================================
// Temple Types
// ============================================

export interface TempleRequirement {
  id: number;
  altar_slug: string;
  altar_name: string;
  offering_slug: string;
  offering_name: string;
  offering_image_url: string | null;
  reward: string | null;
  item_name: string;
  item_id: number | null;
  quantity: number;
  quality: string | null;
  note: string | null;
  display_order: number;
}

export interface TempleProgress {
  id: number;
  save_slot_id: number;
  temple_requirement_id: number;
  offered: boolean;
  offered_at: Date | null;
}

// Temple item with progress and linked item details
export interface TempleItemWithProgress extends TempleRequirement {
  offered: boolean;
  offered_at: Date | null;
  // Linked item details (if item exists in database)
  linked_item?: Item | null;
}

export interface OfferingWithItems {
  slug: string;
  name: string;
  image_url: string | null;
  reward: string | null;
  items: TempleItemWithProgress[];
  total_items: number;
  offered_items: number;
  is_complete: boolean;
}

export interface AltarWithOfferings {
  slug: string;
  name: string;
  offerings: OfferingWithItems[];
  total_items: number;
  offered_items: number;
  total_offerings: number;
  completed_offerings: number;
}

export interface AltarSummary {
  slug: string;
  name: string;
  total_items: number;
  offered_items: number;
  total_offerings: number;
  completed_offerings: number;
}

export interface TempleOverview {
  altars: AltarSummary[];
  total_items: number;
  offered_items: number;
  total_offerings: number;
  completed_offerings: number;
}

export interface UpdateTempleProgressRequest {
  offered: boolean;
}

// Check if an item is required for temple (for category pages)
export interface ItemTempleStatus {
  is_temple_requirement: boolean;
  requirements: {
    requirement_id: number;
    altar_name: string;
    offering_name: string;
    quantity: number;
    quality: string | null;
    offered: boolean;
  }[];
}

// ============================================
// Filter Configuration
// ============================================

// Growth time buckets for crops
export type GrowthTimeBucket = "fast" | "medium" | "slow";
export const GROWTH_TIME_BUCKETS: GrowthTimeBucket[] = ["fast", "medium", "slow"];
export const GROWTH_TIME_LABELS: Record<GrowthTimeBucket, string> = {
  fast: "Fast (1-4 days)",
  medium: "Medium (5-8 days)",
  slow: "Slow (9+ days)",
};

// Helper function for growth time bucket
export function getGrowthTimeBucket(days: number): GrowthTimeBucket {
  if (days <= 4) return "fast";
  if (days <= 8) return "medium";
  return "slow";
}

// Price sort options
export type PriceSortOption = "none" | "price_low" | "price_high";
export const PRICE_SORT_OPTIONS: PriceSortOption[] = ["none", "price_low", "price_high"];
export const PRICE_SORT_LABELS: Record<PriceSortOption, string> = {
  none: "Sell Price",
  price_low: "Low → High",
  price_high: "High → Low",
};

// Category filter configuration
export interface CategoryFilterConfig {
  showSeasons: boolean;
  showTime: boolean;
  showLocation: boolean;
  showRarity: boolean;
  showEquipment: boolean;
  showGrowthTime: boolean;
  showPriceSort: boolean;
}

export const CATEGORY_FILTER_CONFIG: Record<string, CategoryFilterConfig> = {
  fish:               { showSeasons: true,  showTime: true,  showLocation: true,  showRarity: true,  showEquipment: false, showGrowthTime: false, showPriceSort: true },
  insects:            { showSeasons: true,  showTime: true,  showLocation: false, showRarity: true,  showEquipment: false, showGrowthTime: false, showPriceSort: true },
  critters:           { showSeasons: true,  showTime: true,  showLocation: false, showRarity: true,  showEquipment: false, showGrowthTime: false, showPriceSort: true },
  crops:              { showSeasons: true,  showTime: false, showLocation: false, showRarity: false, showEquipment: false, showGrowthTime: true,  showPriceSort: true },
  "artisan-products": { showSeasons: true,  showTime: false, showLocation: false, showRarity: false, showEquipment: true,  showGrowthTime: false, showPriceSort: true },
  gems:               { showSeasons: false, showTime: false, showLocation: false, showRarity: true,  showEquipment: false, showGrowthTime: false, showPriceSort: true },
  artifacts:          { showSeasons: false, showTime: false, showLocation: false, showRarity: true,  showEquipment: false, showGrowthTime: false, showPriceSort: true },
  forageables:        { showSeasons: true,  showTime: false, showLocation: true,  showRarity: true,  showEquipment: false, showGrowthTime: false, showPriceSort: true },
};

export const DEFAULT_FILTER_CONFIG: CategoryFilterConfig = {
  showSeasons: true,
  showTime: false,
  showLocation: false,
  showRarity: true,
  showEquipment: false,
  showGrowthTime: false,
  showPriceSort: true,
};
