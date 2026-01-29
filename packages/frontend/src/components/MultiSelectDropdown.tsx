import { useState, useRef, useEffect, useId, useCallback } from "react";
import { ChevronDown, Check } from "lucide-react";

interface MultiSelectDropdownProps {
  label: string;
  options: readonly string[];
  selected: string[];
  onToggle: (option: string) => void;
  formatOption?: (option: string) => string;
  /** Ref callback for filter navigation */
  buttonRef?: (el: HTMLButtonElement | null) => void;
  /** Tab index for roving tabindex pattern */
  tabIndex?: 0 | -1;
  /** Whether this filter is focused via keyboard navigation */
  isFilterFocused?: boolean;
}

export function MultiSelectDropdown({
  label,
  options,
  selected,
  onToggle,
  formatOption = (o) => o.charAt(0).toUpperCase() + o.slice(1),
  buttonRef,
  tabIndex = 0,
  isFilterFocused = false,
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const internalButtonRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        handleClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpen = () => {
    setIsOpen(true);
    setIsAnimating(true);
  };

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => setIsOpen(false), 200);
  };

  const handleToggle = () => {
    if (isOpen) {
      handleClose();
    } else {
      handleOpen();
    }
  };

  // Combined ref handler
  const setButtonRef = useCallback((el: HTMLButtonElement | null) => {
    (internalButtonRef as React.MutableRefObject<HTMLButtonElement | null>).current = el;
    buttonRef?.(el);
  }, [buttonRef]);

  const displayText = selected.length === 0
    ? label
    : selected.length === 1
      ? formatOption(selected[0])
      : `${selected.length} selected`;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={setButtonRef}
        type="button"
        onClick={handleToggle}
        tabIndex={tabIndex}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        className={`filter-button input w-auto min-w-[100px] sm:min-w-[130px] text-sm sm:text-base py-1.5 sm:py-2 px-2 sm:px-4 flex items-center justify-between gap-1 sm:gap-2 transition-all duration-200 ${
          selected.length > 0 ? "text-ocean-300 border-ocean-500/50" : "text-slate-400"
        } ${isOpen ? "border-ocean-400" : ""} ${isFilterFocused ? "filter-focused" : ""}`}
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown
          size={14}
          className={`flex-shrink-0 transition-transform duration-300 text-ocean-400 ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={label}
          aria-multiselectable="true"
          className={`absolute top-full left-0 mt-1 w-48 border border-ocean-700/50 rounded-lg shadow-2xl z-50 overflow-hidden
            transform-gpu origin-top dropdown-menu
            ${isAnimating ? "dropdown-open" : "dropdown-close"}`}
          style={{ backgroundColor: "#162c4a" }}
        >
          {options.map((option, index) => {
            const isSelected = selected.includes(option);
            return (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => onToggle(option)}
                className="w-full px-3 py-2 flex items-center gap-2 hover:bg-ocean-800/80 text-left text-sm transition-all duration-150 group"
                style={{
                  animationDelay: `${index * 30}ms`,
                }}
              >
                <div
                  aria-hidden="true"
                  className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0
                  transform-gpu transition-all duration-200
                  ${isSelected
                    ? "bg-gradient-to-br from-ocean-400 to-ocean-600 border-ocean-400 shadow-lg shadow-ocean-500/50 scale-110"
                    : "border-ocean-600 group-hover:border-ocean-400 group-hover:scale-110"
                  }`}
                >
                  <Check
                    size={12}
                    className={`text-white transform-gpu transition-all duration-200
                      ${isSelected ? "opacity-100 scale-100" : "opacity-0 scale-50"}`}
                  />
                </div>
                <span className={`transition-colors duration-150 ${isSelected ? "text-ocean-300" : "text-slate-200"}`}>
                  {formatOption(option)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
