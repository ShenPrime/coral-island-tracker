import { useState } from "react";
import { Check, Info, MapPin, Clock, Sparkles } from "lucide-react";
import type { TempleItemWithProgress, Item, Season, Rarity } from "@coral-tracker/shared";
import { ItemModal } from "./ItemModal";
import { ItemImage } from "./ui";
import { rarityColors, seasonColors, qualityColors } from "../lib/styles";

interface TempleItemCardProps {
  item: TempleItemWithProgress;
  onToggleOffered: (requirementId: number, offered: boolean) => void;
}

export function TempleItemCard({ item, onToggleOffered }: TempleItemCardProps) {
  const [justOffered, setJustOffered] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const linkedItem = item.linked_item;
  const hasLinkedItem = !!linkedItem;
  const imageUrl = linkedItem?.image_url || null;

  const handleClick = () => {
    const willOffer = !item.offered;
    if (willOffer) {
      setJustOffered(true);
      setTimeout(() => setJustOffered(false), 600);
    }
    onToggleOffered(item.id, willOffer);
  };

  const handleInfoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasLinkedItem) {
      setShowModal(true);
    }
  };

  // Create a full Item object for the modal if we have linked data
  const modalItem: Item | null = linkedItem ? {
    ...linkedItem,
    id: linkedItem.id,
    category_id: 0,
    name: linkedItem.name,
    slug: linkedItem.slug,
    image_url: linkedItem.image_url,
    rarity: linkedItem.rarity as Rarity | null,
    seasons: linkedItem.seasons as Season[],
    time_of_day: linkedItem.time_of_day,
    weather: linkedItem.weather,
    locations: linkedItem.locations,
    base_price: linkedItem.base_price,
    description: linkedItem.description,
    metadata: linkedItem.metadata,
  } : null;

  return (
    <>
      <div
        className={`
          card cursor-pointer select-none p-4
          transform-gpu
          hover:scale-[1.02] hover:-translate-y-0.5
          ${item.offered ? "completed-card" : ""}
          ${justOffered ? "animate-card-complete" : ""}
        `}
        onClick={handleClick}
      >
        <div className="flex items-start gap-3">
          {/* Offered Checkbox */}
          <div
            className={`
              w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0
              transform-gpu
              ${item.offered
                ? "checkbox-completed"
                : "border-ocean-600 hover:border-ocean-400 hover:scale-110"
              }
              ${justOffered ? "animate-check-pop" : ""}
            `}
          >
            <Check
              size={12}
              className={`
                transform-gpu transition-all duration-200
                ${item.offered ? "opacity-100 scale-100" : "opacity-0 scale-0"}
              `}
            />
          </div>

{/* Item Image */}
          <ItemImage src={imageUrl} alt={item.item_name} size="md" />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 mb-1 flex-wrap">
              <h3 className="font-semibold text-white text-sm">{item.item_name}</h3>
              
              {/* Quantity badge */}
              {item.quantity > 1 && (
                <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-ocean-600/30 text-ocean-300 border border-ocean-500/30">
                  x{item.quantity}
                </span>
              )}
              
              {/* Quality badge */}
              {item.quality && (
                <span className={`px-1.5 py-0.5 text-xs font-medium rounded border ${qualityColors[item.quality] || ""}`}>
                  {item.quality}
                </span>
              )}
              
              {/* Rarity badge */}
              {linkedItem?.rarity && (
                <span className={`px-1.5 py-0.5 text-xs font-medium rounded-full ${rarityColors[linkedItem.rarity as Rarity] || ""}`}>
                  {linkedItem.rarity.replace("_", " ")}
                </span>
              )}
            </div>

            {/* Note (for "Any" items) */}
            {item.note && (
              <p className="text-xs text-ocean-400 italic mb-1.5">{item.note}</p>
            )}

            {/* Item details if linked */}
            {hasLinkedItem && (
              <div className="space-y-1">
                {/* Seasons */}
                {linkedItem.seasons && linkedItem.seasons.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Sparkles size={12} className="text-slate-400 flex-shrink-0" />
                    {linkedItem.seasons.map((season) => (
                      <span
                        key={season}
                        className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full ${seasonColors[season as Season] || ""}`}
                      >
                        {season}
                      </span>
                    ))}
                  </div>
                )}

                {/* Locations */}
                {linkedItem.locations && linkedItem.locations.length > 0 && (
                  <div className="flex items-start gap-1.5 text-xs text-ocean-300/80">
                    <MapPin size={12} className="flex-shrink-0 mt-0.5 text-coral-400" />
                    <span className="line-clamp-1">{linkedItem.locations.join(", ")}</span>
                  </div>
                )}

                {/* Time */}
                {linkedItem.time_of_day && linkedItem.time_of_day.length > 0 && (
                  <div className="flex items-start gap-1.5 text-xs text-ocean-300/80">
                    <Clock size={12} className="flex-shrink-0 mt-0.5 text-sand-400" />
                    <span>{linkedItem.time_of_day.join(", ")}</span>
                  </div>
                )}
              </div>
            )}

            {/* No linked item warning */}
            {!hasLinkedItem && !item.note && (
              <p className="text-xs text-slate-500 italic">Item not in database</p>
            )}
          </div>

          {/* Info button (only if linked item exists) */}
          {hasLinkedItem && (
            <button
              onClick={handleInfoClick}
              className="p-1.5 text-slate-400 hover:text-ocean-300 hover:bg-ocean-800/50 rounded-lg transition-colors flex-shrink-0"
              title="More info"
            >
              <Info size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Modal for linked item details */}
      {modalItem && (
        <ItemModal
          item={modalItem}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
