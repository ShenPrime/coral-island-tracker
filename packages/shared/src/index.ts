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
  "lake-temple",
  "cooking",
  "npcs",
] as const;

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
