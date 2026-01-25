import { useState } from "react";
import { Check, ImageIcon, Info, MapPin, Clock, Sparkles } from "lucide-react";
import type { TempleItemWithProgress, Item, Season, Rarity } from "@coral-tracker/shared";
import { ItemModal } from "./ItemModal";

interface TempleItemCardProps {
  item: TempleItemWithProgress;
  onToggleOffered: (requirementId: number, offered: boolean) => void;
}

const qualityColors: Record<string, string> = {
  bronze: "text-orange-400 bg-orange-500/20 border-orange-500/30",
  silver: "text-slate-300 bg-slate-500/20 border-slate-500/30",
  gold: "text-yellow-400 bg-yellow-500/20 border-yellow-500/30",
  osmium: "text-purple-400 bg-purple-500/20 border-purple-500/30",
};

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
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={item.item_name}
              className="w-10 h-10 object-contain flex-shrink-0 rounded bg-deepsea-900/50"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-10 h-10 bg-deepsea-900/50 rounded flex items-center justify-center flex-shrink-0 border border-ocean-800/30">
              <ImageIcon size={18} className="text-ocean-500" />
            </div>
          )}

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
