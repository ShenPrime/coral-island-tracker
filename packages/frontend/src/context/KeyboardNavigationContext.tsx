/**
 * Keyboard Navigation Context
 * 
 * Provides keyboard navigation state and methods to the entire app.
 * Handles global shortcuts, grid focus state, search input refs,
 * filter toolbar navigation, and interaction mode (keyboard vs mouse).
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
  | { type: "hearts"; delta: 1 | -1 }
  | { type: "toggleOffered" };

// Filter navigation handler type
export interface FilterNavigationHandler {
  activate: () => void;
  focusNext: () => void;
  exit: () => void;
  isActive: boolean;
}

// Interaction mode: mouse or keyboard
export type InteractionMode = "mouse" | "keyboard";

// Mouse movement threshold (in pixels) to switch from keyboard to mouse mode
const MOUSE_MOVEMENT_THRESHOLD = 5;

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
  
  // Interaction mode (mouse vs keyboard)
  interactionMode: InteractionMode;
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
  
  // Interaction mode state - default to mouse mode
  const [interactionMode, setInteractionMode] = useState<InteractionMode>("mouse");
  
  // Track last mouse position for movement threshold detection
  const lastMousePosRef = useRef<{ x: number; y: number } | null>(null);

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

    // Category quick jump (1-9, 0 for 10th category)
    if (!event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
      const num = parseInt(event.key, 10);
      if (num >= 0 && num <= 9) {
        // 0 maps to index 9 (10th category), 1-9 map to indices 0-8
        const index = num === 0 ? 9 : num - 1;
        const categorySlug = CATEGORY_ORDER[index];
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

      // Toggle offered (o) - for temple requirements
      if (event.key === "o" || event.key === "O") {
        event.preventDefault();
        dispatchGridAction({ type: "toggleOffered" });
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
    interactionMode,
  };

  // Handle mouse movement to switch to mouse mode
  const handleMouseMove = useCallback((event: MouseEvent) => {
    // If already in mouse mode, nothing to do
    if (interactionMode === "mouse") {
      lastMousePosRef.current = { x: event.clientX, y: event.clientY };
      return;
    }
    
    // Check if movement exceeds threshold
    const lastPos = lastMousePosRef.current;
    if (lastPos) {
      const deltaX = Math.abs(event.clientX - lastPos.x);
      const deltaY = Math.abs(event.clientY - lastPos.y);
      
      if (deltaX >= MOUSE_MOVEMENT_THRESHOLD || deltaY >= MOUSE_MOVEMENT_THRESHOLD) {
        setInteractionMode("mouse");
      }
    }
    
    lastMousePosRef.current = { x: event.clientX, y: event.clientY };
  }, [interactionMode]);

  // Wrap handleKeyDown to also switch to keyboard mode
  const handleKeyDownWithMode = useCallback((event: KeyboardEvent) => {
    // Switch to keyboard mode on navigation keys (not on modifier-only presses)
    const isNavigationKey = [
      "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
      "Tab", "Enter", " ", "Home", "End",
      "h", "j", "k", "l", "H", "J", "K", "L",
    ].includes(event.key);
    
    if (isNavigationKey && interactionMode !== "keyboard") {
      setInteractionMode("keyboard");
    }
    
    // Call the original handler
    handleKeyDown(event);
  }, [handleKeyDown, interactionMode]);

  return (
    <KeyboardNavigationContext.Provider value={value}>
      <GlobalInputListener 
        onKeyDown={handleKeyDownWithMode} 
        onMouseMove={handleMouseMove}
      />
      {children}
    </KeyboardNavigationContext.Provider>
  );
}

// Separate component to handle the event listeners
interface GlobalInputListenerProps {
  onKeyDown: (e: KeyboardEvent) => void;
  onMouseMove: (e: MouseEvent) => void;
}

function GlobalInputListener({ onKeyDown, onMouseMove }: GlobalInputListenerProps) {
  // Keep callback refs up to date
  const keyDownRef = useRef(onKeyDown);
  const mouseMoveRef = useRef(onMouseMove);
  keyDownRef.current = onKeyDown;
  mouseMoveRef.current = onMouseMove;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => keyDownRef.current(e);
    const handleMouseMove = (e: MouseEvent) => mouseMoveRef.current(e);
    
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousemove", handleMouseMove);
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return null;
}
