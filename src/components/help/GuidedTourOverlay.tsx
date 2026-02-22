import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { TourStep } from "./tourData";

interface GuidedTourOverlayProps {
  steps: TourStep[];
  onFinish: () => void;
}

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function GuidedTourOverlay({ steps, onFinish }: GuidedTourOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  const updateRect = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(step.selector);
    if (el) {
      const r = el.getBoundingClientRect();
      const padding = 6;
      setRect({
        top: r.top - padding + window.scrollY,
        left: r.left - padding,
        width: r.width + padding * 2,
        height: r.height + padding * 2,
      });
      // scroll element into view
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      setRect(null);
    }
  }, [step]);

  useEffect(() => {
    updateRect();
    const timer = setTimeout(updateRect, 300);
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [updateRect]);

  const handleNext = () => {
    if (isLast) {
      onFinish();
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) setCurrentStep((s) => s - 1);
  };

  // Tooltip position relative to spotlight
  const getTooltipStyle = (): React.CSSProperties => {
    if (!rect) return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    const pos = step?.position || "bottom";
    const gap = 16;

    switch (pos) {
      case "top":
        return {
          top: rect.top - gap,
          left: rect.left + rect.width / 2,
          transform: "translate(-50%, -100%)",
        };
      case "bottom":
        return {
          top: rect.top + rect.height + gap,
          left: rect.left + rect.width / 2,
          transform: "translateX(-50%)",
        };
      case "left":
        return {
          top: rect.top + rect.height / 2,
          left: rect.left - gap,
          transform: "translate(-100%, -50%)",
        };
      case "right":
        return {
          top: rect.top + rect.height / 2,
          left: rect.left + rect.width + gap,
          transform: "translateY(-50%)",
        };
      default:
        return {
          top: rect.top + rect.height + gap,
          left: rect.left + rect.width / 2,
          transform: "translateX(-50%)",
        };
    }
  };

  // Arrow pointing to the element
  const getArrowClass = () => {
    const pos = step?.position || "bottom";
    switch (pos) {
      case "bottom":
        return "before:absolute before:-top-2 before:left-1/2 before:-translate-x-1/2 before:border-8 before:border-transparent before:border-b-popover";
      case "top":
        return "before:absolute before:-bottom-2 before:left-1/2 before:-translate-x-1/2 before:border-8 before:border-transparent before:border-t-popover";
      case "left":
        return "before:absolute before:top-1/2 before:-right-2 before:-translate-y-1/2 before:border-8 before:border-transparent before:border-l-popover";
      case "right":
        return "before:absolute before:top-1/2 before:-left-2 before:-translate-y-1/2 before:border-8 before:border-transparent before:border-r-popover";
      default:
        return "";
    }
  };

  return (
    <div className="fixed inset-0 z-[9999]" onClick={(e) => e.stopPropagation()}>
      {/* Dark overlay with cutout */}
      <svg className="absolute inset-0 w-full h-full" style={{ height: document.documentElement.scrollHeight }}>
        <defs>
          <mask id="tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {rect && (
              <rect
                x={rect.left}
                y={rect.top}
                width={rect.width}
                height={rect.height}
                rx="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.6)"
          mask="url(#tour-spotlight-mask)"
        />
      </svg>

      {/* Spotlight ring */}
      {rect && (
        <motion.div
          key={currentStep}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-transparent pointer-events-none"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          }}
        />
      )}

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          ref={tooltipRef}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "absolute z-[10000] w-72 sm:w-80 bg-popover text-popover-foreground rounded-xl shadow-2xl border border-border p-4",
            getArrowClass()
          )}
          style={{ ...getTooltipStyle(), position: "absolute" }}
        >
          {/* Close */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-6 w-6"
            onClick={onFinish}
          >
            <X className="h-3.5 w-3.5" />
          </Button>

          <p className="text-sm font-bold text-foreground pr-6">{step?.title}</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {step?.description}
          </p>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-muted-foreground">
              {currentStep + 1} / {steps.length}
            </span>
            <div className="flex gap-2">
              {!isFirst && (
                <Button size="sm" variant="ghost" onClick={handlePrev} className="h-7 px-2 text-xs">
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                  Anterior
                </Button>
              )}
              <Button size="sm" onClick={handleNext} className="h-7 px-3 text-xs">
                {isLast ? "Concluir" : "Próximo"}
                {!isLast && <ChevronRight className="h-3.5 w-3.5 ml-1" />}
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
