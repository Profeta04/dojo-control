import { cn } from "@/lib/utils";
import { BeltGrade, BELT_LABELS, BELT_COLORS } from "@/lib/constants";

interface BeltBadgeProps {
  grade: BeltGrade | string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function BeltBadge({ grade, size = "md", showLabel = false }: BeltBadgeProps) {
  const sizeClasses = {
    sm: "h-3 w-12",
    md: "h-4 w-16",
    lg: "h-5 w-20",
  };

  // Validate if the grade is a valid BeltGrade
  const validGrade = grade as BeltGrade;
  const beltColor = BELT_COLORS[validGrade] || "bg-muted";
  const beltLabel = BELT_LABELS[validGrade] || grade;
  const textClass = grade.startsWith("preta") ? "text-white" : "";

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "rounded-sm belt-shadow",
          sizeClasses[size],
          beltColor
        )}
        title={beltLabel}
      />
      {showLabel && (
        <span className="text-sm text-muted-foreground">{beltLabel}</span>
      )}
    </div>
  );
}
