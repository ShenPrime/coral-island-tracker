import { useRef, useEffect, useState } from "react";
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
  Leaf,
  Sun,
} from "lucide-react";

const categoryIcons: Record<string, React.ReactNode> = {
  fish: <Fish size={20} />,
  insects: <Bug size={20} />,
  critters: <Rabbit size={20} />,
  crops: <Carrot size={20} />,
  artifacts: <Scroll size={20} />,
  gems: <Gem size={20} />,
  forageables: <Leaf size={20} />,
  "lake-temple": <Sun size={20} />,
  cooking: <UtensilsCrossed size={20} />,
  npcs: <Users size={20} />,
};

interface NavItemProps {
  to: string;
  isActive: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  registerRef?: (el: HTMLAnchorElement | null) => void;
}

function NavItem({ to, isActive, onClick, children, registerRef }: NavItemProps) {
  return (
    <Link
      ref={registerRef}
      to={to}
      onClick={onClick}
      className={`
        nav-item flex items-center gap-3 px-4 py-2.5 rounded-lg
        transform-gpu transition-all duration-200
        hover:-translate-y-0.5
        ${isActive 
          ? "text-white" 
          : "text-slate-300 hover:text-white"
        }
      `}
    >
      {children}
    </Link>
  );
}

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { categories, sidebarOpen, setSidebarOpen, setSelectedCategory } =
    useStore();
  
  const navRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const navContainerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ top: 0, height: 0, opacity: 0 });

  // Update indicator position when route changes
  useEffect(() => {
    const activeEl = navRefs.current.get(location.pathname);
    const container = navContainerRef.current;
    
    if (activeEl && container) {
      const containerRect = container.getBoundingClientRect();
      const activeRect = activeEl.getBoundingClientRect();
      
      setIndicatorStyle({
        top: activeRect.top - containerRect.top,
        height: activeRect.height,
        opacity: 1,
      });
    } else {
      setIndicatorStyle(prev => ({ ...prev, opacity: 0 }));
    }
  }, [location.pathname, categories]);

  const registerRef = (path: string) => (el: HTMLAnchorElement | null) => {
    if (el) {
      navRefs.current.set(path, el);
    } else {
      navRefs.current.delete(path);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Mobile header bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-deepsea-900/95 backdrop-blur-sm border-b border-ocean-800/30 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 bg-deepsea-800 rounded-lg text-white border border-ocean-700/50 hover:bg-deepsea-700 transition-colors"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-coral-400 to-coral-600 rounded-lg flex items-center justify-center shadow-lg shadow-coral-500/30">
            <Fish className="text-white" size={18} />
          </div>
          <span className="font-bold text-white">Coral Island Tracker</span>
        </Link>
      </div>

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40
          w-64 bg-gradient-to-b from-deepsea-800 to-deepsea-900 shadow-xl
          border-r border-ocean-800/30
          transform transition-transform duration-200
          lg:sticky lg:top-0 lg:h-screen
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="p-6 h-full overflow-y-auto">
          <Link to="/" className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-coral-400 to-coral-600 rounded-xl flex items-center justify-center shadow-lg shadow-coral-500/30">
              <Fish className="text-white" size={24} />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white">Coral Island</h1>
              <p className="text-xs text-ocean-300">Tracker</p>
            </div>
          </Link>

          {/* Navigation with sliding indicator */}
          <div ref={navContainerRef} className="relative">
            {/* Sliding background indicator */}
            <div 
              className="absolute left-0 right-0 rounded-lg pointer-events-none nav-indicator"
              style={{
                top: indicatorStyle.top,
                height: indicatorStyle.height,
                opacity: indicatorStyle.opacity,
                background: "linear-gradient(135deg, rgba(0, 201, 196, 0.25) 0%, rgba(255, 61, 107, 0.15) 100%)",
                border: "1px solid rgba(0, 201, 196, 0.4)",
                boxShadow: "0 0 20px rgba(0, 201, 196, 0.15), inset 0 1px 0 rgba(255,255,255,0.1)",
                transition: "top 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), height 0.2s ease, opacity 0.2s ease",
              }}
            />

            <nav className="space-y-1 relative">
              <NavItem 
                to="/" 
                isActive={location.pathname === "/"}
                registerRef={registerRef("/")}
              >
                <Home size={20} />
                <span>Dashboard</span>
              </NavItem>

              <NavItem 
                to="/saves" 
                isActive={location.pathname === "/saves"}
                registerRef={registerRef("/saves")}
              >
                <Save size={20} />
                <span>Save Slots</span>
              </NavItem>
            </nav>

            {/* Categories */}
            <div className="mt-8">
              <h2 className="text-xs font-semibold text-ocean-400 uppercase tracking-wider mb-3">
                Categories
              </h2>
              <nav className="space-y-1 relative">
                {categories.map((category) => (
                  <NavItem
                    key={category.slug}
                    to={`/track/${category.slug}`}
                    isActive={location.pathname === `/track/${category.slug}`}
                    onClick={() => setSelectedCategory(category.slug)}
                    registerRef={registerRef(`/track/${category.slug}`)}
                  >
                    {categoryIcons[category.slug] || <Scroll size={20} />}
                    <span>{category.name}</span>
                  </NavItem>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content - add top padding on mobile for fixed header */}
      <main className="flex-1 p-4 pt-20 sm:p-6 sm:pt-20 lg:p-8 lg:pt-8">{children}</main>

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
