/**
 * Reusable loading spinner component.
 * Supports different sizes and can be used inline or as a full-page loader.
 */

type SpinnerSize = "sm" | "md" | "lg";

interface LoadingSpinnerProps {
  size?: SpinnerSize;
  className?: string;
}

const sizeClasses: Record<SpinnerSize, string> = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

export function LoadingSpinner({ size = "lg", className = "" }: LoadingSpinnerProps) {
  return (
    <div
      className={`animate-spin rounded-full border-b-2 border-ocean-500 ${sizeClasses[size]} ${className}`}
    />
  );
}

interface PageLoaderProps {
  message?: string;
}

/**
 * Full-page centered loading spinner.
 * Use this when loading page content.
 */
export function PageLoader({ message }: PageLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <LoadingSpinner size="lg" />
      {message && <p className="text-slate-400 text-sm">{message}</p>}
    </div>
  );
}
