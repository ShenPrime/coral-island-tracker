import { useState, memo } from "react";
import { 
  Info, 
  Plus, 
  Minus, 
  Heart, 
  Cake, 
  Home, 
  Crown,
  Users
} from "lucide-react";
import type { NPCMetadata, RelationshipStatus, Season } from "@coral-tracker/shared";
import { RELATIONSHIP_STATUS_LABELS, CHARACTER_TYPE_LABELS } from "@coral-tracker/shared";
import { CompactHeartDisplay } from "./HeartDisplay";
import { ItemImage } from "./ui";
import { seasonColors, relationshipColors } from "../lib/styles";
import { ARIA_LABELS } from "../lib/aria-labels";

// NPC data shape returned from API - exported for use in TrackCategory
export interface NPCData {
  id: number;
  name: string;
  slug: string;
  image_url: string | null;
  description: string | null;
  seasons: Season[];
  locations: string[];
  metadata: NPCMetadata;
  hearts: number;
  relationship_status: RelationshipStatus;
  notes: string | null;
  max_hearts: number;
  is_max_hearts: boolean;
}

interface NPCCardProps {
  npc: NPCData;
  onIncrement?: (npcId: number) => void;
  onDecrement?: (npcId: number) => void;
  onShowDetails?: () => void;
}

export const NPCCard = memo(function NPCCard({ npc, onIncrement, onDecrement, onShowDetails }: NPCCardProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const metadata = npc.metadata;
  const isMarriageCandidate = metadata?.is_marriage_candidate || false;
  const birthdaySeason = metadata?.birthday_season;
  const birthdayDay = metadata?.birthday_day;
  const residence = metadata?.residence || npc.locations?.[0];
  const characterType = metadata?.character_type || "other";

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (npc.hearts < npc.max_hearts && onIncrement) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 300);
      onIncrement(npc.id);
    }
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (npc.hearts > 0 && onDecrement) {
      onDecrement(npc.id);
    }
  };

  const handleInfoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShowDetails?.();
  };

  const handleCardClick = () => {
    onShowDetails?.();
  };

  const handleCardKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onShowDetails?.();
    }
  };

  const handleInfoKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      onShowDetails?.();
    }
  };

  // Card style based on relationship status
  const getCardStyle = () => {
    if (npc.is_max_hearts) {
      return "completed-card";
    }
    if (npc.relationship_status === "married") {
      return "border-l-4 border-l-coral-400 shadow-[0_0_15px_-3px_rgba(255,99,132,0.3)]";
    }
    if (npc.relationship_status === "dating") {
      return "border-l-4 border-l-pink-400 shadow-[0_0_15px_-3px_rgba(236,72,153,0.3)]";
    }
    if (isMarriageCandidate) {
      return "border-l-4 border-l-pink-500/50";
    }
    return "";
  };

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        className={`
          card cursor-pointer select-none p-4 sm:p-6 h-full
          transform-gpu
          hover:scale-[1.02] hover:-translate-y-1
          focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-400 focus-visible:ring-offset-2 focus-visible:ring-offset-deepsea-900
          ${getCardStyle()}
        `}
        onClick={handleCardClick}
        onKeyDown={handleCardKeyDown}
      >
        <div className="flex items-start gap-3 sm:gap-4">
          {/* NPC Portrait */}
          <ItemImage src={npc.image_url} alt={npc.name} size="lg" className="rounded-lg" />

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Name and badges */}
            <div className="flex items-start gap-2 mb-2 flex-wrap">
              <h3 className="font-semibold text-white text-sm sm:text-base">{npc.name}</h3>
              
              {/* Marriage candidate badge */}
              {isMarriageCandidate && (
                <span className="px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded-full bg-pink-500/20 text-pink-300 border border-pink-400/30 flex items-center gap-1">
                  <Heart size={10} className="fill-pink-400 text-pink-400" />
                  <span className="hidden sm:inline">Candidate</span>
                </span>
              )}
              
              {/* Relationship status (if not default) */}
              {npc.relationship_status !== "default" && (
                <span className={`px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded-full ${relationshipColors[npc.relationship_status]}`}>
                  {RELATIONSHIP_STATUS_LABELS[npc.relationship_status]}
                </span>
              )}
            </div>

            {/* Hearts display with +/- buttons */}
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={handleDecrement}
                disabled={npc.hearts === 0}
                className={`
                  p-1 rounded-md transition-colors
                  ${npc.hearts === 0 
                    ? "text-slate-600 cursor-not-allowed" 
                    : "text-slate-400 hover:text-coral-400 hover:bg-coral-500/10"
                  }
                `}
                aria-label={ARIA_LABELS.DECREASE_HEARTS}
              >
                <Minus size={16} aria-hidden="true" />
              </button>
              
              <div className={isAnimating ? "animate-heart-pop" : ""}>
                <CompactHeartDisplay hearts={npc.hearts} maxHearts={npc.max_hearts} />
              </div>
              
              <button
                onClick={handleIncrement}
                disabled={npc.hearts >= npc.max_hearts}
                className={`
                  p-1 rounded-md transition-colors
                  ${npc.hearts >= npc.max_hearts 
                    ? "text-slate-600 cursor-not-allowed" 
                    : "text-slate-400 hover:text-coral-400 hover:bg-coral-500/10"
                  }
                `}
                aria-label={ARIA_LABELS.INCREASE_HEARTS}
              >
                <Plus size={16} />
              </button>
            </div>

            {/* NPC info */}
            <div className="space-y-1.5">
              {/* Birthday */}
              {birthdaySeason && birthdayDay && (
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <Cake size={12} className="text-sand-400 flex-shrink-0 sm:hidden" />
                  <Cake size={14} className="text-sand-400 flex-shrink-0 hidden sm:block" />
                  <span className={`px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded-full ${seasonColors[birthdaySeason as Season]}`}>
                    {birthdaySeason.charAt(0).toUpperCase() + birthdaySeason.slice(1)} {birthdayDay}
                  </span>
                </div>
              )}

              {/* Residence */}
              {residence && (
                <div className="flex items-start gap-1.5 sm:gap-2 text-xs sm:text-sm text-ocean-300/80">
                  <Home size={12} className="flex-shrink-0 mt-0.5 text-ocean-400 sm:hidden" />
                  <Home size={14} className="flex-shrink-0 mt-0.5 text-ocean-400 hidden sm:block" />
                  <span className="line-clamp-1">{residence}</span>
                </div>
              )}

              {/* Character type */}
              <div className="flex items-start gap-1.5 sm:gap-2 text-xs sm:text-sm text-ocean-300/80">
                <Users size={12} className="flex-shrink-0 mt-0.5 text-slate-400 sm:hidden" />
                <Users size={14} className="flex-shrink-0 mt-0.5 text-slate-400 hidden sm:block" />
                <span>{CHARACTER_TYPE_LABELS[characterType] || characterType}</span>
              </div>
            </div>

            {/* Notes */}
            {npc.notes && (
              <p className="mt-2 text-xs sm:text-sm text-ocean-300/70 italic">"{npc.notes}"</p>
            )}

            {/* Gift preview - show only loved items */}
            {metadata?.gift_preferences?.loved && metadata.gift_preferences.loved.length > 0 && (
              <div className="mt-2 pt-2 border-t border-ocean-800/30">
                <div className="flex items-start gap-1.5 text-xs text-ocean-300/80">
                  <Heart size={12} className="fill-coral-500 text-coral-500 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-1">
                    {metadata.gift_preferences.loved.slice(0, 3).join(", ")}
                    {metadata.gift_preferences.loved.length > 3 && "..."}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right side: Info button and max hearts indicator */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {/* Max hearts achieved indicator */}
            {npc.is_max_hearts && (
              <span className="flex items-center gap-1 text-xs text-coral-400">
                <Crown size={14} className="fill-coral-400" />
                <span className="hidden sm:inline">Max</span>
              </span>
            )}
            
            {/* Info button */}
            <button
              onClick={handleInfoClick}
              onKeyDown={handleInfoKeyDown}
              className="p-1.5 text-slate-400 hover:text-ocean-300 hover:bg-ocean-800/50 rounded-lg transition-colors"
              aria-label={ARIA_LABELS.viewDetailsFor(npc.name)}
            >
              <Info size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
});
