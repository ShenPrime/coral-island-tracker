import { X, Coins, TrendingUp, Zap, Ruler, Waves, Sprout, RefreshCw, Leaf, Unlock, Tag, Check, Sparkles, Clock, Cloud, MapPin, Gift, Package, Sun, Cog } from "lucide-react";
import type { Item, Season } from "@coral-tracker/shared";
import { ItemImage, Modal, ModalBody, useModalContext } from "./ui";
import { rarityColors, seasonColors, anyBadgeStyle, qualityTextColors } from "../lib/styles";
import { ARIA_LABELS } from "../lib/aria-labels";

interface ItemModalProps {
  item: Item & { completed?: boolean; notes?: string | null };
  categorySlug?: string;
  isOpen: boolean;
  onClose: () => void;
  onToggle?: (itemId: number, completed: boolean) => void;
}

export function ItemModal({ item, categorySlug, isOpen, onClose, onToggle }: ItemModalProps) {
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
    <Modal isOpen={isOpen} onClose={onClose}>
      <ItemModalHeader item={item} />
      <ModalBody>
        {/* Description */}
        {item.description && (
          <div className="text-ocean-200/80 text-sm italic">
            "{item.description}"
          </div>
        )}

        {/* Completion toggle - only show if onToggle is provided */}
        {onToggle && (
          <button
            onClick={handleToggle}
            className={`w-full p-3 rounded-lg border flex items-center justify-center gap-2 font-medium transition-all ${
              item.completed
                ? "bg-palm-600/20 border-palm-500/50 text-palm-300 hover:bg-palm-600/30"
                : "bg-ocean-800/30 border-ocean-600/50 text-ocean-300 hover:bg-ocean-800/50"
            }`}
            aria-pressed={item.completed}
          >
            <Check size={18} className={item.completed ? "opacity-100" : "opacity-50"} />
            {item.completed ? "Completed" : "Mark as Completed"}
          </button>
        )}

        {/* Seasons - hide for gems and artifacts (not seasonal) */}
        {categorySlug !== 'gems' && categorySlug !== 'artifacts' && (
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
        )}

        {/* Time of Day - hide for crops, forageables, artisan products, gems, and artifacts */}
        {categorySlug !== 'crops' && categorySlug !== 'forageables' && categorySlug !== 'artisan-products' && categorySlug !== 'gems' && categorySlug !== 'artifacts' && (
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
        )}

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

        {/* Locations - hide for crops and artisan products */}
        {item.locations && item.locations.length > 0 && 
         categorySlug !== 'crops' && categorySlug !== 'artisan-products' && (
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
                  <div className={`text-xs font-medium capitalize ${qualityTextColors[quality]}`}>
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
                  <div className={`text-xs font-medium capitalize ${qualityTextColors[quality]}`}>
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

            {/* Equipment (for artisan products) */}
            {'equipment' in metadata && metadata.equipment != null && (
              <div className="flex items-center gap-2 text-sm">
                <Cog size={16} className="text-ocean-400 flex-shrink-0" />
                <span className="text-slate-400">Equipment:</span>
                <span className="text-white font-medium">{String(metadata.equipment)}</span>
              </div>
            )}

            {/* Input ingredient (for artisan products) */}
            {'input' in metadata && metadata.input != null && (
              <div className="flex items-center gap-2 text-sm">
                <Package size={16} className="text-coral-400 flex-shrink-0" />
                <span className="text-slate-400">Made from:</span>
                <span className="text-white font-medium">{String(metadata.input)}</span>
              </div>
            )}

            {/* Processing time (for artisan products) */}
            {'processing_time' in metadata && metadata.processing_time != null && (
              <div className="flex items-center gap-2 text-sm">
                <Clock size={16} className="text-sand-400 flex-shrink-0" />
                <span className="text-slate-400">Processing:</span>
                <span className="text-white font-medium">{String(metadata.processing_time)}</span>
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
                          <span className={`ml-1 text-xs ${qualityTextColors[reqItem.quality] || "text-slate-400"}`}>
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
      </ModalBody>
    </Modal>
  );
}

/** 
 * Custom header for ItemModal that uses the modal context for title ID 
 */
function ItemModalHeader({ item }: { item: Item }) {
  const { titleId, onClose } = useModalContext();

  return (
    <div 
      id={titleId}
      className="sticky top-0 bg-deepsea-800/95 backdrop-blur-sm border-b border-ocean-700/30 p-4 flex items-start gap-4 z-10"
    >
      {/* Item Image */}
      <ItemImage src={item.image_url} alt={item.name} size="xl" className="rounded-lg" />
      
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
        aria-label={ARIA_LABELS.CLOSE_DIALOG}
      >
        <X size={20} aria-hidden="true" />
      </button>
    </div>
  );
}
