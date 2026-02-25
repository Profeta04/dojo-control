import { cn } from "@/lib/utils";

interface DojoLoadingSpinnerProps {
  className?: string;
}

export function DojoLoadingSpinner({ className }: DojoLoadingSpinnerProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-6 overflow-hidden w-full", className)}>
      {/* Belt animation container */}
      <div className="relative w-full h-24 flex items-center justify-center">
        {/* The belt strip */}
        <svg
          viewBox="0 0 800 100"
          className="w-full max-w-2xl h-24"
          preserveAspectRatio="xMidYMid meet"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <style>{`
              @keyframes draw-belt {
                0% { stroke-dashoffset: 1200; }
                60% { stroke-dashoffset: 0; }
                100% { stroke-dashoffset: 0; }
              }
              @keyframes fade-knot {
                0%, 40% { opacity: 0; transform: scale(0.5); }
                65% { opacity: 1; transform: scale(1.1); }
                75% { transform: scale(1); }
                100% { opacity: 1; transform: scale(1); }
              }
              @keyframes belt-shimmer {
                0% { stop-color: hsl(var(--accent)); }
                50% { stop-color: hsl(var(--accent) / 0.7); }
                100% { stop-color: hsl(var(--accent)); }
              }
              .belt-path {
                stroke-dasharray: 1200;
                animation: draw-belt 2s ease-in-out infinite;
              }
              .knot-group {
                transform-origin: 400px 50px;
                animation: fade-knot 2s ease-in-out infinite;
              }
            `}</style>
            <linearGradient id="beltGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0" />
              <stop offset="15%" stopColor="hsl(var(--accent))" stopOpacity="1">
                <animate attributeName="stop-color" values="hsl(var(--accent));hsl(var(--accent) / 0.8);hsl(var(--accent))" dur="2s" repeatCount="indefinite" />
              </stop>
              <stop offset="85%" stopColor="hsl(var(--accent))" stopOpacity="1" />
              <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Main belt strip - enters left, curves into knot, exits right */}
          <path
            className="belt-path"
            d="M -50,50 L 300,50 Q 360,50 370,35 Q 380,20 400,20 Q 420,20 430,35 Q 440,50 500,50 L 850,50"
            stroke="url(#beltGrad)"
            strokeWidth="14"
            strokeLinecap="round"
            fill="none"
          />

          {/* Belt knot in the center */}
          <g className="knot-group">
            {/* Knot loop */}
            <path
              d="M 385,50 Q 385,30 400,25 Q 415,30 415,50"
              stroke="hsl(var(--accent))"
              strokeWidth="10"
              strokeLinecap="round"
              fill="none"
            />
            {/* Hanging tails */}
            <path
              d="M 390,50 L 385,78"
              stroke="hsl(var(--accent))"
              strokeWidth="8"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 410,50 L 415,78"
              stroke="hsl(var(--accent))"
              strokeWidth="8"
              strokeLinecap="round"
              fill="none"
            />
          </g>
        </svg>
      </div>

      <p className="text-sm text-muted-foreground font-medium tracking-wide animate-pulse">
        Preparando o tatame...
      </p>
    </div>
  );
}
