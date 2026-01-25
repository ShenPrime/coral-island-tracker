import { useState } from "react";
import { ChevronDown, Gift, CheckCircle2, ImageIcon } from "lucide-react";
import { TempleItemCard } from "./TempleItemCard";
import { ProgressBar } from "./ProgressBar";
import type { OfferingWithItems } from "@coral-tracker/shared";

interface OfferingSectionProps {
  offering: OfferingWithItems;
  onToggleOffered: (requirementId: number, offered: boolean) => void;
  defaultExpanded?: boolean;
}

export function OfferingSection({ offering, onToggleOffered, defaultExpanded = true }: OfferingSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={`card overflow-hidden ${offering.is_complete ? "ring-1 ring-palm-500/30" : ""}`}>
      {/* Header - clickable to expand/collapse */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center gap-4 hover:bg-ocean-800/20 transition-colors text-left"
      >
        {/* Offering Image */}
        {offering.image_url ? (
          <img
            src={offering.image_url}
            alt={offering.name}
            className="w-14 h-14 object-contain rounded-lg bg-deepsea-900/50 flex-shrink-0"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-14 h-14 bg-deepsea-900/50 rounded-lg flex items-center justify-center flex-shrink-0 border border-ocean-800/30">
            <ImageIcon size={24} className="text-ocean-500" />
          </div>
        )}

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
          className={`text-slate-400 transition-transform duration-200 flex-shrink-0 ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Expanded content - items grid */}
      {isExpanded && (
        <div className="border-t border-ocean-800/30 p-4 bg-deepsea-900/30">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {offering.items.map((item) => (
              <TempleItemCard
                key={item.id}
                item={item}
                onToggleOffered={onToggleOffered}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
