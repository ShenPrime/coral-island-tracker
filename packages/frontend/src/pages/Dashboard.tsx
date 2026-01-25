import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { ProgressBar } from "@/components/ProgressBar";
import { getSaveSlot } from "@/lib/api";
import {
  Fish,
  Bug,
  Carrot,
  Gem,
  Scroll,
  UtensilsCrossed,
  Users,
  Rabbit,
  AlertCircle,
  Leaf,
  Sun,
} from "lucide-react";
import type { CategoryStats } from "@coral-tracker/shared";

const categoryIcons: Record<string, { sm: React.ReactNode; lg: React.ReactNode }> = {
  fish: { sm: <Fish size={20} />, lg: <Fish size={24} /> },
  insects: { sm: <Bug size={20} />, lg: <Bug size={24} /> },
  critters: { sm: <Rabbit size={20} />, lg: <Rabbit size={24} /> },
  crops: { sm: <Carrot size={20} />, lg: <Carrot size={24} /> },
  artifacts: { sm: <Scroll size={20} />, lg: <Scroll size={24} /> },
  gems: { sm: <Gem size={20} />, lg: <Gem size={24} /> },
  forageables: { sm: <Leaf size={20} />, lg: <Leaf size={24} /> },
  "lake-temple": { sm: <Sun size={20} />, lg: <Sun size={24} /> },
  cooking: { sm: <UtensilsCrossed size={20} />, lg: <UtensilsCrossed size={24} /> },
  npcs: { sm: <Users size={20} />, lg: <Users size={24} /> },
};

export function Dashboard() {
  const { currentSaveId } = useStore();
  const [stats, setStats] = useState<{
    total_items: number;
    completed_items: number;
    completion_percentage: number;
    by_category: CategoryStats[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      if (!currentSaveId) {
        setLoading(false);
        return;
      }

      try {
        const saveData = await getSaveSlot(currentSaveId);
        setStats(saveData.stats);
      } catch (error) {
        console.error("Failed to load stats:", error);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [currentSaveId]);

  if (!currentSaveId) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card text-center py-8 sm:py-12">
          <AlertCircle size={40} className="mx-auto text-slate-400 mb-3 sm:mb-4 sm:w-12 sm:h-12" />
          <h2 className="text-lg sm:text-xl font-semibold text-white mb-2">
            No Save Slot Selected
          </h2>
          <p className="text-sm sm:text-base text-slate-400 mb-4 sm:mb-6 px-4">
            Create or select a save slot to start tracking your progress
          </p>
          <Link to="/saves" className="btn btn-primary text-sm sm:text-base">
            Go to Save Slots
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ocean-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">Dashboard</h1>
      <p className="text-sm sm:text-base text-slate-400 mb-6 sm:mb-8">Track your overall progress</p>

      {/* Overall Progress */}
      {stats && (
        <div className="card mb-6 sm:mb-8 p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">
            Overall Progress
          </h2>
          <ProgressBar
            value={stats.completed_items}
            max={stats.total_items}
            size="lg"
            color={stats.completion_percentage === 100 ? "green" : "ocean"}
          />
          {stats.completion_percentage === 100 && (
            <p className="mt-3 sm:mt-4 text-sm sm:text-base text-palm-400 font-medium">
              Congratulations! You've completed everything!
            </p>
          )}
        </div>
      )}

      {/* Category Progress */}
      <h2 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">
        Progress by Category
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        {stats?.by_category.map((cat) => (
          <Link
            key={cat.category_slug}
            to={`/track/${cat.category_slug}`}
            className="card hover:shadow-xl transition-shadow p-3 sm:p-6"
          >
            <div className="flex items-center gap-2 sm:gap-4 mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-ocean-600/30 to-ocean-800/30 rounded-lg sm:rounded-xl flex items-center justify-center text-ocean-300 border border-ocean-500/30">
                <span className="sm:hidden">{categoryIcons[cat.category_slug]?.sm || <Scroll size={20} />}</span>
                <span className="hidden sm:block">{categoryIcons[cat.category_slug]?.lg || <Scroll size={24} />}</span>
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-white text-sm sm:text-base truncate">{cat.category_name}</h3>
                <p className="text-xs sm:text-sm text-slate-400">
                  {cat.completed}/{cat.total}
                </p>
              </div>
            </div>
            <ProgressBar
              value={cat.completed}
              max={cat.total}
              showPercentage={false}
              size="sm"
              color={cat.percentage === 100 ? "green" : "ocean"}
            />
          </Link>
        ))}
      </div>

      {(!stats || stats.total_items === 0) && (
        <div className="card text-center py-8 sm:py-12">
          <p className="text-sm sm:text-base text-slate-400 px-4">
            No items found. Run the database seed script to populate game data.
          </p>
          <code className="mt-4 block text-xs sm:text-sm bg-deepsea-900 p-2 rounded text-ocean-300 border border-ocean-800/50 mx-4 overflow-x-auto">
            bun run db:seed
          </code>
        </div>
      )}
    </div>
  );
}
