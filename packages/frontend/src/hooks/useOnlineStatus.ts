import { useState, useEffect } from "react";

/**
 * Hook that tracks online/offline status.
 * Returns true if online, false if offline.
 * 
 * Listens to browser 'online' and 'offline' events for real-time updates.
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(() => 
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
