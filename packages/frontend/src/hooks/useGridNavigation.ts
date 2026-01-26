/**
 * Grid Navigation Hook
 * 
 * Provides keyboard navigation for grid-based item lists.
 * Handles arrow keys, vim keys, and action keys (Enter, Space, i, +, -).
 */

import { useEffect, useCallback, useRef } from "react";
import { useStore } from "@/store/useStore";
import { useKeyboardNavigation, type GridAction } from "@/context/KeyboardNavigationContext";

interface UseGridNavigationOptions {
  /** Total number of items in the grid */
  itemCount: number;
  /** Number of columns in the grid (for arrow navigation) */
  columnCount: number;
  /** Category slug for focus persistence */
  categorySlug: string;
  /** Callback when user selects an item (Enter/Space) */
  onSelect?: (index: number) => void;
  /** Callback when user requests item details (i key) */
  onDetails?: (index: number) => void;
  /** Callback for heart changes on NPCs (+/- keys) */
  onHeartsChange?: (index: number, delta: 1 | -1) => void;
  /** Callback to scroll an item into view */
  scrollToIndex?: (index: number) => void;
  /** Whether grid navigation is enabled (set to false when modal is open) */
  enabled?: boolean;
}

interface UseGridNavigationReturn {
  /** Currently focused index (-1 if none, or -1 if filter mode is active) */
  focusedIndex: number;
  /** Set focused index manually */
  setFocusedIndex: (index: number) => void;
  /** Whether to show the focus indicator (false when filter mode is active) */
  showFocusIndicator: boolean;
}

export function useGridNavigation({
  itemCount,
  columnCount,
  categorySlug,
  onSelect,
  onDetails,
  onHeartsChange,
  scrollToIndex,
  enabled = true,
}: UseGridNavigationOptions): UseGridNavigationReturn {
  const { registerGridHandler, unregisterGridHandler, isFilterModeActive } = useKeyboardNavigation();
  const { gridFocusIndex, setGridFocusIndex } = useStore();

  // Get persisted focus index for this category, default to 0 if items exist
  const persistedIndex = gridFocusIndex[categorySlug] ?? 0;
  
  // Ensure focus index is within bounds
  const focusedIndex = itemCount > 0 
    ? Math.min(persistedIndex, itemCount - 1) 
    : -1;

  // Refs for callbacks to avoid stale closures
  const onSelectRef = useRef(onSelect);
  const onDetailsRef = useRef(onDetails);
  const onHeartsChangeRef = useRef(onHeartsChange);
  const scrollToIndexRef = useRef(scrollToIndex);
  
  useEffect(() => {
    onSelectRef.current = onSelect;
    onDetailsRef.current = onDetails;
    onHeartsChangeRef.current = onHeartsChange;
    scrollToIndexRef.current = scrollToIndex;
  }, [onSelect, onDetails, onHeartsChange, scrollToIndex]);

  // Set focused index and persist it
  const setFocusedIndex = useCallback((index: number) => {
    if (index >= 0 && index < itemCount) {
      setGridFocusIndex(categorySlug, index);
      scrollToIndexRef.current?.(index);
    }
  }, [categorySlug, itemCount, setGridFocusIndex]);

  // Handle grid actions from keyboard context
  const handleGridAction = useCallback((action: GridAction) => {
    if (itemCount === 0) return;

    const currentIndex = focusedIndex >= 0 ? focusedIndex : 0;

    switch (action.type) {
      case "move": {
        let newIndex = currentIndex;
        
        switch (action.direction) {
          case "up":
            newIndex = currentIndex - columnCount;
            if (newIndex < 0) newIndex = currentIndex; // Stay in place at top
            break;
          case "down":
            newIndex = currentIndex + columnCount;
            if (newIndex >= itemCount) newIndex = currentIndex; // Stay in place at bottom
            break;
          case "left":
            if (currentIndex % columnCount > 0) {
              newIndex = currentIndex - 1;
            }
            break;
          case "right":
            if (currentIndex % columnCount < columnCount - 1 && currentIndex + 1 < itemCount) {
              newIndex = currentIndex + 1;
            }
            break;
        }

        if (newIndex !== currentIndex) {
          setFocusedIndex(newIndex);
        }
        break;
      }

      case "jump": {
        if (action.position === "first") {
          setFocusedIndex(0);
        } else {
          setFocusedIndex(itemCount - 1);
        }
        break;
      }

      case "select": {
        if (focusedIndex >= 0) {
          onSelectRef.current?.(focusedIndex);
        }
        break;
      }

      case "details": {
        if (focusedIndex >= 0) {
          onDetailsRef.current?.(focusedIndex);
        }
        break;
      }

      case "hearts": {
        if (focusedIndex >= 0) {
          onHeartsChangeRef.current?.(focusedIndex, action.delta);
        }
        break;
      }
    }
  }, [focusedIndex, itemCount, columnCount, setFocusedIndex]);

  // Register handler when component mounts (only when enabled)
  useEffect(() => {
    if (enabled) {
      registerGridHandler(handleGridAction);
      return () => unregisterGridHandler();
    } else {
      // Ensure handler is unregistered when disabled
      unregisterGridHandler();
    }
  }, [registerGridHandler, unregisterGridHandler, handleGridAction, enabled]);

  // Scroll initial focus into view when first mounting
  useEffect(() => {
    if (focusedIndex >= 0 && scrollToIndexRef.current) {
      // Small delay to ensure virtualizer is ready
      const timer = setTimeout(() => {
        scrollToIndexRef.current?.(focusedIndex);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [categorySlug]); // Only on category change, not focus change

  // Don't show focus indicator when filter mode is active
  const showFocusIndicator = !isFilterModeActive;

  return {
    focusedIndex,
    setFocusedIndex,
    showFocusIndicator,
  };
}
