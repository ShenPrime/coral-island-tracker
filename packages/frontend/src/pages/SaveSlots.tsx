import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import { ProgressBar } from "@/components/ProgressBar";
import { getSaveSlots, createSaveSlot, deleteSaveSlot } from "@/lib/api";
import { Plus, Trash2, Check, Save } from "lucide-react";
import type { SaveSlot } from "@coral-tracker/shared";

interface SaveSlotWithStats extends SaveSlot {
  stats: {
    total_items: number;
    completed_items: number;
    completion_percentage: number;
  };
}

export function SaveSlots() {
  const { currentSaveId, setCurrentSaveId } = useStore();
  const [saves, setSaves] = useState<SaveSlotWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSaveName, setNewSaveName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const loadSaves = async () => {
    try {
      const data = await getSaveSlots();
      setSaves(data as SaveSlotWithStats[]);
    } catch (error) {
      console.error("Failed to load saves:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSaves();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSaveName.trim()) return;

    setIsCreating(true);
    try {
      const newSave = await createSaveSlot({ name: newSaveName.trim() });
      await loadSaves();
      setNewSaveName("");
      // Auto-select the new save if no save is currently selected
      if (!currentSaveId) {
        setCurrentSaveId(newSave.id);
      }
    } catch (error) {
      console.error("Failed to create save:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this save slot? All progress will be lost.")) {
      return;
    }

    try {
      await deleteSaveSlot(id);
      if (currentSaveId === id) {
        setCurrentSaveId(null);
      }
      await loadSaves();
    } catch (error) {
      console.error("Failed to delete save:", error);
    }
  };

  const handleSelect = (id: number) => {
    setCurrentSaveId(id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ocean-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Save Slots</h1>
      <p className="text-slate-500 dark:text-slate-400 mb-8">
        Manage different playthroughs and track progress separately
      </p>

      {/* Create new save */}
      <div className="card mb-8">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
          Create New Save Slot
        </h2>
        <form onSubmit={handleCreate} className="flex gap-4">
          <input
            type="text"
            placeholder="Enter save name (e.g., 'Main Farm', 'Speed Run')"
            value={newSaveName}
            onChange={(e) => setNewSaveName(e.target.value)}
            className="input flex-1"
            disabled={isCreating}
          />
          <button type="submit" className="btn btn-primary flex items-center gap-2" disabled={isCreating}>
            <Plus size={20} />
            Create
          </button>
        </form>
      </div>

      {/* Save slots list */}
      <div className="space-y-4">
        {saves.length === 0 ? (
          <div className="card text-center py-12">
            <Save size={48} className="mx-auto text-slate-400 mb-4" />
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
              No Save Slots Yet
            </h3>
            <p className="text-slate-500 dark:text-slate-400">
              Create your first save slot to start tracking your progress
            </p>
          </div>
        ) : (
          saves.map((save) => (
            <div
              key={save.id}
              className={`card cursor-pointer transition-all ${
                currentSaveId === save.id
                  ? "ring-2 ring-ocean-500 bg-ocean-50 dark:bg-ocean-900/20"
                  : "hover:shadow-lg"
              }`}
              onClick={() => handleSelect(save.id)}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  {currentSaveId === save.id && (
                    <div className="w-8 h-8 bg-ocean-500 rounded-full flex items-center justify-center">
                      <Check size={18} className="text-white" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-white">{save.name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Created {new Date(save.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(save.id);
                  }}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  title="Delete save slot"
                >
                  <Trash2 size={20} />
                </button>
              </div>

              <ProgressBar
                value={save.stats.completed_items}
                max={save.stats.total_items}
                label="Progress"
                color={save.stats.completion_percentage === 100 ? "green" : "ocean"}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
