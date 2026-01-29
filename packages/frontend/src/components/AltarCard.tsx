import { Link } from "react-router-dom";
import { ProgressBar } from "./ProgressBar";
import { ChevronRight, CheckCircle2 } from "lucide-react";
import type { AltarSummary } from "@coral-tracker/shared";
import { ALTAR_ICON_COMPONENTS, ALTAR_COLORS } from "@/lib/icons";

const ALTAR_GRADIENTS: Record<string, string> = {
  "crop-altar": "from-palm-600/20 to-palm-800/20",
  "catch-altar": "from-ocean-600/20 to-ocean-800/20",
  "advanced-altar": "from-purple-600/20 to-purple-800/20",
  "rare-altar": "from-sand-600/20 to-sand-800/20",
};

interface AltarCardProps {
  altar: AltarSummary;
  isKeyboardFocused?: boolean;
}

export function AltarCard({ altar, isKeyboardFocused = false }: AltarCardProps) {
  const altarSlug = altar.slug as keyof typeof ALTAR_COLORS;
  const colors = ALTAR_COLORS[altarSlug] || ALTAR_COLORS["crop-altar"];
  const IconComponent = ALTAR_ICON_COMPONENTS[altarSlug as keyof typeof ALTAR_ICON_COMPONENTS];
  const icon = IconComponent ? <IconComponent size={28} /> : null;
  const isComplete = altar.completed_offerings === altar.total_offerings;

  return (
    <Link
      to={`/temple/${altar.slug}`}
      className={`
        card p-6 hover:shadow-xl transition-all duration-200
        hover:scale-[1.02] hover:-translate-y-1
        bg-gradient-to-br ${ALTAR_GRADIENTS[altar.slug] || ALTAR_GRADIENTS["crop-altar"]}
        border ${colors.border}
        ${isComplete ? "ring-2 ring-palm-500/50" : ""}
        ${isKeyboardFocused ? "keyboard-focused" : ""}
      `}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center bg-deepsea-900/50 ${colors.text}`}>
            {icon}
          </div>
          <div>
            <h3 className="font-bold text-lg text-white">{altar.name}</h3>
            <p className="text-sm text-slate-400">
              {altar.completed_offerings}/{altar.total_offerings} offerings complete
            </p>
          </div>
        </div>
        
        {isComplete ? (
          <CheckCircle2 className="text-palm-400" size={24} />
        ) : (
          <ChevronRight className="text-slate-500" size={24} />
        )}
      </div>

      <ProgressBar
        value={altar.offered_items}
        max={altar.total_items}
        label="Items Offered"
        size="sm"
        color={isComplete ? "green" : "ocean"}
      />

      <div className="mt-3 text-xs text-slate-400">
        {altar.offered_items} / {altar.total_items} items offered
      </div>
    </Link>
  );
}
