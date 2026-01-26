import { ARIA_LABELS } from "../lib/aria-labels";

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  showPercentage?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  color?: "ocean" | "coral" | "sand" | "green";
}

const sizeClasses = {
  xs: "h-1.5",
  sm: "h-2",
  md: "h-3",
  lg: "h-4",
};

const colorClasses = {
  ocean: "bg-gradient-to-r from-ocean-500 to-ocean-400",
  coral: "bg-gradient-to-r from-coral-500 to-coral-400",
  sand: "bg-gradient-to-r from-sand-500 to-sand-400",
  green: "bg-gradient-to-r from-palm-500 to-palm-400",
};

export function ProgressBar({
  value,
  max,
  label,
  showPercentage = true,
  size = "md",
  color = "ocean",
}: ProgressBarProps) {
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0;

  return (
    <div className="w-full">
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-1.5 sm:mb-2">
          {label && <span className="text-xs sm:text-sm font-medium text-white">{label}</span>}
          {showPercentage && (
            <span className="text-xs sm:text-sm text-ocean-300">
              {value}/{max} ({percentage}%)
            </span>
          )}
        </div>
      )}
<div 
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label || ARIA_LABELS.progressLabel(value, max)}
        className={`w-full bg-deepsea-900/80 rounded-full ${sizeClasses[size]} border border-ocean-800/30`}
      >
        <div
          aria-hidden="true"
          className={`${colorClasses[color]} ${sizeClasses[size]} rounded-full transition-all duration-500 shadow-lg`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
