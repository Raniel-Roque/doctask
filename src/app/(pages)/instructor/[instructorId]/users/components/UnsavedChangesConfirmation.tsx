import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface UnsavedChangesConfirmationProps {
  isOpen: boolean;
  onContinue: () => void;
  onCancel: () => void;
}

export const UnsavedChangesConfirmation = ({
  isOpen,
  onContinue,
  onCancel,
}: UnsavedChangesConfirmationProps) => {
  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        // Only allow closing through the buttons
        if (!open) {
          onCancel();
        }
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            Unsaved Changes
          </DialogTitle>
          <DialogDescription>
            You have unsaved changes. Would you like to discard these changes?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onCancel}
            className="sm:mr-2"
          >
            Keep Editing
          </Button>
          <Button
            variant="destructive"
            onClick={onContinue}
          >
            Discard Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 