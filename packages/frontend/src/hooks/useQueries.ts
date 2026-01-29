import { useQuery } from "@tanstack/react-query";
import {
  getCategories,
  getCategory,
  getProgressItems,
  getSaveSlots,
  getSaveSlot,
  getTempleOverview,
  getAltarDetail,
  getItemsTempleStatus,
  getNPCs,
} from "@/lib/api";
import type { CategoryStats } from "@coral-tracker/shared";
import type {
  Category,
  Item,
  NPCMetadata,
  RelationshipStatus,
  Season,
} from "@coral-tracker/shared";

// ============================================================
// Type definitions for query results
// ============================================================

export type ItemWithProgress = Item & {
  completed: boolean;
  completed_at: string | null;
  notes: string | null;
};

export type CategoryWithCount = Category & {
  item_count: number;
};

export interface NPCData {
  id: number;
  name: string;
  slug: string;
  image_url: string | null;
  description: string | null;
  seasons: Season[];
  locations: string[];
  metadata: NPCMetadata;
  hearts: number;
  relationship_status: RelationshipStatus;
  notes: string | null;
  max_hearts: number;
  is_max_hearts: boolean;
}

export interface SaveSlotWithStats {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  stats: {
    total_items: number;
    completed_items: number;
    completion_percentage: number;
    by_category: CategoryStats[];
  };
}

// ============================================================
// Query Keys - centralized for consistency
// ============================================================

export const queryKeys = {
  categories: ["categories"] as const,
  category: (slug: string) => ["category", slug] as const,
  saves: ["saves"] as const,
  saveSlot: (saveId: number) => ["saveSlot", saveId] as const,
  progress: (saveId: number, category: string) => ["progress", saveId, category] as const,
  npcs: (saveId: number) => ["npcs", saveId] as const,
  templeOverview: (saveId: number) => ["temple", saveId] as const,
  altarDetail: (saveId: number, altarSlug: string) => ["altar", saveId, altarSlug] as const,
  templeStatus: (saveId: number, category: string) => ["temple-status", saveId, category] as const,
};

// ============================================================
// Query Hooks
// ============================================================

/**
 * Fetch all categories
 */
export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: getCategories,
  });
}

/**
 * Fetch a single category by slug
 */
export function useCategory(slug: string | undefined) {
  return useQuery({
    queryKey: queryKeys.category(slug!),
    queryFn: () => getCategory(slug!),
    enabled: !!slug,
  });
}

/**
 * Fetch all save slots for current session
 */
export function useSaveSlots() {
  return useQuery({
    queryKey: queryKeys.saves,
    queryFn: getSaveSlots,
  });
}

/**
 * Fetch a single save slot with stats (for dashboard)
 */
export function useSaveSlot(saveId: number | null) {
  return useQuery({
    queryKey: queryKeys.saveSlot(saveId!),
    queryFn: () => getSaveSlot(saveId!),
    enabled: !!saveId,
  });
}

/**
 * Fetch items with progress for a save slot and category
 */
export function useProgressItems(saveId: number | null, category: string | undefined) {
  return useQuery({
    queryKey: queryKeys.progress(saveId!, category!),
    queryFn: () => getProgressItems(saveId!, category),
    enabled: !!saveId && !!category && category !== "npcs",
  });
}

/**
 * Fetch NPCs with progress for a save slot
 */
export function useNPCs(saveId: number | null) {
  return useQuery({
    queryKey: queryKeys.npcs(saveId!),
    queryFn: () => getNPCs<NPCData>(saveId!),
    enabled: !!saveId,
  });
}

/**
 * Fetch temple overview for a save slot
 */
export function useTempleOverview(saveId: number | null) {
  return useQuery({
    queryKey: queryKeys.templeOverview(saveId!),
    queryFn: () => getTempleOverview(saveId!),
    enabled: !!saveId,
  });
}

/**
 * Fetch temple status for items in a category
 * Note: itemIds are derived from progress data, so this depends on progress being loaded
 */
export function useTempleStatus(
  saveId: number | null,
  category: string | undefined,
  itemIds: number[]
) {
  return useQuery({
    queryKey: queryKeys.templeStatus(saveId!, category!),
    queryFn: () => getItemsTempleStatus(saveId!, itemIds),
    enabled: !!saveId && !!category && category !== "npcs" && itemIds.length > 0,
  });
}

/**
 * Fetch altar detail with offerings for a specific altar
 */
export function useAltarDetail(saveId: number | null, altarSlug: string | undefined) {
  return useQuery({
    queryKey: queryKeys.altarDetail(saveId!, altarSlug!),
    queryFn: () => getAltarDetail(saveId!, altarSlug!),
    enabled: !!saveId && !!altarSlug,
  });
}
