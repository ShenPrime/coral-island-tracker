import { useCallback, useEffect } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { useAltarDetail } from "@/hooks/useQueries";
import { useUpdateTempleProgress } from "@/hooks/useMutations";
import { OfferingSection } from "@/components/OfferingSection";
import { ProgressBar } from "@/components/ProgressBar";
import { PageLoader, NoSaveSlotWarning } from "@/components/ui";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { useOfferingNavigation } from "@/hooks/useOfferingNavigation";
import { ALTAR_ICON_COMPONENTS, ALTAR_COLORS } from "@/lib/icons";

export function AltarDetail() {
  const { altarSlug } = useParams<{ altarSlug: string }>();
  const { currentSaveId } = useStore();

  // Use React Query for caching
  const { data: altar, isLoading, error } = useAltarDetail(currentSaveId, altarSlug);

  const updateTempleMutation = useUpdateTempleProgress();

  const handleToggleOffered = useCallback((requirementId: number, offered: boolean) => {
    if (!currentSaveId || !altarSlug) return;

    updateTempleMutation.mutate({
      saveId: currentSaveId,
      requirementId,
      itemId: 0,
      category: "",
      offered,
      altarSlug,
    });
  }, [currentSaveId, altarSlug, updateTempleMutation]);

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

  // Handle openOffering query param (from global search navigation)
  const [searchParams, setSearchParams] = useSearchParams();
  
  useEffect(() => {
    const openOfferingSlug = searchParams.get('openOffering');
    if (!openOfferingSlug || !altar) return;

    // Find the offering
    const offeringIndex = altar.offerings.findIndex(o => o.slug === openOfferingSlug);
    if (offeringIndex !== -1) {
      // Expand the offering
      expandOffering(openOfferingSlug);
      
      // Scroll to the offering section after a small delay to allow expansion
      setTimeout(() => {
        const element = document.getElementById(`offering-${openOfferingSlug}`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      
      // Clear URL param to avoid re-scrolling on refresh
      searchParams.delete('openOffering');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, altar, expandOffering]);

  if (!currentSaveId) {
    return <NoSaveSlotWarning message="Please select a save slot first" />;
  }

  if (isLoading) {
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
          <p className="text-slate-400">{error instanceof Error ? error.message : "Altar not found"}</p>
        </div>
      </div>
    );
  }

  const slug = (altarSlug || "") as keyof typeof ALTAR_COLORS;
  const colors = ALTAR_COLORS[slug] || ALTAR_COLORS["crop-altar"];
  const altarGradients: Record<string, string> = {
    "crop-altar": "from-palm-500/30 to-palm-700/30",
    "catch-altar": "from-ocean-500/30 to-ocean-700/30",
    "advanced-altar": "from-purple-500/30 to-purple-700/30",
    "rare-altar": "from-sand-500/30 to-sand-700/30",
  };
  const colorClass = `${altarGradients[slug] || altarGradients["crop-altar"]} ${colors.border} ${colors.text}`;
  const IconComponent = ALTAR_ICON_COMPONENTS[slug as keyof typeof ALTAR_ICON_COMPONENTS];
  const icon = IconComponent ? <IconComponent size={24} /> : null;
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
