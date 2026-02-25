import { cn } from "@/lib/utils";

interface DojoLoadingSpinnerProps {
  className?: string;
}

export function DojoLoadingSpinner({ className }: DojoLoadingSpinnerProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-5 w-full", className)}>
      <svg
        viewBox="0 0 320 120"
        className="w-64 sm:w-80 h-auto"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <style>{`
            .belt-main {
              stroke-dasharray: 900;
              stroke-dashoffset: 900;
              animation: belt-draw 2.2s ease-in-out infinite;
            }
            .belt-tail-l, .belt-tail-r {
              stroke-dasharray: 100;
              stroke-dashoffset: 100;
              animation: tail-draw 2.2s ease-in-out infinite;
            }
            .belt-tail-l { animation-delay: 0.8s; }
            .belt-tail-r { animation-delay: 0.9s; }
            .belt-knot {
              opacity: 0;
              transform-origin: 160px 44px;
              animation: knot-pop 2.2s ease-in-out infinite;
            }
            @keyframes belt-draw {
              0% { stroke-dashoffset: 900; }
              55% { stroke-dashoffset: 0; }
              80% { stroke-dashoffset: 0; }
              100% { stroke-dashoffset: -900; }
            }
            @keyframes tail-draw {
              0% { stroke-dashoffset: 100; opacity: 0; }
              10% { opacity: 1; }
              50% { stroke-dashoffset: 0; }
              75% { stroke-dashoffset: 0; opacity: 1; }
              90% { opacity: 0; }
              100% { stroke-dashoffset: 0; opacity: 0; }
            }
            @keyframes knot-pop {
              0%, 35% { opacity: 0; transform: scale(0.3); }
              50% { opacity: 1; transform: scale(1.08); }
              58% { transform: scale(1); }
              78% { opacity: 1; }
              92% { opacity: 0; transform: scale(0.8); }
              100% { opacity: 0; }
            }
          `}</style>
        </defs>

        {/* Main belt strip — left to right through center */}
        <path
          className="belt-main"
          d="M -20,52 C 60,52 100,52 130,48 Q 145,44 160,40 Q 175,44 190,48 C 220,52 260,52 340,52"
          stroke="hsl(var(--accent))"
          strokeWidth="18"
          strokeLinecap="round"
          fill="none"
        />

        {/* Knot at center */}
        <g className="belt-knot">
          {/* Knot wrap - horizontal band over the belt */}
          <rect
            x="148" y="34" width="24" height="18" rx="3"
            fill="hsl(var(--accent))"
            stroke="hsl(var(--accent-foreground))"
            strokeWidth="0.8"
            opacity="0.95"
          />
          {/* Center line on knot */}
          <line x1="160" y1="36" x2="160" y2="50" stroke="hsl(var(--accent-foreground))" strokeWidth="0.6" opacity="0.4" />
        </g>

        {/* Left tail hanging down */}
        <path
          className="belt-tail-l"
          d="M 152,52 L 140,90 L 136,92"
          stroke="hsl(var(--accent))"
          strokeWidth="14"
          strokeLinecap="round"
          fill="none"
          opacity="0.9"
        />

        {/* Right tail hanging down */}
        <path
          className="belt-tail-r"
          d="M 168,52 L 180,90 L 184,92"
          stroke="hsl(var(--accent))"
          strokeWidth="14"
          strokeLinecap="round"
          fill="none"
          opacity="0.9"
        />

        {/* Tail tips - diagonal cuts */}
        <path
          className="belt-tail-l"
          d="M 132,88 L 140,96"
          stroke="hsl(var(--accent))"
          strokeWidth="12"
          strokeLinecap="butt"
          fill="none"
          opacity="0.7"
        />
        <path
          className="belt-tail-r"
          d="M 188,88 L 180,96"
          stroke="hsl(var(--accent))"
          strokeWidth="12"
          strokeLinecap="butt"
          fill="none"
          opacity="0.7"
        />
      </svg>

      <p className="text-sm text-muted-foreground font-medium tracking-wide animate-pulse">
        Preparando o tatame...
      </p>
    </div>
  );
}
