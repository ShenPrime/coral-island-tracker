import { useEffect, useMemo } from "react";
import { X } from "lucide-react";
import { useStore } from "@/store/useStore";
import { ARIA_LABELS } from "@/lib/aria-labels";
import { useKeyboardNavigation } from "@/context/KeyboardNavigationContext";
import { useFilterNavigation } from "@/hooks/useFilterNavigation";
import { SearchAutocomplete } from "@/components/SearchAutocomplete";
import { MultiSelectDropdown } from "@/components/MultiSelectDropdown";
import { SingleSelectDropdown } from "@/components/SingleSelectDropdown";
import { 
  SEASONS, 
  TIMES_OF_DAY, 
  GROWTH_TIME_BUCKETS,
  GROWTH_TIME_LABELS,
  PRICE_SORT_OPTIONS,
  PRICE_SORT_LABELS,
  CATEGORY_FILTER_CONFIG,
  DEFAULT_FILTER_CONFIG,
  CHARACTER_TYPE_LABELS,
  ENERGY_GAIN_BUCKETS,
  ENERGY_GAIN_LABELS,
  type Season, 
  type TimeOfDay, 
  type Rarity,
  type GrowthTimeBucket,
  type PriceSortOption,
  type CharacterType,
  type EnergyGainBucket,
  type RecipeSource,
} from "@coral-tracker/shared";

// Format rarity for display (super_rare -> "Super Rare")
const formatRarity = (rarity: string) =>
  rarity.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

interface FilterBarProps {
  categorySlug?: string;
  availableLocations?: string[];
  availableRarities?: Rarity[];
  availableEquipment?: string[];
  availableResidences?: string[];
  availableCharacterTypes?: CharacterType[];
  availableBirthdaySeasons?: Season[];
  // Cooking-specific
  availableBuffTypes?: string[];
  availableRecipeSources?: RecipeSource[];
  items?: Array<{ id: number; name: string }>;
  locationLabel?: string;
}

export function FilterBar({ 
  categorySlug,
  availableLocations = [], 
  availableRarities = [], 
  availableEquipment = [],
  availableResidences = [],
  availableCharacterTypes = [],
  availableBirthdaySeasons = [],
  availableBuffTypes = [],
  availableRecipeSources = [],
  items = [], 
  locationLabel = "Location" 
}: FilterBarProps) {
  const {
    searchQuery,
    setSearchQuery,
    selectedSeasons,
    toggleSeason,
    selectedTimes,
    toggleTime,
    selectedLocations,
    toggleLocation,
    selectedRarities,
    toggleRarity,
    selectedEquipment,
    toggleEquipment,
    selectedGrowthTime,
    toggleGrowthTime,
    priceSort,
    setPriceSort,
    // NPC filters
    selectedCharacterTypes,
    toggleCharacterType,
    selectedResidences,
    toggleResidence,
    marriageCandidatesOnly,
    setMarriageCandidatesOnly,
    selectedBirthdaySeason,
    setBirthdaySeason,
    // Cooking filters
    selectedBuffTypes,
    toggleBuffType,
    selectedRecipeSources,
    toggleRecipeSource,
    selectedEnergyGain,
    toggleEnergyGain,
    showCompleted,
    setShowCompleted,
    clearAllFilters,
  } = useStore();

  // Check if this is the NPC category
  const isNPCCategory = categorySlug === "npcs";
  // Check if this is the cooking category
  const isCookingCategory = categorySlug === "cooking";

  // Get filter config for this category
  const config = categorySlug 
    ? (CATEGORY_FILTER_CONFIG[categorySlug] || DEFAULT_FILTER_CONFIG)
    : DEFAULT_FILTER_CONFIG;

  const hasFilters = 
    searchQuery || 
    selectedSeasons.length > 0 || 
    selectedTimes.length > 0 || 
    selectedLocations.length > 0 || 
    selectedRarities.length > 0 ||
    selectedEquipment.length > 0 ||
    selectedGrowthTime.length > 0 ||
    priceSort !== "none" ||
    selectedCharacterTypes.length > 0 ||
    selectedResidences.length > 0 ||
    marriageCandidatesOnly ||
    selectedBirthdaySeason !== null ||
    selectedBuffTypes.length > 0 ||
    selectedRecipeSources.length > 0 ||
    selectedEnergyGain.length > 0 ||
    showCompleted !== null;

  // Get keyboard navigation context
  const { searchInputRef, registerFilterHandler, unregisterFilterHandler, setFilterModeActive } = useKeyboardNavigation();

  // Filter navigation hook
  const filterNav = useFilterNavigation({
    onExit: () => setFilterModeActive(false),
    onActivate: () => setFilterModeActive(true),
  });

  // Register filter handler with context
  useEffect(() => {
    registerFilterHandler({
      activate: filterNav.activate,
      focusNext: filterNav.focusNext,
      exit: filterNav.exit,
      isActive: filterNav.isActive,
    });
    return () => unregisterFilterHandler();
  }, [registerFilterHandler, unregisterFilterHandler, filterNav.activate, filterNav.focusNext, filterNav.exit, filterNav.isActive]);

  // Memoize filter indices based on visible filters
  // This ensures consistent indices even when filters conditionally render
  const filterIndices = useMemo(() => {
    let index = 0;
    const indices: Record<string, number> = {};
    
    if (config.showSeasons) indices.seasons = index++;
    if (config.showTime) indices.time = index++;
    if (config.showLocation && availableLocations.length > 0) indices.location = index++;
    if (config.showRarity && availableRarities.length > 0) indices.rarity = index++;
    if (config.showEquipment && availableEquipment.length > 0) indices.equipment = index++;
    if (config.showGrowthTime) indices.growthTime = index++;
    
    // NPC-specific
    if (isNPCCategory) {
      if (availableBirthdaySeasons.length > 0) indices.birthday = index++;
      if (availableCharacterTypes.length > 0) indices.characterType = index++;
      if (availableResidences.length > 0) indices.residence = index++;
      indices.marriageCandidates = index++;
    }
    
    // Cooking-specific
    if (isCookingCategory) {
      if (availableBuffTypes.length > 0) indices.buffType = index++;
      if (availableRecipeSources.length > 0) indices.recipeSource = index++;
      indices.energyGain = index++;
    }
    
    // Price sort (not for NPCs)
    if (config.showPriceSort && !isNPCCategory) indices.priceSort = index++;
    
    // Completion filter (always shown)
    indices.completion = index++;
    
    // Clear button (only when has filters)
    if (hasFilters) indices.clear = index++;
    
    return indices;
  }, [config, availableLocations.length, availableRarities.length, availableEquipment.length, isNPCCategory, isCookingCategory, availableBirthdaySeasons.length, availableCharacterTypes.length, availableResidences.length, availableBuffTypes.length, availableRecipeSources.length, hasFilters]);

  return (
    <div className="card mb-6 relative z-20">
      {/* Search - full width on mobile */}
      <div className="mb-3 sm:hidden">
        <SearchAutocomplete
          items={items}
          value={searchQuery}
          onChange={setSearchQuery}
          externalInputRef={searchInputRef}
        />
      </div>

      {/* Filter toolbar with roving tabindex */}
      <div 
        role="toolbar"
        aria-label={ARIA_LABELS.FILTER_TOOLBAR}
        aria-orientation="horizontal"
        className="flex flex-wrap items-center gap-2 sm:gap-3"
        onKeyDown={filterNav.handleToolbarKeyDown}
        onBlur={filterNav.handleToolbarBlur}
      >
        {/* Search with autocomplete - hidden on mobile, shown in flex on larger */}
        <div className="hidden sm:block flex-1 min-w-[200px]">
          <SearchAutocomplete
            items={items}
            value={searchQuery}
            onChange={setSearchQuery}
            externalInputRef={searchInputRef}
          />
        </div>

        {/* Season filter */}
        {config.showSeasons && (
          <MultiSelectDropdown
            label="Seasons"
            options={SEASONS}
            selected={selectedSeasons}
            onToggle={(s) => toggleSeason(s as Season)}
            buttonRef={filterNav.registerFilter(filterIndices.seasons)}
            tabIndex={filterNav.getTabIndex(filterIndices.seasons)}
            isFilterFocused={filterNav.isFocused(filterIndices.seasons)}
          />
        )}

        {/* Time filter */}
        {config.showTime && (
          <MultiSelectDropdown
            label="Time"
            options={TIMES_OF_DAY}
            selected={selectedTimes}
            onToggle={(t) => toggleTime(t as TimeOfDay)}
            buttonRef={filterNav.registerFilter(filterIndices.time)}
            tabIndex={filterNav.getTabIndex(filterIndices.time)}
            isFilterFocused={filterNav.isFocused(filterIndices.time)}
          />
        )}

        {/* Location filter */}
        {config.showLocation && availableLocations.length > 0 && (
          <MultiSelectDropdown
            label={locationLabel}
            options={availableLocations}
            selected={selectedLocations}
            onToggle={toggleLocation}
            formatOption={(o) => o}
            buttonRef={filterNav.registerFilter(filterIndices.location)}
            tabIndex={filterNav.getTabIndex(filterIndices.location)}
            isFilterFocused={filterNav.isFocused(filterIndices.location)}
          />
        )}

        {/* Rarity filter */}
        {config.showRarity && availableRarities.length > 0 && (
          <MultiSelectDropdown
            label="Rarity"
            options={availableRarities}
            selected={selectedRarities}
            onToggle={(r) => toggleRarity(r as Rarity)}
            formatOption={formatRarity}
            buttonRef={filterNav.registerFilter(filterIndices.rarity)}
            tabIndex={filterNav.getTabIndex(filterIndices.rarity)}
            isFilterFocused={filterNav.isFocused(filterIndices.rarity)}
          />
        )}

        {/* Equipment filter (for artisan products) / Utensil filter (for cooking) */}
        {config.showEquipment && availableEquipment.length > 0 && (
          <MultiSelectDropdown
            label={categorySlug === 'cooking' ? "Utensil" : "Equipment"}
            options={availableEquipment}
            selected={selectedEquipment}
            onToggle={toggleEquipment}
            formatOption={(o) => o}
            buttonRef={filterNav.registerFilter(filterIndices.equipment)}
            tabIndex={filterNav.getTabIndex(filterIndices.equipment)}
            isFilterFocused={filterNav.isFocused(filterIndices.equipment)}
          />
        )}

        {/* Growth Time filter (for crops) */}
        {config.showGrowthTime && (
          <MultiSelectDropdown
            label="Growth"
            options={[...GROWTH_TIME_BUCKETS]}
            selected={selectedGrowthTime}
            onToggle={(b) => toggleGrowthTime(b as GrowthTimeBucket)}
            formatOption={(b) => GROWTH_TIME_LABELS[b as GrowthTimeBucket]}
            buttonRef={filterNav.registerFilter(filterIndices.growthTime)}
            tabIndex={filterNav.getTabIndex(filterIndices.growthTime)}
            isFilterFocused={filterNav.isFocused(filterIndices.growthTime)}
          />
        )}

        {/* NPC-specific filters */}
        {isNPCCategory && (
          <>
            {/* Birthday Season filter - only show if we have NPCs with birthdays */}
            {availableBirthdaySeasons.length > 0 && (
              <SingleSelectDropdown
                label="Birthday"
                options={["Any Season", ...availableBirthdaySeasons]}
                selected={selectedBirthdaySeason || "Any Season"}
                onSelect={(s) => setBirthdaySeason(s === "Any Season" ? null : s as Season)}
                formatOption={(s) => s === "Any Season" ? "Birthday" : s.charAt(0).toUpperCase() + s.slice(1)}
                buttonRef={filterNav.registerFilter(filterIndices.birthday)}
                tabIndex={filterNav.getTabIndex(filterIndices.birthday)}
                isFilterFocused={filterNav.isFocused(filterIndices.birthday)}
              />
            )}

            {/* Character Type filter - only show types that have data */}
            {availableCharacterTypes.length > 0 && (
              <MultiSelectDropdown
                label="Type"
                options={availableCharacterTypes}
                selected={selectedCharacterTypes}
                onToggle={(t) => toggleCharacterType(t as CharacterType)}
                formatOption={(t) => CHARACTER_TYPE_LABELS[t as CharacterType] || t}
                buttonRef={filterNav.registerFilter(filterIndices.characterType)}
                tabIndex={filterNav.getTabIndex(filterIndices.characterType)}
                isFilterFocused={filterNav.isFocused(filterIndices.characterType)}
              />
            )}

            {/* Residence filter */}
            {availableResidences.length > 0 && (
              <MultiSelectDropdown
                label="Residence"
                options={availableResidences}
                selected={selectedResidences}
                onToggle={toggleResidence}
                formatOption={(r) => r}
                buttonRef={filterNav.registerFilter(filterIndices.residence)}
                tabIndex={filterNav.getTabIndex(filterIndices.residence)}
                isFilterFocused={filterNav.isFocused(filterIndices.residence)}
              />
            )}

            {/* Marriage Candidates toggle */}
            <button
              ref={filterNav.registerFilter(filterIndices.marriageCandidates)}
              type="button"
              onClick={() => setMarriageCandidatesOnly(!marriageCandidatesOnly)}
              tabIndex={filterNav.getTabIndex(filterIndices.marriageCandidates)}
              aria-pressed={marriageCandidatesOnly}
              className={`filter-button input w-auto text-sm sm:text-base py-1.5 sm:py-2 px-2 sm:px-4 flex items-center gap-2 transition-all duration-200 ${
                marriageCandidatesOnly 
                  ? "text-pink-300 border-pink-500/50 bg-pink-500/10" 
                  : "text-slate-400"
              } ${filterNav.isFocused(filterIndices.marriageCandidates) ? "filter-focused" : ""}`}
            >
              <span aria-hidden="true" className={marriageCandidatesOnly ? "text-pink-400" : ""}>♥</span>
              <span className="hidden sm:inline">Candidates</span>
              <span className="sr-only">Marriage candidates only</span>
            </button>
          </>
        )}

        {/* Cooking-specific filters */}
        {isCookingCategory && (
          <>
            {/* Buff Type filter */}
            {availableBuffTypes.length > 0 && (
              <MultiSelectDropdown
                label="Buff"
                options={availableBuffTypes}
                selected={selectedBuffTypes}
                onToggle={toggleBuffType}
                formatOption={(b) => b}
                buttonRef={filterNav.registerFilter(filterIndices.buffType)}
                tabIndex={filterNav.getTabIndex(filterIndices.buffType)}
                isFilterFocused={filterNav.isFocused(filterIndices.buffType)}
              />
            )}

            {/* Recipe Source filter */}
            {availableRecipeSources.length > 0 && (
              <MultiSelectDropdown
                label="Source"
                options={availableRecipeSources}
                selected={selectedRecipeSources}
                onToggle={(s) => toggleRecipeSource(s as RecipeSource)}
                formatOption={(s) => s}
                buttonRef={filterNav.registerFilter(filterIndices.recipeSource)}
                tabIndex={filterNav.getTabIndex(filterIndices.recipeSource)}
                isFilterFocused={filterNav.isFocused(filterIndices.recipeSource)}
              />
            )}

            {/* Energy Gain filter */}
            <MultiSelectDropdown
              label="Energy"
              options={[...ENERGY_GAIN_BUCKETS]}
              selected={selectedEnergyGain}
              onToggle={(b) => toggleEnergyGain(b as EnergyGainBucket)}
              formatOption={(b) => ENERGY_GAIN_LABELS[b as EnergyGainBucket]}
              buttonRef={filterNav.registerFilter(filterIndices.energyGain)}
              tabIndex={filterNav.getTabIndex(filterIndices.energyGain)}
              isFilterFocused={filterNav.isFocused(filterIndices.energyGain)}
            />
          </>
        )}

        {/* Price Sort (hide for NPCs) */}
        {config.showPriceSort && !isNPCCategory && (
          <SingleSelectDropdown
            label="Sort"
            options={[...PRICE_SORT_OPTIONS]}
            selected={priceSort}
            onSelect={(s) => setPriceSort(s as PriceSortOption)}
            formatOption={(s) => PRICE_SORT_LABELS[s as PriceSortOption]}
            buttonRef={filterNav.registerFilter(filterIndices.priceSort)}
            tabIndex={filterNav.getTabIndex(filterIndices.priceSort)}
            isFilterFocused={filterNav.isFocused(filterIndices.priceSort)}
          />
        )}

        {/* Completion filter */}
        <SingleSelectDropdown
          label="All Items"
          options={["All Items", "Completed", "Incomplete"]}
          selected={showCompleted === null ? "All Items" : showCompleted ? "Completed" : "Incomplete"}
          onSelect={(value) => {
            setShowCompleted(value === "All Items" ? null : value === "Completed");
          }}
          buttonRef={filterNav.registerFilter(filterIndices.completion)}
          tabIndex={filterNav.getTabIndex(filterIndices.completion)}
          isFilterFocused={filterNav.isFocused(filterIndices.completion)}
        />

        {/* Clear filters */}
        {hasFilters && (
          <button
            ref={filterNav.registerFilter(filterIndices.clear)}
            onClick={clearAllFilters}
            tabIndex={filterNav.getTabIndex(filterIndices.clear)}
            aria-label={ARIA_LABELS.CLEAR_ALL_FILTERS}
            className={`filter-button flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 text-sm text-slate-400 hover:text-slate-200 flex-shrink-0 rounded-lg transition-all duration-200 ${
              filterNav.isFocused(filterIndices.clear) ? "filter-focused" : ""
            }`}
          >
            <X size={16} aria-hidden="true" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        )}
      </div>
    </div>
  );
}
