import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { getAltarDetail, updateTempleProgress } from "@/lib/api";
import { OfferingSection } from "@/components/OfferingSection";
import { ProgressBar } from "@/components/ProgressBar";
import { PageLoader, NoSaveSlotWarning } from "@/components/ui";
import { AlertCircle, ArrowLeft, Sprout, Fish, Sparkles, Crown } from "lucide-react";
import { useOfferingNavigation } from "@/hooks/useOfferingNavigation";
import type { AltarWithOfferings } from "@coral-tracker/shared";

const altarIcons: Record<string, React.ReactNode> = {
  "crop-altar": <Sprout size={24} />,
  "catch-altar": <Fish size={24} />,
  "advanced-altar": <Sparkles size={24} />,
  "rare-altar": <Crown size={24} />,
};

const altarColors: Record<string, string> = {
  "crop-altar": "from-palm-500/30 to-palm-700/30 border-palm-500/30 text-palm-400",
  "catch-altar": "from-ocean-500/30 to-ocean-700/30 border-ocean-500/30 text-ocean-400",
  "advanced-altar": "from-purple-500/30 to-purple-700/30 border-purple-500/30 text-purple-400",
  "rare-altar": "from-sand-500/30 to-sand-700/30 border-sand-500/30 text-sand-400",
};

export function AltarDetail() {
  const { altarSlug } = useParams<{ altarSlug: string }>();
  const { currentSaveId } = useStore();
  const [altar, setAltar] = useState<AltarWithOfferings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAltar = useCallback(async () => {
    if (!currentSaveId || !altarSlug) return;

    try {
      const data = await getAltarDetail(currentSaveId, altarSlug);
      setAltar(data);
      setError(null);
    } catch (err) {
      console.error("Failed to load altar:", err);
      setError("Failed to load altar data");
    } finally {
      setLoading(false);
    }
  }, [currentSaveId, altarSlug]);

  useEffect(() => {
    loadAltar();
  }, [loadAltar]);

  const handleToggleOffered = async (requirementId: number, offered: boolean) => {
    if (!currentSaveId || !altar) return;

    // Optimistic update
    setAltar((prev) => {
      if (!prev) return prev;
      
      const updatedOfferings = prev.offerings.map((offering) => {
        const updatedItems = offering.items.map((item) =>
          item.id === requirementId
            ? { ...item, offered, offered_at: offered ? new Date() : null }
            : item
        );
        
        const offeredCount = updatedItems.filter((i) => i.offered).length;
        
        return {
          ...offering,
          items: updatedItems,
          offered_items: offeredCount,
          is_complete: offeredCount === offering.total_items,
        };
      });

      return {
        ...prev,
        offerings: updatedOfferings,
        offered_items: updatedOfferings.reduce((sum, o) => sum + o.offered_items, 0),
        completed_offerings: updatedOfferings.filter((o) => o.is_complete).length,
      };
    });

    try {
      await updateTempleProgress(currentSaveId, requirementId, offered);
    } catch (err) {
      console.error("Failed to update progress:", err);
      // Revert on error
      loadAltar();
    }
  };

  // Keyboard navigation for offerings and items
  const {
    level,
    focusedOfferingIndex,
    focusedItemIndex,
    expandedOfferings,
    expandOffering,
    collapseOffering,
    showFocusIndicator,
  } = useOfferingNavigation({
    offerings: altar?.offerings ?? [],
    categorySlug: `altar-${altarSlug}`,
    onToggleOffered: (reqId, offered) => handleToggleOffered(reqId, offered),
    enabled: !!altar,
  });

if (!currentSaveId) {
    return <NoSaveSlotWarning message="Please select a save slot first" />;
  }

  if (loading) {
    return <PageLoader />;
  }

  if (error || !altar) {
    return (
      <div className="max-w-4xl mx-auto">
        <Link
          to="/temple"
          className="inline-flex items-center gap-2 text-ocean-400 hover:text-ocean-300 mb-6"
        >
          <ArrowLeft size={20} />
          Back to Temple
        </Link>
        <div className="card text-center py-12">
          <AlertCircle size={48} className="mx-auto text-coral-400 mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Error Loading Altar</h2>
          <p className="text-slate-400">{error || "Altar not found"}</p>
        </div>
      </div>
    );
  }

  const colorClass = altarColors[altarSlug || ""] || altarColors["crop-altar"];
  const icon = altarIcons[altarSlug || ""] || <Sprout size={24} />;
  const isComplete = altar.completed_offerings === altar.total_offerings;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back link */}
      <Link
        to="/temple"
        className="inline-flex items-center gap-2 text-ocean-400 hover:text-ocean-300 mb-6"
      >
        <ArrowLeft size={20} />
        Back to Temple
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className={`w-14 h-14 bg-gradient-to-br ${colorClass} rounded-xl flex items-center justify-center border`}>
            {icon}
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">{altar.name}</h1>
            <p className="text-sm sm:text-base text-slate-400">
              {altar.completed_offerings}/{altar.total_offerings} offerings complete
            </p>
          </div>
        </div>
      </div>

      {/* Progress Card */}
      <div className="card mb-6 p-4 sm:p-6">
        <ProgressBar
          value={altar.offered_items}
          max={altar.total_items}
          label={`${altar.name} Progress`}
          size="lg"
          color={isComplete ? "green" : "ocean"}
        />
        {isComplete && (
          <p className="mt-4 text-palm-400 font-medium">
            All offerings complete! You've unlocked all rewards from this altar.
          </p>
        )}
      </div>

      {/* Offerings */}
      <h2 className="text-lg font-semibold text-white mb-4">Offerings</h2>
      <div className="space-y-4">
        {altar.offerings.map((offering, index) => (
          <OfferingSection
            key={offering.slug}
            offering={offering}
            onToggleOffered={handleToggleOffered}
            defaultExpanded={false}
            isHeaderFocused={showFocusIndicator && level === 1 && focusedOfferingIndex === index}
            focusedItemIndex={
              showFocusIndicator && level === 2 && focusedOfferingIndex === index
                ? focusedItemIndex
                : -1
            }
            isExpandedControlled={expandedOfferings.has(offering.slug)}
            onExpandChange={(expanded) => {
              if (expanded) {
                expandOffering(offering.slug);
              } else {
                collapseOffering(offering.slug);
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}
