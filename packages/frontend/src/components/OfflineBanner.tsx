import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

/**
 * Banner that appears at the top of the screen when the user is offline.
 * Warns that changes won't be saved until they reconnect.
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
      className="bg-amber-600 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2"
    >
      <WifiOff size={16} aria-hidden="true" />
      <span>You're offline - changes won't be saved</span>
    </div>
  );
}
