import { useState, useEffect } from "react";
import { 
  X, 
  ExternalLink, 
  Heart, 
  Cake, 
  Home, 
  Users,
  Gift,
  ThumbsUp,
  ThumbsDown,
  Skull
} from "lucide-react";
import type { NPCMetadata, RelationshipStatus, Season, CharacterType } from "@coral-tracker/shared";
import { 
  RELATIONSHIP_STATUS_LABELS, 
  RELATIONSHIP_STATUSES,
  CHARACTER_TYPE_LABELS 
} from "@coral-tracker/shared";
import { HeartDisplay } from "./HeartDisplay";
import { ItemImage, Modal, ModalBody, useModalContext } from "./ui";
import { seasonColors } from "../lib/styles";

// NPC data shape returned from API
interface NPCData {
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

interface NPCModalProps {
  npc: NPCData;
  isOpen: boolean;
  onClose: () => void;
  onUpdateProgress?: (npcId: number, hearts: number, status: RelationshipStatus) => void;
}

export function NPCModal({ npc, isOpen, onClose, onUpdateProgress }: NPCModalProps) {
  const [localHearts, setLocalHearts] = useState(npc.hearts);
  const [localStatus, setLocalStatus] = useState<RelationshipStatus>(npc.relationship_status);

  // Sync local state when npc changes
  useEffect(() => {
    setLocalHearts(npc.hearts);
    setLocalStatus(npc.relationship_status);
  }, [npc.hearts, npc.relationship_status]);

  const metadata = npc.metadata;
  const isMarriageCandidate = metadata?.is_marriage_candidate || false;
  const birthdaySeason = metadata?.birthday_season;
  const birthdayDay = metadata?.birthday_day;
  const residence = metadata?.residence || npc.locations?.[0];
  const characterType: CharacterType = metadata?.character_type || "other";
  const gender = metadata?.gender;
  const wikiUrl = metadata?.wiki_url;
  const giftPreferences = metadata?.gift_preferences;

  // Calculate max hearts based on local status
  const getLocalMaxHearts = () => {
    if (isMarriageCandidate && localStatus === "married") {
      return 14;
    }
    return 10;
  };

  const localMaxHearts = getLocalMaxHearts();

  // Handle hearts change
  const handleHeartsChange = (newHearts: number) => {
    // Clamp to valid range
    const clamped = Math.max(0, Math.min(newHearts, localMaxHearts));
    setLocalHearts(clamped);
    
    // Auto-adjust relationship status based on hearts
    if (isMarriageCandidate) {
      if (clamped < 8 && localStatus !== "default") {
        setLocalStatus("default");
        onUpdateProgress?.(npc.id, clamped, "default");
      } else {
        onUpdateProgress?.(npc.id, clamped, localStatus);
      }
    } else {
      onUpdateProgress?.(npc.id, clamped, "default");
    }
  };

  // Handle relationship status change
  const handleStatusChange = (newStatus: RelationshipStatus) => {
    // Validate status change
    if (newStatus === "dating" && localHearts < 8) {
      return; // Need 8+ hearts to date
    }
    if (newStatus === "married" && localHearts < 10) {
      return; // Need 10+ hearts to marry
    }
    
    setLocalStatus(newStatus);
    onUpdateProgress?.(npc.id, localHearts, newStatus);
  };

  // Gift preference section
  const renderGiftPreferences = () => {
    if (!giftPreferences) return null;
    
    const { loved, liked, disliked, hated } = giftPreferences;
    const hasAnyPreferences = 
      (loved && loved.length > 0) || 
      (liked && liked.length > 0) || 
      (disliked && disliked.length > 0) || 
      (hated && hated.length > 0);
    
    if (!hasAnyPreferences) return null;

    return (
      <div className="border-t border-ocean-800/50 pt-4">
        <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Gift size={16} className="text-sand-400" />
          Gift Preferences
        </h4>
        
        <div className="space-y-3">
          {/* Loved */}
          {loved && loved.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Heart size={14} className="fill-coral-500 text-coral-500" />
                <span className="text-xs font-medium text-coral-400">Loved</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {loved.map((item, i) => (
                  <span 
                    key={i}
                    className="px-2 py-0.5 text-xs bg-coral-500/20 text-coral-300 rounded-full border border-coral-500/30"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Liked */}
          {liked && liked.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <ThumbsUp size={14} className="text-palm-400" />
                <span className="text-xs font-medium text-palm-400">Liked</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {liked.map((item, i) => (
                  <span 
                    key={i}
                    className="px-2 py-0.5 text-xs bg-palm-500/20 text-palm-300 rounded-full border border-palm-500/30"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Disliked */}
          {disliked && disliked.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <ThumbsDown size={14} className="text-orange-400" />
                <span className="text-xs font-medium text-orange-400">Disliked</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {disliked.map((item, i) => (
                  <span 
                    key={i}
                    className="px-2 py-0.5 text-xs bg-orange-500/20 text-orange-300 rounded-full border border-orange-500/30"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Hated */}
          {hated && hated.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Skull size={14} className="text-red-400" />
                <span className="text-xs font-medium text-red-400">Hated</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {hated.map((item, i) => (
                  <span 
                    key={i}
                    className="px-2 py-0.5 text-xs bg-red-500/20 text-red-300 rounded-full border border-red-500/30"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <NPCModalHeader 
        npc={npc} 
        characterType={characterType} 
        gender={gender} 
        isMarriageCandidate={isMarriageCandidate} 
      />
      <ModalBody>
        {/* Description */}
        {npc.description && (
          <p className="text-sm text-ocean-200 italic">"{npc.description}"</p>
        )}

        {/* Hearts Progress */}
        <div className="bg-deepsea-900/50 rounded-lg p-4 border border-ocean-800/30">
          <h4 className="text-sm font-semibold text-white mb-3">Friendship Progress</h4>
          
          <HeartDisplay
            hearts={localHearts}
            maxHearts={localMaxHearts}
            size="lg"
            interactive={true}
            onHeartChange={handleHeartsChange}
            showCount={true}
          />

          {/* Relationship status (only for marriage candidates) */}
          {isMarriageCandidate && (
            <div className="mt-4 pt-4 border-t border-ocean-800/30">
              <h5 className="text-xs font-semibold text-slate-400 mb-2">Relationship Status</h5>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Relationship status">
                {RELATIONSHIP_STATUSES.map((status) => {
                  const isDisabled = 
                    (status === "dating" && localHearts < 8) ||
                    (status === "married" && localHearts < 10);
                  
                  return (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      disabled={isDisabled}
                      aria-pressed={localStatus === status}
                      className={`
                        px-3 py-1.5 text-sm rounded-lg transition-all
                        ${localStatus === status
                          ? status === "married"
                            ? "bg-coral-500 text-white"
                            : status === "dating"
                              ? "bg-pink-500 text-white"
                              : "bg-ocean-500 text-white"
                          : isDisabled
                            ? "bg-deepsea-700 text-slate-500 cursor-not-allowed"
                            : "bg-deepsea-700 text-slate-300 hover:bg-deepsea-600"
                        }
                      `}
                    >
                      {RELATIONSHIP_STATUS_LABELS[status]}
                      {isDisabled && (
                        <span className="ml-1 text-xs opacity-70">
                          ({status === "dating" ? "8+" : "10+"}&#10084;)
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              
              {localStatus === "married" && (
                <p className="mt-2 text-xs text-coral-300">
                  Marriage unlocks 4 additional hearts (11-14)!
                </p>
              )}
            </div>
          )}
        </div>

        {/* NPC Details */}
        <div className="grid grid-cols-2 gap-3">
          {/* Birthday */}
          {birthdaySeason && birthdayDay && (
            <div className="bg-deepsea-900/50 rounded-lg p-3 border border-ocean-800/30">
              <div className="flex items-center gap-2 mb-1">
                <Cake size={14} className="text-sand-400" />
                <span className="text-xs font-medium text-slate-400">Birthday</span>
              </div>
              <span className={`inline-block px-2 py-0.5 text-sm font-medium rounded-full ${seasonColors[birthdaySeason as Season]}`}>
                {birthdaySeason.charAt(0).toUpperCase() + birthdaySeason.slice(1)} {birthdayDay}
              </span>
            </div>
          )}

          {/* Residence */}
          {residence && (
            <div className="bg-deepsea-900/50 rounded-lg p-3 border border-ocean-800/30">
              <div className="flex items-center gap-2 mb-1">
                <Home size={14} className="text-ocean-400" />
                <span className="text-xs font-medium text-slate-400">Residence</span>
              </div>
              <span className="text-sm text-ocean-200">{residence}</span>
            </div>
          )}

          {/* Character Type */}
          <div className="bg-deepsea-900/50 rounded-lg p-3 border border-ocean-800/30">
            <div className="flex items-center gap-2 mb-1">
              <Users size={14} className="text-slate-400" />
              <span className="text-xs font-medium text-slate-400">Type</span>
            </div>
            <span className="text-sm text-ocean-200">
              {CHARACTER_TYPE_LABELS[characterType] || characterType}
            </span>
          </div>
        </div>

        {/* Gift Preferences */}
        {renderGiftPreferences()}

        {/* Wiki Link */}
        {wikiUrl && (
          <a
            href={wikiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-ocean-800/50 hover:bg-ocean-700/50 text-ocean-300 hover:text-ocean-200 rounded-lg transition-colors text-sm"
          >
            <ExternalLink size={16} />
            View on Wiki
          </a>
        )}
      </ModalBody>
    </Modal>
  );
}

/**
 * Custom header for NPCModal that uses the modal context for title ID
 */
function NPCModalHeader({ 
  npc, 
  characterType, 
  gender, 
  isMarriageCandidate 
}: { 
  npc: NPCData; 
  characterType: CharacterType;
  gender?: string | null;
  isMarriageCandidate: boolean;
}) {
  const { titleId, onClose } = useModalContext();

  return (
    <div 
      id={titleId}
      className="sticky top-0 bg-deepsea-800/95 backdrop-blur-sm border-b border-ocean-800/50 p-4 flex items-start justify-between z-10"
    >
      <div className="flex items-center gap-4">
        {/* Portrait */}
        <ItemImage src={npc.image_url} alt={npc.name} size="xl" className="rounded-lg" />
        
        <div>
          <h2 className="text-xl font-bold text-white">{npc.name}</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-sm text-ocean-300">
              {CHARACTER_TYPE_LABELS[characterType] || characterType}
            </span>
            {gender && gender !== "unknown" && (
              <span className="text-xs text-slate-400">
                ({gender})
              </span>
            )}
            {isMarriageCandidate && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-pink-500/20 text-pink-300 border border-pink-400/30 flex items-center gap-1">
                <Heart size={10} className="fill-pink-400 text-pink-400" />
                Candidate
              </span>
            )}
          </div>
        </div>
      </div>
      
      <button
        onClick={onClose}
        className="p-2 text-slate-400 hover:text-white hover:bg-ocean-800/50 rounded-lg transition-colors"
        aria-label="Close dialog"
      >
        <X size={20} />
      </button>
    </div>
  );
}
