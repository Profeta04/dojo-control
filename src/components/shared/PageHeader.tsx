import { ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import { InteractiveTutorialDialog } from "@/components/help/InteractiveTutorialDialog";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  showHelp?: boolean;
}

export function PageHeader({ title, description, actions, showHelp = true }: PageHeaderProps) {
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-4 border-b border-border/30">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">{title}</h1>
            {showHelp && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                onClick={() => setHelpOpen(true)}
                aria-label="Ajuda sobre esta página"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            )}
          </div>
          {description && (
            <p className="text-sm sm:text-base text-muted-foreground mt-1.5 leading-relaxed">{description}</p>
          )}
        </div>
        {actions && <div className="flex-shrink-0">{actions}</div>}
      </div>

      {showHelp && (
        <InteractiveTutorialDialog
          manualOpen={helpOpen}
          onManualClose={() => setHelpOpen(false)}
        />
      )}
    </>
  );
}
