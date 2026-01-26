import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Dashboard } from "@/pages/Dashboard";
import { SaveSlots } from "@/pages/SaveSlots";
import { TrackCategory } from "@/pages/TrackCategory";
import { LakeTempleOverview } from "@/pages/LakeTempleOverview";
import { AltarDetail } from "@/pages/AltarDetail";
import { useStore } from "@/store/useStore";
import { initSession } from "@/lib/session";
import { useCategories, useSaveSlots } from "@/hooks/useQueries";

function App() {
  const { setCategories, currentSaveId, setCurrentSaveId } = useStore();
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Initialize session first
  useEffect(() => {
    async function setupSession() {
      try {
        await initSession();
        setSessionReady(true);
      } catch (error) {
        console.error("Failed to initialize session:", error);
        setSessionError("Failed to connect to server. Please refresh the page.");
      }
    }

    setupSession();
  }, []);

  // Use React Query hooks for data fetching (only when session is ready)
  const { data: categories } = useCategories();
  const { data: saves } = useSaveSlots();

  // Sync categories to store for sidebar access
  useEffect(() => {
    if (categories) {
      setCategories(categories);
    }
  }, [categories, setCategories]);

  // Auto-select first save if none selected
  useEffect(() => {
    if (!currentSaveId && saves && saves.length > 0) {
      setCurrentSaveId(saves[0]!.id);
    }
  }, [saves, currentSaveId, setCurrentSaveId]);

  // Show loading state while session initializes
  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          {sessionError ? (
            <div className="text-destructive">
              <p className="text-lg font-medium">{sessionError}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground">Loading...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/saves" element={<SaveSlots />} />
        <Route path="/temple" element={<LakeTempleOverview />} />
        <Route path="/temple/:altarSlug" element={<AltarDetail />} />
        <Route path="/track/:slug" element={<TrackCategory />} />
      </Routes>
    </Layout>
  );
}

export default App;
