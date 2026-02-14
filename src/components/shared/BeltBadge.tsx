import { cn } from "@/lib/utils";
import { BeltGrade, BELT_LABELS } from "@/lib/constants";

interface BeltBadgeProps {
  grade: BeltGrade | string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

// Direct hex colors to avoid CSS variable conflicts with dojo theming
const BELT_HEX_COLORS: Record<string, string> = {
  branca: "#FFFFFF",
  cinza: "#999999",
  azul: "#1A73E8",
  amarela: "#FFD600",
  laranja: "#FF6D00",
  verde: "#2E7D32",
  roxa: "#7B1FA2",
  marrom: "#5D4037",
  preta_1dan: "#1A1A1A",
  preta_2dan: "#1A1A1A",
  preta_3dan: "#1A1A1A",
  preta_4dan: "#1A1A1A",
  preta_5dan: "#1A1A1A",
  preta_6dan: "#1A1A1A",
  preta_7dan: "#1A1A1A",
  preta_8dan: "#1A1A1A",
  preta_9dan: "#1A1A1A",
  preta_10dan: "#1A1A1A",
};

export function BeltBadge({ grade, size = "md", showLabel = false }: BeltBadgeProps) {
  const sizeClasses = {
    sm: "h-3 w-12",
    md: "h-4 w-16",
    lg: "h-5 w-20",
  };

  const validGrade = grade as BeltGrade;
  const beltLabel = BELT_LABELS[validGrade] || grade;
  const hexColor = BELT_HEX_COLORS[grade] || "#CCCCCC";
  const isWhite = grade === "branca";

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "rounded-sm",
          sizeClasses[size],
          isWhite && "border-2 border-foreground/40"
        )}
        style={{ backgroundColor: hexColor }}
        title={beltLabel}
      />
      {showLabel && (
        <span className="text-sm text-muted-foreground">{beltLabel}</span>
      )}
    </div>
  );
}
