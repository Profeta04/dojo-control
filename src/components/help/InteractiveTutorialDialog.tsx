import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lightbulb, Compass } from "lucide-react";
import { GuidedTourOverlay } from "./GuidedTourOverlay";
import { getTutorialForPath } from "./tourData";

interface InteractiveTutorialDialogProps {
  /** If true, the dialog was opened manually via the ? button */
  manualOpen?: boolean;
  onManualClose?: () => void;
}

export function InteractiveTutorialDialog({
  manualOpen = false,
  onManualClose,
}: InteractiveTutorialDialogProps) {
  const { pathname } = useLocation();
  const { user, canManageStudents } = useAuth();
  const { hasSeenTab, markTabSeen, welcomeSeen, isLoading } = useOnboarding();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [tourActive, setTourActive] = useState(false);

  const tutorial = getTutorialForPath(pathname, canManageStudents);

  // Auto-open on first visit
  useEffect(() => {
    if (!user || isLoading || !welcomeSeen || !tutorial) return;
    if (!hasSeenTab(tutorial.tabId)) {
      setDialogOpen(true);
    }
  }, [pathname, user, isLoading, welcomeSeen, tutorial, hasSeenTab]);

  // Manual open via ? button
  useEffect(() => {
    if (manualOpen && tutorial) {
      setDialogOpen(true);
    }
  }, [manualOpen, tutorial]);

  if (!tutorial) return null;

  const hasSteps = tutorial.steps.length > 0;

  const handleClose = () => {
    setDialogOpen(false);
    markTabSeen(tutorial.tabId);
    onManualClose?.();
  };

  const handleStartTour = () => {
    setDialogOpen(false);
    // Small delay so dialog closes before overlay shows
    setTimeout(() => setTourActive(true), 200);
  };

  const handleTourFinish = () => {
    setTourActive(false);
    markTabSeen(tutorial.tabId);
    onManualClose?.();
  };

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-accent/15 flex items-center justify-center">
              <Lightbulb className="h-6 w-6 text-accent" />
            </div>
            <DialogTitle className="text-lg">{tutorial.title}</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed mt-2 text-accent-foreground/70">
              {tutorial.summary}
            </DialogDescription>
          </DialogHeader>

          {tutorial.tip && (
            <p className="text-xs text-accent text-center mt-1">
              💡 {tutorial.tip}
            </p>
          )}

          <div className="flex flex-col gap-2 mt-4">
            {hasSteps && (
              <Button onClick={handleStartTour} className="w-full gap-2">
                <Compass className="h-4 w-4" />
                Tour Guiado
              </Button>
            )}
            <Button variant="outline" onClick={handleClose} className="w-full">
              Entendi!
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {tourActive && (
        <GuidedTourOverlay steps={tutorial.steps} onFinish={handleTourFinish} />
      )}
    </>
  );
}
