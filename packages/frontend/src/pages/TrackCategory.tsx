import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { FilterBar } from "@/components/FilterBar";
import { ItemCard } from "@/components/ItemCard";
import { NPCCard, type NPCData } from "@/components/NPCCard";
import { ProgressBar } from "@/components/ProgressBar";
import { ItemModal } from "@/components/ItemModal";
import { NPCModal } from "@/components/NPCModal";
import { VirtualizedGrid } from "@/components/VirtualizedGrid";
import { PageLoader, NoSaveSlotWarning } from "@/components/ui";
import { useGridNavigation } from "@/hooks/useGridNavigation";
import { useWindowWidth } from "@react-hook/window-size";
import { 
  FISHING_LOCATIONS, 
  FORAGING_LOCATIONS,
  INSECT_LOCATIONS,
  RARITIES,
  SEASONS,
  CHARACTER_TYPES,
  CATEGORY_FILTER_CONFIG,
  DEFAULT_FILTER_CONFIG,
  getGrowthTimeBucket,
  getEnergyGainBucket,
  RECIPE_SOURCES,
} from "@coral-tracker/shared";
import type { Rarity, Season, CharacterType, RelationshipStatus, RecipeSource } from "@coral-tracker/shared";

// Query hooks
import { 
  useProgressItems, 
  useNPCs, 
  useCategory, 
  useTempleStatus,
  type ItemWithProgress,
} from "@/hooks/useQueries";

// Mutation hooks
import {
  useUpdateProgress,
  useUpdateTempleProgress,
  useUpdateNPCProgress,
  useIncrementNPCHearts,
  useDecrementNPCHearts,
} from "@/hooks/useMutations";

// Card heights per category (in pixels) - must accommodate tallest card in each category
// Heights account for: padding, image, name/rarity row, and all info rows that can wrap
const CARD_HEIGHTS: Record<string, number> = {
  fish: 280,           // 4 seasons (wrap) + long locations (2 lines) + 4 times + weather
  crops: 200,          // 4 seasons (wrap) + growth days
  'artisan-products': 220, // Equipment + Input + Processing time (3 lines)
  gems: 160,           // Minimal info (no seasons, no location on card)
  artifacts: 160,      // Minimal info (no seasons, no location on card)
  forageables: 240,    // 4 seasons (wrap) + long locations (2 lines)
  insects: 280,        // 4 seasons (wrap) + locations (2 lines) + times
  critters: 280,       // 4 seasons (wrap) + locations (2 lines) + times
  npcs: 260,           // Hearts display + Birthday + Residence + Character type + Gifts
  'lake-temple': 200,  // Altar + Required items + Reward
  cooking: 200,        // Seasons + ingredients
};

const DEFAULT_CARD_HEIGHT = 220;

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
  const [searchParams, setSearchParams] = useSearchParams();
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
    // Cooking filters
    selectedBuffTypes,
    clearBuffTypes,
    selectedRecipeSources,
    clearRecipeSources,
    selectedEnergyGain,
    clearEnergyGain,
    showCompleted,
    setShowCompleted,
  } = useStore();

  // Check if this is the NPC category
  const isNPCCategory = slug === "npcs";
  // Check if this is the cooking category
  const isCookingCategory = slug === "cooking";

  // Track previous slug to detect category changes
  const prevSlugRef = useRef<string | undefined>(undefined);

  // ============================================================
  // Shared modal state (single modal instance for all items)
  // ============================================================

  const [selectedItem, setSelectedItem] = useState<ItemWithProgress | null>(null);
  const [selectedNPC, setSelectedNPC] = useState<NPCData | null>(null);

  // ============================================================
  // React Query hooks for data fetching
  // ============================================================

  const { data: category } = useCategory(slug);

  const { 
    data: items = [], 
    isLoading: isLoadingItems,
  } = useProgressItems(currentSaveId, isNPCCategory ? undefined : slug);

  const { 
    data: npcs = [], 
    isLoading: isLoadingNPCs,
  } = useNPCs(isNPCCategory ? currentSaveId : null);

  // Get item IDs for temple status query
  const itemIds = useMemo(() => items.map((item) => item.id), [items]);

  const { data: templeStatus = {} } = useTempleStatus(
    currentSaveId,
    slug,
    itemIds
  );

  const loading = isNPCCategory ? isLoadingNPCs : isLoadingItems;

  // ============================================================
  // Mutation hooks
  // ============================================================

  const updateProgressMutation = useUpdateProgress();
  const updateTempleMutation = useUpdateTempleProgress();
  const updateNPCProgressMutation = useUpdateNPCProgress();
  const incrementHeartsMutation = useIncrementNPCHearts();
  const decrementHeartsMutation = useDecrementNPCHearts();

  // ============================================================
  // Keyboard grid navigation
  // ============================================================

  const windowWidth = useWindowWidth();
  const columnCount = windowWidth < 768 ? 1 : 2;
  
  // Ref for scroll-to-index function from VirtualizedGrid
  const scrollToIndexRef = useRef<((index: number) => void) | null>(null);

  // ============================================================
  // Clear filters on category change
  // ============================================================

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

      // Clear cooking-specific filters
      clearBuffTypes();
      clearRecipeSources();
      clearEnergyGain();

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
  }, [slug, clearLocations, clearRarities, clearEquipment, clearGrowthTime, setSearchQuery, setShowCompleted, setPriceSort, clearTimes, clearSeasons, clearCharacterTypes, clearResidences, setMarriageCandidatesOnly, setBirthdaySeason, clearBuffTypes, clearRecipeSources, clearEnergyGain]);

  // ============================================================
  // Event handlers (using mutations) - memoized for stable references
  // ============================================================

  const handleToggle = useCallback((itemId: number, completed: boolean) => {
    if (!currentSaveId || !slug) return;

    updateProgressMutation.mutate({
      saveId: currentSaveId,
      itemId,
      category: slug,
      data: { completed },
    });
  }, [currentSaveId, slug, updateProgressMutation]);

  const handleToggleOffered = useCallback((itemId: number, requirementId: number, offered: boolean) => {
    if (!currentSaveId || !slug) return;

    updateTempleMutation.mutate({
      saveId: currentSaveId,
      requirementId,
      itemId,
      category: slug,
      offered,
    });
  }, [currentSaveId, slug, updateTempleMutation]);

  const handleNPCIncrement = useCallback((npcId: number) => {
    if (!currentSaveId) return;

    incrementHeartsMutation.mutate({
      saveId: currentSaveId,
      npcId,
    });
  }, [currentSaveId, incrementHeartsMutation]);

  const handleNPCDecrement = useCallback((npcId: number) => {
    if (!currentSaveId) return;

    decrementHeartsMutation.mutate({
      saveId: currentSaveId,
      npcId,
    });
  }, [currentSaveId, decrementHeartsMutation]);

  const handleNPCUpdateProgress = useCallback((npcId: number, hearts: number, status: RelationshipStatus) => {
    if (!currentSaveId) return;

    updateNPCProgressMutation.mutate({
      saveId: currentSaveId,
      npcId,
      hearts,
      relationship_status: status,
    });
  }, [currentSaveId, updateNPCProgressMutation]);

  // ============================================================
  // Derived data for filters
  // ============================================================

  // Get available locations based on category
  const availableLocations = 
    slug === "fish" ? [...FISHING_LOCATIONS] : 
    slug === "forageables" ? [...FORAGING_LOCATIONS] : 
    slug === "insects" ? [...INSECT_LOCATIONS] :
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

  // Get available equipment from items (for artisan products and cooking utensils)
  const availableEquipment = useMemo(() => {
    if (slug !== 'artisan-products' && slug !== 'cooking') return [];
    const equipmentSet = new Set<string>();
    items.forEach(item => {
      const metadata = parseMetadata(item.metadata);
      // Artisan products use 'equipment', cooking uses 'utensil'
      const eq = metadata?.equipment || metadata?.utensil;
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

  // Get available buff types from cooking items
  const availableBuffTypes = useMemo(() => {
    if (!isCookingCategory) return [];
    const buffTypeSet = new Set<string>();
    items.forEach(item => {
      const metadata = parseMetadata(item.metadata);
      const buffs = metadata?.buffs as Array<{ type: string }> | undefined;
      if (Array.isArray(buffs)) {
        buffs.forEach(buff => {
          if (buff.type) buffTypeSet.add(buff.type);
        });
      }
    });
    return Array.from(buffTypeSet).sort();
  }, [items, isCookingCategory]);

  // Get available recipe sources from cooking items
  const availableRecipeSources = useMemo(() => {
    if (!isCookingCategory) return [] as RecipeSource[];
    const sourceSet = new Set<RecipeSource>();
    items.forEach(item => {
      const metadata = parseMetadata(item.metadata);
      const source = metadata?.recipe_source_category as RecipeSource | undefined;
      if (source) sourceSet.add(source);
    });
    // Return in standard order from RECIPE_SOURCES
    return RECIPE_SOURCES.filter((s) => sourceSet.has(s));
  }, [items, isCookingCategory]);

  // ============================================================
  // Filter items
  // ============================================================

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

    // Equipment/Utensil filter (for artisan products and cooking)
    if (selectedEquipment.length > 0) {
      const metadata = parseMetadata(item.metadata);
      // Artisan products use 'equipment', cooking uses 'utensil'
      const itemEquipment = metadata?.equipment || metadata?.utensil;
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

    // Cooking filters
    if (isCookingCategory) {
      const metadata = parseMetadata(item.metadata);
      
      // Buff type filter (match ANY selected buff type)
      if (selectedBuffTypes.length > 0) {
        const buffs = metadata?.buffs as Array<{ type: string }> | undefined;
        if (!Array.isArray(buffs) || !buffs.some(b => selectedBuffTypes.includes(b.type))) {
          return false;
        }
      }

      // Recipe source filter
      if (selectedRecipeSources.length > 0) {
        const source = metadata?.recipe_source_category as RecipeSource | undefined;
        if (!source || !selectedRecipeSources.includes(source)) {
          return false;
        }
      }

      // Energy gain filter
      if (selectedEnergyGain.length > 0) {
        const energy = Number(metadata?.energy_restored);
        if (isNaN(energy) || energy <= 0) return false;
        
        const bucket = getEnergyGainBucket(energy);
        if (!selectedEnergyGain.includes(bucket)) {
          return false;
        }
      }
    }

    // Completion filter
    if (showCompleted !== null) {
      if (showCompleted && !item.completed) return false;
      if (!showCompleted && item.completed) return false;
    }

    return true;
  });

  // ============================================================
  // Filter NPCs
  // ============================================================

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

  // ============================================================
  // Sort items
  // ============================================================

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

  // ============================================================
  // Handle openItem query param (from global search navigation)
  // ============================================================

  useEffect(() => {
    const openItemId = searchParams.get('openItem');
    if (!openItemId) return;

    // Wait for data to be loaded
    if (isNPCCategory) {
      if (npcs.length === 0) return;
      const npc = npcs.find(n => n.id === Number(openItemId));
      if (npc) {
        // Set search to filter down to this NPC
        setSearchQuery(npc.name);
        // Open the modal
        setSelectedNPC(npc);
        // Clear the query param to avoid reopening on refresh
        searchParams.delete('openItem');
        setSearchParams(searchParams, { replace: true });
      }
    } else {
      if (items.length === 0) return;
      const item = items.find(i => i.id === Number(openItemId));
      if (item) {
        // Set search to filter down to this item
        setSearchQuery(item.name);
        // Open the modal
        setSelectedItem(item);
        // Clear the query param to avoid reopening on refresh
        searchParams.delete('openItem');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [searchParams, setSearchParams, isNPCCategory, items, npcs, setSearchQuery]);

  // ============================================================
  // Calculate counts
  // ============================================================

  const completedCount = isNPCCategory 
    ? npcs.filter((n) => n.is_max_hearts).length
    : items.filter((i) => i.completed).length;
  const totalCount = isNPCCategory ? npcs.length : items.length;
  const filteredCompletedCount = isNPCCategory
    ? filteredNPCs.filter((n) => n.is_max_hearts).length
    : sortedItems.filter((i) => i.completed).length;
  const filteredCount = isNPCCategory ? filteredNPCs.length : sortedItems.length;

  // ============================================================
  // Grid navigation handlers
  // ============================================================

  // Handler for selecting an item (Enter/Space)
  const handleGridSelect = useCallback((index: number) => {
    if (isNPCCategory) {
      const npc = filteredNPCs[index];
      if (npc) setSelectedNPC(npc);
    } else {
      const item = sortedItems[index];
      if (item) {
        handleToggle(item.id, !item.completed);
      }
    }
  }, [isNPCCategory, filteredNPCs, sortedItems, handleToggle]);

  // Handler for showing item details (i key)
  const handleGridDetails = useCallback((index: number) => {
    if (isNPCCategory) {
      const npc = filteredNPCs[index];
      if (npc) setSelectedNPC(npc);
    } else {
      const item = sortedItems[index];
      if (item) setSelectedItem(item);
    }
  }, [isNPCCategory, filteredNPCs, sortedItems]);

  // Handler for NPC heart changes (+/- keys)
  const handleGridHeartsChange = useCallback((index: number, delta: 1 | -1) => {
    if (!isNPCCategory) return;
    const npc = filteredNPCs[index];
    if (!npc) return;

    if (delta > 0) {
      handleNPCIncrement(npc.id);
    } else {
      handleNPCDecrement(npc.id);
    }
  }, [isNPCCategory, filteredNPCs, handleNPCIncrement, handleNPCDecrement]);

  // Handler for toggling temple offering (o key)
  const handleGridToggleOffered = useCallback((index: number) => {
    if (isNPCCategory) return; // NPCs don't have offerings
    const item = sortedItems[index];
    if (!item) return;

    // Check if this item has temple requirements
    const itemTempleStatus = templeStatus[item.id];
    if (!itemTempleStatus?.is_temple_requirement) return;
    
    const requirements = itemTempleStatus.requirements;
    if (!requirements || requirements.length === 0) return;

    // Toggle the first requirement's offered state
    const firstReq = requirements[0];
    handleToggleOffered(item.id, firstReq.requirement_id, !firstReq.offered);
  }, [isNPCCategory, sortedItems, templeStatus, handleToggleOffered]);

  // Initialize grid navigation (disabled when modal is open)
  const isModalOpen = !!selectedItem || !!selectedNPC;
  const { focusedIndex, showFocusIndicator } = useGridNavigation({
    itemCount: filteredCount,
    columnCount,
    categorySlug: slug || "",
    onSelect: handleGridSelect,
    onDetails: handleGridDetails,
    onHeartsChange: handleGridHeartsChange,
    onToggleOffered: handleGridToggleOffered,
    scrollToIndex: (index) => scrollToIndexRef.current?.(index),
    enabled: !isModalOpen,
  });

  // Only show grid focus indicator when not in filter mode
  const effectiveFocusedIndex = showFocusIndicator ? focusedIndex : -1;

  // ============================================================
  // Render
  // ============================================================

  if (!currentSaveId) {
    return <NoSaveSlotWarning />;
  }

  if (loading) {
    return <PageLoader />;
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
        availableBuffTypes={availableBuffTypes}
        availableRecipeSources={availableRecipeSources}
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
        // NPC rendering with virtualization
        <>
          <p className="text-xs sm:text-sm text-slate-400 mb-3 sm:mb-4">
            Showing {filteredNPCs.length} NPCs ({filteredCompletedCount} max hearts)
          </p>
          <VirtualizedGrid
            key={slug}
            items={filteredNPCs}
            getItemKey={(npc) => npc.id}
            rowHeight={CARD_HEIGHTS.npcs}
            focusedIndex={effectiveFocusedIndex}
            onScrollToIndexReady={(fn) => { scrollToIndexRef.current = fn; }}
            renderItem={(npc, _index, isKeyboardFocused) => (
              <NPCCard
                npc={npc}
                onIncrement={handleNPCIncrement}
                onDecrement={handleNPCDecrement}
                onShowDetails={() => setSelectedNPC(npc)}
                isKeyboardFocused={isKeyboardFocused}
              />
            )}
          />
        </>
      ) : (
        // Regular item rendering with virtualization
        <>
          <p className="text-xs sm:text-sm text-slate-400 mb-3 sm:mb-4">
            Showing {sortedItems.length} items ({filteredCompletedCount} completed)
          </p>
          <VirtualizedGrid
            key={slug}
            items={sortedItems}
            getItemKey={(item) => item.id}
            rowHeight={slug ? (CARD_HEIGHTS[slug] ?? DEFAULT_CARD_HEIGHT) : DEFAULT_CARD_HEIGHT}
            focusedIndex={effectiveFocusedIndex}
            onScrollToIndexReady={(fn) => { scrollToIndexRef.current = fn; }}
            renderItem={(item, _index, isKeyboardFocused) => (
              <ItemCard 
                item={item}
                categorySlug={slug}
                onToggle={handleToggle}
                templeStatus={templeStatus[item.id]}
                onToggleOffered={(requirementId, offered) => handleToggleOffered(item.id, requirementId, offered)}
                onShowDetails={() => setSelectedItem(item)}
                isKeyboardFocused={isKeyboardFocused}
              />
            )}
          />
        </>
      )}

      {/* Shared Item Modal */}
      {selectedItem && (
        <ItemModal
          item={selectedItem}
          categorySlug={slug}
          isOpen={true}
          onClose={() => setSelectedItem(null)}
          onToggle={handleToggle}
        />
      )}

      {/* Shared NPC Modal */}
      {selectedNPC && (
        <NPCModal
          npc={selectedNPC}
          isOpen={true}
          onClose={() => setSelectedNPC(null)}
          onUpdateProgress={handleNPCUpdateProgress}
        />
      )}
    </div>
  );
}
