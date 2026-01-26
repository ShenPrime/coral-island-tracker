/**
 * Reusable modal wrapper component.
 * Provides consistent backdrop, animation, and click-outside-to-close behavior.
 */

import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Max width class for the modal. Defaults to max-w-lg */
  maxWidth?: string;
  /** Whether to show the close button in the header */
  showCloseButton?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  children,
  maxWidth = "max-w-lg",
}: ModalProps) {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm modal-backdrop" />

      {/* Modal container */}
      <div
        className={`relative w-full ${maxWidth} max-h-[90vh] overflow-y-auto bg-deepsea-800/95 border border-ocean-700/50 rounded-2xl shadow-2xl modal-content`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

interface ModalHeaderProps {
  children: React.ReactNode;
  onClose?: () => void;
  showCloseButton?: boolean;
}

/**
 * Sticky header for modals with optional close button.
 */
export function ModalHeader({ children, onClose, showCloseButton = true }: ModalHeaderProps) {
  return (
    <div className="sticky top-0 bg-deepsea-800/95 backdrop-blur-sm border-b border-ocean-700/30 p-4 flex items-start gap-4 z-10">
      <div className="flex-1 min-w-0">{children}</div>
      {showCloseButton && onClose && (
        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-white hover:bg-ocean-800/50 rounded-lg transition-colors flex-shrink-0"
        >
          <X size={20} />
        </button>
      )}
    </div>
  );
}

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
