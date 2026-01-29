/**
 * Offering Navigation Hook
 * 
 * Two-level navigation for altar detail pages:
 * - Level 1: Navigate between offering headers (collapsed view)
 * - Level 2: Navigate between items within an expanded offering
 * 
 * Navigation behavior:
 * - Level 1: ↑↓/jk moves between offerings, Enter/Space expands & enters Level 2
 * - Level 2: ↑↓/jk moves between items, Enter/Space/o toggles offered, Escape collapses
 * - At first item + ↑: collapse offering, return to Level 1
 * - At last item + ↓: collapse offering, move to next offering (Level 1)
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useKeyboardNavigation } from "@/context/KeyboardNavigationContext";

interface OfferingItem {
  id: number;
  offered: boolean;
}

interface Offering {
  slug: string;
  items: OfferingItem[];
}

interface UseOfferingNavigationOptions {
  /** Array of offerings with their items */
  offerings: Offering[];
  /** Category slug for focus persistence */
  categorySlug: string;
  /** Callback when user toggles an item's offered state */
  onToggleOffered?: (requirementId: number, offered: boolean) => void;
  /** Whether navigation is enabled */
  enabled?: boolean;
}

interface UseOfferingNavigationReturn {
  /** Current navigation level (1 = offering headers, 2 = items within offering) */
  level: 1 | 2;
  /** Index of the focused offering (0-based) */
  focusedOfferingIndex: number;
  /** Index of the focused item within the offering (-1 when at Level 1) */
  focusedItemIndex: number;
  /** Set of expanded offering slugs */
  expandedOfferings: Set<string>;
  /** Expand a specific offering */
  expandOffering: (slug: string) => void;
  /** Collapse a specific offering */
  collapseOffering: (slug: string) => void;
  /** Toggle offering expansion */
  toggleOffering: (slug: string) => void;
  /** Whether to show focus indicators */
  showFocusIndicator: boolean;
}

export function useOfferingNavigation({
  offerings,
  categorySlug,
  onToggleOffered,
  enabled = true,
}: UseOfferingNavigationOptions): UseOfferingNavigationReturn {
  const { isFilterModeActive } = useKeyboardNavigation();
  
  // Navigation state
  const [level, setLevel] = useState<1 | 2>(1);
  const [focusedOfferingIndex, setFocusedOfferingIndex] = useState(0);
  const [focusedItemIndex, setFocusedItemIndex] = useState(-1);
  const [expandedOfferings, setExpandedOfferings] = useState<Set<string>>(new Set());

  // Refs for callbacks to avoid stale closures
  const onToggleOfferedRef = useRef(onToggleOffered);
  useEffect(() => {
    onToggleOfferedRef.current = onToggleOffered;
  }, [onToggleOffered]);

  // Expand/collapse helpers
  const expandOffering = useCallback((slug: string) => {
    setExpandedOfferings(prev => new Set(prev).add(slug));
  }, []);

  const collapseOffering = useCallback((slug: string) => {
    setExpandedOfferings(prev => {
      const next = new Set(prev);
      next.delete(slug);
      return next;
    });
  }, []);

  const toggleOffering = useCallback((slug: string) => {
    setExpandedOfferings(prev => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  }, []);

  // Get current offering and its items
  const getCurrentOffering = useCallback(() => {
    return offerings[focusedOfferingIndex];
  }, [offerings, focusedOfferingIndex]);

  // Keyboard event handler
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled || offerings.length === 0) return;
    
    // Normalize vim keys
    const key = event.key;
    const isUp = key === "ArrowUp" || key === "k";
    const isDown = key === "ArrowDown" || key === "j";
    const isEnter = key === "Enter" || key === " ";
    const isEscape = key === "Escape";
    const isToggleOffered = key === "o" || key === "O";

    if (level === 1) {
      // Level 1: Navigate between offering headers
      
      if (isUp) {
        event.preventDefault();
        setFocusedOfferingIndex(prev => Math.max(0, prev - 1));
        return;
      }
      
      if (isDown) {
        event.preventDefault();
        setFocusedOfferingIndex(prev => Math.min(offerings.length - 1, prev + 1));
        return;
      }
      
      if (isEnter) {
        event.preventDefault();
        const offering = getCurrentOffering();
        if (offering && offering.items.length > 0) {
          // Expand offering and enter Level 2
          expandOffering(offering.slug);
          setLevel(2);
          setFocusedItemIndex(0);
        }
        return;
      }
    } else {
      // Level 2: Navigate between items within offering (2-column grid)
      const offering = getCurrentOffering();
      if (!offering) return;
      
      const itemCount = offering.items.length;
      const columnCount = 2;
      const currentRow = Math.floor(focusedItemIndex / columnCount);
      const currentCol = focusedItemIndex % columnCount;
      
      // Detect horizontal keys
      const isLeft = key === "ArrowLeft" || key === "h";
      const isRight = key === "ArrowRight" || key === "l";
      
      if (isUp) {
        event.preventDefault();
        if (currentRow === 0) {
          // At top row - collapse and return to Level 1
          collapseOffering(offering.slug);
          setLevel(1);
          setFocusedItemIndex(-1);
        } else {
          // Move up one row
          setFocusedItemIndex(prev => prev - columnCount);
        }
        return;
      }
      
      if (isDown) {
        event.preventDefault();
        const newIndex = focusedItemIndex + columnCount;
        if (newIndex >= itemCount) {
          // At bottom - collapse and move to next offering
          collapseOffering(offering.slug);
          setLevel(1);
          setFocusedItemIndex(-1);
          setFocusedOfferingIndex(prev => Math.min(offerings.length - 1, prev + 1));
        } else {
          // Move down one row
          setFocusedItemIndex(newIndex);
        }
        return;
      }
      
      if (isLeft) {
        event.preventDefault();
        // Move left within row (don't wrap)
        if (currentCol > 0) {
          setFocusedItemIndex(prev => prev - 1);
        }
        return;
      }
      
      if (isRight) {
        event.preventDefault();
        // Move right within row (don't wrap, check bounds)
        if (currentCol < columnCount - 1 && focusedItemIndex + 1 < itemCount) {
          setFocusedItemIndex(prev => prev + 1);
        }
        return;
      }
      
      if (isEnter || isToggleOffered) {
        event.preventDefault();
        const item = offering.items[focusedItemIndex];
        if (item) {
          onToggleOfferedRef.current?.(item.id, !item.offered);
        }
        return;
      }
      
      if (isEscape) {
        event.preventDefault();
        // Collapse and return to Level 1
        collapseOffering(offering.slug);
        setLevel(1);
        setFocusedItemIndex(-1);
        return;
      }
    }
  }, [enabled, offerings, level, focusedOfferingIndex, focusedItemIndex, getCurrentOffering, expandOffering, collapseOffering]);

  // Register keyboard handler
  useEffect(() => {
    if (!enabled) return;
    
    let modalOpen = false;

    const observer = new MutationObserver(() => {
      modalOpen = !!document.querySelector('[role="dialog"][aria-modal="true"]');
    });
    observer.observe(document.body, { childList: true, subtree: true });
    // Initialize from current DOM state
    modalOpen = !!document.querySelector('[role="dialog"][aria-modal="true"]');

    const handler = (e: KeyboardEvent) => {
      // Don't handle if typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      // Don't handle if a modal is open
      if (modalOpen) {
        return;
      }

      handleKeyDown(e);
    };
    
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      observer.disconnect();
    };
  }, [enabled, handleKeyDown]);

  // Reset state when offerings change (e.g., navigating to different altar)
  useEffect(() => {
    setLevel(1);
    setFocusedOfferingIndex(0);
    setFocusedItemIndex(-1);
    setExpandedOfferings(new Set());
  }, [categorySlug]);

  // Don't show focus when filter mode is active
  const showFocusIndicator = enabled && !isFilterModeActive;

  return {
    level,
    focusedOfferingIndex,
    focusedItemIndex,
    expandedOfferings,
    expandOffering,
    collapseOffering,
    toggleOffering,
    showFocusIndicator,
  };
}
