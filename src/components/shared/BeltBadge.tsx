import { cn } from "@/lib/utils";
import { BeltGrade, BELT_LABELS, BELT_COLORS } from "@/lib/constants";

interface BeltBadgeProps {
  grade: BeltGrade;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function BeltBadge({ grade, size = "md", showLabel = false }: BeltBadgeProps) {
  const sizeClasses = {
    sm: "h-3 w-12",
    md: "h-4 w-16",
    lg: "h-5 w-20",
  };

  const textClass = grade.startsWith("preta") ? "text-white" : "";

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "rounded-sm belt-shadow",
          sizeClasses[size],
          BELT_COLORS[grade]
        )}
        title={BELT_LABELS[grade]}
      />
      {showLabel && (
        <span className="text-sm text-muted-foreground">{BELT_LABELS[grade]}</span>
      )}
    </div>
  );
}
