import { useState, useEffect } from "react";
import { RefreshCw, X, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { useVersionCheck } from "@/hooks/useVersionCheck";
import { getLatestChangelog } from "@/lib/changelog";
import { PENDING_WHATS_NEW_KEY } from "@/lib/constants";

/**
 * Banner that appears in two scenarios:
 * 
 * 1. Before refresh: When a new version is deployed, shows "A new version is available"
 *    with a Refresh button. User can dismiss and continue working.
 * 
 * 2. After refresh: When user has just upgraded, shows "What's new in vX.X.X"
 *    with an expandable changelog. User can see new features and dismiss.
 * 
 * Fixed position to overlay content, z-[60] to appear above header (z-50) and offline banner (z-40).
 * Ocean-colored to distinguish from the amber offline warning.
 */
export function NewVersionBanner() {
  const hasNewVersion = useVersionCheck();
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);

  const changelog = getLatestChangelog();

  // Check if we have a pending "What's New" notification from before refresh
  useEffect(() => {
    const pendingWhatsNew = localStorage.getItem(PENDING_WHATS_NEW_KEY);
    if (pendingWhatsNew) {
      setShowWhatsNew(true);
      // Note: Flag is removed when user dismisses, not here
      // This handles React Strict Mode double-mounting
    }
  }, [changelog]);

  const handleRefresh = () => {
    localStorage.removeItem(PENDING_WHATS_NEW_KEY);
    window.location.reload();
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowWhatsNew(false);
    localStorage.removeItem(PENDING_WHATS_NEW_KEY);
  };

  // Show "What's new" banner after refresh (with changelog details)
  if (showWhatsNew && !dismissed && changelog) {
    return (
      <div
        role="alert"
        aria-live="polite"
        className="fixed top-0 left-0 right-0 z-[60] bg-ocean-600 text-white shadow-lg"
      >
        {/* Main banner row */}
        <div className="px-4 py-2 flex items-center justify-center gap-2 flex-wrap">
          <Sparkles size={16} aria-hidden="true" className="text-palm-300" />
          <span className="font-medium">New version {changelog.version} loaded!</span>
          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-2 px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-sm font-medium transition-colors flex items-center gap-1"
          >
            What's new
            {expanded ? (
              <ChevronUp size={14} aria-hidden="true" />
            ) : (
              <ChevronDown size={14} aria-hidden="true" />
            )}
          </button>
          <button
            onClick={handleRefresh}
            className="ml-2 px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-sm font-medium transition-colors"
          >
            Refresh
          </button>
        </div>

        {/* Expandable changelog section */}
        {expanded && (
          <div className="px-4 py-3 bg-ocean-700 border-t border-ocean-500">
            <ul className="text-sm space-y-1.5 max-w-2xl mx-auto">
              {changelog.changes.map((change, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-palm-300 mt-0.5">•</span>
                  <span>{change}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // Show "What's new" banner after refresh (fallback when changelog parsing fails)
  if (showWhatsNew && !dismissed && !changelog) {
    return (
      <div
        role="alert"
        aria-live="polite"
        className="fixed top-0 left-0 right-0 z-[60] bg-ocean-600 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2"
      >
        <Sparkles size={16} aria-hidden="true" className="text-palm-300" />
        <span>New version loaded!</span>
        <button
          onClick={handleRefresh}
          className="ml-2 px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-sm font-medium transition-colors"
        >
          Refresh
        </button>
      </div>
    );
  }

  // Show "New version available" banner before refresh (existing behavior)
  if (hasNewVersion && !dismissed) {
    return (
      <div
        role="alert"
        aria-live="polite"
        className="fixed top-0 left-0 right-0 z-[60] bg-ocean-600 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2"
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
          onClick={handleDismiss}
          className="ml-2 p-1 hover:bg-white/20 rounded transition-colors"
          aria-label="Dismiss"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    );
  }

  return null;
}
