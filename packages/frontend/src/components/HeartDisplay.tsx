import { useState, useCallback, useMemo } from "react";
import { Heart } from "lucide-react";
import { ARIA_LABELS } from "../lib/aria-labels";

interface HeartDisplayProps {
  hearts: number;
  maxHearts: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onHeartChange?: (hearts: number) => void;
  showCount?: boolean;
}

const sizeClasses = {
  sm: "w-3.5 h-3.5",
  md: "w-5 h-5",
  lg: "w-6 h-6",
};

const gapClasses = {
  sm: "gap-0.5",
  md: "gap-1",
  lg: "gap-1.5",
};

function HeartButton({
  index,
  isFilled,
  interactive,
  size,
  maxHearts,
  onHeartClick,
  hoveredHeart,
  animatingHeart,
  onMouseEnter,
  onMouseLeave,
}: {
  index: number;
  isFilled: boolean;
  interactive: boolean;
  size: "sm" | "md" | "lg";
  maxHearts: number;
  onHeartClick: (i: number) => void;
  hoveredHeart: number | null;
  animatingHeart: number | null;
  onMouseEnter: (i: number | null) => void;
  onMouseLeave: (i: null) => void;
}) {
  const isHovered = hoveredHeart !== null && index <= hoveredHeart;
  const isAnimating = animatingHeart === index;

  return (
    <button
      type="button"
      disabled={!interactive}
      onClick={() => onHeartClick(index)}
      onMouseEnter={() => interactive && onMouseEnter(index)}
      onMouseLeave={() => onMouseLeave(null)}
      className={`
        ${interactive ? "cursor-pointer" : "cursor-default"}
        transition-transform duration-150
        ${isAnimating ? "animate-heart-pop" : ""}
        ${interactive && isHovered && !isFilled ? "scale-110" : ""}
        focus:outline-none focus-visible:ring-2 focus-visible:ring-coral-400 focus-visible:ring-offset-1 focus-visible:ring-offset-deepsea-800 rounded-sm
      `}
      aria-label={ARIA_LABELS.heartProgress(index + 1, maxHearts)}
    >
      <Heart
        aria-hidden="true"
        className={`
          ${sizeClasses[size]}
          transition-all duration-200
          ${
            isFilled || (interactive && isHovered)
              ? "fill-coral-500 text-coral-500"
              : "fill-transparent text-slate-500"
          }
          ${isFilled ? "drop-shadow-[0_0_4px_rgba(255,99,132,0.5)]" : ""}
        `}
      />
    </button>
  );
}

export function HeartDisplay({
  hearts,
  maxHearts,
  size = "md",
  interactive = false,
  onHeartChange,
  showCount = false,
}: HeartDisplayProps) {
  const [hoveredHeart, setHoveredHeart] = useState<number | null>(null);
  const [animatingHeart, setAnimatingHeart] = useState<number | null>(null);

  const handleHeartClick = useCallback(
    (index: number) => {
      if (!interactive || !onHeartChange) return;

      // If clicking the currently filled heart, set to that value
      // If clicking an empty heart, fill up to that heart
      const clickedHeart = index + 1;
      const newHearts = clickedHeart === hearts ? clickedHeart - 1 : clickedHeart;

      // Trigger animation
      setAnimatingHeart(index);
      setTimeout(() => setAnimatingHeart(null), 300);

      onHeartChange(newHearts);
    },
    [hearts, interactive, onHeartChange]
  );

  const heartElements = useMemo(() => {
    const elements = [];

    // For display purposes, show hearts in rows of 5 if more than 10
    const heartsPerRow = maxHearts > 10 ? 5 : maxHearts;

    for (let i = 0; i < maxHearts; i++) {
      const isFilled = i < hearts;

      // Add row break after 5 hearts if we have more than 10
      if (i > 0 && i % heartsPerRow === 0 && maxHearts > 10) {
        elements.push(<div key={`break-${i}`} className="w-full h-0.5" />);
      }

      elements.push(
        <HeartButton
          key={i}
          index={i}
          isFilled={isFilled}
          interactive={interactive}
          size={size}
          maxHearts={maxHearts}
          onHeartClick={handleHeartClick}
          hoveredHeart={hoveredHeart}
          animatingHeart={animatingHeart}
          onMouseEnter={setHoveredHeart}
          onMouseLeave={setHoveredHeart}
        />
      );
    }

    return elements;
  }, [hearts, maxHearts, interactive, size, handleHeartClick, hoveredHeart, animatingHeart]);

  return (
    <div className="flex flex-col gap-1">
      <div className={`flex flex-wrap items-center ${gapClasses[size]}`}>
        {heartElements}
      </div>
      {showCount && (
        <span className="text-xs text-slate-400 ml-0.5">
          {hearts}/{maxHearts} hearts
        </span>
      )}
    </div>
  );
}

// Compact heart display for cards (just shows filled hearts as text with icon)
interface CompactHeartDisplayProps {
  hearts: number;
  maxHearts: number;
}

export function CompactHeartDisplay({ hearts, maxHearts }: CompactHeartDisplayProps) {
  const percentage = maxHearts > 0 ? (hearts / maxHearts) * 100 : 0;
  
  return (
    <div className="flex items-center gap-2">
      {/* Heart icon with fill indicating progress */}
      <div className="relative">
        <Heart className="w-5 h-5 text-slate-600" />
        <div 
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(${100 - percentage}% 0 0 0)` }}
        >
          <Heart className="w-5 h-5 fill-coral-500 text-coral-500 drop-shadow-[0_0_4px_rgba(255,99,132,0.5)]" />
        </div>
      </div>
      
      {/* Heart count */}
      <span className={`text-sm font-medium ${hearts >= maxHearts ? "text-coral-400" : "text-slate-300"}`}>
        {hearts}/{maxHearts}
      </span>
    </div>
  );
}
