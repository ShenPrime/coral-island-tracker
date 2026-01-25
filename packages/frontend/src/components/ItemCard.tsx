import { Check, MapPin, Clock, Cloud, Sparkles, ImageIcon } from "lucide-react";
import type { Item, Season, Rarity } from "@coral-tracker/shared";

interface ItemCardProps {
  item: Item & { completed?: boolean; notes?: string | null };
  onToggle?: (itemId: number, completed: boolean) => void;
  showDetails?: boolean;
}

const rarityColors: Record<Rarity, string> = {
  common: "bg-slate-200 text-slate-700",
  uncommon: "bg-green-200 text-green-700",
  rare: "bg-blue-200 text-blue-700",
  super_rare: "bg-indigo-200 text-indigo-700",
  epic: "bg-purple-200 text-purple-700",
  legendary: "bg-amber-200 text-amber-700",
};

const seasonColors: Record<Season, string> = {
  spring: "bg-pink-100 text-pink-700",
  summer: "bg-yellow-100 text-yellow-700",
  fall: "bg-orange-100 text-orange-700",
  winter: "bg-cyan-100 text-cyan-700",
};

// "Any" badge style for items available any season/time
const anyBadgeStyle = "bg-slate-100 text-slate-500 italic";

export function ItemCard({ item, onToggle, showDetails = true }: ItemCardProps) {
  const handleClick = () => {
    if (onToggle) {
      onToggle(item.id, !item.completed);
    }
  };

  return (
    <div
      className={`
        card cursor-pointer transition-all duration-200 hover:shadow-xl
        ${item.completed ? "bg-green-50 dark:bg-green-900/20 border-2 border-green-500" : ""}
      `}
      onClick={handleClick}
    >
      <div className="flex items-start gap-4">
        {/* Checkbox */}
        <div
          className={`
            w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0
            ${
              item.completed
                ? "bg-green-500 border-green-500 text-white"
                : "border-slate-300 dark:border-slate-600"
            }
          `}
        >
          {item.completed && <Check size={16} />}
        </div>

        {/* Item Image */}
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-10 h-10 object-contain flex-shrink-0 rounded"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded flex items-center justify-center flex-shrink-0">
            <ImageIcon size={20} className="text-slate-400" />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-slate-800 dark:text-white truncate">{item.name}</h3>
            {item.rarity && (
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded-full ${rarityColors[item.rarity] || rarityColors.common}`}
              >
                {item.rarity.replace("_", " ")}
              </span>
            )}
          </div>

          {showDetails && (
            <div className="space-y-2 mt-2">
              {/* Seasons */}
              <div className="flex items-center gap-2 flex-wrap">
                <Sparkles size={14} className="text-slate-400" />
                {item.seasons && item.seasons.length > 0 ? (
                  item.seasons.map((season) => (
                    <span
                      key={season}
                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${seasonColors[season as Season] || anyBadgeStyle}`}
                    >
                      {season}
                    </span>
                  ))
                ) : (
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${anyBadgeStyle}`}>
                    Any Season
                  </span>
                )}
              </div>

              {/* Locations */}
              {item.locations && item.locations.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <MapPin size={14} />
                  <span className="truncate">{item.locations.join(", ")}</span>
                </div>
              )}

              {/* Time */}
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <Clock size={14} />
                {item.time_of_day && item.time_of_day.length > 0 ? (
                  <span>{item.time_of_day.join(", ")}</span>
                ) : (
                  <span className="italic text-slate-400">Any Time</span>
                )}
              </div>

              {/* Weather */}
              {item.weather && item.weather.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <Cloud size={14} />
                  <span>{item.weather.join(", ")}</span>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {item.notes && (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 italic">"{item.notes}"</p>
          )}
        </div>

        {/* Price */}
        {item.base_price && (
          <div className="text-right flex-shrink-0">
            <span className="text-sm font-medium text-sand-600">{item.base_price}g</span>
          </div>
        )}
      </div>
    </div>
  );
}
