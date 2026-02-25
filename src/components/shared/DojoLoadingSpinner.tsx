import { cn } from "@/lib/utils";

interface DojoLoadingSpinnerProps {
  className?: string;
}

export function DojoLoadingSpinner({ className }: DojoLoadingSpinnerProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-5 w-full", className)}>
      <svg
        viewBox="0 0 280 230"
        className="w-40 sm:w-52 h-auto"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <style>{`
            .t-pillar-l, .t-pillar-r {
              stroke-dasharray: 150;
              stroke-dashoffset: 150;
              animation: t-draw 3s ease-in-out infinite;
            }
            .t-pillar-r { animation-delay: 0.12s; }

            .t-base-l, .t-base-r {
              stroke-dasharray: 60;
              stroke-dashoffset: 60;
              animation: t-draw-short 3s ease-in-out infinite;
            }
            .t-base-l { animation-delay: 0.05s; }
            .t-base-r { animation-delay: 0.17s; }

            .t-kasagi {
              stroke-dasharray: 340;
              stroke-dashoffset: 340;
              animation: t-draw-long 3s ease-in-out infinite;
              animation-delay: 0.45s;
            }
            .t-shimaki {
              stroke-dasharray: 300;
              stroke-dashoffset: 300;
              animation: t-draw-long 3s ease-in-out infinite;
              animation-delay: 0.55s;
            }
            .t-nuki {
              stroke-dasharray: 180;
              stroke-dashoffset: 180;
              animation: t-draw-med 3s ease-in-out infinite;
              animation-delay: 0.65s;
            }
            .t-gakuzuka {
              stroke-dasharray: 50;
              stroke-dashoffset: 50;
              animation: t-draw-short 3s ease-in-out infinite;
              animation-delay: 0.8s;
            }
            .t-tip-l, .t-tip-r {
              stroke-dasharray: 30;
              stroke-dashoffset: 30;
              animation: t-draw-short 3s ease-in-out infinite;
            }
            .t-tip-l { animation-delay: 0.55s; }
            .t-tip-r { animation-delay: 0.6s; }

            @keyframes t-draw {
              0% { stroke-dashoffset: 150; opacity: 0; }
              8% { opacity: 1; }
              40% { stroke-dashoffset: 0; }
              68% { stroke-dashoffset: 0; opacity: 1; }
              88% { opacity: 0; }
              100% { opacity: 0; }
            }
            @keyframes t-draw-long {
              0% { stroke-dashoffset: 340; opacity: 0; }
              5% { opacity: 0; }
              15% { opacity: 1; }
              50% { stroke-dashoffset: 0; }
              68% { stroke-dashoffset: 0; opacity: 1; }
              88% { opacity: 0; }
              100% { opacity: 0; }
            }
            @keyframes t-draw-med {
              0% { stroke-dashoffset: 180; opacity: 0; }
              10% { opacity: 0; }
              20% { opacity: 1; }
              50% { stroke-dashoffset: 0; }
              68% { stroke-dashoffset: 0; opacity: 1; }
              88% { opacity: 0; }
              100% { opacity: 0; }
            }
            @keyframes t-draw-short {
              0% { stroke-dashoffset: 60; opacity: 0; }
              8% { opacity: 1; }
              35% { stroke-dashoffset: 0; }
              68% { stroke-dashoffset: 0; opacity: 1; }
              88% { opacity: 0; }
              100% { opacity: 0; }
            }
          `}</style>
        </defs>

        {/* ── Pillar bases (wider feet) ── */}
        <line className="t-base-l" x1="62" y1="195" x2="88" y2="195"
          stroke="hsl(var(--accent))" strokeWidth="8" strokeLinecap="round" fill="none" />
        <line className="t-base-r" x1="192" y1="195" x2="218" y2="195"
          stroke="hsl(var(--accent))" strokeWidth="8" strokeLinecap="round" fill="none" />

        {/* ── Left pillar (slightly tapered inward) ── */}
        <line className="t-pillar-l" x1="78" y1="195" x2="82" y2="58"
          stroke="hsl(var(--accent))" strokeWidth="9" strokeLinecap="round" fill="none" />

        {/* ── Right pillar ── */}
        <line className="t-pillar-r" x1="202" y1="195" x2="198" y2="58"
          stroke="hsl(var(--accent))" strokeWidth="9" strokeLinecap="round" fill="none" />

        {/* ── Shimaki (lower/thinner top beam) ── */}
        <line className="t-shimaki" x1="55" y1="58" x2="225" y2="58"
          stroke="hsl(var(--accent))" strokeWidth="7" strokeLinecap="round" fill="none" />

        {/* ── Kasagi (top curved beam — thicker, with upward curve at ends) ── */}
        <path className="t-kasagi"
          d="M 28,48 Q 40,38 70,35 L 140,32 L 210,35 Q 240,38 252,48"
          stroke="hsl(var(--accent))" strokeWidth="10" strokeLinecap="round" fill="none" />

        {/* ── Kasagi tips (curved end caps) ── */}
        <path className="t-tip-l" d="M 28,48 Q 24,52 22,58"
          stroke="hsl(var(--accent))" strokeWidth="7" strokeLinecap="round" fill="none" />
        <path className="t-tip-r" d="M 252,48 Q 256,52 258,58"
          stroke="hsl(var(--accent))" strokeWidth="7" strokeLinecap="round" fill="none" />

        {/* ── Nuki (cross beam between pillars) ── */}
        <line className="t-nuki" x1="62" y1="88" x2="218" y2="88"
          stroke="hsl(var(--accent))" strokeWidth="6" strokeLinecap="round" fill="none" />

        {/* ── Gakuzuka (vertical piece between kasagi and nuki, center) ── */}
        <line className="t-gakuzuka" x1="140" y1="58" x2="140" y2="88"
          stroke="hsl(var(--accent))" strokeWidth="6" strokeLinecap="round" fill="none" />
      </svg>

      <p className="text-sm text-muted-foreground font-medium tracking-wide animate-pulse">
        Preparando o tatame...
      </p>
    </div>
  );
}
