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
        top: r.top - padding,
        left: r.left - padding,
        width: r.width + padding * 2,
        height: r.height + padding * 2,
      });
    } else {
      setRect(null);
    }
  }, [step]);

  useEffect(() => {
    if (!step) return;
    // Scroll element into view first, then measure
    const el = document.querySelector(step.selector);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      // Wait for scroll to settle before measuring
      const timer = setTimeout(updateRect, 400);
      return () => clearTimeout(timer);
    } else {
      setRect(null);
    }
  }, [currentStep, step]);

  useEffect(() => {
    const handleScrollResize = () => updateRect();
    window.addEventListener("resize", handleScrollResize);
    window.addEventListener("scroll", handleScrollResize, true);
    return () => {
      window.removeEventListener("resize", handleScrollResize);
      window.removeEventListener("scroll", handleScrollResize, true);
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

  // Clamp tooltip so it doesn't overflow viewport
  const getTooltipStyle = (): React.CSSProperties => {
    if (!rect) return { top: "50%", left: "50%", transform: "translate(-50%, -50%)", position: "fixed" };
    const pos = step?.position || "bottom";
    const gap = 14;
    const tooltipW = 320;
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;

    let top = 0;
    let left = 0;

    switch (pos) {
      case "top":
        top = rect.top - gap;
        left = rect.left + rect.width / 2;
        // Check if tooltip fits above
        if (top < 120) {
          top = rect.top + rect.height + gap;
        } else {
          top = rect.top - gap;
        }
        break;
      case "left":
        top = rect.top + rect.height / 2;
        left = rect.left - gap - tooltipW;
        if (left < 8) left = rect.left + rect.width + gap;
        break;
      case "right":
        top = rect.top + rect.height / 2;
        left = rect.left + rect.width + gap;
        if (left + tooltipW > viewW - 8) left = rect.left - gap - tooltipW;
        break;
      default: // bottom
        top = rect.top + rect.height + gap;
        left = rect.left + rect.width / 2;
        // If goes below viewport, show above
        if (top + 160 > viewH) {
          top = rect.top - gap - 160;
        }
        break;
    }

    // Clamp horizontal
    const halfW = tooltipW / 2;
    if (pos === "top" || pos === "bottom") {
      left = Math.max(halfW + 8, Math.min(left, viewW - halfW - 8));
      return {
        position: "fixed",
        top,
        left,
        transform: pos === "top" && rect.top - gap >= 120 ? "translate(-50%, -100%)" : "translateX(-50%)",
      };
    }

    return {
      position: "fixed",
      top,
      left,
      transform: "translateY(-50%)",
    };
  };

  return (
    <>
      {/* Overlay that allows scroll-through via pointer-events */}
      <div className="fixed inset-0 z-[9998] pointer-events-none">
        <svg className="absolute inset-0 w-full h-full">
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
            fill="rgba(0,0,0,0.55)"
            mask="url(#tour-spotlight-mask)"
          />
        </svg>
      </div>

      {/* Spotlight ring - fixed position */}
      {rect && (
        <motion.div
          key={currentStep}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed rounded-lg ring-2 ring-accent ring-offset-2 ring-offset-transparent pointer-events-none z-[9999]"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          }}
        />
      )}

      {/* Tooltip - fixed, above overlay, interactive */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          ref={tooltipRef}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ duration: 0.18 }}
          className={cn(
            "fixed z-[10000] w-72 sm:w-80 bg-popover text-popover-foreground rounded-xl shadow-2xl border border-border p-4"
          )}
          style={getTooltipStyle()}
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
              <Button size="sm" onClick={handleNext} className="h-7 px-3 text-xs bg-accent text-accent-foreground hover:bg-accent/90">
                {isLast ? "Concluir" : "Próximo"}
                {!isLast && <ChevronRight className="h-3.5 w-3.5 ml-1" />}
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
