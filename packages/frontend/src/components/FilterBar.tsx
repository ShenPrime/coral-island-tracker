import { Search, X } from "lucide-react";
import { useStore } from "@/store/useStore";
import { SEASONS, type Season } from "@coral-tracker/shared";

export function FilterBar() {
  const {
    searchQuery,
    setSearchQuery,
    selectedSeason,
    setSelectedSeason,
    showCompleted,
    setShowCompleted,
  } = useStore();

  const hasFilters = searchQuery || selectedSeason || showCompleted !== null;

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedSeason(null);
    setShowCompleted(null);
  };

  return (
    <div className="card mb-6">
      <div className="flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="flex-1 min-w-[200px] relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
          />
        </div>

        {/* Season filter */}
        <select
          value={selectedSeason || ""}
          onChange={(e) => setSelectedSeason((e.target.value as Season) || null)}
          className="input w-auto"
        >
          <option value="">All Seasons</option>
          {SEASONS.map((season) => (
            <option key={season} value={season}>
              {season.charAt(0).toUpperCase() + season.slice(1)}
            </option>
          ))}
        </select>

        {/* Completion filter */}
        <select
          value={showCompleted === null ? "" : showCompleted ? "completed" : "incomplete"}
          onChange={(e) => {
            const value = e.target.value;
            setShowCompleted(value === "" ? null : value === "completed");
          }}
          className="input w-auto"
        >
          <option value="">All Items</option>
          <option value="completed">Completed</option>
          <option value="incomplete">Incomplete</option>
        </select>

        {/* Clear filters */}
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            <X size={16} />
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
