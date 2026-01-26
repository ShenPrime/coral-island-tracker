/**
 * Accessible modal wrapper component.
 * 
 * Features:
 * - Focus trapping (Tab cycles within modal)
 * - Escape key closes modal
 * - ARIA dialog role and attributes
 * - Click outside to close
 * - Focus restoration on close
 * - Auto-generated title ID via context
 */

import { createContext, useContext, useId } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";

// ============================================================
// Modal Context
// ============================================================

interface ModalContextValue {
  /** ID for the modal title element (for aria-labelledby) */
  titleId: string;
  /** Close handler */
  onClose: () => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

/**
 * Hook to access modal context. Must be used within a Modal component.
 */
export function useModalContext() {
  const ctx = useContext(ModalContext);
  if (!ctx) {
    throw new Error("useModalContext must be used within a Modal component");
  }
  return ctx;
}

// ============================================================
// Modal Component
// ============================================================

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Max width class for the modal. Defaults to max-w-lg */
  maxWidth?: string;
}

export function Modal({
  isOpen,
  onClose,
  children,
  maxWidth = "max-w-lg",
}: ModalProps) {
  const titleId = useId();
  const focusTrapRef = useFocusTrap({ isActive: isOpen, onEscape: onClose });

  if (!isOpen) return null;

  return createPortal(
    <ModalContext.Provider value={{ titleId, onClose }}>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/70 backdrop-blur-sm modal-backdrop" 
          aria-hidden="true"
        />

        {/* Modal dialog */}
        <div
          ref={focusTrapRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={`relative w-full ${maxWidth} max-h-[90vh] overflow-y-auto bg-deepsea-800/95 border border-ocean-700/50 rounded-2xl shadow-2xl modal-content`}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </ModalContext.Provider>,
    document.body
  );
}

// ============================================================
// ModalHeader Component
// ============================================================

interface ModalHeaderProps {
  children: React.ReactNode;
  /** @deprecated Use modal context instead. This prop is ignored. */
  onClose?: () => void;
  showCloseButton?: boolean;
}

/**
 * Sticky header for modals with optional close button.
 * Automatically receives titleId and onClose from Modal context.
 */
export function ModalHeader({ children, showCloseButton = true }: ModalHeaderProps) {
  const { titleId, onClose } = useModalContext();

  return (
    <div 
      id={titleId}
      className="sticky top-0 bg-deepsea-800/95 backdrop-blur-sm border-b border-ocean-700/30 p-4 flex items-start gap-4 z-10"
    >
      <div className="flex-1 min-w-0">{children}</div>
      {showCloseButton && (
        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-white hover:bg-ocean-800/50 rounded-lg transition-colors flex-shrink-0"
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
      )}
    </div>
  );
}

// ============================================================
// ModalBody Component
// ============================================================

interface ModalBodyProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Content body for modals with consistent padding.
 */
export function ModalBody({ children, className = "" }: ModalBodyProps) {
  return <div className={`p-4 space-y-4 ${className}`}>{children}</div>;
}
