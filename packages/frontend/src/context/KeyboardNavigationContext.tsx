/**
 * Keyboard Navigation Context
 * 
 * Provides keyboard navigation state and methods to the entire app.
 * Handles global shortcuts, grid focus state, search input refs,
 * and filter toolbar navigation.
 */

import { createContext, useContext, useCallback, useRef, useEffect, useState, type ReactNode, type RefObject } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useStore } from "@/store/useStore";
import {
  SHORTCUTS,
  CATEGORY_ORDER,
  isInputElement,
  matchesShortcut,
  normalizeVimKey,
} from "@/lib/keyboard-shortcuts";
import { SEASONS } from "@coral-tracker/shared";

// Grid navigation action types
export type GridAction = 
  | { type: "move"; direction: "up" | "down" | "left" | "right" }
  | { type: "jump"; position: "first" | "last" }
  | { type: "select" }
  | { type: "details" }
  | { type: "hearts"; delta: 1 | -1 };

// Filter navigation handler type
export interface FilterNavigationHandler {
  activate: () => void;
  focusNext: () => void;
  exit: () => void;
  isActive: boolean;
}

interface KeyboardNavigationContextValue {
  // Search input ref registration
  searchInputRef: RefObject<HTMLInputElement>;
  
  // Grid navigation
  gridActionRef: RefObject<((action: GridAction) => void) | null>;
  registerGridHandler: (handler: (action: GridAction) => void) => void;
  unregisterGridHandler: () => void;
  
  // Filter navigation
  filterHandlerRef: RefObject<FilterNavigationHandler | null>;
  registerFilterHandler: (handler: FilterNavigationHandler) => void;
  unregisterFilterHandler: () => void;
  isFilterModeActive: boolean;
  setFilterModeActive: (active: boolean) => void;
  
  // Check if we're on a grid page
  isGridPage: boolean;
}

const KeyboardNavigationContext = createContext<KeyboardNavigationContextValue | null>(null);

export function useKeyboardNavigation() {
  const ctx = useContext(KeyboardNavigationContext);
  if (!ctx) {
    throw new Error("useKeyboardNavigation must be used within KeyboardNavigationProvider");
  }
  return ctx;
}

interface KeyboardNavigationProviderProps {
  children: ReactNode;
}

export function KeyboardNavigationProvider({ children }: KeyboardNavigationProviderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    toggleSidebarCollapsed,
    toggleSeason,
    clearAllFilters,
    isShortcutsModalOpen,
    setShortcutsModalOpen,
  } = useStore();

  // Refs for coordinating with child components
  const searchInputRef = useRef<HTMLInputElement>(null);
  const gridActionRef = useRef<((action: GridAction) => void) | null>(null);
  const filterHandlerRef = useRef<FilterNavigationHandler | null>(null);

  // Filter mode state
  const [isFilterModeActive, setFilterModeActive] = useState(false);

  // Check if current page has a grid
  const isGridPage = location.pathname.startsWith("/track/") || 
                     location.pathname.startsWith("/temple/");

  // Register/unregister grid handler
  const registerGridHandler = useCallback((handler: (action: GridAction) => void) => {
    gridActionRef.current = handler;
  }, []);

  const unregisterGridHandler = useCallback(() => {
    gridActionRef.current = null;
  }, []);

  // Register/unregister filter handler
  const registerFilterHandler = useCallback((handler: FilterNavigationHandler) => {
    filterHandlerRef.current = handler;
  }, []);

  const unregisterFilterHandler = useCallback(() => {
    filterHandlerRef.current = null;
    setFilterModeActive(false);
  }, []);

  // Dispatch grid action if handler is registered
  const dispatchGridAction = useCallback((action: GridAction) => {
    if (gridActionRef.current) {
      gridActionRef.current(action);
    }
  }, []);

  // Global keyboard handler
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const isInput = isInputElement(event.target);
    
    // Always handle Escape
    if (event.key === "Escape") {
      event.preventDefault();
      
      // Priority: close modal > blur input > clear search
      if (isShortcutsModalOpen) {
        setShortcutsModalOpen(false);
        return;
      }
      
      if (isInput && event.target instanceof HTMLElement) {
        event.target.blur();
        return;
      }
      
      // Clear search if on a grid page
      if (searchInputRef.current) {
        searchInputRef.current.value = "";
        // Trigger input event to update state
        searchInputRef.current.dispatchEvent(new Event("input", { bubbles: true }));
      }
      return;
    }

    // Skip most shortcuts when typing in input
    if (isInput) {
      return;
    }

    // Help modal toggle (? key, which is Shift+/)
    if (event.key === "?" || (event.shiftKey && event.key === "/")) {
      event.preventDefault();
      setShortcutsModalOpen(!isShortcutsModalOpen);
      return;
    }

    // Don't process other shortcuts if modal is open
    if (isShortcutsModalOpen) {
      return;
    }

    // Navigation shortcuts
    if (matchesShortcut(event, SHORTCUTS.GO_HOME)) {
      event.preventDefault();
      navigate("/");
      return;
    }

    if (matchesShortcut(event, SHORTCUTS.GO_SAVES)) {
      event.preventDefault();
      navigate("/saves");
      return;
    }

    if (matchesShortcut(event, SHORTCUTS.GO_TEMPLE)) {
      event.preventDefault();
      navigate("/temple");
      return;
    }

    // Focus search
    if (matchesShortcut(event, SHORTCUTS.FOCUS_SEARCH)) {
      event.preventDefault();
      searchInputRef.current?.focus();
      return;
    }

    // Toggle sidebar
    if (matchesShortcut(event, SHORTCUTS.TOGGLE_SIDEBAR)) {
      event.preventDefault();
      toggleSidebarCollapsed();
      return;
    }

    // Category quick jump (1-9)
    if (!event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
      const num = parseInt(event.key, 10);
      if (num >= 1 && num <= 9) {
        const categorySlug = CATEGORY_ORDER[num - 1];
        if (categorySlug) {
          event.preventDefault();
          navigate(`/track/${categorySlug}`);
          return;
        }
      }
    }

    // Season filter shortcuts (Alt+1-4)
    if (event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
      const num = parseInt(event.key, 10);
      if (num >= 1 && num <= 4) {
        event.preventDefault();
        const season = SEASONS[num - 1];
        if (season) {
          toggleSeason(season);
        }
        return;
      }
    }

    // Filter shortcuts (only on grid pages)
    if (isGridPage) {
      if (matchesShortcut(event, SHORTCUTS.FOCUS_FILTERS)) {
        event.preventDefault();
        // If filter handler is registered, use it
        if (filterHandlerRef.current) {
          if (filterHandlerRef.current.isActive) {
            // Already in filter mode - cycle to next filter
            filterHandlerRef.current.focusNext();
          } else {
            // Enter filter mode
            filterHandlerRef.current.activate();
            setFilterModeActive(true);
          }
        }
        return;
      }

      if (matchesShortcut(event, SHORTCUTS.CLEAR_FILTERS)) {
        event.preventDefault();
        clearAllFilters();
        return;
      }
    }

    // Grid navigation shortcuts (only when grid handler is registered AND filter mode is not active)
    // Use synchronous check on filterHandlerRef.current?.isActive instead of React state
    // to avoid timing issues with async state updates
    const filterModeActive = filterHandlerRef.current?.isActive ?? false;
    if (gridActionRef.current && !filterModeActive) {
      // Normalize vim keys
      const normalizedKey = normalizeVimKey(event.key);

      // Arrow/vim navigation
      if (normalizedKey === "ArrowUp") {
        event.preventDefault();
        dispatchGridAction({ type: "move", direction: "up" });
        return;
      }
      if (normalizedKey === "ArrowDown") {
        event.preventDefault();
        dispatchGridAction({ type: "move", direction: "down" });
        return;
      }
      if (normalizedKey === "ArrowLeft") {
        event.preventDefault();
        dispatchGridAction({ type: "move", direction: "left" });
        return;
      }
      if (normalizedKey === "ArrowRight") {
        event.preventDefault();
        dispatchGridAction({ type: "move", direction: "right" });
        return;
      }

      // Home/End
      if (event.key === "Home") {
        event.preventDefault();
        dispatchGridAction({ type: "jump", position: "first" });
        return;
      }
      if (event.key === "End") {
        event.preventDefault();
        dispatchGridAction({ type: "jump", position: "last" });
        return;
      }

      // Select (Enter/Space)
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        dispatchGridAction({ type: "select" });
        return;
      }

      // Details (i)
      if (event.key === "i" || event.key === "I") {
        event.preventDefault();
        dispatchGridAction({ type: "details" });
        return;
      }

      // Hearts (+/- and =/-)
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        dispatchGridAction({ type: "hearts", delta: 1 });
        return;
      }
      if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        dispatchGridAction({ type: "hearts", delta: -1 });
        return;
      }
    }
  }, [
    navigate,
    toggleSidebarCollapsed,
    toggleSeason,
    clearAllFilters,
    isShortcutsModalOpen,
    setShortcutsModalOpen,
    isGridPage,
    dispatchGridAction,
  ]);

  // Set up global event listener
  // Using useEffect in the hook instead of here to avoid re-renders
  // This will be added in the App component

  const value: KeyboardNavigationContextValue = {
    searchInputRef,
    gridActionRef,
    registerGridHandler,
    unregisterGridHandler,
    filterHandlerRef,
    registerFilterHandler,
    unregisterFilterHandler,
    isFilterModeActive,
    setFilterModeActive,
    isGridPage,
  };

  return (
    <KeyboardNavigationContext.Provider value={value}>
      <GlobalKeyboardListener onKeyDown={handleKeyDown} />
      {children}
    </KeyboardNavigationContext.Provider>
  );
}

// Separate component to handle the event listener
function GlobalKeyboardListener({ onKeyDown }: { onKeyDown: (e: KeyboardEvent) => void }) {
  // Keep callback ref up to date
  const callbackRef = useRef(onKeyDown);
  callbackRef.current = onKeyDown;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => callbackRef.current(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return null;
}
