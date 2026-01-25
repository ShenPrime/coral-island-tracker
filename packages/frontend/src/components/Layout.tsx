import { Link, useLocation } from "react-router-dom";
import { useStore } from "@/store/useStore";
import {
  Fish,
  Bug,
  Carrot,
  Gem,
  Scroll,
  UtensilsCrossed,
  Users,
  Rabbit,
  Menu,
  X,
  Home,
  Save,
} from "lucide-react";

const categoryIcons: Record<string, React.ReactNode> = {
  fish: <Fish size={20} />,
  insects: <Bug size={20} />,
  critters: <Rabbit size={20} />,
  crops: <Carrot size={20} />,
  artifacts: <Scroll size={20} />,
  gems: <Gem size={20} />,
  cooking: <UtensilsCrossed size={20} />,
  npcs: <Users size={20} />,
};

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { categories, sidebarOpen, setSidebarOpen, setSelectedCategory } =
    useStore();

  return (
    <div className="min-h-screen flex">
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg"
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-64 bg-white dark:bg-slate-800 shadow-xl
          transform transition-transform duration-200
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="p-6">
          <Link to="/" className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-ocean-500 rounded-xl flex items-center justify-center">
              <Fish className="text-white" size={24} />
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-800 dark:text-white">Coral Island</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Tracker</p>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="space-y-2">
            <Link
              to="/"
              className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                location.pathname === "/"
                  ? "bg-ocean-100 dark:bg-ocean-900 text-ocean-600 dark:text-ocean-400"
                  : "hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              <Home size={20} />
              <span>Dashboard</span>
            </Link>

            <Link
              to="/saves"
              className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                location.pathname === "/saves"
                  ? "bg-ocean-100 dark:bg-ocean-900 text-ocean-600 dark:text-ocean-400"
                  : "hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              <Save size={20} />
              <span>Save Slots</span>
            </Link>
          </nav>

          {/* Categories */}
          <div className="mt-8">
            <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              Categories
            </h2>
            <nav className="space-y-1">
              {categories.map((category) => (
                <Link
                  key={category.slug}
                  to={`/track/${category.slug}`}
                  onClick={() => setSelectedCategory(category.slug)}
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                    location.pathname === `/track/${category.slug}`
                      ? "bg-ocean-100 dark:bg-ocean-900 text-ocean-600 dark:text-ocean-400"
                      : "hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  {categoryIcons[category.slug] || <Scroll size={20} />}
                  <span>{category.name}</span>
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 lg:p-8">{children}</main>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
