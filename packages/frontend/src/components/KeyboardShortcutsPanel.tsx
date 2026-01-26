/**
 * Keyboard Shortcuts Cheat Sheet Panel
 * 
 * A floating panel that displays all available keyboard shortcuts.
 * Appears in the bottom-right corner with smooth animations.
 */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Keyboard } from "lucide-react";
import { useStore } from "@/store/useStore";
import { CATEGORY_ORDER } from "@/lib/keyboard-shortcuts";
import { ARIA_LABELS } from "@/lib/aria-labels";

// Shortcut display data - organized for the cheat sheet layout
interface ShortcutItem {
  keys: string[];
  description: string;
  compact?: boolean;
}

interface ShortcutSection {
  title: string;
  shortcuts: ShortcutItem[];
}

const SHORTCUT_SECTIONS: ShortcutSection[] = [
  {
    title: "Navigation",
    shortcuts: [
      { keys: ["Shift", "H"], description: "Dashboard" },
      { keys: ["Shift", "S"], description: "Save Slots" },
      { keys: ["Shift", "T"], description: "Temple" },
      { keys: ["1-9"], description: "Categories" },
      { keys: ["/"], description: "Search" },
      { keys: ["Esc"], description: "Close/Clear" },
      { keys: ["["], description: "Toggle sidebar" },
    ],
  },
  {
    title: "Grid",
    shortcuts: [
      { keys: ["↑", "↓", "←", "→"], description: "Move", compact: true },
      { keys: ["h", "j", "k", "l"], description: "Move (vim)", compact: true },
      { keys: ["Space"], description: "Toggle" },
      { keys: ["i"], description: "Details" },
      { keys: ["Home"], description: "First item" },
      { keys: ["End"], description: "Last item" },
      { keys: ["+", "-"], description: "Hearts (NPCs)" },
    ],
  },
  {
    title: "Filters",
    shortcuts: [
      { keys: ["f"], description: "Focus filters" },
      { keys: ["c"], description: "Clear all" },
      { keys: ["Alt", "1-4"], description: "Seasons" },
    ],
  },
];

// Category names for the legend
const CATEGORY_NAMES = [
  "Fish", "Insects", "Critters", "Crops", "Artifacts",
  "Gems", "Forageables", "Cooking", "NPCs"
];

/**
 * Floating button that hints at keyboard shortcuts availability.
 * Always visible in bottom-right corner.
 */
function ShortcutsHintButton() {
  const { isShortcutsModalOpen, setShortcutsModalOpen } = useStore();

  // Don't show button when panel is open
  if (isShortcutsModalOpen) return null;

  return createPortal(
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
      {/* Text hint */}
      <span className="text-sm text-slate-400 mr-1">
        Press <kbd className="kbd">?</kbd> for shortcuts
      </span>
      
      {/* Floating button */}
      <button
        onClick={() => setShortcutsModalOpen(true)}
        className="
          w-10 h-10 rounded-full
          bg-deepsea-800/90 backdrop-blur-sm
          border border-ocean-600/40
          text-ocean-400 hover:text-ocean-300
          hover:bg-deepsea-700/90 hover:border-ocean-500/50
          shadow-lg shadow-black/30
          transition-all duration-200
          flex items-center justify-center
        "
        aria-label="Open keyboard shortcuts"
        title="Keyboard shortcuts (?)"
      >
        <Keyboard size={18} aria-hidden="true" />
      </button>
    </div>,
    document.body
  );
}

export function KeyboardShortcutsPanel() {
  const { isShortcutsModalOpen, setShortcutsModalOpen } = useStore();
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  // Handle open/close with animation
  useEffect(() => {
    if (isShortcutsModalOpen) {
      setShouldRender(true);
      // Small delay to ensure DOM is ready for animation
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
    } else {
      setIsAnimating(false);
      // Wait for exit animation to complete
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isShortcutsModalOpen]);

  return (
    <>
      {/* Always show the hint button */}
      <ShortcutsHintButton />
      
      {/* Panel only renders when open */}
      {shouldRender && createPortal(
    <div
      className={`
        fixed bottom-4 right-4 z-50
        w-[420px] max-w-[calc(100vw-2rem)]
        bg-deepsea-800/95 backdrop-blur-md
        border border-ocean-600/40 rounded-2xl
        shadow-2xl shadow-black/50
        shortcuts-panel
        ${isAnimating ? "shortcuts-panel-enter" : "shortcuts-panel-exit"}
      `}
      role="dialog"
      aria-modal="false"
      aria-label="Keyboard shortcuts"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-ocean-700/30">
        <div className="flex items-center gap-2 text-ocean-300">
          <Keyboard size={18} aria-hidden="true" />
          <h2 className="font-semibold text-white text-sm">Keyboard Shortcuts</h2>
        </div>
        <button
          onClick={() => setShortcutsModalOpen(false)}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-ocean-800/50 rounded-lg transition-colors"
          aria-label={ARIA_LABELS.CLOSE_DIALOG}
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Shortcut sections */}
        <div className="grid grid-cols-3 gap-4">
          {SHORTCUT_SECTIONS.map((section) => (
            <div key={section.title}>
              <h3 className="text-xs font-semibold text-ocean-400 uppercase tracking-wider mb-2">
                {section.title}
              </h3>
              <div className="space-y-1.5">
                {section.shortcuts.map((shortcut, idx) => (
                  <div 
                    key={idx} 
                    className={`flex items-center gap-2 ${shortcut.compact ? "flex-wrap" : ""}`}
                  >
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      {shortcut.keys.map((key, keyIdx) => (
                        <span key={keyIdx} className="flex items-center">
                          {keyIdx > 0 && <span className="text-slate-500 text-[10px] mx-0.5">+</span>}
                          <kbd className="kbd">{key}</kbd>
                        </span>
                      ))}
                    </div>
                    <span className="text-xs text-slate-400 truncate">{shortcut.description}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Category legend */}
        <div className="pt-3 border-t border-ocean-700/30">
          <h3 className="text-xs font-semibold text-ocean-400 uppercase tracking-wider mb-2">
            Category Keys (1-9)
          </h3>
          <div className="grid grid-cols-3 gap-x-4 gap-y-1">
            {CATEGORY_ORDER.map((slug, idx) => (
              <div key={slug} className="flex items-center gap-2">
                <kbd className="kbd kbd-sm">{idx + 1}</kbd>
                <span className="text-xs text-slate-400">{CATEGORY_NAMES[idx]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer hint */}
        <div className="pt-3 border-t border-ocean-700/30 flex items-center justify-center gap-1 text-xs text-slate-500">
          <span>Press</span>
          <kbd className="kbd kbd-sm">?</kbd>
          <span>to toggle this panel</span>
        </div>
      </div>
    </div>,
    document.body
  )}
    </>
  );
}
