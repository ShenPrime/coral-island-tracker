import { RefreshCw } from "lucide-react";
import { useVersionCheck } from "@/hooks/useVersionCheck";

/**
 * Banner that appears when a new version of the app has been deployed.
 * Prompts the user to refresh to get the latest features.
 * 
 * Ocean-colored to distinguish from the amber offline warning.
 */
export function NewVersionBanner() {
  const hasNewVersion = useVersionCheck();

  if (!hasNewVersion) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className="bg-ocean-600 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2"
    >
      <RefreshCw size={16} aria-hidden="true" />
      <span>A new version is available</span>
      <button
        onClick={() => window.location.reload()}
        className="ml-2 px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-sm font-medium transition-colors"
      >
        Refresh
      </button>
    </div>
  );
}
