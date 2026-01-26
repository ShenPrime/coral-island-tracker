/**
 * Filter Navigation Hook
 * 
 * Implements the roving tabindex pattern for accessible toolbar navigation.
 * Used by FilterBar to enable keyboard navigation between filter controls.
 * 
 * ARIA Pattern: https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/
 * 
 * Key behaviors:
 * - Only one filter button has tabindex="0" (the focused one)
 * - All others have tabindex="-1"
 * - Arrow keys move focus between filters
 * - Wraps around at boundaries
 * - Escape exits filter navigation mode
 */

import { useCallback, useRef, useState, useEffect } from "react";

interface UseFilterNavigationOptions {
  /** Called when user exits filter mode (Escape or blur) */
  onExit?: () => void;
  /** Called when filter mode is activated */
  onActivate?: () => void;
}

interface UseFilterNavigationReturn {
  /** Whether filter navigation mode is active */
  isActive: boolean;
  /** Current focused filter index (-1 if not active) */
  focusedIndex: number;
  /** Register a filter element - returns ref callback */
  registerFilter: (index: number) => (el: HTMLButtonElement | null) => void;
  /** Get tabIndex for a filter at given index */
  getTabIndex: (index: number) => 0 | -1;
  /** Check if a filter at given index is focused */
  isFocused: (index: number) => boolean;
  /** Activate filter mode and focus first filter */
  activate: () => void;
  /** Move focus to next filter (wraps) */
  focusNext: () => void;
  /** Move focus to previous filter (wraps) */
  focusPrev: () => void;
  /** Exit filter navigation mode */
  exit: () => void;
  /** Handle keyboard events on the toolbar */
  handleToolbarKeyDown: (e: React.KeyboardEvent) => void;
  /** Handle blur events to detect when focus leaves toolbar */
  handleToolbarBlur: (e: React.FocusEvent) => void;
  /** Total number of registered filters */
  filterCount: number;
}

export function useFilterNavigation(
  options: UseFilterNavigationOptions = {}
): UseFilterNavigationReturn {
  const { onExit, onActivate } = options;

  // Track active state and focused index
  const [isActive, setIsActive] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  // Store refs to filter buttons
  // Using a ref to avoid re-renders when registering filters
  const filterRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const [filterCount, setFilterCount] = useState(0);

  // Refs for callbacks to avoid stale closures
  const onExitRef = useRef(onExit);
  const onActivateRef = useRef(onActivate);
  useEffect(() => {
    onExitRef.current = onExit;
    onActivateRef.current = onActivate;
  }, [onExit, onActivate]);

  // Get sorted list of registered filter indices
  const getSortedIndices = useCallback(() => {
    return Array.from(filterRefs.current.keys()).sort((a, b) => a - b);
  }, []);

  // Focus a specific filter by index
  const focusFilter = useCallback((index: number) => {
    const el = filterRefs.current.get(index);
    if (el) {
      el.focus();
      setFocusedIndex(index);
    }
  }, []);

  // Activate filter mode - focus first filter
  const activate = useCallback(() => {
    const indices = getSortedIndices();
    if (indices.length === 0) return;

    setIsActive(true);
    const firstIndex = indices[0];
    setFocusedIndex(firstIndex);
    
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      focusFilter(firstIndex);
      onActivateRef.current?.();
    });
  }, [getSortedIndices, focusFilter]);

  // Move focus to next filter (wraps around)
  const focusNext = useCallback(() => {
    const indices = getSortedIndices();
    if (indices.length === 0) return;

    // If not active, activate first
    if (!isActive) {
      activate();
      return;
    }

    const currentPos = indices.indexOf(focusedIndex);
    const nextPos = currentPos === -1 ? 0 : (currentPos + 1) % indices.length;
    const nextIndex = indices[nextPos];
    
    focusFilter(nextIndex);
  }, [getSortedIndices, isActive, focusedIndex, activate, focusFilter]);

  // Move focus to previous filter (wraps around)
  const focusPrev = useCallback(() => {
    const indices = getSortedIndices();
    if (indices.length === 0 || !isActive) return;

    const currentPos = indices.indexOf(focusedIndex);
    const prevPos = currentPos <= 0 ? indices.length - 1 : currentPos - 1;
    const prevIndex = indices[prevPos];
    
    focusFilter(prevIndex);
  }, [getSortedIndices, isActive, focusedIndex, focusFilter]);

  // Exit filter navigation mode
  const exit = useCallback(() => {
    setIsActive(false);
    setFocusedIndex(-1);
    onExitRef.current?.();
  }, []);

  // Register a filter element - returns a ref callback
  const registerFilter = useCallback((index: number) => {
    return (el: HTMLButtonElement | null) => {
      if (el) {
        filterRefs.current.set(index, el);
      } else {
        filterRefs.current.delete(index);
      }
      // Update count
      setFilterCount(filterRefs.current.size);
    };
  }, []);

  // Get tabIndex for a filter
  const getTabIndex = useCallback((index: number): 0 | -1 => {
    // When active, only the focused filter has tabindex 0
    if (isActive) {
      return focusedIndex === index ? 0 : -1;
    }
    // When not active, first filter has tabindex 0 (for Tab entry)
    const indices = getSortedIndices();
    return indices[0] === index ? 0 : -1;
  }, [isActive, focusedIndex, getSortedIndices]);

  // Check if a filter is focused
  const isFocused = useCallback((index: number): boolean => {
    return isActive && focusedIndex === index;
  }, [isActive, focusedIndex]);

  // Handle keyboard events on the toolbar
  const handleToolbarKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Only handle when filter mode is active
    if (!isActive) return;

    switch (e.key) {
      case "ArrowRight":
      case "l":
        e.preventDefault();
        e.stopPropagation();
        focusNext();
        break;
      case "ArrowLeft":
      case "h":
        e.preventDefault();
        e.stopPropagation();
        focusPrev();
        break;
      case "Escape":
        e.preventDefault();
        e.stopPropagation();
        exit();
        break;
      case "Home":
        e.preventDefault();
        e.stopPropagation();
        const indices = getSortedIndices();
        if (indices.length > 0) {
          focusFilter(indices[0]);
        }
        break;
      case "End":
        e.preventDefault();
        e.stopPropagation();
        const sortedIndices = getSortedIndices();
        if (sortedIndices.length > 0) {
          focusFilter(sortedIndices[sortedIndices.length - 1]);
        }
        break;
    }
  }, [isActive, focusNext, focusPrev, exit, getSortedIndices, focusFilter]);

  // Handle blur to detect when focus leaves the toolbar
  const handleToolbarBlur = useCallback((e: React.FocusEvent) => {
    // Check if the new focus target is still within the toolbar
    const toolbar = e.currentTarget;
    const newFocusTarget = e.relatedTarget as Node | null;
    
    // Use setTimeout to let the focus settle
    setTimeout(() => {
      if (newFocusTarget && !toolbar.contains(newFocusTarget)) {
        // Focus moved outside toolbar - exit filter mode
        exit();
      }
    }, 0);
  }, [exit]);

  // Cleanup: if focused filter is removed, adjust focus
  useEffect(() => {
    if (!isActive || focusedIndex === -1) return;

    // Check if current focused element still exists
    if (!filterRefs.current.has(focusedIndex)) {
      const indices = getSortedIndices();
      if (indices.length > 0) {
        // Focus the nearest available filter
        const nearestIndex = indices.reduce((prev, curr) => 
          Math.abs(curr - focusedIndex) < Math.abs(prev - focusedIndex) ? curr : prev
        );
        focusFilter(nearestIndex);
      } else {
        // No filters left - exit
        exit();
      }
    }
  }, [isActive, focusedIndex, getSortedIndices, focusFilter, exit, filterCount]);

  return {
    isActive,
    focusedIndex,
    registerFilter,
    getTabIndex,
    isFocused,
    activate,
    focusNext,
    focusPrev,
    exit,
    handleToolbarKeyDown,
    handleToolbarBlur,
    filterCount,
  };
}
