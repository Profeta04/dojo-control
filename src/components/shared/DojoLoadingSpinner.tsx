import { cn } from "@/lib/utils";

interface DojoLoadingSpinnerProps {
  className?: string;
}

export function DojoLoadingSpinner({ className }: DojoLoadingSpinnerProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-4", className)}>
      {/* Belt knot animation */}
      <div className="relative w-20 h-20">
        {/* Outer spinning belt circle */}
        <div className="absolute inset-0 rounded-full border-4 border-muted animate-[spin_2.5s_linear_infinite]" />
        <div className="absolute inset-0 rounded-full border-t-4 border-accent animate-[spin_1.2s_ease-in-out_infinite]" />
        
        {/* Inner belt knot */}
        <div className="absolute inset-3 flex items-center justify-center">
          <svg
            viewBox="0 0 48 48"
            className="w-full h-full text-accent animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Belt knot shape */}
            <path
              d="M24 8 C18 8, 12 14, 12 20 C12 26, 16 28, 20 30 L16 40 L24 36 L32 40 L28 30 C32 28, 36 26, 36 20 C36 14, 30 8, 24 8Z"
              fill="currentColor"
              opacity="0.85"
            />
            {/* Belt stripe */}
            <rect x="21" y="14" width="6" height="12" rx="1" fill="hsl(var(--accent-foreground))" opacity="0.6" />
          </svg>
        </div>
      </div>

      <p className="text-sm text-muted-foreground font-medium tracking-wide animate-pulse">
        Preparando o tatame...
      </p>
    </div>
  );
}
