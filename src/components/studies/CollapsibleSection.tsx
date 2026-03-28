import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";

interface CollapsibleSectionProps {
  label: string;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function CollapsibleSection({ label, count, defaultOpen = false, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn(
      "rounded-xl border overflow-hidden transition-colors",
      open ? "border-primary/20 bg-primary/[0.02]" : "border-border"
    )}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-4 py-3 transition-colors",
          open
            ? "bg-primary/5"
            : "bg-muted/30 hover:bg-muted/50"
        )}
      >
        <span className="text-sm font-semibold text-foreground text-left leading-tight">{label}</span>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge
            variant="secondary"
            className={cn(
              "text-[10px] px-1.5 py-0 min-w-[1.25rem] justify-center",
              open && "bg-primary/10 text-primary"
            )}
          >
            {count}
          </Badge>
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              open ? "rotate-180 text-primary" : "text-muted-foreground"
            )}
          />
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 pt-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
