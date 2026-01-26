/**
 * Reusable item image component with placeholder fallback.
 * Used for items, NPCs, and any other entity with an optional image.
 */

import { ImageIcon } from "lucide-react";

type ImageSize = "sm" | "md" | "lg" | "xl";

interface ItemImageProps {
  src: string | null | undefined;
  alt: string;
  size?: ImageSize;
  className?: string;
}

const sizeClasses: Record<ImageSize, { container: string; icon: number }> = {
  sm: { container: "w-9 h-9 sm:w-10 sm:h-10", icon: 18 },
  md: { container: "w-10 h-10", icon: 18 },
  lg: { container: "w-12 h-12 sm:w-14 sm:h-14", icon: 24 },
  xl: { container: "w-16 h-16", icon: 28 },
};

export function ItemImage({ src, alt, size = "md", className = "" }: ItemImageProps) {
  const { container, icon } = sizeClasses[size];

  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={`${container} object-contain flex-shrink-0 rounded bg-deepsea-900/50 ${className}`}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div
      className={`${container} bg-deepsea-900/50 rounded flex items-center justify-center flex-shrink-0 border border-ocean-800/30 ${className}`}
    >
      <ImageIcon size={icon} className="text-ocean-500" />
    </div>
  );
}
