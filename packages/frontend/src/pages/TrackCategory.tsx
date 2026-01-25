import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { FilterBar } from "@/components/FilterBar";
import { ItemCard } from "@/components/ItemCard";
import { ProgressBar } from "@/components/ProgressBar";
import { getProgressItems, updateProgress, getCategory } from "@/lib/api";
import { AlertCircle, ArrowLeft } from "lucide-react";
import type { Item, Category } from "@coral-tracker/shared";

type ItemWithProgress = Item & { completed: boolean; completed_at: string | null; notes: string | null };

export function TrackCategory() {
  const { slug } = useParams<{ slug: string }>();
  const { currentSaveId, searchQuery, selectedSeason, showCompleted } = useStore();

  const [items, setItems] = useState<ItemWithProgress[]>([]);
  const [category, setCategory] = useState<(Category & { item_count: number }) | null>(null);
  const [loading, setLoading] = useState(true);

  const loadItems = useCallback(async () => {
    if (!currentSaveId || !slug) return;

    setLoading(true);
    try {
      const [itemsData, categoryData] = await Promise.all([
        getProgressItems(currentSaveId, slug, showCompleted ?? undefined),
        getCategory(slug),
      ]);
      setItems(itemsData);
      setCategory(categoryData);
    } catch (error) {
      console.error("Failed to load items:", error);
    } finally {
      setLoading(false);
    }
  }, [currentSaveId, slug, showCompleted]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

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

  // Filter items based on search and season
  const filteredItems = items.filter((item) => {
    // Search filter
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Season filter
    if (selectedSeason && item.seasons && !item.seasons.includes(selectedSeason)) {
      return false;
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
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">
            No Save Slot Selected
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
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
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-4"
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </Link>

        <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">
          {category?.name || "Loading..."}
        </h1>
        {category?.description && (
          <p className="text-slate-500 dark:text-slate-400">{category.description}</p>
        )}
      </div>

      {/* Progress */}
      <div className="card mb-6">
        <ProgressBar
          value={completedCount}
          max={items.length}
          label={`${category?.name} Progress`}
          color={completedCount === items.length ? "green" : "ocean"}
        />
      </div>

      {/* Filters */}
      <FilterBar />

      {/* Items grid */}
      {filteredItems.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-slate-500 dark:text-slate-400">
            {items.length === 0
              ? "No items in this category yet. Run the seed script to add data."
              : "No items match your filters."}
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Showing {filteredItems.length} items ({filteredCompletedCount} completed)
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredItems.map((item) => (
              <ItemCard key={item.id} item={item} onToggle={handleToggle} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
