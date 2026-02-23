import { cn } from "@/lib/utils";
import { BeltGrade, BELT_LABELS, getBjjBeltLabel } from "@/lib/constants";

interface BeltBadgeProps {
  grade: BeltGrade | string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  degree?: number; // 0-4 graus for BJJ
  martialArt?: string; // "judo" | "bjj"
}

// Direct hex colors to avoid CSS variable conflicts with dojo theming
const BELT_HEX_COLORS: Record<string, string> = {
  branca: "#FFFFFF",
  bordo: "#800020",
  cinza: "#999999",
  azul_escura: "#1A3A6B",
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

// Stripe color: white on colored belts, red on black belt, black on white belt
function getStripeColor(grade: string): string {
  if (grade === "branca") return "#1A1A1A";
  if (grade.startsWith("preta")) return "#CC0000";
  return "#FFFFFF";
}

export function BeltBadge({ grade, size = "md", showLabel = false, degree = 0, martialArt }: BeltBadgeProps) {
  const sizeClasses = {
    sm: "h-3 w-12",
    md: "h-4 w-16",
    lg: "h-5 w-20",
  };

  const stripeSizes = {
    sm: { width: 1.5, gap: 1.5, offset: 8 },
    md: { width: 2, gap: 2, offset: 10 },
    lg: { width: 2.5, gap: 2.5, offset: 12 },
  };

  const validGrade = grade as BeltGrade;
  const isBjj = martialArt === "bjj";
  const beltLabel = isBjj && degree > 0
    ? getBjjBeltLabel(grade, degree)
    : BELT_LABELS[validGrade] || grade;
  const hexColor = BELT_HEX_COLORS[grade] || "#CCCCCC";
  const isWhite = grade === "branca";
  const stripeColor = getStripeColor(grade);
  const showStripes = isBjj && degree > 0 && degree <= 4;

  const stripeConfig = stripeSizes[size];

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "rounded-sm relative overflow-hidden",
          sizeClasses[size],
          isWhite && "border-2 border-foreground/40"
        )}
        style={{ backgroundColor: hexColor }}
        title={beltLabel}
      >
        {/* BJJ degree stripes */}
        {showStripes && (
          <div 
            className="absolute top-0 bottom-0 flex items-center gap-px"
            style={{ right: `${stripeConfig.offset}px`, gap: `${stripeConfig.gap}px` }}
          >
            {Array.from({ length: degree }).map((_, i) => (
              <div
                key={i}
                className="h-full"
                style={{
                  width: `${stripeConfig.width}px`,
                  backgroundColor: stripeColor,
                }}
              />
            ))}
          </div>
        )}
      </div>
      {showLabel && (
        <span className="text-sm text-muted-foreground">{beltLabel}</span>
      )}
    </div>
  );
}
