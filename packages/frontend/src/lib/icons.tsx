import {
  Fish,
  Bug,
  Rabbit,
  Carrot,
  Scroll,
  Gem,
  Leaf,
  UtensilsCrossed,
  Users,
  Sprout,
  Sparkles,
  Crown,
  Landmark,
} from "lucide-react";

export const CATEGORY_ICON_COMPONENTS = {
  fish: Fish,
  insects: Bug,
  critters: Rabbit,
  crops: Carrot,
  artifacts: Scroll,
  gems: Gem,
  forageables: Leaf,
  cooking: UtensilsCrossed,
  npcs: Users,
} as const;

export const ALTAR_ICON_COMPONENTS = {
  "crop-altar": Sprout,
  "catch-altar": Fish,
  "advanced-altar": Sparkles,
  "rare-altar": Crown,
} as const;

export const TEMPLE_ICON_COMPONENT = Landmark;

export const ALTAR_COLORS = {
  "crop-altar": { text: "text-palm-400", border: "border-palm-500/30" },
  "catch-altar": { text: "text-ocean-400", border: "border-ocean-500/30" },
  "advanced-altar": { text: "text-purple-400", border: "border-purple-500/30" },
  "rare-altar": { text: "text-sand-400", border: "border-sand-500/30" },
} as const;
