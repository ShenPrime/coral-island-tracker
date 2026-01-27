import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Category, Season, TimeOfDay, Rarity, GrowthTimeBucket, PriceSortOption, CharacterType, EnergyGainBucket, RecipeSource } from "@coral-tracker/shared";

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

  selectedRarities: Rarity[];
  toggleRarity: (rarity: Rarity) => void;
  clearRarities: () => void;

  // Equipment filter (for artisan products)
  selectedEquipment: string[];
  toggleEquipment: (equipment: string) => void;
  clearEquipment: () => void;

  // Growth time filter (for crops)
  selectedGrowthTime: GrowthTimeBucket[];
  toggleGrowthTime: (bucket: GrowthTimeBucket) => void;
  clearGrowthTime: () => void;

  // Price sort
  priceSort: PriceSortOption;
  setPriceSort: (sort: PriceSortOption) => void;

  // NPC-specific filters
  selectedCharacterTypes: CharacterType[];
  toggleCharacterType: (type: CharacterType) => void;
  clearCharacterTypes: () => void;

  selectedResidences: string[];
  toggleResidence: (residence: string) => void;
  clearResidences: () => void;

  marriageCandidatesOnly: boolean;
  setMarriageCandidatesOnly: (value: boolean) => void;

  selectedBirthdaySeason: Season | null;
  setBirthdaySeason: (season: Season | null) => void;

  // Cooking-specific filters
  selectedBuffTypes: string[];
  toggleBuffType: (buffType: string) => void;
  clearBuffTypes: () => void;

  selectedRecipeSources: RecipeSource[];
  toggleRecipeSource: (source: RecipeSource) => void;
  clearRecipeSources: () => void;

  selectedEnergyGain: EnergyGainBucket[];
  toggleEnergyGain: (bucket: EnergyGainBucket) => void;
  clearEnergyGain: () => void;

  showCompleted: boolean | null; // null = show all, true = completed only, false = incomplete only
  setShowCompleted: (show: boolean | null) => void;

  searchQuery: string;
  setSearchQuery: (query: string) => void;

  clearAllFilters: () => void;

  // UI state
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;

  // Keyboard navigation
  isShortcutsModalOpen: boolean;
  setShortcutsModalOpen: (open: boolean) => void;
  
  // Global search
  globalSearchOpen: boolean;
  setGlobalSearchOpen: (open: boolean) => void;
  
  // Grid focus persistence (per category slug)
  gridFocusIndex: Record<string, number>;
  setGridFocusIndex: (category: string, index: number) => void;
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

      selectedRarities: [],
      toggleRarity: (rarity) =>
        set((state) => ({
          selectedRarities: state.selectedRarities.includes(rarity)
            ? state.selectedRarities.filter((r) => r !== rarity)
            : [...state.selectedRarities, rarity],
        })),
      clearRarities: () => set({ selectedRarities: [] }),

      // Equipment filter (for artisan products)
      selectedEquipment: [],
      toggleEquipment: (equipment) =>
        set((state) => ({
          selectedEquipment: state.selectedEquipment.includes(equipment)
            ? state.selectedEquipment.filter((e) => e !== equipment)
            : [...state.selectedEquipment, equipment],
        })),
      clearEquipment: () => set({ selectedEquipment: [] }),

      // Growth time filter (for crops)
      selectedGrowthTime: [],
      toggleGrowthTime: (bucket) =>
        set((state) => ({
          selectedGrowthTime: state.selectedGrowthTime.includes(bucket)
            ? state.selectedGrowthTime.filter((b) => b !== bucket)
            : [...state.selectedGrowthTime, bucket],
        })),
      clearGrowthTime: () => set({ selectedGrowthTime: [] }),

      // Price sort
      priceSort: "none" as PriceSortOption,
      setPriceSort: (sort) => set({ priceSort: sort }),

      // NPC-specific filters
      selectedCharacterTypes: [],
      toggleCharacterType: (type) =>
        set((state) => ({
          selectedCharacterTypes: state.selectedCharacterTypes.includes(type)
            ? state.selectedCharacterTypes.filter((t) => t !== type)
            : [...state.selectedCharacterTypes, type],
        })),
      clearCharacterTypes: () => set({ selectedCharacterTypes: [] }),

      selectedResidences: [],
      toggleResidence: (residence) =>
        set((state) => ({
          selectedResidences: state.selectedResidences.includes(residence)
            ? state.selectedResidences.filter((r) => r !== residence)
            : [...state.selectedResidences, residence],
        })),
      clearResidences: () => set({ selectedResidences: [] }),

      marriageCandidatesOnly: false,
      setMarriageCandidatesOnly: (value) => set({ marriageCandidatesOnly: value }),

      selectedBirthdaySeason: null,
      setBirthdaySeason: (season) => set({ selectedBirthdaySeason: season }),

      // Cooking-specific filters
      selectedBuffTypes: [],
      toggleBuffType: (buffType) =>
        set((state) => ({
          selectedBuffTypes: state.selectedBuffTypes.includes(buffType)
            ? state.selectedBuffTypes.filter((b) => b !== buffType)
            : [...state.selectedBuffTypes, buffType],
        })),
      clearBuffTypes: () => set({ selectedBuffTypes: [] }),

      selectedRecipeSources: [],
      toggleRecipeSource: (source) =>
        set((state) => ({
          selectedRecipeSources: state.selectedRecipeSources.includes(source)
            ? state.selectedRecipeSources.filter((s) => s !== source)
            : [...state.selectedRecipeSources, source],
        })),
      clearRecipeSources: () => set({ selectedRecipeSources: [] }),

      selectedEnergyGain: [],
      toggleEnergyGain: (bucket) =>
        set((state) => ({
          selectedEnergyGain: state.selectedEnergyGain.includes(bucket)
            ? state.selectedEnergyGain.filter((b) => b !== bucket)
            : [...state.selectedEnergyGain, bucket],
        })),
      clearEnergyGain: () => set({ selectedEnergyGain: [] }),

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
          selectedRarities: [],
          selectedEquipment: [],
          selectedGrowthTime: [],
          priceSort: "none" as PriceSortOption,
          selectedCharacterTypes: [],
          selectedResidences: [],
          marriageCandidatesOnly: false,
          selectedBirthdaySeason: null,
          selectedBuffTypes: [],
          selectedRecipeSources: [],
          selectedEnergyGain: [],
          showCompleted: null,
        }),

      // UI
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleSidebarCollapsed: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      // Keyboard navigation
      isShortcutsModalOpen: false,
      setShortcutsModalOpen: (open) => set({ isShortcutsModalOpen: open }),
      
      // Global search
      globalSearchOpen: false,
      setGlobalSearchOpen: (open) => set({ globalSearchOpen: open }),
      
      // Grid focus persistence
      gridFocusIndex: {},
      setGridFocusIndex: (category, index) =>
        set((state) => ({
          gridFocusIndex: { ...state.gridFocusIndex, [category]: index },
        })),
    }),
    {
      name: "coral-tracker-storage",
      partialize: (state) => ({
        currentSaveId: state.currentSaveId,
        sidebarOpen: state.sidebarOpen,
        sidebarCollapsed: state.sidebarCollapsed,
        selectedSeasons: state.selectedSeasons,
        gridFocusIndex: state.gridFocusIndex,
      }),
    }
  )
);
