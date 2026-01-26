/**
 * Centralized style constants for consistent UI across components
 */

import type { Rarity, Season } from "@coral-tracker/shared";

/**
 * Rarity badge colors for displaying rarity labels
 */
export const rarityColors: Record<Rarity, string> = {
  common: "bg-slate-600/50 text-slate-300 border border-slate-500/30",
  uncommon: "bg-palm-600/30 text-palm-300 border border-palm-500/30",
  rare: "bg-ocean-600/30 text-ocean-300 border border-ocean-500/30",
  super_rare: "bg-indigo-600/30 text-indigo-300 border border-indigo-500/30",
  epic: "bg-purple-600/30 text-purple-300 border border-purple-500/30",
  legendary: "bg-gradient-to-r from-sand-500/40 to-coral-500/40 text-sand-200 border border-sand-400/50",
};

/**
 * Rarity-based card border and glow styles for item cards
 */
export const rarityCardStyles: Record<Rarity, { border: string; glow: string; glowCompleted: string }> = {
  common: {
    border: "border-l-4 border-l-slate-500",
    glow: "shadow-[0_0_15px_-3px_rgba(100,116,139,0.3)]",
    glowCompleted: "shadow-[0_0_10px_-3px_rgba(100,116,139,0.15)]",
  },
  uncommon: {
    border: "border-l-4 border-l-emerald-500",
    glow: "shadow-[0_0_15px_-3px_rgba(16,185,129,0.35)]",
    glowCompleted: "shadow-[0_0_10px_-3px_rgba(16,185,129,0.2)]",
  },
  rare: {
    border: "border-l-4 border-l-ocean-400",
    glow: "shadow-[0_0_15px_-3px_rgba(0,201,196,0.4)]",
    glowCompleted: "shadow-[0_0_10px_-3px_rgba(0,201,196,0.2)]",
  },
  super_rare: {
    border: "border-l-4 border-l-indigo-400",
    glow: "shadow-[0_0_15px_-3px_rgba(129,140,248,0.4)]",
    glowCompleted: "shadow-[0_0_10px_-3px_rgba(129,140,248,0.2)]",
  },
  epic: {
    border: "border-l-4 border-l-purple-400",
    glow: "shadow-[0_0_18px_-3px_rgba(192,132,252,0.45)]",
    glowCompleted: "shadow-[0_0_12px_-3px_rgba(192,132,252,0.25)]",
  },
  legendary: {
    border: "border-l-4 border-l-amber-400",
    glow: "shadow-[0_0_20px_-3px_rgba(251,191,36,0.5)]",
    glowCompleted: "shadow-[0_0_12px_-3px_rgba(251,191,36,0.25)]",
  },
};

/**
 * Season badge colors
 */
export const seasonColors: Record<Season, string> = {
  spring: "bg-pink-500/30 text-pink-300 border border-pink-400/30",
  summer: "bg-sand-500/30 text-sand-300 border border-sand-400/30",
  fall: "bg-orange-500/30 text-orange-300 border border-orange-400/30",
  winter: "bg-cyan-500/30 text-cyan-300 border border-cyan-400/30",
};

/**
 * Quality badge colors for item quality levels (bronze, silver, gold, osmium)
 */
export const qualityColors: Record<string, string> = {
  bronze: "text-orange-400 bg-orange-500/20 border-orange-500/30",
  silver: "text-slate-300 bg-slate-500/20 border-slate-500/30",
  gold: "text-yellow-400 bg-yellow-500/20 border-yellow-500/30",
  osmium: "text-purple-400 bg-purple-500/20 border-purple-500/30",
};

/**
 * Quality text colors for price tables
 */
export const qualityTextColors: Record<string, string> = {
  base: "text-slate-400",
  bronze: "text-orange-400",
  silver: "text-slate-300",
  gold: "text-yellow-400",
  osmium: "text-purple-400",
};

/**
 * Style for "Any" badges (any season, any time, etc.)
 */
export const anyBadgeStyle = "bg-ocean-800/50 text-ocean-300 italic border border-ocean-600/30";

/**
 * Relationship status badge colors for NPCs
 */
export const relationshipColors: Record<string, string> = {
  default: "bg-slate-600/50 text-slate-300 border border-slate-500/30",
  dating: "bg-pink-600/30 text-pink-300 border border-pink-500/30",
  married: "bg-coral-600/30 text-coral-300 border border-coral-500/30",
};
