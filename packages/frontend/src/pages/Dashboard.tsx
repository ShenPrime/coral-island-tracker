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
} from "lucide-react";
import type { CategoryStats } from "@coral-tracker/shared";

const categoryIcons: Record<string, React.ReactNode> = {
  fish: <Fish size={24} />,
  insects: <Bug size={24} />,
  critters: <Rabbit size={24} />,
  crops: <Carrot size={24} />,
  artifacts: <Scroll size={24} />,
  gems: <Gem size={24} />,
  cooking: <UtensilsCrossed size={24} />,
  npcs: <Users size={24} />,
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
        <div className="card text-center py-12">
          <AlertCircle size={48} className="mx-auto text-slate-400 mb-4" />
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">
            No Save Slot Selected
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            Create or select a save slot to start tracking your progress
          </p>
          <Link to="/saves" className="btn btn-primary">
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
      <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Dashboard</h1>
      <p className="text-slate-500 dark:text-slate-400 mb-8">Track your overall progress</p>

      {/* Overall Progress */}
      {stats && (
        <div className="card mb-8">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
            Overall Progress
          </h2>
          <ProgressBar
            value={stats.completed_items}
            max={stats.total_items}
            size="lg"
            color={stats.completion_percentage === 100 ? "green" : "ocean"}
          />
          {stats.completion_percentage === 100 && (
            <p className="mt-4 text-green-600 font-medium">
              Congratulations! You've completed everything!
            </p>
          )}
        </div>
      )}

      {/* Category Progress */}
      <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
        Progress by Category
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats?.by_category.map((cat) => (
          <Link
            key={cat.category_slug}
            to={`/track/${cat.category_slug}`}
            className="card hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-ocean-100 dark:bg-ocean-900 rounded-xl flex items-center justify-center text-ocean-600 dark:text-ocean-400">
                {categoryIcons[cat.category_slug] || <Scroll size={24} />}
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-white">{cat.category_name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {cat.completed} / {cat.total} items
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
        <div className="card text-center py-12">
          <p className="text-slate-500 dark:text-slate-400">
            No items found. Run the database seed script to populate game data.
          </p>
          <code className="mt-4 block text-sm bg-slate-100 dark:bg-slate-800 p-2 rounded">
            bun run db:seed
          </code>
        </div>
      )}
    </div>
  );
}
