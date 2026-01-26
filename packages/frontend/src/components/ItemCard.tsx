import { memo, useState } from "react";
import { Check, MapPin, Clock, Cloud, Sparkles, Info, Gift, Package, Sun, Sprout, Cog } from "lucide-react";
import type { Item, Season, ItemTempleStatus } from "@coral-tracker/shared";
import { ItemImage } from "./ui";
import { rarityColors, rarityCardStyles, seasonColors, anyBadgeStyle } from "../lib/styles";
import { ARIA_LABELS } from "../lib/aria-labels";

interface ItemCardProps {
  item: Item & { completed?: boolean; notes?: string | null };
  categorySlug?: string;
  onToggle?: (itemId: number, completed: boolean) => void;
  showDetails?: boolean;
  templeStatus?: ItemTempleStatus;
  onToggleOffered?: (requirementId: number, offered: boolean) => void;
  onShowDetails?: () => void;
  /** Whether this card is focused via keyboard navigation */
  isKeyboardFocused?: boolean;
}

export const ItemCard = memo(function ItemCard({ 
  item, 
  categorySlug, 
  onToggle, 
  showDetails = true, 
  templeStatus, 
  onToggleOffered,
  onShowDetails,
  isKeyboardFocused = false,
}: ItemCardProps) {
  // Animation state for completion
  const [justCompleted, setJustCompleted] = useState(false);

  // Metadata should be pre-parsed from backend, just cast it
  const itemMetadata = (item.metadata || {}) as Record<string, unknown>;

  const isOffering = 'altar' in itemMetadata;
  const requiredItems = itemMetadata.required_items as Array<{ name: string; quantity: number }> | undefined;
  const reward = itemMetadata.reward as string | undefined;

  // Temple requirement info
  const isTempleRequirement = templeStatus?.is_temple_requirement ?? false;
  const templeRequirements = templeStatus?.requirements ?? [];

const handleClick = () => {
    if (onToggle) {
      const willComplete = !item.completed;
      if (willComplete) {
        setJustCompleted(true);
        setTimeout(() => setJustCompleted(false), 600);
      }
      onToggle(item.id, willComplete);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  const handleInfoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShowDetails?.();
  };

  const handleInfoKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      onShowDetails?.();
    }
  };

  // Get rarity styles if item has rarity
  const rarityStyle = item.rarity ? rarityCardStyles[item.rarity] : null;

  return (
    <>
<div
        role="button"
        tabIndex={0}
        aria-pressed={item.completed}
        className={`
          card cursor-pointer select-none p-4 sm:p-6 h-full
          transform-gpu
          hover:scale-[1.02] hover:-translate-y-1
          focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-400 focus-visible:ring-offset-2 focus-visible:ring-offset-deepsea-900
          ${item.completed ? "completed-card" : ""}
          ${justCompleted ? "animate-card-complete" : ""}
          ${rarityStyle ? rarityStyle.border : ""}
          ${rarityStyle ? (item.completed ? rarityStyle.glowCompleted : rarityStyle.glow) : ""}
          ${isKeyboardFocused ? "keyboard-focused" : ""}
        `}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-start gap-3 sm:gap-4">
{/* Checkbox (visual only - card is the interactive element) */}
          <div
            aria-hidden="true"
            className={`
              w-5 h-5 sm:w-6 sm:h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0
              transform-gpu
              ${
                item.completed
                  ? "checkbox-completed"
                  : "border-ocean-600 hover:border-ocean-400 hover:scale-110"
              }
              ${justCompleted ? "animate-check-pop" : ""}
            `}
          >
            <Check 
              size={14} 
              className={`
                transform-gpu transition-all duration-200
                ${item.completed ? "opacity-100 scale-100" : "opacity-0 scale-0"}
              `}
            />
          </div>

{/* Item Image */}
          <ItemImage src={item.image_url} alt={item.name} size="sm" />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 mb-1 flex-wrap">
              <h3 className="font-semibold text-white text-sm sm:text-base">{item.name}</h3>
              {item.rarity && (
                <span
                  className={`px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded-full flex-shrink-0 ${rarityColors[item.rarity] || rarityColors.common}`}
                >
                  {item.rarity.replace("_", " ")}
                </span>
              )}
            </div>

            {showDetails && (
              <div className="space-y-1.5 sm:space-y-2 mt-2">
                {/* For Lake Temple Offerings - show different info */}
                {isOffering ? (
                  <>
                    {/* Altar badge */}
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <Sun size={12} className="text-sand-400 flex-shrink-0 sm:hidden" />
                      <Sun size={14} className="text-sand-400 flex-shrink-0 hidden sm:block" />
                      <span className="px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded-full bg-sand-500/20 text-sand-300 border border-sand-400/30">
                        {item.locations?.[0] || "Temple"}
                      </span>
                    </div>

                    {/* Required items count */}
                    {requiredItems && (
                      <div className="flex items-start gap-1.5 sm:gap-2 text-xs sm:text-sm text-ocean-300/80">
                        <Package size={12} className="flex-shrink-0 mt-0.5 text-ocean-400 sm:hidden" />
                        <Package size={14} className="flex-shrink-0 mt-0.5 text-ocean-400 hidden sm:block" />
                        <span>{requiredItems.length} items required</span>
                      </div>
                    )}

                    {/* Reward */}
                    {reward && (
                      <div className="flex items-start gap-1.5 sm:gap-2 text-xs sm:text-sm text-palm-300">
                        <Gift size={12} className="flex-shrink-0 mt-0.5 text-palm-400 sm:hidden" />
                        <Gift size={14} className="flex-shrink-0 mt-0.5 text-palm-400 hidden sm:block" />
                        <span>Reward: {reward}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Seasons - hide for gems and artifacts (not seasonal) */}
                    {categorySlug !== 'gems' && categorySlug !== 'artifacts' && (
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <Sparkles size={12} className="text-slate-400 flex-shrink-0 sm:hidden" />
                        <Sparkles size={14} className="text-slate-400 flex-shrink-0 hidden sm:block" />
                        {item.seasons && item.seasons.length > 0 ? (
                          item.seasons.map((season) => (
                            <span
                              key={season}
                              className={`px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded-full ${seasonColors[season as Season] || anyBadgeStyle}`}
                            >
                              {season}
                            </span>
                          ))
                        ) : (
                          <span className={`px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded-full ${anyBadgeStyle}`}>
                            Any Season
                          </span>
                        )}
                      </div>
                    )}

                    {/* Locations - hide for crops and artisan products */}
                    {item.locations && item.locations.length > 0 && 
                     categorySlug !== 'crops' && categorySlug !== 'artisan-products' && (
                      <div className="flex items-start gap-1.5 sm:gap-2 text-xs sm:text-sm text-ocean-300/80">
                        <MapPin size={12} className="flex-shrink-0 mt-0.5 text-coral-400 sm:hidden" />
                        <MapPin size={14} className="flex-shrink-0 mt-0.5 text-coral-400 hidden sm:block" />
                        <span className="line-clamp-2">{item.locations.join(", ")}</span>
                      </div>
                    )}

                    {/* Category-specific info (replaces generic Time of Day) */}
                    {categorySlug === 'crops' ? (
                      // Crops: Show growth time
                      itemMetadata.growth_days != null && (
                        <div className="flex items-start gap-1.5 sm:gap-2 text-xs sm:text-sm text-ocean-300/80">
                          <Sprout size={12} className="flex-shrink-0 mt-0.5 text-palm-400 sm:hidden" />
                          <Sprout size={14} className="flex-shrink-0 mt-0.5 text-palm-400 hidden sm:block" />
                          <span>{String(itemMetadata.growth_days)} days</span>
                        </div>
                      )
                    ) : categorySlug === 'artisan-products' ? (
                      // Artisan Products: Show equipment, input, and processing time
                      <>
                        {itemMetadata.equipment && (
                          <div className="flex items-start gap-1.5 sm:gap-2 text-xs sm:text-sm text-ocean-300/80">
                            <Cog size={12} className="flex-shrink-0 mt-0.5 text-ocean-400 sm:hidden" />
                            <Cog size={14} className="flex-shrink-0 mt-0.5 text-ocean-400 hidden sm:block" />
                            <span>{String(itemMetadata.equipment)}</span>
                          </div>
                        )}
                        {itemMetadata.input && (
                          <div className="flex items-start gap-1.5 sm:gap-2 text-xs sm:text-sm text-ocean-300/80">
                            <Package size={12} className="flex-shrink-0 mt-0.5 text-coral-400 sm:hidden" />
                            <Package size={14} className="flex-shrink-0 mt-0.5 text-coral-400 hidden sm:block" />
                            <span>From: {String(itemMetadata.input)}</span>
                          </div>
                        )}
                        {itemMetadata.processing_time && (
                          <div className="flex items-start gap-1.5 sm:gap-2 text-xs sm:text-sm text-ocean-300/80">
                            <Clock size={12} className="flex-shrink-0 mt-0.5 text-sand-400 sm:hidden" />
                            <Clock size={14} className="flex-shrink-0 mt-0.5 text-sand-400 hidden sm:block" />
                            <span>{String(itemMetadata.processing_time)}</span>
                          </div>
                        )}
                      </>
                    ) : categorySlug === 'forageables' || categorySlug === 'gems' || categorySlug === 'artifacts' ? (
                      // Forageables, Gems, Artifacts: Hide time of day entirely (not relevant)
                      null
                    ) : (
                      // Default: Show time of day (fish, insects, critters, etc.)
                      <div className="flex items-start gap-1.5 sm:gap-2 text-xs sm:text-sm text-ocean-300/80">
                        <Clock size={12} className="flex-shrink-0 mt-0.5 text-sand-400 sm:hidden" />
                        <Clock size={14} className="flex-shrink-0 mt-0.5 text-sand-400 hidden sm:block" />
                        {item.time_of_day && item.time_of_day.length > 0 ? (
                          <span>{item.time_of_day.join(", ")}</span>
                        ) : (
                          <span className="italic text-ocean-400/60">Any Time</span>
                        )}
                      </div>
                    )}

                    {/* Weather */}
                    {item.weather && item.weather.length > 0 && (
                      <div className="flex items-start gap-1.5 sm:gap-2 text-xs sm:text-sm text-ocean-300/80">
                        <Cloud size={12} className="flex-shrink-0 mt-0.5 text-ocean-400 sm:hidden" />
                        <Cloud size={14} className="flex-shrink-0 mt-0.5 text-ocean-400 hidden sm:block" />
                        <span>{item.weather.join(", ")}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Notes */}
            {item.notes && (
              <p className="mt-2 text-xs sm:text-sm text-ocean-300/70 italic">"{item.notes}"</p>
            )}

            {/* Temple Requirements */}
            {isTempleRequirement && templeRequirements.length > 0 && (
              <div className="mt-2 pt-2 border-t border-ocean-800/30">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Sun size={12} className="text-sand-400" />
                  <span className="text-xs text-sand-300 font-medium">Temple Offering</span>
                </div>
                <div className="space-y-1">
                  {templeRequirements.map((req) => (
                    <button
                      key={req.requirement_id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleOffered?.(req.requirement_id, !req.offered);
                      }}
                      className={`flex items-center gap-2 text-xs w-full p-1.5 rounded transition-colors ${
                        req.offered 
                          ? "bg-sand-500/20 text-sand-300" 
                          : "bg-ocean-800/30 text-slate-400 hover:bg-ocean-800/50"
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${
                        req.offered
                          ? "bg-sand-500 border-sand-400"
                          : "border-ocean-600"
                      }`}>
                        {req.offered && <Check size={10} className="text-white" />}
                      </div>
                      <span className="truncate">
                        Offered ({req.offering_name})
                        {req.quality && <span className="ml-1 opacity-70">- {req.quality}</span>}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right side: Price and Info button */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {/* Price */}
            {item.base_price && (
              <span className="text-xs sm:text-sm font-semibold text-sand-300">{item.base_price}g</span>
            )}
            
{/* Info button */}
            <button
              onClick={handleInfoClick}
              onKeyDown={handleInfoKeyDown}
              className="p-1.5 text-slate-400 hover:text-ocean-300 hover:bg-ocean-800/50 rounded-lg transition-colors"
              aria-label={ARIA_LABELS.viewDetailsFor(item.name)}
            >
              <Info size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
</div>
    </>
  );
});
