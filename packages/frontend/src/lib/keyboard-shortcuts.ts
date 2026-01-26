/**
 * Centralized keyboard shortcut definitions.
 * All shortcuts are defined here for consistency and easy modification.
 */

// Category slugs in order (1-9 keys)
export const CATEGORY_ORDER = [
  "fish",
  "insects",
  "critters",
  "crops",
  "artifacts",
  "gems",
  "forageables",
  "cooking",
  "npcs",
] as const;

export type CategorySlug = (typeof CATEGORY_ORDER)[number];

// Shortcut definition type
export interface ShortcutDefinition {
  key: string;
  modifiers?: ("shift" | "alt" | "ctrl" | "meta")[];
  description: string;
  category: "navigation" | "grid" | "filters" | "general";
}

// All shortcuts for display in help panel
export const SHORTCUTS: Record<string, ShortcutDefinition> = {
  // General
  HELP: {
    key: "?",
    modifiers: ["shift"],
    description: "Toggle keyboard shortcuts",
    category: "general",
  },
  ESCAPE: {
    key: "Escape",
    description: "Close modal / Clear search / Unfocus",
    category: "general",
  },

  // Navigation
  GO_HOME: {
    key: "H",
    modifiers: ["shift"],
    description: "Go to Dashboard",
    category: "navigation",
  },
  GO_SAVES: {
    key: "S",
    modifiers: ["shift"],
    description: "Go to Save Slots",
    category: "navigation",
  },
  GO_TEMPLE: {
    key: "T",
    modifiers: ["shift"],
    description: "Go to Temple",
    category: "navigation",
  },
  FOCUS_SEARCH: {
    key: "/",
    description: "Focus search",
    category: "navigation",
  },
  TOGGLE_SIDEBAR: {
    key: "[",
    description: "Toggle sidebar",
    category: "navigation",
  },

  // Grid navigation
  GRID_UP: {
    key: "ArrowUp",
    description: "Move up",
    category: "grid",
  },
  GRID_DOWN: {
    key: "ArrowDown",
    description: "Move down",
    category: "grid",
  },
  GRID_LEFT: {
    key: "ArrowLeft",
    description: "Move left",
    category: "grid",
  },
  GRID_RIGHT: {
    key: "ArrowRight",
    description: "Move right",
    category: "grid",
  },
  GRID_TOGGLE: {
    key: "Enter",
    description: "Toggle completion",
    category: "grid",
  },
  GRID_DETAILS: {
    key: "i",
    description: "Open details",
    category: "grid",
  },
  GRID_FIRST: {
    key: "Home",
    description: "First item",
    category: "grid",
  },
  GRID_LAST: {
    key: "End",
    description: "Last item",
    category: "grid",
  },
  GRID_HEARTS_UP: {
    key: "+",
    description: "Increase hearts (NPCs)",
    category: "grid",
  },
  GRID_HEARTS_DOWN: {
    key: "-",
    description: "Decrease hearts (NPCs)",
    category: "grid",
  },

  // Filters
  FOCUS_FILTERS: {
    key: "f",
    description: "Focus / cycle filters",
    category: "filters",
  },
  CLEAR_FILTERS: {
    key: "c",
    description: "Clear all filters",
    category: "filters",
  },
  SEASON_SPRING: {
    key: "1",
    modifiers: ["alt"],
    description: "Toggle Spring",
    category: "filters",
  },
  SEASON_SUMMER: {
    key: "2",
    modifiers: ["alt"],
    description: "Toggle Summer",
    category: "filters",
  },
  SEASON_FALL: {
    key: "3",
    modifiers: ["alt"],
    description: "Toggle Fall",
    category: "filters",
  },
  SEASON_WINTER: {
    key: "4",
    modifiers: ["alt"],
    description: "Toggle Winter",
    category: "filters",
  },
} as const;

/**
 * Check if an event target is an input element where we should ignore shortcuts.
 */
export function isInputElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    target.isContentEditable
  );
}

/**
 * Check if a keyboard event matches a shortcut definition.
 */
export function matchesShortcut(
  event: KeyboardEvent,
  shortcut: ShortcutDefinition
): boolean {
  const modifiers = shortcut.modifiers || [];
  
  const shiftRequired = modifiers.includes("shift");
  const altRequired = modifiers.includes("alt");
  const ctrlRequired = modifiers.includes("ctrl");
  const metaRequired = modifiers.includes("meta");

  // Check modifiers match exactly
  if (event.shiftKey !== shiftRequired) return false;
  if (event.altKey !== altRequired) return false;
  if (event.ctrlKey !== ctrlRequired) return false;
  if (event.metaKey !== metaRequired) return false;

  // Check key (case-insensitive for letters)
  const eventKey = event.key.length === 1 ? event.key.toUpperCase() : event.key;
  const shortcutKey = shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key;
  
  return eventKey === shortcutKey;
}

/**
 * Format a shortcut for display (e.g., "Shift+H", "Alt+1")
 */
export function formatShortcut(shortcut: ShortcutDefinition): string {
  const parts: string[] = [];
  
  if (shortcut.modifiers?.includes("ctrl")) parts.push("Ctrl");
  if (shortcut.modifiers?.includes("alt")) parts.push("Alt");
  if (shortcut.modifiers?.includes("shift")) parts.push("Shift");
  if (shortcut.modifiers?.includes("meta")) parts.push("Cmd");
  
  // Format key for display
  let keyDisplay = shortcut.key;
  if (keyDisplay === "ArrowUp") keyDisplay = "↑";
  if (keyDisplay === "ArrowDown") keyDisplay = "↓";
  if (keyDisplay === "ArrowLeft") keyDisplay = "←";
  if (keyDisplay === "ArrowRight") keyDisplay = "→";
  if (keyDisplay === "Escape") keyDisplay = "Esc";
  if (keyDisplay === " ") keyDisplay = "Space";
  
  parts.push(keyDisplay);
  
  return parts.join("+");
}

/**
 * Get shortcuts grouped by category for display.
 */
export function getShortcutsByCategory(): Record<string, ShortcutDefinition[]> {
  const grouped: Record<string, ShortcutDefinition[]> = {
    navigation: [],
    grid: [],
    filters: [],
    general: [],
  };

  for (const shortcut of Object.values(SHORTCUTS)) {
    grouped[shortcut.category].push(shortcut);
  }

  return grouped;
}

// Vim key mappings
export const VIM_KEYS: Record<string, string> = {
  h: "ArrowLeft",
  j: "ArrowDown",
  k: "ArrowUp",
  l: "ArrowRight",
};

/**
 * Normalize vim keys to arrow keys.
 */
export function normalizeVimKey(key: string): string {
  return VIM_KEYS[key.toLowerCase()] || key;
}
