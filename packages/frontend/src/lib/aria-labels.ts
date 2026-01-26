/**
 * Centralized aria-label strings for consistent accessibility across the app.
 * Using constants ensures consistent wording and makes updates easier.
 */

export const ARIA_LABELS = {
  // Dialog/Modal
  CLOSE_DIALOG: "Close dialog",

  // Navigation
  MAIN_NAV: "Main navigation",
  OPEN_NAV_MENU: "Open navigation menu",
  CLOSE_NAV_MENU: "Close navigation menu",
  EXPAND_SIDEBAR: "Expand sidebar",
  COLLAPSE_SIDEBAR: "Collapse sidebar",

  // Filters
  SEARCH_ITEMS: "Search items",
  CLEAR_ALL_FILTERS: "Clear all filters",
  SELECT_OPTION: "Select option",

  // NPC Hearts
  INCREASE_HEARTS: "Increase hearts",
  DECREASE_HEARTS: "Decrease hearts",

  // Dynamic labels (functions)
  viewDetailsFor: (name: string) => `View details for ${name}`,
  filterBySeason: (season: string) => `Filter by ${season}`,
  deleteSaveSlot: (name: string) => `Delete save slot ${name}`,
  heartProgress: (current: number, max: number) => `Heart ${current} of ${max}`,
  progressLabel: (value: number, max: number) => `Progress: ${value} of ${max}`,
} as const;
