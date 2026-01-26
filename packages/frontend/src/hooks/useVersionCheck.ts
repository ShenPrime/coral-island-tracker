import { useState, useEffect } from "react";

/**
 * Hook that listens for version mismatch events.
 * Returns true if a new version of the app has been deployed.
 * 
 * The version-mismatch event is dispatched by the API client when
 * it detects that the server's BUILD_ID differs from the client's.
 */
export function useVersionCheck(): boolean {
  const [hasNewVersion, setHasNewVersion] = useState(false);

  useEffect(() => {
    const handler = () => setHasNewVersion(true);
    window.addEventListener("version-mismatch", handler);
    return () => window.removeEventListener("version-mismatch", handler);
  }, []);

  return hasNewVersion;
}
