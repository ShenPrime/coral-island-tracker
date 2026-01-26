import { useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { useVersionCheck } from "@/hooks/useVersionCheck";

/**
 * Banner that appears when a new version of the app has been deployed.
 * Prompts the user to refresh to get the latest features.
 * 
 * Fixed position to overlay content, z-50 to take priority over offline banner.
 * Ocean-colored to distinguish from the amber offline warning.
 * Dismissable - user can close and continue working before refreshing.
 */
export function NewVersionBanner() {
  const hasNewVersion = useVersionCheck();
  const [dismissed, setDismissed] = useState(false);

  if (!hasNewVersion || dismissed) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-50 bg-ocean-600 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2"
    >
      <RefreshCw size={16} aria-hidden="true" />
      <span>A new version is available</span>
      <button
        onClick={() => window.location.reload()}
        className="ml-2 px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-sm font-medium transition-colors"
      >
        Refresh
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="ml-2 p-1 hover:bg-white/20 rounded transition-colors"
        aria-label="Dismiss"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
