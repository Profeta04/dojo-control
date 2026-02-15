import { cn } from "@/lib/utils";
import { useSeasons } from "@/hooks/useSeasons";

const BORDER_STYLES: Record<string, string> = {
  "verao-gold": "ring-amber-400 shadow-amber-400/30",
  "verao-silver": "ring-orange-300 shadow-orange-300/30",
  "verao-bronze": "ring-yellow-600 shadow-yellow-600/30",
  "outono-gold": "ring-amber-700 shadow-amber-700/30",
  "outono-silver": "ring-orange-500 shadow-orange-500/30",
  "outono-bronze": "ring-yellow-700 shadow-yellow-700/30",
  "inverno-gold": "ring-cyan-400 shadow-cyan-400/30",
  "inverno-silver": "ring-blue-300 shadow-blue-300/30",
  "inverno-bronze": "ring-blue-500 shadow-blue-500/30",
  "primavera-gold": "ring-emerald-400 shadow-emerald-400/30",
  "primavera-silver": "ring-green-300 shadow-green-300/30",
  "primavera-bronze": "ring-lime-500 shadow-lime-500/30",
};

const BORDER_GRADIENTS: Record<string, string> = {
  "verao-gold": "from-amber-400 via-yellow-300 to-orange-400",
  "verao-silver": "from-orange-300 via-amber-200 to-orange-400",
  "verao-bronze": "from-yellow-600 via-amber-500 to-yellow-700",
  "outono-gold": "from-amber-700 via-orange-500 to-amber-600",
  "outono-silver": "from-orange-400 via-amber-300 to-orange-500",
  "outono-bronze": "from-yellow-700 via-amber-600 to-yellow-800",
  "inverno-gold": "from-cyan-400 via-blue-300 to-cyan-500",
  "inverno-silver": "from-blue-300 via-cyan-200 to-blue-400",
  "inverno-bronze": "from-blue-500 via-cyan-400 to-blue-600",
  "primavera-gold": "from-emerald-400 via-green-300 to-emerald-500",
  "primavera-silver": "from-green-300 via-emerald-200 to-green-400",
  "primavera-bronze": "from-lime-500 via-green-400 to-lime-600",
};

interface SeasonAvatarBorderProps {
  children: React.ReactNode;
  userId?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function SeasonAvatarBorder({ children, userId, className, size = "md" }: SeasonAvatarBorderProps) {
  const { activeBorder } = useSeasons(userId);

  if (!activeBorder) {
    return <div className={className}>{children}</div>;
  }

  const borderGradient = BORDER_GRADIENTS[activeBorder] || "";
  const sizeClasses = {
    sm: "p-[2px]",
    md: "p-[3px]",
    lg: "p-[4px]",
  };

  return (
    <div className={cn(
      "rounded-full bg-gradient-to-br",
      borderGradient,
      sizeClasses[size],
      "shadow-lg animate-pulse-slow",
      className
    )}>
      {children}
    </div>
  );
}

export function getSeasonBorderStyle(borderValue: string | null) {
  if (!borderValue) return "";
  return BORDER_STYLES[borderValue] || "";
}
