import { useState, useRef, useEffect, useMemo, useId, useCallback, type RefObject } from "react";
import { Search, X, ChevronDown, Check } from "lucide-react";
import { useStore } from "@/store/useStore";
import { ARIA_LABELS } from "@/lib/aria-labels";
import { useKeyboardNavigation } from "@/context/KeyboardNavigationContext";
import { useFilterNavigation } from "@/hooks/useFilterNavigation";
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

interface SearchAutocompleteProps {
  items: Array<{ id: number; name: string }>;
  value: string;
  onChange: (value: string) => void;
  onSelectItem?: (item: { id: number; name: string }) => void;
  externalInputRef?: RefObject<HTMLInputElement>;
}

function SearchAutocomplete({ items, value, onChange, onSelectItem, externalInputRef }: SearchAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const internalInputRef = useRef<HTMLInputElement>(null);
  // Use external ref if provided, otherwise use internal
  const inputRef = externalInputRef || internalInputRef;
  const listRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on input
  const suggestions = useMemo(() => {
    if (!value.trim() || value.length < 1) return [];
    const query = value.toLowerCase();
    return items
      .filter((item) => item.name.toLowerCase().includes(query))
      .slice(0, 8); // Limit to 8 suggestions
  }, [items, value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset highlight when suggestions change
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [suggestions]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlighted = listRef.current.children[highlightedIndex] as HTMLElement;
      highlighted?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === "ArrowDown" && suggestions.length > 0) {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
          handleSelect(suggestions[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleSelect = (item: { id: number; name: string }) => {
    onChange(item.name);
    setIsOpen(false);
    setHighlightedIndex(-1);
    onSelectItem?.(item);
    inputRef.current?.blur();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setIsOpen(true);
  };

  const handleFocus = () => {
    if (value.trim() && suggestions.length > 0) {
      setIsOpen(true);
    }
  };

  // Highlight matching text in suggestion
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return text;
    return (
      <>
        {text.slice(0, index)}
        <span className="text-ocean-300 font-semibold">{text.slice(index, index + query.length)}</span>
        {text.slice(index + query.length)}
      </>
    );
  };

  return (
    <div className="relative" ref={containerRef}>
      <Search
        size={18}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10"
      />
<input
        ref={inputRef}
        type="text"
        placeholder="Search items..."
        value={value}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        className="input pl-10"
        autoComplete="off"
        aria-label={ARIA_LABELS.SEARCH_ITEMS}
      />

      {/* Autocomplete dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div 
          ref={listRef}
          className="absolute top-full left-0 right-0 mt-1 border border-ocean-700/50 rounded-lg shadow-2xl z-50 overflow-hidden max-h-64 overflow-y-auto dropdown-open"
          style={{ backgroundColor: "#162c4a" }}
        >
          {suggestions.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`w-full px-4 py-2.5 text-left text-sm transition-colors duration-100 flex items-center gap-2
                ${highlightedIndex === index 
                  ? "bg-ocean-800/80 text-white" 
                  : "text-slate-200 hover:bg-ocean-800/50"
                }`}
            >
              <Search size={14} className="text-ocean-400 flex-shrink-0" />
              <span>{highlightMatch(item.name, value)}</span>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {isOpen && value.trim().length >= 2 && suggestions.length === 0 && (
        <div 
          className="absolute top-full left-0 right-0 mt-1 border border-ocean-700/50 rounded-lg shadow-2xl z-50 overflow-hidden"
          style={{ backgroundColor: "#162c4a" }}
        >
          <div className="px-4 py-3 text-sm text-slate-400 text-center">
            No items found
          </div>
        </div>
      )}
    </div>
  );
}

interface MultiSelectDropdownProps {
  label: string;
  options: readonly string[];
  selected: string[];
  onToggle: (option: string) => void;
  formatOption?: (option: string) => string;
  /** Ref callback for filter navigation */
  buttonRef?: (el: HTMLButtonElement | null) => void;
  /** Tab index for roving tabindex pattern */
  tabIndex?: 0 | -1;
  /** Whether this filter is focused via keyboard navigation */
  isFilterFocused?: boolean;
}

function MultiSelectDropdown({
  label,
  options,
  selected,
  onToggle,
  formatOption = (o) => o.charAt(0).toUpperCase() + o.slice(1),
  buttonRef,
  tabIndex = 0,
  isFilterFocused = false,
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const internalButtonRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        handleClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpen = () => {
    setIsOpen(true);
    setIsAnimating(true);
  };

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => setIsOpen(false), 200);
  };

  const handleToggle = () => {
    if (isOpen) {
      handleClose();
    } else {
      handleOpen();
    }
  };

  // Combined ref handler
  const setButtonRef = useCallback((el: HTMLButtonElement | null) => {
    (internalButtonRef as React.MutableRefObject<HTMLButtonElement | null>).current = el;
    buttonRef?.(el);
  }, [buttonRef]);

  const displayText = selected.length === 0 
    ? label 
    : selected.length === 1 
      ? formatOption(selected[0]) 
      : `${selected.length} selected`;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={setButtonRef}
        type="button"
        onClick={handleToggle}
        tabIndex={tabIndex}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        className={`filter-button input w-auto min-w-[100px] sm:min-w-[130px] text-sm sm:text-base py-1.5 sm:py-2 px-2 sm:px-4 flex items-center justify-between gap-1 sm:gap-2 transition-all duration-200 ${
          selected.length > 0 ? "text-ocean-300 border-ocean-500/50" : "text-slate-400"
        } ${isOpen ? "border-ocean-400" : ""} ${isFilterFocused ? "filter-focused" : ""}`}
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown 
          size={14} 
          className={`flex-shrink-0 transition-transform duration-300 text-ocean-400 ${isOpen ? "rotate-180" : ""}`} 
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div 
          id={listboxId}
          role="listbox"
          aria-label={label}
          aria-multiselectable="true"
          className={`absolute top-full left-0 mt-1 w-48 border border-ocean-700/50 rounded-lg shadow-2xl z-50 overflow-hidden
            transform-gpu origin-top dropdown-menu
            ${isAnimating ? "dropdown-open" : "dropdown-close"}`}
          style={{ backgroundColor: "#162c4a" }}
        >
          {options.map((option, index) => {
            const isSelected = selected.includes(option);
            return (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => onToggle(option)}
                className="w-full px-3 py-2 flex items-center gap-2 hover:bg-ocean-800/80 text-left text-sm transition-all duration-150 group"
                style={{ 
                  animationDelay: `${index * 30}ms`,
                }}
              >
                <div 
                  aria-hidden="true"
                  className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 
                  transform-gpu transition-all duration-200
                  ${isSelected 
                    ? "bg-gradient-to-br from-ocean-400 to-ocean-600 border-ocean-400 shadow-lg shadow-ocean-500/50 scale-110" 
                    : "border-ocean-600 group-hover:border-ocean-400 group-hover:scale-110"
                  }`}
                >
                  <Check 
                    size={12} 
                    className={`text-white transform-gpu transition-all duration-200
                      ${isSelected ? "opacity-100 scale-100" : "opacity-0 scale-50"}`}
                  />
                </div>
                <span className={`transition-colors duration-150 ${isSelected ? "text-ocean-300" : "text-slate-200"}`}>
                  {formatOption(option)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface SingleSelectDropdownProps {
  label?: string; // Optional, for accessibility/aria
  options: readonly string[];
  selected: string;
  onSelect: (option: string) => void;
  formatOption?: (option: string) => string;
  /** Ref callback for filter navigation */
  buttonRef?: (el: HTMLButtonElement | null) => void;
  /** Tab index for roving tabindex pattern */
  tabIndex?: 0 | -1;
  /** Whether this filter is focused via keyboard navigation */
  isFilterFocused?: boolean;
}

function SingleSelectDropdown({
  label,
  options,
  selected,
  onSelect,
  formatOption = (o) => o,
  buttonRef,
  tabIndex = 0,
  isFilterFocused = false,
}: SingleSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const internalButtonRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        handleClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpen = () => {
    setIsOpen(true);
    setIsAnimating(true);
  };

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => setIsOpen(false), 200);
  };

  const handleToggle = () => {
    if (isOpen) {
      handleClose();
    } else {
      handleOpen();
    }
  };

  const handleSelect = (option: string) => {
    onSelect(option);
    handleClose();
  };

  // Combined ref handler
  const setButtonRef = useCallback((el: HTMLButtonElement | null) => {
    (internalButtonRef as React.MutableRefObject<HTMLButtonElement | null>).current = el;
    buttonRef?.(el);
  }, [buttonRef]);

  const displayText = formatOption(selected);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={setButtonRef}
        type="button"
        onClick={handleToggle}
        tabIndex={tabIndex}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        className={`filter-button input w-auto min-w-[90px] sm:min-w-[120px] text-sm sm:text-base py-1.5 sm:py-2 px-2 sm:px-4 flex items-center justify-between gap-1 sm:gap-2 transition-all duration-200 ${
          selected !== options[0] ? "text-ocean-300 border-ocean-500/50" : "text-slate-400"
        } ${isOpen ? "border-ocean-400" : ""} ${isFilterFocused ? "filter-focused" : ""}`}
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown 
          size={14} 
          className={`flex-shrink-0 transition-transform duration-300 text-ocean-400 ${isOpen ? "rotate-180" : ""}`} 
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div 
          id={listboxId}
          role="listbox"
          aria-label={label || ARIA_LABELS.SELECT_OPTION}
          className={`absolute top-full left-0 mt-1 w-48 border border-ocean-700/50 rounded-lg shadow-2xl z-50 overflow-hidden
            transform-gpu origin-top dropdown-menu
            ${isAnimating ? "dropdown-open" : "dropdown-close"}`}
          style={{ backgroundColor: "#162c4a" }}
        >
          {options.map((option) => {
            const isSelected = selected === option;
            return (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(option)}
                className={`w-full px-3 py-2 flex items-center gap-2 hover:bg-ocean-800/80 text-left text-sm transition-all duration-150
                  ${isSelected ? "text-ocean-300" : "text-slate-200"}`}
              >
                <div 
                  aria-hidden="true"
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                  isSelected ? "bg-ocean-400 shadow shadow-ocean-400/50" : "bg-transparent"
                }`} />
                <span>{formatOption(option)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
