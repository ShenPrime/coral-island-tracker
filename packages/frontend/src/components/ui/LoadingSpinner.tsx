/**
 * Reusable loading spinner component.
 * Supports different sizes and can be used inline or as a full-page loader.
 * Includes proper ARIA attributes for accessibility.
 */

type SpinnerSize = "sm" | "md" | "lg";

interface LoadingSpinnerProps {
  size?: SpinnerSize;
  className?: string;
  /** Accessible label for screen readers */
  label?: string;
}

const sizeClasses: Record<SpinnerSize, string> = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

export function LoadingSpinner({ size = "lg", className = "", label = "Loading" }: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`${sizeClasses[size]} ${className}`}
    >
      <div
        aria-hidden="true"
        className={`animate-spin rounded-full border-b-2 border-ocean-500 ${sizeClasses[size]}`}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}

interface PageLoaderProps {
  message?: string;
}

/**
 * Full-page centered loading spinner.
 * Use this when loading page content.
 */
export function PageLoader({ message = "Loading..." }: PageLoaderProps) {
  return (
    <div 
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center h-64 gap-4"
    >
      <div
        aria-hidden="true"
        className="animate-spin rounded-full border-b-2 border-ocean-500 h-12 w-12"
      />
      <p className="text-slate-400 text-sm">{message}</p>
      <span className="sr-only">{message}</span>
    </div>
  );
}
