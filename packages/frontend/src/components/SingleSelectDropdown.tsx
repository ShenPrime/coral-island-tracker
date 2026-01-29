import { useState, useRef, useEffect, useId, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import { ARIA_LABELS } from "@/lib/aria-labels";

interface SingleSelectDropdownProps {
  label?: string; // Optional, for accessibility/aria
  options: readonly string[];
  selected: string;
  onSelect: (option: string) => void;
  formatOption?: (option: string) => string;
  /** Ref callback for filter navigation */
  buttonRef?: (el: HTMLButtonElement | null) => void;
  /** Tab index for roving tabindex pattern */
  tabIndex?: 0 | -1;
  /** Whether this filter is focused via keyboard navigation */
  isFilterFocused?: boolean;
}

export function SingleSelectDropdown({
  label,
  options,
  selected,
  onSelect,
  formatOption = (o) => o,
  buttonRef,
  tabIndex = 0,
  isFilterFocused = false,
}: SingleSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const internalButtonRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();

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

  const handleSelect = (option: string) => {
    onSelect(option);
    handleClose();
  };

  // Combined ref handler
  const setButtonRef = useCallback((el: HTMLButtonElement | null) => {
    (internalButtonRef as React.MutableRefObject<HTMLButtonElement | null>).current = el;
    buttonRef?.(el);
  }, [buttonRef]);

  const displayText = formatOption(selected);

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
        className={`filter-button input w-auto min-w-[90px] sm:min-w-[120px] text-sm sm:text-base py-1.5 sm:py-2 px-2 sm:px-4 flex items-center justify-between gap-1 sm:gap-2 transition-all duration-200 ${
          selected !== options[0] ? "text-ocean-300 border-ocean-500/50" : "text-slate-400"
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
          aria-label={label || ARIA_LABELS.SELECT_OPTION}
          className={`absolute top-full left-0 mt-1 w-48 border border-ocean-700/50 rounded-lg shadow-2xl z-50 overflow-hidden
            transform-gpu origin-top dropdown-menu
            ${isAnimating ? "dropdown-open" : "dropdown-close"}`}
          style={{ backgroundColor: "#162c4a" }}
        >
          {options.map((option) => {
            const isSelected = selected === option;
            return (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(option)}
                className={`w-full px-3 py-2 flex items-center gap-2 hover:bg-ocean-800/80 text-left text-sm transition-all duration-150
                  ${isSelected ? "text-ocean-300" : "text-slate-200"}`}
              >
                <div
                  aria-hidden="true"
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                  isSelected ? "bg-ocean-400 shadow shadow-ocean-400/50" : "bg-transparent"
                }`} />
                <span>{formatOption(option)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
