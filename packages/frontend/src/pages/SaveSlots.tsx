import { useState } from "react";
import { useStore } from "@/store/useStore";
import { ProgressBar } from "@/components/ProgressBar";
import { PageLoader } from "@/components/ui";
import { Plus, Trash2, Check, Save } from "lucide-react";
import type { SaveSlot } from "@coral-tracker/shared";
import { useSaveSlots } from "@/hooks/useQueries";
import { useCreateSaveSlot, useDeleteSaveSlot } from "@/hooks/useMutations";
import { ARIA_LABELS } from "@/lib/aria-labels";

interface SaveSlotWithStats extends SaveSlot {
  stats: {
    total_items: number;
    completed_items: number;
    completion_percentage: number;
  };
}

export function SaveSlots() {
  const { currentSaveId, setCurrentSaveId } = useStore();
  const [newSaveName, setNewSaveName] = useState("");

  // Query hooks
  const { data: saves = [], isLoading } = useSaveSlots();

  // Mutation hooks
  const createSaveMutation = useCreateSaveSlot();
  const deleteSaveMutation = useDeleteSaveSlot();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSaveName.trim()) return;

    createSaveMutation.mutate(
      { name: newSaveName.trim() },
      {
        onSuccess: (newSave) => {
          setNewSaveName("");
          // Auto-select the new save if no save is currently selected
          if (!currentSaveId) {
            setCurrentSaveId(newSave.id);
          }
        },
      }
    );
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this save slot? All progress will be lost.")) {
      return;
    }

    deleteSaveMutation.mutate(id, {
      onSuccess: () => {
        if (currentSaveId === id) {
          setCurrentSaveId(null);
        }
      },
    });
  };

  const handleSelect = (id: number) => {
    setCurrentSaveId(id);
  };

  if (isLoading) {
    return <PageLoader />;
  }

  // Cast saves to include stats (API returns this)
  const savesWithStats = saves as SaveSlotWithStats[];

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">Save Slots</h1>
      <p className="text-sm sm:text-base text-slate-400 mb-6 sm:mb-8">
        Manage different playthroughs and track progress separately
      </p>

      {/* Create new save */}
      <div className="card mb-6 sm:mb-8 p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">
          Create New Save Slot
        </h2>
        <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <label htmlFor="new-save-name" className="sr-only">Save slot name</label>
          <input
            id="new-save-name"
            type="text"
            placeholder="Enter save name (e.g., 'Main Farm')"
            value={newSaveName}
            onChange={(e) => setNewSaveName(e.target.value)}
            className="input flex-1 text-sm sm:text-base"
            disabled={createSaveMutation.isPending}
            aria-label="Save slot name"
          />
          <button 
            type="submit" 
            className="btn btn-primary flex items-center justify-center gap-2 text-sm sm:text-base" 
            disabled={createSaveMutation.isPending}
          >
            <Plus size={18} />
            {createSaveMutation.isPending ? "Creating..." : "Create"}
          </button>
        </form>
      </div>

      {/* Save slots list */}
      <div className="space-y-3 sm:space-y-4">
        {savesWithStats.length === 0 ? (
          <div className="card text-center py-8 sm:py-12">
            <Save size={40} className="mx-auto text-slate-400 mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-semibold text-white mb-2">
              No Save Slots Yet
            </h3>
            <p className="text-sm sm:text-base text-slate-400 px-4">
              Create your first save slot to start tracking your progress
            </p>
          </div>
        ) : (
          savesWithStats.map((save) => (
            <div
              key={save.id}
              className={`card cursor-pointer transition-all p-4 sm:p-6 ${
                currentSaveId === save.id
                  ? "ring-2 ring-ocean-400 bg-ocean-900/20 border-ocean-500/50"
                  : "hover:shadow-lg hover:border-ocean-600/50"
              }`}
              onClick={() => handleSelect(save.id)}
            >
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  {currentSaveId === save.id && (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-ocean-400 to-ocean-600 rounded-full flex items-center justify-center shadow-lg shadow-ocean-500/30 flex-shrink-0">
                      <Check size={16} className="text-white" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="font-semibold text-white text-sm sm:text-base truncate">{save.name}</h3>
                    <p className="text-xs sm:text-sm text-slate-400">
                      Created {new Date(save.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(save.id);
                  }}
                  className="p-2 text-slate-400 hover:text-red-400 transition-colors flex-shrink-0"
                  aria-label={ARIA_LABELS.deleteSaveSlot(save.name)}
                  disabled={deleteSaveMutation.isPending}
                >
                  <Trash2 size={18} aria-hidden="true" />
                </button>
              </div>

              <ProgressBar
                value={save.stats?.completed_items || 0}
                max={save.stats?.total_items || 0}
                label="Progress"
                color={save.stats?.completion_percentage === 100 ? "green" : "ocean"}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
