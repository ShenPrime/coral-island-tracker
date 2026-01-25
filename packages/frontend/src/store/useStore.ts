import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Category, Season, TimeOfDay } from "@coral-tracker/shared";

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

  selectedSeasons: Season[];
  toggleSeason: (season: Season) => void;
  clearSeasons: () => void;

  selectedTimes: TimeOfDay[];
  toggleTime: (time: TimeOfDay) => void;
  clearTimes: () => void;

  selectedLocations: string[];
  toggleLocation: (location: string) => void;
  clearLocations: () => void;

  showCompleted: boolean | null; // null = show all, true = completed only, false = incomplete only
  setShowCompleted: (show: boolean | null) => void;

  searchQuery: string;
  setSearchQuery: (query: string) => void;

  clearAllFilters: () => void;

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

      selectedSeasons: [],
      toggleSeason: (season) =>
        set((state) => ({
          selectedSeasons: state.selectedSeasons.includes(season)
            ? state.selectedSeasons.filter((s) => s !== season)
            : [...state.selectedSeasons, season],
        })),
      clearSeasons: () => set({ selectedSeasons: [] }),

      selectedTimes: [],
      toggleTime: (time) =>
        set((state) => ({
          selectedTimes: state.selectedTimes.includes(time)
            ? state.selectedTimes.filter((t) => t !== time)
            : [...state.selectedTimes, time],
        })),
      clearTimes: () => set({ selectedTimes: [] }),

      selectedLocations: [],
      toggleLocation: (location) =>
        set((state) => ({
          selectedLocations: state.selectedLocations.includes(location)
            ? state.selectedLocations.filter((l) => l !== location)
            : [...state.selectedLocations, location],
        })),
      clearLocations: () => set({ selectedLocations: [] }),

      showCompleted: null,
      setShowCompleted: (show) => set({ showCompleted: show }),

      searchQuery: "",
      setSearchQuery: (query) => set({ searchQuery: query }),

      clearAllFilters: () =>
        set({
          searchQuery: "",
          selectedSeasons: [],
          selectedTimes: [],
          selectedLocations: [],
          showCompleted: null,
        }),

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
