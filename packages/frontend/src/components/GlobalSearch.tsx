import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Fish,
  Bug,
  Rabbit,
  Carrot,
  Scroll,
  Gem,
  Leaf,
  UtensilsCrossed,
  Users,
  Landmark,
} from "lucide-react";
import { useStore } from "@/store/useStore";
import { useGlobalSearch, type SearchableItem } from "@/hooks/useGlobalSearch";

// Category icons for search results
const categoryIcons: Record<string, React.ReactNode> = {
  fish: <Fish size={18} className="text-ocean-400" />,
  insects: <Bug size={18} className="text-palm-400" />,
  critters: <Rabbit size={18} className="text-coral-400" />,
  crops: <Carrot size={18} className="text-orange-400" />,
  artifacts: <Scroll size={18} className="text-amber-400" />,
  gems: <Gem size={18} className="text-purple-400" />,
  forageables: <Leaf size={18} className="text-green-400" />,
  cooking: <UtensilsCrossed size={18} className="text-red-400" />,
  "artisan-products": <UtensilsCrossed size={18} className="text-amber-400" />,
  npcs: <Users size={18} className="text-pink-400" />,
  temple: <Landmark size={18} className="text-cyan-400" />,
};

// Get icon for a search result
function getResultIcon(item: SearchableItem): React.ReactNode {
  if (item.type === "altar" || item.type === "offering") {
    return categoryIcons.temple;
  }
  return categoryIcons[item.categorySlug] || <Search size={18} className="text-ocean-400" />;
}

// Highlight matching text in search results
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;

  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <span key={i} className="text-palm-300 font-semibold">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

/**
 * Global search modal component.
 * Triggered by Ctrl+K / Cmd+K keyboard shortcut.
 * Searches across items, NPCs, and altars.
 */
export function GlobalSearch() {
  const { globalSearchOpen, setGlobalSearchOpen } = useStore();
  const { search, isLoading } = useGlobalSearch();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const results = search(query);

  // Focus input when modal opens
  useEffect(() => {
    if (globalSearchOpen) {
      setQuery("");
      setSelectedIndex(0);
      // Small delay to ensure the modal is rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
    }
  }, [globalSearchOpen]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results.length]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && results.length > 0) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex, results.length]);

  // Handle selection
  const handleSelect = useCallback(
    (item: SearchableItem) => {
      setGlobalSearchOpen(false);

      if (item.type === "altar") {
        // Navigate to altar page
        navigate(`/temple/${item.categorySlug}`);
      } else if (item.type === "offering") {
        // Navigate to altar page and scroll to the offering section
        navigate(`/temple/${item.parentSlug}?openOffering=${item.id}`);
      } else {
        // Navigate to category page and open item modal
        navigate(`/track/${item.categorySlug}?openItem=${item.id}`);
      }
    },
    [navigate, setGlobalSearchOpen]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (results[selectedIndex]) {
            handleSelect(results[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          setGlobalSearchOpen(false);
          break;
      }
    },
    [results, selectedIndex, handleSelect, setGlobalSearchOpen]
  );

  if (!globalSearchOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setGlobalSearchOpen(false)}
      />

      {/* Modal */}
      <div className="relative w-full max-w-xl bg-deepsea-800 rounded-xl shadow-2xl border border-ocean-700/50 overflow-hidden">
        {/* Search input */}
        <div className="flex items-center px-4 py-3 border-b border-ocean-700/50">
          <Search className="text-ocean-400 mr-3 flex-shrink-0" size={20} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search items, NPCs, altars..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none text-white placeholder-ocean-500 text-lg"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="hidden sm:inline-flex text-xs text-ocean-400 bg-ocean-800/50 px-2 py-1 rounded border border-ocean-700/50">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="px-4 py-8 text-center text-ocean-400">Loading data...</div>
          ) : query && results.length === 0 ? (
            <div className="px-4 py-8 text-center text-ocean-400">
              No results found for "{query}"
            </div>
          ) : query && results.length > 0 ? (
            <ul ref={listRef} role="listbox">
              {results.map((item, index) => (
                <li
                  key={`${item.type}-${item.id}`}
                  role="option"
                  aria-selected={index === selectedIndex}
                  className={`px-4 py-2.5 flex items-center gap-3 cursor-pointer transition-colors ${
                    index === selectedIndex
                      ? "bg-ocean-700/50"
                      : "hover:bg-ocean-800/50"
                  }`}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  {/* Icon or image */}
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="w-8 h-8 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded bg-ocean-800/50 flex items-center justify-center flex-shrink-0">
                      {getResultIcon(item)}
                    </div>
                  )}

                  {/* Name with highlight */}
                  <span className="flex-1 text-white truncate">
                    <HighlightMatch text={item.name} query={query} />
                  </span>

                  {/* Category badge */}
                  <span className="text-xs text-ocean-400 bg-ocean-800/50 px-2 py-0.5 rounded flex-shrink-0">
                    {item.category}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-6 text-center text-ocean-500 text-sm">
              Start typing to search...
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-ocean-700/50 text-xs text-ocean-500 flex gap-4 justify-center">
          <span>
            <kbd className="px-1.5 py-0.5 bg-ocean-800/50 rounded border border-ocean-700/50 mr-1">
              ↑
            </kbd>
            <kbd className="px-1.5 py-0.5 bg-ocean-800/50 rounded border border-ocean-700/50 mr-1">
              ↓
            </kbd>
            to navigate
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-ocean-800/50 rounded border border-ocean-700/50 mr-1">
              Enter
            </kbd>
            to select
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-ocean-800/50 rounded border border-ocean-700/50 mr-1">
              Esc
            </kbd>
            to close
          </span>
        </div>
      </div>
    </div>
  );
}
