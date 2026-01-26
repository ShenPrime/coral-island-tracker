import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useStore } from "@/store/useStore";
import { queryKeys } from "./useQueries";
import {
  getSaveSlot,
  getCategories,
  getProgressItems,
  getNPCs,
  getTempleOverview,
  getAltarDetail,
} from "@/lib/api";

// All category slugs to prefetch
const CATEGORY_SLUGS = [
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

// All altar slugs to prefetch
const ALTAR_SLUGS = [
  "altar-of-the-ocean-king",
  "altar-of-the-spring-fairy",
  "altar-of-the-earth-giant",
  "altar-of-the-fire-spirit",
];

// Delay between batches in milliseconds
const BATCH_DELAY = 100;

/**
 * Prefetches all app data in the background when the user first loads the site.
 * Uses staggered requests to avoid overwhelming the server.
 * 
 * Prefetch sequence:
 * 1. Save slot stats (dashboard)
 * 2. Categories list + Temple overview
 * 3-5. Category progress data (3 categories per batch)
 * 6. NPCs
 * 7. All 4 altar details
 */
export function usePrefetchAll() {
  const queryClient = useQueryClient();
  const { currentSaveId } = useStore();
  const hasPrefetched = useRef<number | null>(null);

  useEffect(() => {
    // Only prefetch once per save slot
    if (!currentSaveId || hasPrefetched.current === currentSaveId) {
      return;
    }

    hasPrefetched.current = currentSaveId;

    async function prefetchAll() {
      const saveId = currentSaveId!;

      // Helper to delay execution
      const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      // Batch 1 (immediate): Dashboard stats
      queryClient.prefetchQuery({
        queryKey: queryKeys.saveSlot(saveId),
        queryFn: () => getSaveSlot(saveId),
      });

      // Batch 2 (+100ms): Categories + Temple overview
      await delay(BATCH_DELAY);
      queryClient.prefetchQuery({
        queryKey: queryKeys.categories,
        queryFn: getCategories,
      });
      queryClient.prefetchQuery({
        queryKey: queryKeys.templeOverview(saveId),
        queryFn: () => getTempleOverview(saveId),
      });

      // Batch 3 (+200ms): First 3 categories
      await delay(BATCH_DELAY);
      for (const slug of CATEGORY_SLUGS.slice(0, 3)) {
        queryClient.prefetchQuery({
          queryKey: queryKeys.progress(saveId, slug),
          queryFn: () => getProgressItems(saveId, slug),
        });
      }

      // Batch 4 (+300ms): Next 3 categories
      await delay(BATCH_DELAY);
      for (const slug of CATEGORY_SLUGS.slice(3, 6)) {
        queryClient.prefetchQuery({
          queryKey: queryKeys.progress(saveId, slug),
          queryFn: () => getProgressItems(saveId, slug),
        });
      }

      // Batch 5 (+400ms): Last 3 categories
      await delay(BATCH_DELAY);
      for (const slug of CATEGORY_SLUGS.slice(6, 9)) {
        queryClient.prefetchQuery({
          queryKey: queryKeys.progress(saveId, slug),
          queryFn: () => getProgressItems(saveId, slug),
        });
      }

      // Batch 6 (+500ms): NPCs
      await delay(BATCH_DELAY);
      queryClient.prefetchQuery({
        queryKey: queryKeys.npcs(saveId),
        queryFn: () => getNPCs(saveId),
      });

      // Batch 7 (+600ms): All 4 altar details
      await delay(BATCH_DELAY);
      for (const altarSlug of ALTAR_SLUGS) {
        queryClient.prefetchQuery({
          queryKey: queryKeys.altarDetail(saveId, altarSlug),
          queryFn: () => getAltarDetail(saveId, altarSlug),
        });
      }
    }

    prefetchAll();
  }, [currentSaveId, queryClient]);
}
