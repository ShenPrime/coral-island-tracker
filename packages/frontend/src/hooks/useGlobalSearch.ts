import { useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys, type ItemWithProgress, type NPCData } from "./useQueries";
import { useStore } from "@/store/useStore";
import { LAKE_TEMPLE_ALTARS } from "@coral-tracker/shared";

/**
 * Represents a searchable item in the global search
 */
export interface SearchableItem {
  id: number | string;
  name: string;
  type: "item" | "npc" | "altar" | "offering";
  category: string;
  categorySlug: string;
  imageUrl: string | null;
  /** For offerings, the parent altar slug */
  parentSlug?: string;
}

// Category slugs that contain items (not NPCs)
const ITEM_CATEGORY_SLUGS = [
  "fish",
  "insects",
  "critters",
  "crops",
  "artifacts",
  "gems",
  "forageables",
  "cooking",
  "artisan-products",
];

// Map altar names to their URL slugs
const ALTAR_SLUG_MAP: Record<string, string> = {
  "Crop Altar": "crop-altar",
  "Catch Altar": "catch-altar",
  "Advanced Altar": "advanced-altar",
  "Rare Altar": "rare-altar",
};

// All offerings across all altars (static game data)
const ALTAR_OFFERINGS: Array<{
  name: string;
  slug: string;
  altarSlug: string;
  altarName: string;
}> = [
  // Crop Altar
  { name: "Essential Resources", slug: "essential-resources", altarSlug: "crop-altar", altarName: "Crop Altar" },
  { name: "Spring Sesajen", slug: "spring-sesajen", altarSlug: "crop-altar", altarName: "Crop Altar" },
  { name: "Summer Sesajen", slug: "summer-sesajen", altarSlug: "crop-altar", altarName: "Crop Altar" },
  { name: "Fall Sesajen", slug: "fall-sesajen", altarSlug: "crop-altar", altarName: "Crop Altar" },
  { name: "Winter Sesajen", slug: "winter-sesajen", altarSlug: "crop-altar", altarName: "Crop Altar" },
  { name: "Ocean Scavengables", slug: "ocean-scavengables", altarSlug: "crop-altar", altarName: "Crop Altar" },
  // Catch Altar
  { name: "Fresh Water Fish", slug: "fresh-water-fish", altarSlug: "catch-altar", altarName: "Catch Altar" },
  { name: "Salt Water Fish", slug: "salt-water-fish", altarSlug: "catch-altar", altarName: "Catch Altar" },
  { name: "Rare Fish", slug: "rare-fish", altarSlug: "catch-altar", altarName: "Catch Altar" },
  { name: "Day Insect", slug: "day-insect", altarSlug: "catch-altar", altarName: "Catch Altar" },
  { name: "Night Insect", slug: "night-insect", altarSlug: "catch-altar", altarName: "Catch Altar" },
  { name: "Ocean Critters", slug: "ocean-critters", altarSlug: "catch-altar", altarName: "Catch Altar" },
  // Advanced Altar
  { name: "Barn Animals", slug: "barn-animals", altarSlug: "advanced-altar", altarName: "Advanced Altar" },
  { name: "Coop Animals", slug: "coop-animals", altarSlug: "advanced-altar", altarName: "Advanced Altar" },
  { name: "Basic Cooking", slug: "basic-cooking", altarSlug: "advanced-altar", altarName: "Advanced Altar" },
  { name: "Basic Artisan", slug: "basic-artisan", altarSlug: "advanced-altar", altarName: "Advanced Altar" },
  { name: "Fruit Plant", slug: "fruit-plant", altarSlug: "advanced-altar", altarName: "Advanced Altar" },
  { name: "Monster Drop", slug: "monster-drop", altarSlug: "advanced-altar", altarName: "Advanced Altar" },
  // Rare Altar
  { name: "Rare Crops", slug: "rare-crops", altarSlug: "rare-altar", altarName: "Rare Altar" },
  { name: "Greenhouse Crops", slug: "greenhouse-crops", altarSlug: "rare-altar", altarName: "Rare Altar" },
  { name: "Advanced Cooking", slug: "advanced-cooking", altarSlug: "rare-altar", altarName: "Rare Altar" },
  { name: "Master Artisan", slug: "master-artisan", altarSlug: "rare-altar", altarName: "Rare Altar" },
  { name: "Rare Animal Products", slug: "rare-animal-products", altarSlug: "rare-altar", altarName: "Rare Altar" },
  { name: "Kelp Essence", slug: "kelp-essence", altarSlug: "rare-altar", altarName: "Rare Altar" },
];

// Category display names for search results
const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  fish: "Fish",
  insects: "Insects",
  critters: "Critters",
  crops: "Crops",
  artifacts: "Artifacts",
  gems: "Gems",
  forageables: "Forageables",
  cooking: "Cooking",
  "artisan-products": "Artisan Products",
  npcs: "NPCs",
};

/**
 * Hook for global search functionality.
 * Aggregates all searchable data from the React Query cache.
 */
export function useGlobalSearch() {
  const queryClient = useQueryClient();
  const { currentSaveId } = useStore();

  // Build the searchable index from cached data
  const searchableItems = useMemo(() => {
    if (!currentSaveId) return [];

    const items: SearchableItem[] = [];

    // Add items from each category
    for (const slug of ITEM_CATEGORY_SLUGS) {
      const cachedData = queryClient.getQueryData<ItemWithProgress[]>(
        queryKeys.progress(currentSaveId, slug)
      );

      if (cachedData) {
        for (const item of cachedData) {
          items.push({
            id: item.id,
            name: item.name,
            type: "item",
            category: CATEGORY_DISPLAY_NAMES[slug] || slug,
            categorySlug: slug,
            imageUrl: item.image_url,
          });
        }
      }
    }

    // Add NPCs
    const npcsData = queryClient.getQueryData<NPCData[]>(
      queryKeys.npcs(currentSaveId)
    );

    if (npcsData) {
      for (const npc of npcsData) {
        items.push({
          id: npc.id,
          name: npc.name,
          type: "npc",
          category: "NPCs",
          categorySlug: "npcs",
          imageUrl: npc.image_url,
        });
      }
    }

    // Add altars
    for (const altar of LAKE_TEMPLE_ALTARS) {
      items.push({
        id: altar,
        name: altar,
        type: "altar",
        category: "Temple",
        categorySlug: ALTAR_SLUG_MAP[altar] || altar.toLowerCase().replace(" ", "-"),
        imageUrl: null,
      });
    }

    // Add altar offerings (sections within altars)
    for (const offering of ALTAR_OFFERINGS) {
      items.push({
        id: offering.slug,
        name: offering.name,
        type: "offering",
        category: offering.altarName,
        categorySlug: offering.slug,
        imageUrl: null,
        parentSlug: offering.altarSlug,
      });
    }

    return items;
  }, [currentSaveId, queryClient]);

  // Search function
  const search = useCallback(
    (query: string): SearchableItem[] => {
      if (!query.trim()) return [];

      const q = query.toLowerCase();
      return searchableItems
        .filter((item) => item.name.toLowerCase().includes(q))
        .slice(0, 12); // Limit results
    },
    [searchableItems]
  );

  // Check if data is loaded
  const isLoading = searchableItems.length === 0 && currentSaveId !== null;

  return { search, searchableItems, isLoading };
}
