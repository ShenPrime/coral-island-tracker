import { Link } from "react-router-dom";
import { ProgressBar } from "./ProgressBar";
import { Sprout, Fish, Sparkles, Crown, ChevronRight, CheckCircle2 } from "lucide-react";
import type { AltarSummary } from "@coral-tracker/shared";

const altarIcons: Record<string, React.ReactNode> = {
  "crop-altar": <Sprout size={28} />,
  "catch-altar": <Fish size={28} />,
  "advanced-altar": <Sparkles size={28} />,
  "rare-altar": <Crown size={28} />,
};

const altarColors: Record<string, { bg: string; border: string; icon: string }> = {
  "crop-altar": {
    bg: "from-palm-600/20 to-palm-800/20",
    border: "border-palm-500/30",
    icon: "text-palm-400",
  },
  "catch-altar": {
    bg: "from-ocean-600/20 to-ocean-800/20",
    border: "border-ocean-500/30",
    icon: "text-ocean-400",
  },
  "advanced-altar": {
    bg: "from-purple-600/20 to-purple-800/20",
    border: "border-purple-500/30",
    icon: "text-purple-400",
  },
  "rare-altar": {
    bg: "from-sand-600/20 to-sand-800/20",
    border: "border-sand-500/30",
    icon: "text-sand-400",
  },
};

interface AltarCardProps {
  altar: AltarSummary;
  isKeyboardFocused?: boolean;
}

export function AltarCard({ altar, isKeyboardFocused = false }: AltarCardProps) {
  const colors = altarColors[altar.slug] || altarColors["crop-altar"];
  const icon = altarIcons[altar.slug] || <Sprout size={28} />;
  const isComplete = altar.completed_offerings === altar.total_offerings;

  return (
    <Link
      to={`/temple/${altar.slug}`}
      className={`
        card p-6 hover:shadow-xl transition-all duration-200
        hover:scale-[1.02] hover:-translate-y-1
        bg-gradient-to-br ${colors.bg}
        border ${colors.border}
        ${isComplete ? "ring-2 ring-palm-500/50" : ""}
        ${isKeyboardFocused ? "keyboard-focused" : ""}
      `}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center bg-deepsea-900/50 ${colors.icon}`}>
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
