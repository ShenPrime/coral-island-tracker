import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Category, Season } from "@coral-tracker/shared";

interface AppState {
  // Current save slot
  currentSaveId: number | null;
  setCurrentSaveId: (id: number | null) => void;

  // Categories cache
  categories: Category[];
  setCategories: (categories: Category[]) => void;

  // Filter state
  selectedCategory: string | null;
  setSelectedCategory: (slug: string | null) => void;

  selectedSeason: Season | null;
  setSelectedSeason: (season: Season | null) => void;

  showCompleted: boolean | null; // null = show all, true = completed only, false = incomplete only
  setShowCompleted: (show: boolean | null) => void;

  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // UI state
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      // Current save
      currentSaveId: null,
      setCurrentSaveId: (id) => set({ currentSaveId: id }),

      // Categories
      categories: [],
      setCategories: (categories) => set({ categories }),

      // Filters
      selectedCategory: null,
      setSelectedCategory: (slug) => set({ selectedCategory: slug }),

      selectedSeason: null,
      setSelectedSeason: (season) => set({ selectedSeason: season }),

      showCompleted: null,
      setShowCompleted: (show) => set({ showCompleted: show }),

      searchQuery: "",
      setSearchQuery: (query) => set({ searchQuery: query }),

      // UI
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
    }),
    {
      name: "coral-tracker-storage",
      partialize: (state) => ({
        currentSaveId: state.currentSaveId,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);
