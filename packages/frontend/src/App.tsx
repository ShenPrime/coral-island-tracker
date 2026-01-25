import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Dashboard } from "@/pages/Dashboard";
import { SaveSlots } from "@/pages/SaveSlots";
import { TrackCategory } from "@/pages/TrackCategory";
import { LakeTempleOverview } from "@/pages/LakeTempleOverview";
import { AltarDetail } from "@/pages/AltarDetail";
import { useStore } from "@/store/useStore";
import { getCategories, getSaveSlots } from "@/lib/api";

function App() {
  const { setCategories, currentSaveId, setCurrentSaveId } = useStore();

  useEffect(() => {
    // Load categories on mount
    async function loadInitialData() {
      try {
        const [categories, saves] = await Promise.all([getCategories(), getSaveSlots()]);

        setCategories(categories);

        // Auto-select first save if none selected
        if (!currentSaveId && saves.length > 0) {
          setCurrentSaveId(saves[0]!.id);
        }
      } catch (error) {
        console.error("Failed to load initial data:", error);
      }
    }

    loadInitialData();
  }, [setCategories, currentSaveId, setCurrentSaveId]);

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
