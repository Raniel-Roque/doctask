"use client";

import { useState, useEffect } from "react";
import { BsCloudCheck, BsCloudSlash } from "react-icons/bs";
import { LoaderIcon } from "lucide-react";
import { useEditorStore } from "@/store/use-editor-store";
import { useStatus } from "@liveblocks/react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CloudSavingIndicatorProps {
  onManualSave?: (isManualSave?: boolean) => Promise<void>;
  className?: string;
}

export const CloudSavingIndicator = ({
  onManualSave,
  className = "",
}: CloudSavingIndicatorProps) => {
  const {
    isSaving,
    lastSaved,
    saveError,
    setIsSaving,
    setLastSaved,
    setSaveError,
  } = useEditorStore();
  const status = useStatus();
  const [showTooltip, setShowTooltip] = useState(false);
  const [showSavedText, setShowSavedText] = useState(false);

  // Determine what to show based on various states
  const showLoader =
    isSaving || status === "connecting" || status === "reconnecting";
  const showError = saveError || status === "disconnected";
  const showSuccess = !showError && !showLoader && lastSaved;

  // Show "Saved!" text for 3 seconds after successful save
  useEffect(() => {
    if (lastSaved && !isSaving) {
      setShowSavedText(true);
      const timer = setTimeout(() => {
        setShowSavedText(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [lastSaved, isSaving]);

  const getTooltipText = () => {
    if (showError) {
      return saveError || "Connection lost. Changes may not be saved.";
    }
    if (showLoader) {
      return "Saving...";
    }
    if (showSuccess) {
      return `Last saved ${lastSaved.toLocaleTimeString()}`;
    }
    return "All changes saved";
  };

  const handleClick = async () => {
    if (onManualSave && !showLoader) {
      try {
        setIsSaving(true);
        setSaveError(null);
        await onManualSave(true);
        setLastSaved(new Date());
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : "Failed to save");
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <Tooltip open={showTooltip} onOpenChange={setShowTooltip}>
          <TooltipTrigger asChild>
            <button
              onClick={handleClick}
              disabled={showLoader}
              className={`flex items-center justify-center w-6 h-6 rounded-sm hover:bg-neutral-200/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              {showError && <BsCloudSlash className="w-4 h-4 text-red-500" />}
              {!showError && !showLoader && (
                <BsCloudCheck className="w-4 h-4 text-green-600" />
              )}
              {showLoader && (
                <LoaderIcon className="w-4 h-4 animate-spin text-blue-600" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="text-sm">{getTooltipText()}</p>
            {onManualSave && !showLoader && (
              <p className="text-xs text-muted-foreground mt-1">
                Click to save manually
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Text indicators */}
      {showLoader && (
        <span className="text-sm text-blue-600 font-medium">Saving...</span>
      )}
      {showSavedText && !showLoader && (
        <span className="text-sm text-green-600 font-medium">Saved!</span>
      )}
    </div>
  );
};
