/**
 * Virtualized grid using @tanstack/react-virtual for efficient rendering of large lists.
 * Uses fixed row heights per category to ensure proper virtualization.
 * 
 * Supports responsive 1-column (mobile) / 2-column (desktop) layouts.
 */

import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useWindowWidth } from "@react-hook/window-size";
import { useRef, useLayoutEffect, useState } from "react";

interface VirtualizedGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Key extractor for items */
  getItemKey: (item: T) => string | number;
  /** Fixed row height in pixels (should accommodate tallest card in category) */
  rowHeight: number;
}

export function VirtualizedGrid<T>({
  items,
  renderItem,
  getItemKey,
  rowHeight,
}: VirtualizedGridProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);
  const windowWidth = useWindowWidth();
  const [scrollMargin, setScrollMargin] = useState(0);

  // Measure scroll margin after mount
  useLayoutEffect(() => {
    if (listRef.current) {
      setScrollMargin(listRef.current.offsetTop);
    }
  }, []);

  // Responsive: 1 column on mobile (<768px), 2 columns on desktop
  const isMobile = windowWidth < 768;
  const columnCount = isMobile ? 1 : 2;

  // Gap between rows
  const rowGap = 16;

  // Calculate number of rows (ceiling division)
  const rowCount = Math.ceil(items.length / columnCount);

  // Window virtualizer for scroll-based virtualization
  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => rowHeight + rowGap,
    overscan: 3,
    scrollMargin,
  });

  const virtualRows = virtualizer.getVirtualItems();

  // Don't render if no items
  if (items.length === 0) return null;

  return (
    <div ref={listRef}>
      {/* Container with total height for proper scrollbar */}
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {/* Render only visible rows */}
        {virtualRows.map((virtualRow) => {
          const rowIndex = virtualRow.index;
          const startIndex = rowIndex * columnCount;
          
          // Get items for this row
          const rowItems = items.slice(startIndex, startIndex + columnCount);

          return (
            <div
              key={virtualRow.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${rowHeight}px`,
                transform: `translateY(${virtualRow.start - scrollMargin}px)`,
              }}
            >
              {/* CSS Grid for 1-2 columns */}
              <div
                className={`grid gap-4 h-full ${
                  isMobile ? "grid-cols-1" : "grid-cols-2"
                }`}
              >
                {rowItems.map((item, indexInRow) => {
                  const globalIndex = startIndex + indexInRow;
                  return (
                    <div key={getItemKey(item)} className="h-full">
                      {renderItem(item, globalIndex)}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
