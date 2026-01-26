import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { AltarCard } from "@/components/AltarCard";
import { ProgressBar } from "@/components/ProgressBar";
import { PageLoader, NoSaveSlotWarning } from "@/components/ui";
import { AlertCircle, Sun } from "lucide-react";
import { useTempleOverview } from "@/hooks/useQueries";
import { useGridNavigation } from "@/hooks/useGridNavigation";

export function LakeTempleOverview() {
  const { currentSaveId } = useStore();
  const navigate = useNavigate();

  // Query hook
  const { data: overview, isLoading, error } = useTempleOverview(currentSaveId);

  // Handle altar selection via keyboard
  const handleAltarSelect = useCallback((index: number) => {
    const altar = overview?.altars[index];
    if (altar) {
      navigate(`/temple/${altar.slug}`);
    }
  }, [overview?.altars, navigate]);

  // Grid navigation for altar cards
  const { focusedIndex, showFocusIndicator } = useGridNavigation({
    itemCount: overview?.altars.length ?? 0,
    columnCount: 2,
    categorySlug: "temple-overview",
    onSelect: handleAltarSelect,
    onDetails: handleAltarSelect,
    enabled: !!overview && overview.altars.length > 0,
  });

  const effectiveFocusedIndex = showFocusIndicator ? focusedIndex : -1;

  if (!currentSaveId) {
    return <NoSaveSlotWarning message="Please select a save slot first to track your temple offerings" />;
  }

  if (isLoading) {
    return <PageLoader />;
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card text-center py-12">
          <AlertCircle size={48} className="mx-auto text-coral-400 mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Error Loading Temple</h2>
          <p className="text-slate-400 mb-4">
            Failed to load temple data. Make sure you've run the temple migration.
          </p>
          <p className="text-sm text-slate-500">
            Try running: <code className="bg-deepsea-900 px-2 py-1 rounded">bun run db:migrate:temple-redesign</code>
          </p>
        </div>
      </div>
    );
  }

  if (!overview || overview.altars.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card text-center py-12">
          <Sun size={48} className="mx-auto text-slate-400 mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">No Temple Data</h2>
          <p className="text-slate-400 mb-4">
            Temple requirements haven't been set up yet.
          </p>
          <p className="text-sm text-slate-500">
            Run: <code className="bg-deepsea-900 px-2 py-1 rounded">bun run db:migrate:temple-redesign</code>
          </p>
        </div>
      </div>
    );
  }

  const isAllComplete = overview.completed_offerings === overview.total_offerings;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-sand-500/30 to-sand-700/30 rounded-xl flex items-center justify-center border border-sand-500/30">
            <Sun size={24} className="text-sand-400" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Lake Temple</h1>
            <p className="text-sm sm:text-base text-slate-400">
              Complete offerings to unlock rewards
            </p>
          </div>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="card mb-6 p-4 sm:p-6">
        <ProgressBar
          value={overview.offered_items}
          max={overview.total_items}
          label="Overall Temple Progress"
          size="lg"
          color={isAllComplete ? "green" : "ocean"}
        />
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-400">
          <span>
            <strong className="text-white">{overview.offered_items}</strong> / {overview.total_items} items offered
          </span>
          <span>
            <strong className="text-white">{overview.completed_offerings}</strong> / {overview.total_offerings} offerings complete
          </span>
        </div>
        {isAllComplete && (
          <p className="mt-4 text-palm-400 font-medium">
            Congratulations! You've completed all temple offerings!
          </p>
        )}
      </div>

      {/* Altars Grid */}
      <h2 className="text-lg font-semibold text-white mb-4">Altars</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {overview.altars.map((altar, index) => (
          <AltarCard 
            key={altar.slug} 
            altar={altar} 
            isKeyboardFocused={effectiveFocusedIndex === index}
          />
        ))}
      </div>

      {/* Info */}
      <div className="mt-8 p-4 bg-deepsea-900/50 rounded-lg border border-ocean-800/30">
        <h3 className="font-medium text-white mb-2">How Temple Offerings Work</h3>
        <ul className="text-sm text-slate-400 space-y-1">
          <li>- Each altar has 6 offerings to complete</li>
          <li>- Each offering requires specific items to be offered</li>
          <li>- Completing offerings unlocks rewards like machines and blueprints</li>
          <li>- Items marked as "offered" here will also show as offered in their category pages</li>
        </ul>
      </div>
    </div>
  );
}
