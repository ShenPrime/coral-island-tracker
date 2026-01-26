import { useState, useId, useEffect, useRef } from "react";
import { ChevronDown, Gift, CheckCircle2 } from "lucide-react";
import { TempleItemCard } from "./TempleItemCard";
import { ProgressBar } from "./ProgressBar";
import { ItemImage } from "./ui";
import type { OfferingWithItems } from "@coral-tracker/shared";

interface OfferingSectionProps {
  offering: OfferingWithItems;
  onToggleOffered: (requirementId: number, offered: boolean) => void;
  defaultExpanded?: boolean;
  /** Whether this offering's header is focused via keyboard navigation (Level 1) */
  isHeaderFocused?: boolean;
  /** Index of the focused item within this offering (-1 if none focused, Level 2) */
  focusedItemIndex?: number;
  /** Controlled expansion state from parent (for keyboard navigation) */
  isExpandedControlled?: boolean;
  /** Callback when expansion changes (for keyboard navigation) */
  onExpandChange?: (expanded: boolean) => void;
}

export function OfferingSection({ 
  offering, 
  onToggleOffered, 
  defaultExpanded = false,
  isHeaderFocused = false,
  focusedItemIndex = -1,
  isExpandedControlled,
  onExpandChange,
}: OfferingSectionProps) {
  const [isExpandedInternal, setIsExpandedInternal] = useState(defaultExpanded);
  const contentId = useId();
  const headerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Use controlled state if provided, otherwise use internal state
  const isExpanded = isExpandedControlled !== undefined ? isExpandedControlled : isExpandedInternal;
  
  const handleToggleExpanded = () => {
    const newExpanded = !isExpanded;
    if (onExpandChange) {
      onExpandChange(newExpanded);
    } else {
      setIsExpandedInternal(newExpanded);
    }
  };

  // Scroll header into view when focused
  useEffect(() => {
    if (isHeaderFocused && headerRef.current) {
      headerRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [isHeaderFocused]);

  // Scroll focused item into view
  useEffect(() => {
    if (focusedItemIndex >= 0 && itemRefs.current[focusedItemIndex]) {
      itemRefs.current[focusedItemIndex]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [focusedItemIndex]);

  return (
    <div className={`card overflow-hidden ${offering.is_complete ? "ring-1 ring-palm-500/30" : ""}`}>
{/* Header - clickable to expand/collapse */}
      <button
        ref={headerRef}
        onClick={handleToggleExpanded}
        aria-expanded={isExpanded}
        aria-controls={contentId}
        className={`w-full p-4 flex items-center gap-4 hover:bg-ocean-800/20 transition-colors text-left ${
          isHeaderFocused ? "keyboard-focused ring-2 ring-ocean-400 ring-inset" : ""
        }`}
      >
{/* Offering Image */}
        <ItemImage src={offering.image_url} alt={offering.name} size="lg" className="rounded-lg" />

        {/* Title and Progress */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-white">{offering.name}</h3>
            {offering.is_complete && (
              <CheckCircle2 size={18} className="text-palm-400 flex-shrink-0" />
            )}
          </div>
          
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-400">
              {offering.offered_items}/{offering.total_items} items
            </span>
            
            {/* Reward badge */}
            {offering.reward && (
              <span className="flex items-center gap-1 text-palm-300 bg-palm-900/30 px-2 py-0.5 rounded border border-palm-600/30">
                <Gift size={12} />
                <span className="text-xs">{offering.reward}</span>
              </span>
            )}
          </div>

          {/* Mini progress bar */}
          <div className="mt-2">
            <ProgressBar
              value={offering.offered_items}
              max={offering.total_items}
              size="xs"
              showPercentage={false}
              color={offering.is_complete ? "green" : "ocean"}
            />
          </div>
        </div>

{/* Expand/collapse indicator */}
        <ChevronDown
          size={20}
          aria-hidden="true"
          className={`text-slate-400 transition-transform duration-200 flex-shrink-0 ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </button>

{/* Expanded content - items grid */}
      {isExpanded && (
        <div id={contentId} className="border-t border-ocean-800/30 p-4 bg-deepsea-900/30">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {offering.items.map((item, index) => (
              <div 
                key={item.id}
                ref={(el) => { itemRefs.current[index] = el; }}
              >
                <TempleItemCard
                  item={item}
                  onToggleOffered={onToggleOffered}
                  isKeyboardFocused={focusedItemIndex === index}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
