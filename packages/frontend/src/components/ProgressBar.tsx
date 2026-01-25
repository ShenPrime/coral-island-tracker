interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  showPercentage?: boolean;
  size?: "sm" | "md" | "lg";
  color?: "ocean" | "coral" | "sand" | "green";
}

const sizeClasses = {
  sm: "h-2",
  md: "h-3",
  lg: "h-4",
};

const colorClasses = {
  ocean: "bg-ocean-500",
  coral: "bg-coral-500",
  sand: "bg-sand-500",
  green: "bg-green-500",
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
        <div className="flex justify-between items-center mb-1">
          {label && <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>}
          {showPercentage && (
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {value}/{max} ({percentage}%)
            </span>
          )}
        </div>
      )}
      <div className={`w-full bg-slate-200 dark:bg-slate-700 rounded-full ${sizeClasses[size]}`}>
        <div
          className={`${colorClasses[color]} ${sizeClasses[size]} rounded-full transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
