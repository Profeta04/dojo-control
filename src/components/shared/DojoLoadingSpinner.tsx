import { cn } from "@/lib/utils";

interface DojoLoadingSpinnerProps {
  className?: string;
}

export function DojoLoadingSpinner({ className }: DojoLoadingSpinnerProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-5 w-full", className)}>
      <svg
        viewBox="0 0 240 200"
        className="w-36 sm:w-44 h-auto"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <style>{`
            /* Left pillar */
            .torii-pillar-l {
              stroke-dasharray: 140;
              stroke-dashoffset: 140;
              animation: draw-pillar 2.6s ease-in-out infinite;
            }
            /* Right pillar */
            .torii-pillar-r {
              stroke-dasharray: 140;
              stroke-dashoffset: 140;
              animation: draw-pillar 2.6s ease-in-out infinite;
              animation-delay: 0.15s;
            }
            /* Top beam (kasagi) — the curved one */
            .torii-kasagi {
              stroke-dasharray: 260;
              stroke-dashoffset: 260;
              animation: draw-beam 2.6s ease-in-out infinite;
              animation-delay: 0.5s;
            }
            /* Lower beam (nuki) */
            .torii-nuki {
              stroke-dasharray: 160;
              stroke-dashoffset: 160;
              animation: draw-beam 2.6s ease-in-out infinite;
              animation-delay: 0.7s;
            }

            @keyframes draw-pillar {
              0% { stroke-dashoffset: 140; opacity: 0; }
              10% { opacity: 1; }
              40% { stroke-dashoffset: 0; }
              70% { stroke-dashoffset: 0; opacity: 1; }
              90% { opacity: 0; }
              100% { stroke-dashoffset: 0; opacity: 0; }
            }
            @keyframes draw-beam {
              0% { stroke-dashoffset: 260; opacity: 0; }
              5% { opacity: 0; }
              15% { opacity: 1; }
              50% { stroke-dashoffset: 0; }
              70% { stroke-dashoffset: 0; opacity: 1; }
              90% { opacity: 0; }
              100% { stroke-dashoffset: 0; opacity: 0; }
            }
          `}</style>
        </defs>

        {/* Left pillar */}
        <line
          className="torii-pillar-l"
          x1="72" y1="55" x2="72" y2="185"
          stroke="hsl(var(--accent))"
          strokeWidth="10"
          strokeLinecap="round"
          fill="none"
        />

        {/* Right pillar */}
        <line
          className="torii-pillar-r"
          x1="168" y1="55" x2="168" y2="185"
          stroke="hsl(var(--accent))"
          strokeWidth="10"
          strokeLinecap="round"
          fill="none"
        />

        {/* Kasagi — top curved beam */}
        <path
          className="torii-kasagi"
          d="M 30,50 Q 60,30 120,28 Q 180,30 210,50"
          stroke="hsl(var(--accent))"
          strokeWidth="11"
          strokeLinecap="round"
          fill="none"
        />

        {/* Nuki — lower straight beam */}
        <line
          className="torii-nuki"
          x1="50" y1="75" x2="190" y2="75"
          stroke="hsl(var(--accent))"
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
        />
      </svg>

      <p className="text-sm text-muted-foreground font-medium tracking-wide animate-pulse">
        Preparando o tatame...
      </p>
    </div>
  );
}
