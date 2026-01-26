/**
 * Warning component displayed when no save slot is selected.
 * Used across pages that require a save slot to display content.
 */

import { Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";

interface NoSaveSlotWarningProps {
  /** Custom message to display. Defaults to generic progress tracking message. */
  message?: string;
}

export function NoSaveSlotWarning({ 
  message = "Please select a save slot first to track your progress" 
}: NoSaveSlotWarningProps) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="card text-center py-12">
        <AlertCircle size={48} className="mx-auto text-slate-400 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">
          No Save Slot Selected
        </h2>
        <p className="text-slate-400 mb-6">{message}</p>
        <Link to="/saves" className="btn btn-primary">
          Go to Save Slots
        </Link>
      </div>
    </div>
  );
}
