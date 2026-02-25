import { cn } from "@/lib/utils";

interface DojoLoadingSpinnerProps {
  className?: string;
}

export function DojoLoadingSpinner({ className }: DojoLoadingSpinnerProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-5 w-full", className)}>
      <svg
        viewBox="0 0 320 130"
        className="w-64 sm:w-80 h-auto"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <style>{`
            .belt-back {
              stroke-dasharray: 900;
              stroke-dashoffset: 900;
              animation: belt-draw 2.4s ease-in-out infinite;
            }
            .belt-front {
              stroke-dasharray: 900;
              stroke-dashoffset: 900;
              animation: belt-draw 2.4s ease-in-out infinite;
              animation-delay: 0.15s;
            }
            .belt-tail-l, .belt-tail-r {
              stroke-dasharray: 120;
              stroke-dashoffset: 120;
              animation: tail-draw 2.4s ease-in-out infinite;
            }
            .belt-tail-l { animation-delay: 0.9s; }
            .belt-tail-r { animation-delay: 1.0s; }
            @keyframes belt-draw {
              0% { stroke-dashoffset: 900; }
              50% { stroke-dashoffset: 0; }
              78% { stroke-dashoffset: 0; }
              100% { stroke-dashoffset: -900; }
            }
            @keyframes tail-draw {
              0% { stroke-dashoffset: 120; opacity: 0; }
              8% { opacity: 1; }
              45% { stroke-dashoffset: 0; }
              75% { stroke-dashoffset: 0; opacity: 1; }
              92% { opacity: 0; }
              100% { opacity: 0; }
            }
          `}</style>
        </defs>

        {/* Back layer of the cross — goes UNDER */}
        <path
          className="belt-back"
          d="M -20,55 C 80,55 120,55 145,45 Q 160,38 175,55 C 200,80 220,55 340,55"
          stroke="hsl(var(--accent) / 0.5)"
          strokeWidth="16"
          strokeLinecap="round"
          fill="none"
        />

        {/* Front layer of the cross — goes OVER */}
        <path
          className="belt-front"
          d="M -20,55 C 80,55 120,55 145,65 Q 160,72 175,55 C 200,30 220,55 340,55"
          stroke="hsl(var(--accent))"
          strokeWidth="16"
          strokeLinecap="round"
          fill="none"
        />

        {/* Left tail */}
        <path
          className="belt-tail-l"
          d="M 148,58 Q 142,80 134,105"
          stroke="hsl(var(--accent))"
          strokeWidth="14"
          strokeLinecap="round"
          fill="none"
        />

        {/* Right tail */}
        <path
          className="belt-tail-r"
          d="M 172,58 Q 178,80 186,105"
          stroke="hsl(var(--accent))"
          strokeWidth="14"
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
