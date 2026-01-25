import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { FilterBar } from "@/components/FilterBar";
import { ItemCard } from "@/components/ItemCard";
import { ProgressBar } from "@/components/ProgressBar";
import { getProgressItems, updateProgress, getCategory, getItemsTempleStatus, updateTempleProgress } from "@/lib/api";
import { AlertCircle } from "lucide-react";
import { FISHING_LOCATIONS, FORAGING_LOCATIONS, RARITIES } from "@coral-tracker/shared";
import type { Item, Category, ItemTempleStatus, Rarity } from "@coral-tracker/shared";

type ItemWithProgress = Item & { completed: boolean; completed_at: string | null; notes: string | null };

// Categories that support time-of-day filtering
const CATEGORIES_WITH_TIME = ["fish", "insects", "critters"];

export function TrackCategory() {
  const { slug } = useParams<{ slug: string }>();
  const { 
    currentSaveId, 
    searchQuery, 
    setSearchQuery,
    selectedSeasons, 
    selectedTimes,
    clearTimes,
    selectedLocations,
    clearLocations,
    selectedRarities,
    clearRarities,
    showCompleted,
    setShowCompleted,
  } = useStore();

  // Track previous slug to detect category changes
  const prevSlugRef = useRef<string | undefined>(undefined);

  const [items, setItems] = useState<ItemWithProgress[]>([]);
  const [category, setCategory] = useState<(Category & { item_count: number }) | null>(null);
  const [templeStatus, setTempleStatus] = useState<Record<number, ItemTempleStatus>>({});
  const [loading, setLoading] = useState(true);

  const loadItems = useCallback(async () => {
    if (!currentSaveId || !slug) return;

    setLoading(true);
    try {
      const [itemsData, categoryData] = await Promise.all([
        getProgressItems(currentSaveId, slug),
        getCategory(slug),
      ]);
      setItems(itemsData);
      setCategory(categoryData);

      // Load temple status for all items
      const itemIds = itemsData.map((item) => item.id);
      if (itemIds.length > 0) {
        const status = await getItemsTempleStatus(currentSaveId, itemIds);
        setTempleStatus(status);
      }
    } catch (error) {
      console.error("Failed to load items:", error);
    } finally {
      setLoading(false);
    }
  }, [currentSaveId, slug]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Clear category-specific filters when switching categories
  useEffect(() => {
    // Skip on initial mount
    if (prevSlugRef.current === undefined) {
      prevSlugRef.current = slug;
      return;
    }

    // Only clear if slug actually changed
    if (prevSlugRef.current !== slug) {
      // Always clear these (category-specific)
      clearLocations();
      clearRarities();
      setSearchQuery("");
      setShowCompleted(null);

      // Clear time filter only if new category doesn't support time-based filtering
      if (slug && !CATEGORIES_WITH_TIME.includes(slug)) {
        clearTimes();
      }

      prevSlugRef.current = slug;
    }
  }, [slug, clearLocations, clearRarities, setSearchQuery, setShowCompleted, clearTimes]);

  const handleToggle = async (itemId: number, completed: boolean) => {
    if (!currentSaveId) return;

    // Optimistic update
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, completed, completed_at: completed ? new Date().toISOString() : null }
          : item
      )
    );

    try {
      await updateProgress(currentSaveId, itemId, { completed });
    } catch (error) {
      console.error("Failed to update progress:", error);
      // Revert on error
      loadItems();
    }
  };

  const handleToggleOffered = async (itemId: number, requirementId: number, offered: boolean) => {
    if (!currentSaveId) return;

    // Optimistic update
    setTempleStatus((prev) => {
      const itemStatus = prev[itemId];
      if (!itemStatus) return prev;
      
      return {
        ...prev,
        [itemId]: {
          ...itemStatus,
          requirements: itemStatus.requirements.map((req) =>
            req.requirement_id === requirementId ? { ...req, offered } : req
          ),
        },
      };
    });

    try {
      await updateTempleProgress(currentSaveId, requirementId, offered);
    } catch (error) {
      console.error("Failed to update temple progress:", error);
      // Reload temple status on error
      const itemIds = items.map((item) => item.id);
      if (itemIds.length > 0) {
        const status = await getItemsTempleStatus(currentSaveId, itemIds);
        setTempleStatus(status);
      }
    }
  };

  // Get available locations based on category
  const availableLocations = 
    slug === "fish" ? [...FISHING_LOCATIONS] : 
    slug === "forageables" ? [...FORAGING_LOCATIONS] : 
    [];

  // Get available rarities from items in this category (in standard order)
  const availableRarities = useMemo(() => {
    const raritiesInCategory = new Set<Rarity>();
    items.forEach(item => {
      if (item.rarity) raritiesInCategory.add(item.rarity);
    });
    // Return in standard order: common, uncommon, rare, super_rare, epic, legendary
    return RARITIES.filter(r => raritiesInCategory.has(r));
  }, [items]);

  // Filter items based on all filters
  const filteredItems = items.filter((item) => {
    // Search filter
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Season filter (match ANY selected season, or if item has no seasons it's "any season")
    if (selectedSeasons.length > 0) {
      const itemSeasons = item.seasons || [];
      // Items with empty seasons array are available in all seasons
      if (itemSeasons.length > 0 && !selectedSeasons.some((s) => itemSeasons.includes(s))) {
        return false;
      }
    }

    // Time filter (match ANY selected time)
    if (selectedTimes.length > 0) {
      const itemTimes = item.time_of_day || [];
      // Items with empty time array are available at all times
      if (itemTimes.length > 0 && !selectedTimes.some((t) => itemTimes.includes(t))) {
        return false;
      }
    }

    // Location filter (match ANY selected location - partial match)
    if (selectedLocations.length > 0) {
      const itemLocations = item.locations || [];
      const itemLocationsLower = itemLocations.map((l) => l.toLowerCase());
      const hasMatch = selectedLocations.some((selectedLoc) => {
        const selectedLower = selectedLoc.toLowerCase();
        return itemLocationsLower.some((itemLoc) => 
          itemLoc.includes(selectedLower) || selectedLower.includes(itemLoc)
        );
      });
      if (!hasMatch) {
        return false;
      }
    }

    // Rarity filter (match ANY selected rarity)
    if (selectedRarities.length > 0) {
      if (!item.rarity || !selectedRarities.includes(item.rarity)) {
        return false;
      }
    }

    // Completion filter
    if (showCompleted !== null) {
      if (showCompleted && !item.completed) return false;
      if (!showCompleted && item.completed) return false;
    }

    return true;
  });

  const completedCount = items.filter((i) => i.completed).length;
  const filteredCompletedCount = filteredItems.filter((i) => i.completed).length;

  if (!currentSaveId) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card text-center py-12">
          <AlertCircle size={48} className="mx-auto text-slate-400 mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">
            No Save Slot Selected
          </h2>
          <p className="text-slate-400 mb-6">
            Please select a save slot first to track your progress
          </p>
          <Link to="/saves" className="btn btn-primary">
            Go to Save Slots
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ocean-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Sticky header with progress */}
      <div className="sticky top-0 z-10 bg-gradient-to-b from-deepsea-950 via-deepsea-950 to-transparent pb-3 sm:pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 pt-2">
        {/* Header */}
        <div className="mb-3 sm:mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">
            {category?.name || "Loading..."}
          </h1>
          {category?.description && (
            <p className="text-sm sm:text-base text-slate-400">{category.description}</p>
          )}
        </div>

        {/* Progress */}
        <div className="card p-4 sm:p-6">
          <ProgressBar
            value={completedCount}
            max={items.length}
            label={`${category?.name} Progress`}
            color={completedCount === items.length ? "green" : "ocean"}
          />
        </div>
      </div>

      {/* Filters */}
      <FilterBar 
        availableLocations={availableLocations}
        availableRarities={availableRarities}
        items={items} 
      />

      {/* Items grid */}
      {filteredItems.length === 0 ? (
        <div className="card text-center py-8 sm:py-12">
          <p className="text-slate-400 text-sm sm:text-base">
            {items.length === 0
              ? "No items in this category yet. Run the seed script to add data."
              : "No items match your filters."}
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs sm:text-sm text-slate-400 mb-3 sm:mb-4">
            Showing {filteredItems.length} items ({filteredCompletedCount} completed)
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {filteredItems.map((item) => (
              <ItemCard 
                key={item.id} 
                item={item} 
                onToggle={handleToggle}
                templeStatus={templeStatus[item.id]}
                onToggleOffered={(requirementId, offered) => handleToggleOffered(item.id, requirementId, offered)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
