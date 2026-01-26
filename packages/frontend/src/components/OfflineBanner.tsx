import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

/**
 * Banner that appears at the top of the screen when the user is offline.
 * Warns that changes won't be saved until they reconnect.
 * 
 * Fixed position to overlay content, z-40 (lower than version banner's z-50).
 */
export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-40 bg-amber-600 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2"
    >
      <WifiOff size={16} aria-hidden="true" />
      <span>You're offline - changes won't be saved</span>
    </div>
  );
}
