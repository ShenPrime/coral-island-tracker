import { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { ARIA_LABELS } from "@/lib/aria-labels";
import { SEASONS, type Season } from "@coral-tracker/shared";
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
  Flower2,
  Snowflake,
  ChevronsLeft,
  ChevronsRight,
  Search,
} from "lucide-react";

// Tooltip component for collapsed sidebar - uses portal to escape overflow:hidden
interface TooltipProps {
  children: React.ReactNode;
  content: string;
  enabled?: boolean;
}

function Tooltip({ children, content, enabled = true }: TooltipProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top + rect.height / 2,
        left: rect.right + 12,
      });
    }
    setIsHovered(true);
    // Small delay to ensure position is set before animation starts
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setIsVisible(false);
  };

  if (!enabled) return <>{children}</>;
  
  return (
    <div 
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isHovered && position && createPortal(
        <div 
          className={`
            fixed -translate-y-1/2
            px-3 py-1.5 rounded-lg
            bg-deepsea-700 border border-ocean-600/50
            text-white text-sm font-medium whitespace-nowrap
            shadow-lg shadow-black/30
            transition-all duration-150 ease-out z-[100]
            pointer-events-none
          `}
          style={{ 
            top: position.top, 
            left: position.left,
            opacity: isVisible ? 1 : 0,
            transform: `translateY(-50%) translateX(${isVisible ? '0' : '-8px'})`,
          }}
        >
          {content}
          {/* Arrow pointing left */}
          <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-y-[6px] border-y-transparent border-r-8 border-r-deepsea-700" />
        </div>,
        document.body
      )}
    </div>
  );
}

const categoryIcons: Record<string, React.ReactNode> = {
  fish: <Fish size={20} />,
  insects: <Bug size={20} />,
  critters: <Rabbit size={20} />,
  crops: <Carrot size={20} />,
  artifacts: <Scroll size={20} />,
  gems: <Gem size={20} />,
  forageables: <Leaf size={20} />,
  cooking: <UtensilsCrossed size={20} />,
  npcs: <Users size={20} />,
};

const seasonConfig: Record<Season, { label: string; icon: React.ReactNode; colors: string; activeColors: string }> = {
  spring: {
    label: "Spr",
    icon: <Flower2 size={16} />,
    colors: "text-pink-400/70 hover:text-pink-300 hover:bg-pink-500/20",
    activeColors: "bg-pink-500/30 text-pink-200 border-pink-400/50 shadow-lg shadow-pink-500/20",
  },
  summer: {
    label: "Sum",
    icon: <Sun size={16} />,
    colors: "text-amber-400/70 hover:text-amber-300 hover:bg-amber-500/20",
    activeColors: "bg-amber-500/30 text-amber-200 border-amber-400/50 shadow-lg shadow-amber-500/20",
  },
  fall: {
    label: "Fall",
    icon: <Leaf size={16} />,
    colors: "text-orange-400/70 hover:text-orange-300 hover:bg-orange-500/20",
    activeColors: "bg-orange-500/30 text-orange-200 border-orange-400/50 shadow-lg shadow-orange-500/20",
  },
  winter: {
    label: "Win",
    icon: <Snowflake size={16} />,
    colors: "text-cyan-400/70 hover:text-cyan-300 hover:bg-cyan-500/20",
    activeColors: "bg-cyan-500/30 text-cyan-200 border-cyan-400/50 shadow-lg shadow-cyan-500/20",
  },
};

interface NavItemProps {
  to: string;
  isActive: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  registerRef?: (el: HTMLAnchorElement | null) => void;
  collapsed?: boolean;
  title?: string;
}

function NavItem({ to, isActive, onClick, children, registerRef, collapsed, title }: NavItemProps) {
  const link = (
    <Link
      ref={registerRef}
      to={to}
      onClick={onClick}
      className={`
        nav-item flex items-center rounded-lg
        transform-gpu transition-all duration-200
        hover:-translate-y-0.5
        ${collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-4 py-2.5"}
        ${isActive 
          ? "text-white" 
          : "text-slate-300 hover:text-white"
        }
      `}
    >
      {children}
    </Link>
  );

  return (
    <Tooltip content={title || ""} enabled={collapsed && !!title}>
      {link}
    </Tooltip>
  );
}

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { categories, sidebarOpen, setSidebarOpen, sidebarCollapsed, toggleSidebarCollapsed, setSelectedCategory, selectedSeasons, toggleSeason } =
    useStore();
  
  const navRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const navContainerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ top: 0, height: 0, opacity: 0 });

  // Update indicator position when route changes or sidebar collapses
  useEffect(() => {
    // Hide indicator immediately during transition
    setIndicatorStyle(prev => ({ ...prev, opacity: 0 }));
    
    // Recalculate after sidebar transition completes
    const timer = setTimeout(() => {
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
      }
    }, 310); // Wait for 300ms sidebar transition + small buffer
    
    return () => clearTimeout(timer);
  }, [location.pathname, categories, sidebarCollapsed]);

  const registerRef = (path: string) => (el: HTMLAnchorElement | null) => {
    if (el) {
      navRefs.current.set(path, el);
    } else {
      navRefs.current.delete(path);
    }
  };

return (
    <div className="min-h-screen flex">
      {/* Skip to main content link - visible on focus for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-ocean-600 focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-400"
      >
        Skip to main content
      </a>

      {/* Mobile header bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-deepsea-900/95 backdrop-blur-sm border-b border-ocean-800/30 px-4 py-3 flex items-center gap-3">
<button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-expanded={sidebarOpen}
          aria-controls="sidebar-nav"
          aria-label={sidebarOpen ? ARIA_LABELS.CLOSE_NAV_MENU : ARIA_LABELS.OPEN_NAV_MENU}
          className="p-2 bg-deepsea-800 rounded-lg text-white border border-ocean-700/50 hover:bg-deepsea-700 transition-colors"
        >
          {sidebarOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
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
        id="sidebar-nav"
        aria-label={ARIA_LABELS.MAIN_NAV}
        className={`
          fixed inset-y-0 left-0 z-40
          bg-gradient-to-b from-deepsea-800 to-deepsea-900 shadow-xl
          border-r border-ocean-800/30
          transform transition-all duration-300 ease-in-out
          lg:sticky lg:top-0 lg:h-screen
          ${sidebarCollapsed ? "lg:w-16" : "w-64"}
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className={`h-full overflow-y-auto overflow-x-hidden ${sidebarCollapsed ? "p-2" : "p-6"}`}>
{/* Logo */}
          <Link to="/" className={`flex items-center ${sidebarCollapsed ? "justify-center mb-6" : "gap-3 mb-2"}`}>
            <div className={`bg-gradient-to-br from-coral-400 to-coral-600 rounded-xl flex items-center justify-center shadow-lg shadow-coral-500/30 flex-shrink-0 ${sidebarCollapsed ? "w-10 h-10" : "w-10 h-10"}`}>
              <Fish className="text-white" size={24} />
            </div>
            {!sidebarCollapsed && (
              <div>
                <h1 className="font-bold text-lg text-white">Coral Island</h1>
                <p className="text-xs text-ocean-300">Tracker</p>
              </div>
            )}
          </Link>

          {/* Version - hidden when collapsed */}
          {!sidebarCollapsed && (
            <a
              href="https://github.com/ShenPrime/coral-island-tracker/blob/main/CHANGELOG.md"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-[10px] text-ocean-500 hover:text-ocean-300 transition-colors mb-4 ml-[52px]"
            >
              v{import.meta.env.VITE_APP_VERSION}
            </a>
          )}

          {/* Global Search Button */}
          <Tooltip content="Search (Ctrl+K)" enabled={sidebarCollapsed}>
            <button
              onClick={() => useStore.getState().setGlobalSearchOpen(true)}
              aria-label="Search (Ctrl+K)"
              className={`
                w-full mb-4 flex items-center gap-2 px-3 py-2 rounded-lg
                bg-ocean-800/30 border border-ocean-700/30
                text-ocean-300 hover:text-white hover:bg-ocean-700/30 hover:border-ocean-600/50
                transition-colors
                ${sidebarCollapsed ? "justify-center" : ""}
              `}
            >
              <Search size={18} />
              {!sidebarCollapsed && (
                <>
                  <span className="flex-1 text-left text-sm">Search...</span>
                  <kbd className="text-[10px] bg-ocean-800/50 px-1.5 py-0.5 rounded border border-ocean-700/50">
                    Ctrl+K
                  </kbd>
                </>
              )}
            </button>
          </Tooltip>

          {/* Season Selector */}
          <div className="mb-6">
            <div className={`flex ${sidebarCollapsed ? "flex-col gap-1" : "gap-1.5"}`}>
              {SEASONS.map((season) => {
                const config = seasonConfig[season];
                const isActive = selectedSeasons.includes(season);
                const seasonName = season.charAt(0).toUpperCase() + season.slice(1);
                const button = (
<button
                    key={season}
                    onClick={() => toggleSeason(season)}
                    aria-pressed={isActive}
                    aria-label={ARIA_LABELS.filterBySeason(seasonName)}
                    className={`
                      flex flex-col items-center gap-0.5 rounded-lg
                      border transition-all duration-200 transform-gpu
                      ${sidebarCollapsed ? "py-2 px-2" : "flex-1 py-2 px-1"}
                      ${isActive 
                        ? config.activeColors 
                        : `border-transparent ${config.colors}`
                      }
                    `}
                  >
                    <span aria-hidden="true">{config.icon}</span>
                    {!sidebarCollapsed && <span className="text-[10px] font-medium">{config.label}</span>}
                  </button>
                );
                return (
                  <Tooltip key={season} content={seasonName} enabled={sidebarCollapsed}>
                    {button}
                  </Tooltip>
                );
              })}
            </div>
          </div>

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
                collapsed={sidebarCollapsed}
                title="Dashboard"
              >
                <Home size={20} />
                {!sidebarCollapsed && <span>Dashboard</span>}
              </NavItem>

              <NavItem 
                to="/saves" 
                isActive={location.pathname === "/saves"}
                registerRef={registerRef("/saves")}
                collapsed={sidebarCollapsed}
                title="Save Slots"
              >
                <Save size={20} />
                {!sidebarCollapsed && <span>Save Slots</span>}
              </NavItem>

              <NavItem 
                to="/temple" 
                isActive={location.pathname.startsWith("/temple")}
                registerRef={registerRef("/temple")}
                collapsed={sidebarCollapsed}
                title="Lake Temple"
              >
                <Sun size={20} />
                {!sidebarCollapsed && <span>Lake Temple</span>}
              </NavItem>
            </nav>

            {/* Categories */}
            <div className="mt-8">
              {!sidebarCollapsed && (
                <h2 className="text-xs font-semibold text-ocean-400 uppercase tracking-wider mb-3">
                  Categories
                </h2>
              )}
              {sidebarCollapsed && <div className="border-t border-ocean-700/30 mb-3" />}
              <nav className="space-y-1 relative">
                {categories.map((category) => (
                  <NavItem
                    key={category.slug}
                    to={`/track/${category.slug}`}
                    isActive={location.pathname === `/track/${category.slug}`}
                    onClick={() => setSelectedCategory(category.slug)}
                    registerRef={registerRef(`/track/${category.slug}`)}
                    collapsed={sidebarCollapsed}
                    title={category.name}
                  >
                    {categoryIcons[category.slug] || <Scroll size={20} />}
                    {!sidebarCollapsed && <span>{category.name}</span>}
                  </NavItem>
                ))}
              </nav>
            </div>
          </div>

{/* Collapse Toggle Button - Desktop only */}
          <button
            onClick={toggleSidebarCollapsed}
            aria-expanded={!sidebarCollapsed}
            aria-label={sidebarCollapsed ? ARIA_LABELS.EXPAND_SIDEBAR : ARIA_LABELS.COLLAPSE_SIDEBAR}
            className="hidden lg:flex absolute bottom-4 right-0 translate-x-1/2 w-6 h-6 bg-deepsea-700 border border-ocean-600/50 rounded-full items-center justify-center text-ocean-300 hover:text-white hover:bg-deepsea-600 transition-colors shadow-lg"
          >
            {sidebarCollapsed ? <ChevronsRight size={14} aria-hidden="true" /> : <ChevronsLeft size={14} aria-hidden="true" />}
          </button>
        </div>
      </aside>

{/* Main content - add top padding on mobile for fixed header */}
      <main id="main-content" className="flex-1 p-4 pt-20 sm:p-6 sm:pt-20 lg:p-8 lg:pt-8">{children}</main>

{/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
