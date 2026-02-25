import { cn } from "@/lib/utils";

interface DojoLoadingSpinnerProps {
  className?: string;
}

export function DojoLoadingSpinner({ className }: DojoLoadingSpinnerProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-5 w-full", className)}>
      <svg
        viewBox="0 0 200 200"
        className="w-28 sm:w-36 h-auto"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <style>{`
            .enso-circle {
              stroke-dasharray: 520;
              stroke-dashoffset: 520;
              animation: enso-draw 2.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
              filter: url(#brush);
            }
            .enso-dot {
              opacity: 0;
              animation: dot-appear 2.8s ease-in-out infinite;
            }
            @keyframes enso-draw {
              0% {
                stroke-dashoffset: 520;
                opacity: 0.3;
              }
              8% {
                opacity: 1;
              }
              60% {
                stroke-dashoffset: 40;
                opacity: 1;
              }
              75% {
                stroke-dashoffset: 40;
                opacity: 1;
              }
              100% {
                stroke-dashoffset: 40;
                opacity: 0;
              }
            }
            @keyframes dot-appear {
              0%, 55% { opacity: 0; transform: scale(0); }
              65% { opacity: 1; transform: scale(1); }
              75% { opacity: 1; }
              100% { opacity: 0; }
            }
          `}</style>
          <filter id="brush" x="-3%" y="-3%" width="106%" height="106%">
            <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.5" />
          </filter>
        </defs>

        {/* Ensō circle — drawn like a brush stroke */}
        <circle
          className="enso-circle"
          cx="100"
          cy="100"
          r="78"
          fill="none"
          stroke="hsl(var(--accent))"
          strokeWidth="7"
          strokeLinecap="round"
          transform="rotate(-90 100 100)"
        />
      </svg>

      <p className="text-sm text-muted-foreground font-medium tracking-wide animate-pulse">
        Preparando o tatame...
      </p>
    </div>
  );
}
