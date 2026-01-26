import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { FilterBar } from "@/components/FilterBar";
import { ItemCard } from "@/components/ItemCard";
import { NPCCard } from "@/components/NPCCard";
import { ProgressBar } from "@/components/ProgressBar";
import { getProgressItems, updateProgress, getCategory, getItemsTempleStatus, updateTempleProgress, getNPCs, incrementNPCHearts, decrementNPCHearts, updateNPCProgress } from "@/lib/api";
import { AlertCircle } from "lucide-react";
import { 
  FISHING_LOCATIONS, 
  FORAGING_LOCATIONS, 
  RARITIES,
  SEASONS,
  CHARACTER_TYPES,
  CATEGORY_FILTER_CONFIG,
  DEFAULT_FILTER_CONFIG,
  getGrowthTimeBucket,
} from "@coral-tracker/shared";
import type { Item, Category, ItemTempleStatus, Rarity, NPCMetadata, RelationshipStatus, Season, CharacterType } from "@coral-tracker/shared";

type ItemWithProgress = Item & { completed: boolean; completed_at: string | null; notes: string | null };

// NPC data type from API
interface NPCData {
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

// Helper to parse metadata (handles string or object)
function parseMetadata(metadata: unknown): Record<string, unknown> {
  if (!metadata) return {};
  if (typeof metadata === 'string') {
    try {
      return JSON.parse(metadata);
    } catch {
      return {};
    }
  }
  return metadata as Record<string, unknown>;
}

export function TrackCategory() {
  const { slug } = useParams<{ slug: string }>();
  const { 
    currentSaveId, 
    searchQuery, 
    setSearchQuery,
    selectedSeasons,
    clearSeasons,
    selectedTimes,
    clearTimes,
    selectedLocations,
    clearLocations,
    selectedRarities,
    clearRarities,
    selectedEquipment,
    clearEquipment,
    selectedGrowthTime,
    clearGrowthTime,
    priceSort,
    setPriceSort,
    // NPC filters
    selectedCharacterTypes,
    clearCharacterTypes,
    selectedResidences,
    clearResidences,
    marriageCandidatesOnly,
    setMarriageCandidatesOnly,
    selectedBirthdaySeason,
    setBirthdaySeason,
    showCompleted,
    setShowCompleted,
  } = useStore();

  // Check if this is the NPC category
  const isNPCCategory = slug === "npcs";

  // Track previous slug to detect category changes
  const prevSlugRef = useRef<string | undefined>(undefined);

  const [items, setItems] = useState<ItemWithProgress[]>([]);
  const [npcs, setNPCs] = useState<NPCData[]>([]);
  const [category, setCategory] = useState<(Category & { item_count: number }) | null>(null);
  const [templeStatus, setTempleStatus] = useState<Record<number, ItemTempleStatus>>({});
  const [loading, setLoading] = useState(true);

  const loadItems = useCallback(async () => {
    if (!currentSaveId || !slug) return;

    setLoading(true);
    try {
      // Load NPCs differently
      if (slug === "npcs") {
        const [npcsData, categoryData] = await Promise.all([
          getNPCs(currentSaveId),
          getCategory(slug),
        ]);
        setNPCs(npcsData);
        setItems([]);
        setCategory(categoryData);
      } else {
        const [itemsData, categoryData] = await Promise.all([
          getProgressItems(currentSaveId, slug),
          getCategory(slug),
        ]);
        setItems(itemsData);
        setNPCs([]);
        setCategory(categoryData);

        // Load temple status for all items
        const itemIds = itemsData.map((item) => item.id);
        if (itemIds.length > 0) {
          const status = await getItemsTempleStatus(currentSaveId, itemIds);
          setTempleStatus(status);
        }
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
      const config = slug 
        ? (CATEGORY_FILTER_CONFIG[slug] || DEFAULT_FILTER_CONFIG)
        : DEFAULT_FILTER_CONFIG;

      // Always clear these (category-specific)
      clearLocations();
      clearRarities();
      clearEquipment();
      clearGrowthTime();
      setSearchQuery("");
      setShowCompleted(null);
      setPriceSort("none");

      // Clear NPC-specific filters
      clearCharacterTypes();
      clearResidences();
      setMarriageCandidatesOnly(false);
      setBirthdaySeason(null);

      // Clear time filter if new category doesn't support it
      if (!config.showTime) {
        clearTimes();
      }

      // Clear season filter if new category doesn't support it
      if (!config.showSeasons) {
        clearSeasons();
      }

      prevSlugRef.current = slug;
    }
  }, [slug, clearLocations, clearRarities, clearEquipment, clearGrowthTime, setSearchQuery, setShowCompleted, setPriceSort, clearTimes, clearSeasons, clearCharacterTypes, clearResidences, setMarriageCandidatesOnly, setBirthdaySeason]);

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

  // NPC handlers
  const handleNPCIncrement = async (npcId: number) => {
    if (!currentSaveId) return;

    // Optimistic update
    setNPCs((prev) =>
      prev.map((npc) =>
        npc.id === npcId && npc.hearts < npc.max_hearts
          ? { ...npc, hearts: npc.hearts + 1, is_max_hearts: npc.hearts + 1 >= npc.max_hearts }
          : npc
      )
    );

    try {
      await incrementNPCHearts(currentSaveId, npcId);
    } catch (error) {
      console.error("Failed to increment NPC hearts:", error);
      loadItems();
    }
  };

  const handleNPCDecrement = async (npcId: number) => {
    if (!currentSaveId) return;

    // Optimistic update
    setNPCs((prev) =>
      prev.map((npc) =>
        npc.id === npcId && npc.hearts > 0
          ? { ...npc, hearts: npc.hearts - 1, is_max_hearts: false }
          : npc
      )
    );

    try {
      await decrementNPCHearts(currentSaveId, npcId);
    } catch (error) {
      console.error("Failed to decrement NPC hearts:", error);
      loadItems();
    }
  };

  const handleNPCUpdateProgress = async (npcId: number, hearts: number, status: RelationshipStatus) => {
    if (!currentSaveId) return;

    // Optimistic update
    setNPCs((prev) =>
      prev.map((npc) => {
        if (npc.id !== npcId) return npc;
        
        const isMarriageCandidate = npc.metadata?.is_marriage_candidate || false;
        const newMaxHearts = isMarriageCandidate && status === "married" ? 14 : 10;
        
        return {
          ...npc,
          hearts,
          relationship_status: status,
          max_hearts: newMaxHearts,
          is_max_hearts: hearts >= newMaxHearts,
        };
      })
    );

    try {
      await updateNPCProgress(currentSaveId, npcId, { hearts, relationship_status: status });
    } catch (error) {
      console.error("Failed to update NPC progress:", error);
      loadItems();
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

  // Get available equipment from items (for artisan products)
  const availableEquipment = useMemo(() => {
    if (slug !== 'artisan-products') return [];
    const equipmentSet = new Set<string>();
    items.forEach(item => {
      const metadata = parseMetadata(item.metadata);
      const eq = metadata?.equipment;
      if (typeof eq === 'string') equipmentSet.add(eq);
    });
    return Array.from(equipmentSet).sort();
  }, [items, slug]);

  // Get available residences from NPCs
  const availableResidences = useMemo(() => {
    if (!isNPCCategory) return [];
    const residenceSet = new Set<string>();
    npcs.forEach(npc => {
      const residence = npc.metadata?.residence || npc.locations?.[0];
      if (residence) residenceSet.add(residence);
    });
    return Array.from(residenceSet).sort();
  }, [npcs, isNPCCategory]);

  // Get available character types from NPCs (only show types that have data)
  const availableCharacterTypes = useMemo(() => {
    if (!isNPCCategory) return [] as CharacterType[];
    const typeSet = new Set<CharacterType>();
    npcs.forEach(npc => {
      const charType = (npc.metadata?.character_type || "other") as CharacterType;
      typeSet.add(charType);
    });
    // Return in standard order from CHARACTER_TYPES, filtered to only those present
    return CHARACTER_TYPES.filter((t) => typeSet.has(t));
  }, [npcs, isNPCCategory]);

  // Get available birthday seasons from NPCs
  const availableBirthdaySeasons = useMemo(() => {
    if (!isNPCCategory) return [] as Season[];
    const seasonSet = new Set<Season>();
    npcs.forEach(npc => {
      const birthdaySeason = npc.metadata?.birthday_season as Season | undefined;
      if (birthdaySeason) seasonSet.add(birthdaySeason);
    });
    // Return in standard season order
    return SEASONS.filter((s) => seasonSet.has(s));
  }, [npcs, isNPCCategory]);

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

    // Equipment filter (for artisan products)
    if (selectedEquipment.length > 0) {
      const metadata = parseMetadata(item.metadata);
      const itemEquipment = metadata?.equipment;
      if (typeof itemEquipment !== 'string' || !selectedEquipment.includes(itemEquipment)) {
        return false;
      }
    }

    // Growth time filter (for crops)
    if (selectedGrowthTime.length > 0) {
      const metadata = parseMetadata(item.metadata);
      const growthDays = Number(metadata?.growth_days);
      if (isNaN(growthDays)) return false;
      
      const bucket = getGrowthTimeBucket(growthDays);
      if (!selectedGrowthTime.includes(bucket)) {
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

  // Filter NPCs
  const filteredNPCs = npcs.filter((npc) => {
    // Search filter
    if (searchQuery && !npc.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Birthday season filter
    if (selectedBirthdaySeason) {
      const birthdaySeason = npc.metadata?.birthday_season;
      if (birthdaySeason !== selectedBirthdaySeason) {
        return false;
      }
    }

    // Character type filter
    if (selectedCharacterTypes.length > 0) {
      const characterType = npc.metadata?.character_type || "other";
      if (!selectedCharacterTypes.includes(characterType as CharacterType)) {
        return false;
      }
    }

    // Residence filter
    if (selectedResidences.length > 0) {
      const residence = npc.metadata?.residence || npc.locations?.[0];
      if (!residence || !selectedResidences.includes(residence)) {
        return false;
      }
    }

    // Marriage candidates only filter
    if (marriageCandidatesOnly) {
      if (!npc.metadata?.is_marriage_candidate) {
        return false;
      }
    }

    // Completion filter (max hearts reached)
    if (showCompleted !== null) {
      if (showCompleted && !npc.is_max_hearts) return false;
      if (!showCompleted && npc.is_max_hearts) return false;
    }

    return true;
  });

  // Sort items based on priceSort
  const sortedItems = useMemo(() => {
    if (priceSort === "none") return filteredItems;
    
    return [...filteredItems].sort((a, b) => {
      const priceA = a.base_price || 0;
      const priceB = b.base_price || 0;
      return priceSort === "price_high" 
        ? priceB - priceA 
        : priceA - priceB;
    });
  }, [filteredItems, priceSort]);

  // Calculate completion counts
  const completedCount = isNPCCategory 
    ? npcs.filter((n) => n.is_max_hearts).length
    : items.filter((i) => i.completed).length;
  const totalCount = isNPCCategory ? npcs.length : items.length;
  const filteredCompletedCount = isNPCCategory
    ? filteredNPCs.filter((n) => n.is_max_hearts).length
    : sortedItems.filter((i) => i.completed).length;
  const filteredCount = isNPCCategory ? filteredNPCs.length : sortedItems.length;

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
            max={totalCount}
            label={`${category?.name} Progress`}
            color={completedCount === totalCount ? "green" : "ocean"}
          />
        </div>
      </div>

      {/* Filters */}
      <FilterBar 
        categorySlug={slug}
        availableLocations={availableLocations}
        availableRarities={availableRarities}
        availableEquipment={availableEquipment}
        availableResidences={availableResidences}
        availableCharacterTypes={availableCharacterTypes}
        availableBirthdaySeasons={availableBirthdaySeasons}
        items={isNPCCategory ? npcs.map(n => ({ id: n.id, name: n.name })) : items} 
      />

      {/* Items/NPCs grid */}
      {filteredCount === 0 ? (
        <div className="card text-center py-8 sm:py-12">
          <p className="text-slate-400 text-sm sm:text-base">
            {totalCount === 0
              ? isNPCCategory 
                ? "No NPCs in this category yet. Run the scraper to add data."
                : "No items in this category yet. Run the seed script to add data."
              : "No items match your filters."}
          </p>
        </div>
      ) : isNPCCategory ? (
        // NPC rendering
        <>
          <p className="text-xs sm:text-sm text-slate-400 mb-3 sm:mb-4">
            Showing {filteredNPCs.length} NPCs ({filteredCompletedCount} max hearts)
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {filteredNPCs.map((npc) => (
              <NPCCard
                key={npc.id}
                npc={npc}
                onIncrement={handleNPCIncrement}
                onDecrement={handleNPCDecrement}
                onUpdateProgress={handleNPCUpdateProgress}
              />
            ))}
          </div>
        </>
      ) : (
        // Regular item rendering
        <>
          <p className="text-xs sm:text-sm text-slate-400 mb-3 sm:mb-4">
            Showing {sortedItems.length} items ({filteredCompletedCount} completed)
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {sortedItems.map((item) => (
              <ItemCard 
                key={item.id} 
                item={item}
                categorySlug={slug}
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
