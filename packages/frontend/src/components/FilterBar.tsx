import { useState, useRef, useEffect, useMemo } from "react";
import { Search, X, ChevronDown, Check } from "lucide-react";
import { useStore } from "@/store/useStore";
import { SEASONS, TIMES_OF_DAY, type Season, type TimeOfDay, type Rarity } from "@coral-tracker/shared";

// Format rarity for display (super_rare -> "Super Rare")
const formatRarity = (rarity: string) => 
  rarity.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

interface SearchAutocompleteProps {
  items: Array<{ id: number; name: string }>;
  value: string;
  onChange: (value: string) => void;
  onSelectItem?: (item: { id: number; name: string }) => void;
}

function SearchAutocomplete({ items, value, onChange, onSelectItem }: SearchAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
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
}

function MultiSelectDropdown({
  label,
  options,
  selected,
  onToggle,
  formatOption = (o) => o.charAt(0).toUpperCase() + o.slice(1),
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const displayText = selected.length === 0 
    ? label 
    : selected.length === 1 
      ? formatOption(selected[0]) 
      : `${selected.length} selected`;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleToggle}
        className={`input w-auto min-w-[100px] sm:min-w-[130px] text-sm sm:text-base py-1.5 sm:py-2 px-2 sm:px-4 flex items-center justify-between gap-1 sm:gap-2 transition-all duration-200 ${
          selected.length > 0 ? "text-ocean-300 border-ocean-500/50" : "text-slate-400"
        } ${isOpen ? "border-ocean-400" : ""}`}
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown 
          size={14} 
          className={`flex-shrink-0 transition-transform duration-300 text-ocean-400 ${isOpen ? "rotate-180" : ""}`} 
        />
      </button>

      {isOpen && (
        <div 
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
                onClick={() => onToggle(option)}
                className="w-full px-3 py-2 flex items-center gap-2 hover:bg-ocean-800/80 text-left text-sm transition-all duration-150 group"
                style={{ 
                  animationDelay: `${index * 30}ms`,
                }}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 
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
  label: string;
  options: readonly string[];
  selected: string;
  onSelect: (option: string) => void;
}

function SingleSelectDropdown({
  label,
  options,
  selected,
  onSelect,
}: SingleSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleToggle}
        className={`input w-auto min-w-[90px] sm:min-w-[120px] text-sm sm:text-base py-1.5 sm:py-2 px-2 sm:px-4 flex items-center justify-between gap-1 sm:gap-2 transition-all duration-200 ${
          selected !== label ? "text-ocean-300 border-ocean-500/50" : "text-slate-400"
        } ${isOpen ? "border-ocean-400" : ""}`}
      >
        <span className="truncate">{selected}</span>
        <ChevronDown 
          size={14} 
          className={`flex-shrink-0 transition-transform duration-300 text-ocean-400 ${isOpen ? "rotate-180" : ""}`} 
        />
      </button>

      {isOpen && (
        <div 
          className={`absolute top-full left-0 mt-1 w-40 border border-ocean-700/50 rounded-lg shadow-2xl z-50 overflow-hidden
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
                onClick={() => handleSelect(option)}
                className={`w-full px-3 py-2 flex items-center gap-2 hover:bg-ocean-800/80 text-left text-sm transition-all duration-150
                  ${isSelected ? "text-ocean-300" : "text-slate-200"}`}
              >
                <div className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                  isSelected ? "bg-ocean-400 shadow shadow-ocean-400/50" : "bg-transparent"
                }`} />
                <span>{option}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface FilterBarProps {
  availableLocations?: string[];
  availableRarities?: Rarity[];
  items?: Array<{ id: number; name: string }>;
  locationLabel?: string;
}

export function FilterBar({ availableLocations = [], availableRarities = [], items = [], locationLabel = "Location" }: FilterBarProps) {
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
    showCompleted,
    setShowCompleted,
    clearAllFilters,
  } = useStore();

  const hasFilters = 
    searchQuery || 
    selectedSeasons.length > 0 || 
    selectedTimes.length > 0 || 
    selectedLocations.length > 0 || 
    selectedRarities.length > 0 ||
    showCompleted !== null;

  return (
    <div className="card mb-6 relative z-20">
      {/* Search - full width on mobile */}
      <div className="mb-3 sm:hidden">
        <SearchAutocomplete
          items={items}
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Search with autocomplete - hidden on mobile, shown in flex on larger */}
        <div className="hidden sm:block flex-1 min-w-[200px]">
          <SearchAutocomplete
            items={items}
            value={searchQuery}
            onChange={setSearchQuery}
          />
        </div>

        {/* Season filter */}
        <MultiSelectDropdown
          label="Seasons"
          options={SEASONS}
          selected={selectedSeasons}
          onToggle={(s) => toggleSeason(s as Season)}
        />

        {/* Time filter */}
        <MultiSelectDropdown
          label="Time"
          options={TIMES_OF_DAY}
          selected={selectedTimes}
          onToggle={(t) => toggleTime(t as TimeOfDay)}
        />

        {/* Location filter */}
        {availableLocations.length > 0 && (
          <MultiSelectDropdown
            label={locationLabel}
            options={availableLocations}
            selected={selectedLocations}
            onToggle={toggleLocation}
            formatOption={(o) => o}
          />
        )}

        {/* Rarity filter */}
        {availableRarities.length > 0 && (
          <MultiSelectDropdown
            label="Rarity"
            options={availableRarities}
            selected={selectedRarities}
            onToggle={(r) => toggleRarity(r as Rarity)}
            formatOption={formatRarity}
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
        />

        {/* Clear filters */}
        {hasFilters && (
          <button
            onClick={clearAllFilters}
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 text-sm text-slate-400 hover:text-slate-200 flex-shrink-0"
          >
            <X size={16} />
            <span className="hidden sm:inline">Clear</span>
          </button>
        )}
      </div>
    </div>
  );
}
