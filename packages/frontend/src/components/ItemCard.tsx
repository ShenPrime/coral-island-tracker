import { useState } from "react";
import { Check, MapPin, Clock, Cloud, Sparkles, ImageIcon, Info, X, Coins, TrendingUp, Zap, Ruler, Waves, Sprout, RefreshCw, Leaf, Unlock, Tag, Gift, Package, Sun } from "lucide-react";
import type { Item, Season, Rarity } from "@coral-tracker/shared";

interface ItemCardProps {
  item: Item & { completed?: boolean; notes?: string | null };
  onToggle?: (itemId: number, completed: boolean) => void;
  showDetails?: boolean;
}

const rarityColors: Record<Rarity, string> = {
  common: "bg-slate-600/50 text-slate-300 border border-slate-500/30",
  uncommon: "bg-palm-600/30 text-palm-300 border border-palm-500/30",
  rare: "bg-ocean-600/30 text-ocean-300 border border-ocean-500/30",
  super_rare: "bg-indigo-600/30 text-indigo-300 border border-indigo-500/30",
  epic: "bg-purple-600/30 text-purple-300 border border-purple-500/30",
  legendary: "bg-gradient-to-r from-sand-500/40 to-coral-500/40 text-sand-200 border border-sand-400/50",
};

const seasonColors: Record<Season, string> = {
  spring: "bg-pink-500/30 text-pink-300 border border-pink-400/30",
  summer: "bg-sand-500/30 text-sand-300 border border-sand-400/30",
  fall: "bg-orange-500/30 text-orange-300 border border-orange-400/30",
  winter: "bg-cyan-500/30 text-cyan-300 border border-cyan-400/30",
};

// "Any" badge style for items available any season/time
const anyBadgeStyle = "bg-ocean-800/50 text-ocean-300 italic border border-ocean-600/30";

// Modal component for detailed item info
function ItemModal({ 
  item, 
  isOpen, 
  onClose,
  onToggle,
}: { 
  item: Item & { completed?: boolean; notes?: string | null }; 
  isOpen: boolean; 
  onClose: () => void;
  onToggle?: (itemId: number, completed: boolean) => void;
}) {
  if (!isOpen) return null;

  // Parse metadata if it's a string (from JSON)
  let metadata: Record<string, unknown> = {};
  if (item.metadata) {
    if (typeof item.metadata === 'string') {
      try {
        metadata = JSON.parse(item.metadata);
      } catch {
        metadata = {};
      }
    } else {
      metadata = item.metadata as Record<string, unknown>;
    }
  }
  
  const prices = metadata?.prices as Record<string, number> | undefined;
  const pricesWithPerk = metadata?.prices_with_perk as Record<string, number> | undefined;

  const handleToggle = () => {
    onToggle?.(item.id, !item.completed);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm modal-backdrop" />
      
      {/* Modal */}
      <div 
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-deepsea-800 border border-ocean-700/50 rounded-2xl shadow-2xl modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-deepsea-800/95 backdrop-blur-sm border-b border-ocean-700/30 p-4 flex items-start gap-4">
          {/* Item Image */}
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.name}
              className="w-16 h-16 object-contain rounded-lg bg-deepsea-900/50"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-16 h-16 bg-deepsea-900/50 rounded-lg flex items-center justify-center border border-ocean-800/30">
              <ImageIcon size={28} className="text-ocean-500" />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-white mb-1">{item.name}</h2>
            <div className="flex items-center gap-2 flex-wrap">
              {item.rarity && (
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${rarityColors[item.rarity] || rarityColors.common}`}>
                  {item.rarity.replace("_", " ")}
                </span>
              )}
              {item.base_price && (
                <span className="text-sand-300 text-sm font-medium">{item.base_price}g</span>
              )}
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-ocean-800/50 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Description */}
          {item.description && (
            <div className="text-ocean-200/80 text-sm italic">
              "{item.description}"
            </div>
          )}

          {/* Completion toggle */}
          <button
            onClick={handleToggle}
            className={`w-full p-3 rounded-lg border flex items-center justify-center gap-2 font-medium transition-all ${
              item.completed
                ? "bg-palm-600/20 border-palm-500/50 text-palm-300 hover:bg-palm-600/30"
                : "bg-ocean-800/30 border-ocean-600/50 text-ocean-300 hover:bg-ocean-800/50"
            }`}
          >
            <Check size={18} className={item.completed ? "opacity-100" : "opacity-50"} />
            {item.completed ? "Completed" : "Mark as Completed"}
          </button>

          {/* Seasons */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles size={16} className="text-ocean-400" />
              Seasons
            </h3>
            <div className="flex flex-wrap gap-2">
              {item.seasons && item.seasons.length > 0 ? (
                item.seasons.map((season) => (
                  <span
                    key={season}
                    className={`px-3 py-1 text-sm font-medium rounded-full ${seasonColors[season as Season] || anyBadgeStyle}`}
                  >
                    {season.charAt(0).toUpperCase() + season.slice(1)}
                  </span>
                ))
              ) : (
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${anyBadgeStyle}`}>
                  Any Season
                </span>
              )}
            </div>
          </div>

          {/* Time of Day */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Clock size={16} className="text-sand-400" />
              Time of Day
            </h3>
            <div className="flex flex-wrap gap-2">
              {item.time_of_day && item.time_of_day.length > 0 ? (
                item.time_of_day.map((time) => (
                  <span
                    key={time}
                    className="px-3 py-1 text-sm font-medium rounded-full bg-sand-500/20 text-sand-300 border border-sand-400/30"
                  >
                    {time.charAt(0).toUpperCase() + time.slice(1)}
                  </span>
                ))
              ) : (
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${anyBadgeStyle}`}>
                  Any Time
                </span>
              )}
            </div>
          </div>

          {/* Weather */}
          {item.weather && item.weather.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Cloud size={16} className="text-ocean-400" />
                Weather
              </h3>
              <div className="flex flex-wrap gap-2">
                {item.weather.map((w) => (
                  <span
                    key={w}
                    className="px-3 py-1 text-sm font-medium rounded-full bg-ocean-500/20 text-ocean-300 border border-ocean-400/30"
                  >
                    {w.charAt(0).toUpperCase() + w.slice(1)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Locations */}
          {item.locations && item.locations.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <MapPin size={16} className="text-coral-400" />
                Locations
              </h3>
              <div className="flex flex-wrap gap-2">
                {item.locations.map((loc, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 text-sm font-medium rounded-full bg-coral-500/20 text-coral-300 border border-coral-400/30"
                  >
                    {loc}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Prices Table */}
          {prices && Object.keys(prices).length > 1 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Coins size={16} className="text-sand-400" />
                Sell Prices by Quality
              </h3>
              <div className="grid grid-cols-5 gap-1 text-center text-sm">
                {["base", "bronze", "silver", "gold", "osmium"].map((quality) => (
                  <div key={quality} className="space-y-1">
                    <div className={`text-xs font-medium capitalize ${
                      quality === "base" ? "text-slate-400" :
                      quality === "bronze" ? "text-orange-400" :
                      quality === "silver" ? "text-slate-300" :
                      quality === "gold" ? "text-yellow-400" :
                      "text-purple-400"
                    }`}>
                      {quality}
                    </div>
                    <div className="text-sand-300 font-medium">
                      {prices[quality] ? `${prices[quality]}g` : "-"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prices with Perk */}
          {pricesWithPerk && Object.keys(pricesWithPerk).length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <TrendingUp size={16} className="text-palm-400" />
                Prices with Fish Price Perk
              </h3>
              <div className="grid grid-cols-5 gap-1 text-center text-sm">
                {["base", "bronze", "silver", "gold", "osmium"].map((quality) => (
                  <div key={quality} className="space-y-1">
                    <div className={`text-xs font-medium capitalize ${
                      quality === "base" ? "text-slate-400" :
                      quality === "bronze" ? "text-orange-400" :
                      quality === "silver" ? "text-slate-300" :
                      quality === "gold" ? "text-yellow-400" :
                      "text-purple-400"
                    }`}>
                      {quality}
                    </div>
                    <div className="text-palm-300 font-medium">
                      {pricesWithPerk[quality] ? `${pricesWithPerk[quality]}g` : "-"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Additional Metadata */}
          {metadata && (
            <div className="space-y-2">
              {/* Difficulty (for fish) */}
              {'difficulty' in metadata && metadata.difficulty != null && (
                <div className="flex items-center gap-2 text-sm">
                  <Zap size={16} className="text-coral-400 flex-shrink-0" />
                  <span className="text-slate-400">Difficulty:</span>
                  <span className="text-white font-medium">{String(metadata.difficulty)}</span>
                </div>
              )}

              {/* Size (for fish) */}
              {'size' in metadata && metadata.size != null && (
                <div className="flex items-center gap-2 text-sm">
                  <Ruler size={16} className="text-ocean-400 flex-shrink-0" />
                  <span className="text-slate-400">Size:</span>
                  <span className="text-white font-medium">{String(metadata.size)}</span>
                </div>
              )}

              {/* Pattern (for fish) */}
              {'pattern' in metadata && metadata.pattern != null && (
                <div className="flex items-center gap-2 text-sm">
                  <Waves size={16} className="text-ocean-400 flex-shrink-0" />
                  <span className="text-slate-400">Pattern:</span>
                  <span className="text-white font-medium">{String(metadata.pattern)}</span>
                </div>
              )}

              {/* Growth days (for crops) */}
              {'growth_days' in metadata && metadata.growth_days != null && (
                <div className="flex items-center gap-2 text-sm">
                  <Sprout size={16} className="text-palm-400 flex-shrink-0" />
                  <span className="text-slate-400">Growth Time:</span>
                  <span className="text-white font-medium">{String(metadata.growth_days)} days</span>
                </div>
              )}

              {/* Regrowth days (for crops) */}
              {'regrowth_days' in metadata && metadata.regrowth_days != null && (
                <div className="flex items-center gap-2 text-sm">
                  <RefreshCw size={16} className="text-palm-400 flex-shrink-0" />
                  <span className="text-slate-400">Regrowth:</span>
                  <span className="text-white font-medium">{String(metadata.regrowth_days)} days</span>
                </div>
              )}

              {/* Seed info (for crops) */}
              {'seed' in metadata && metadata.seed != null && typeof metadata.seed === 'object' && (
                <div className="flex items-center gap-2 text-sm">
                  <Leaf size={16} className="text-sand-400 flex-shrink-0" />
                  <span className="text-slate-400">Seed:</span>
                  <span className="text-white font-medium">
                    {(metadata.seed as { name?: string; price?: number }).name}
                    {(metadata.seed as { price?: number }).price && ` (${(metadata.seed as { price: number }).price}g)`}
                  </span>
                </div>
              )}

              {/* Unlock requirement */}
              {'unlock_requirement' in metadata && metadata.unlock_requirement != null && (
                <div className="flex items-center gap-2 text-sm">
                  <Unlock size={16} className="text-coral-400 flex-shrink-0" />
                  <span className="text-slate-400">Unlocks:</span>
                  <span className="text-white font-medium">{String(metadata.unlock_requirement)}</span>
                </div>
              )}

              {/* Type */}
              {'type' in metadata && metadata.type != null && (
                <div className="flex items-center gap-2 text-sm">
                  <Tag size={16} className="text-ocean-400 flex-shrink-0" />
                  <span className="text-slate-400">Type:</span>
                  <span className="text-white font-medium">{String(metadata.type)}</span>
                </div>
              )}
            </div>
          )}

          {/* Lake Temple Offering Details */}
          {'altar' in metadata && metadata.altar != null && (
            <div className="space-y-3">
              {/* Altar */}
              <div className="flex items-center gap-2 text-sm">
                <Sun size={16} className="text-sand-400 flex-shrink-0" />
                <span className="text-slate-400">Altar:</span>
                <span className="text-white font-medium">{String(metadata.altar)}</span>
              </div>

              {/* Required Items */}
              {'required_items' in metadata && Array.isArray(metadata.required_items) && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Package size={16} className="text-ocean-400" />
                    Required Items ({(metadata.required_items as Array<{ name: string; quantity: number; quality?: string; note?: string }>).length})
                  </h3>
                  <div className="space-y-1.5 bg-deepsea-900/50 p-3 rounded-lg border border-ocean-800/30">
                    {(metadata.required_items as Array<{ name: string; quantity: number; quality?: string; note?: string }>).map((reqItem, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-ocean-200">
                          {reqItem.name}
                          {reqItem.quality && (
                            <span className={`ml-1 text-xs ${
                              reqItem.quality === "bronze" ? "text-orange-400" :
                              reqItem.quality === "silver" ? "text-slate-300" :
                              reqItem.quality === "gold" ? "text-yellow-400" :
                              reqItem.quality === "osmium" ? "text-purple-400" :
                              "text-slate-400"
                            }`}>
                              ({reqItem.quality})
                            </span>
                          )}
                          {reqItem.note && (
                            <span className="ml-1 text-ocean-500 text-xs italic">({reqItem.note})</span>
                          )}
                        </span>
                        <span className="text-sand-300 font-medium">x{reqItem.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reward */}
              {'reward' in metadata && metadata.reward != null && (
                <div className="flex items-center gap-2 text-sm bg-palm-900/30 border border-palm-600/30 rounded-lg p-3">
                  <Gift size={16} className="text-palm-400 flex-shrink-0" />
                  <span className="text-palm-300">Reward:</span>
                  <span className="text-white font-medium">{String(metadata.reward)}</span>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {item.notes && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-white">Your Notes</h3>
              <p className="text-ocean-300/70 italic text-sm bg-deepsea-900/50 p-3 rounded-lg border border-ocean-800/30">
                "{item.notes}"
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ItemCard({ item, onToggle, showDetails = true }: ItemCardProps) {
  const [justCompleted, setJustCompleted] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Parse metadata for display
  let itemMetadata: Record<string, unknown> = {};
  if (item.metadata) {
    if (typeof item.metadata === 'string') {
      try {
        itemMetadata = JSON.parse(item.metadata);
      } catch {
        itemMetadata = {};
      }
    } else {
      itemMetadata = item.metadata as Record<string, unknown>;
    }
  }

  const isOffering = 'altar' in itemMetadata;
  const requiredItems = itemMetadata.required_items as Array<{ name: string; quantity: number }> | undefined;
  const reward = itemMetadata.reward as string | undefined;

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

  const handleInfoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowModal(true);
  };

  return (
    <>
      <div
        className={`
          card cursor-pointer select-none p-4 sm:p-6
          transform-gpu
          hover:scale-[1.02] hover:-translate-y-1
          ${item.completed 
            ? "completed-card" 
            : ""
          }
          ${justCompleted ? "animate-card-complete" : ""}
        `}
        onClick={handleClick}
      >
        <div className="flex items-start gap-3 sm:gap-4">
          {/* Checkbox */}
          <div
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
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.name}
              className="w-9 h-9 sm:w-10 sm:h-10 object-contain flex-shrink-0 rounded bg-deepsea-900/50"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-deepsea-900/50 rounded flex items-center justify-center flex-shrink-0 border border-ocean-800/30">
              <ImageIcon size={18} className="text-ocean-500" />
            </div>
          )}

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
                    {/* Seasons */}
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

                    {/* Locations */}
                    {item.locations && item.locations.length > 0 && (
                      <div className="flex items-start gap-1.5 sm:gap-2 text-xs sm:text-sm text-ocean-300/80">
                        <MapPin size={12} className="flex-shrink-0 mt-0.5 text-coral-400 sm:hidden" />
                        <MapPin size={14} className="flex-shrink-0 mt-0.5 text-coral-400 hidden sm:block" />
                        <span className="line-clamp-2">{item.locations.join(", ")}</span>
                      </div>
                    )}

                    {/* Time */}
                    <div className="flex items-start gap-1.5 sm:gap-2 text-xs sm:text-sm text-ocean-300/80">
                      <Clock size={12} className="flex-shrink-0 mt-0.5 text-sand-400 sm:hidden" />
                      <Clock size={14} className="flex-shrink-0 mt-0.5 text-sand-400 hidden sm:block" />
                      {item.time_of_day && item.time_of_day.length > 0 ? (
                        <span>{item.time_of_day.join(", ")}</span>
                      ) : (
                        <span className="italic text-ocean-400/60">Any Time</span>
                      )}
                    </div>

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
              className="p-1.5 text-slate-400 hover:text-ocean-300 hover:bg-ocean-800/50 rounded-lg transition-colors"
              title="More info"
            >
              <Info size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      <ItemModal 
        item={item} 
        isOpen={showModal} 
        onClose={() => setShowModal(false)}
        onToggle={onToggle}
      />
    </>
  );
}
