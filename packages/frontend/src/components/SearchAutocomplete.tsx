import { useState, useRef, useEffect, useMemo, type RefObject } from "react";
import { Search } from "lucide-react";
import { HighlightMatch } from "@/lib/highlightMatch";
import { ARIA_LABELS } from "@/lib/aria-labels";

interface SearchAutocompleteProps {
  items: Array<{ id: number; name: string }>;
  value: string;
  onChange: (value: string) => void;
  onSelectItem?: (item: { id: number; name: string }) => void;
  externalInputRef?: RefObject<HTMLInputElement>;
}

export function SearchAutocomplete({ items, value, onChange, onSelectItem, externalInputRef }: SearchAutocompleteProps) {
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

  const highlightMatch = (text: string, query: string) => (
    <HighlightMatch text={text} query={query} className="text-ocean-300 font-semibold" />
  );

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
