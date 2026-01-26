import { QueryClient } from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

// Cache duration: 7 days
const CACHE_TIME = 1000 * 60 * 60 * 24 * 7;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,           // Data never becomes stale automatically
      gcTime: CACHE_TIME,            // Must be >= persister maxAge
      refetchOnWindowFocus: false,   // Don't refetch when tab regains focus
      refetchOnReconnect: false,     // Don't refetch when network reconnects
      refetchOnMount: false,         // Don't refetch when component mounts if data exists
      retry: 1,                      // Only retry once on failure
    },
  },
});

// Create localStorage persister for offline-like behavior
export const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: "coral-tracker-cache",
});

// Build ID for cache busting on redeploy (injected by Vite at build time)
export const BUILD_ID = import.meta.env.VITE_BUILD_ID || "dev";

// Max age for persisted cache (same as gcTime)
export const PERSIST_MAX_AGE = CACHE_TIME;
