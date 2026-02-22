import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
  const [ready, setReady] = useState(false);

  // Filter to only steps whose elements exist in the DOM
  const [visibleSteps, setVisibleSteps] = useState<TourStep[]>([]);

  useEffect(() => {
    const available = steps.filter((s) => document.querySelector(s.selector));
    setVisibleSteps(available.length > 0 ? available : steps);
  }, [steps]);

  const step = visibleSteps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === visibleSteps.length - 1;

  const measure = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(step.selector);
    if (el) {
      const r = el.getBoundingClientRect();
      const pad = 6;
      setRect({
        top: r.top - pad,
        left: r.left - pad,
        width: r.width + pad * 2,
        height: r.height + pad * 2,
      });
    } else {
      setRect(null);
    }
  }, [step]);

  // On step change: scroll into view then measure
  useEffect(() => {
    setReady(false);
    if (!step) return;
    const el = document.querySelector(step.selector);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      // Re-measure after scroll settles
      const t1 = setTimeout(() => { measure(); setReady(true); }, 500);
      return () => clearTimeout(t1);
    } else {
      setRect(null);
      setReady(true);
    }
  }, [currentStep, step, measure]);

  // Keep in sync on scroll/resize
  useEffect(() => {
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure]);

  const handleNext = () => (isLast ? onFinish() : setCurrentStep((s) => s + 1));
  const handlePrev = () => { if (!isFirst) setCurrentStep((s) => s - 1); };

  const getTooltipStyle = (): React.CSSProperties => {
    const margin = 10;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const tw = Math.min(vw - margin * 2, 320);

    if (!rect) {
      return { position: "fixed", top: vh / 2 - 80, left: (vw - tw) / 2, width: tw };
    }

    const gap = 12;
    const estH = 170; // estimated tooltip height

    // Prefer below, fallback above, fallback center
    let top: number;
    if (rect.top + rect.height + gap + estH <= vh - margin) {
      top = rect.top + rect.height + gap;
    } else if (rect.top - gap - estH >= margin) {
      top = rect.top - gap - estH;
    } else {
      top = Math.max(margin, Math.min(vh / 2 - estH / 2, vh - estH - margin));
    }

    // Clamp top
    top = Math.max(margin, Math.min(top, vh - estH - margin));

    // Center on element, clamp to viewport
    let left = rect.left + rect.width / 2 - tw / 2;
    left = Math.max(margin, Math.min(left, vw - tw - margin));

    return { position: "fixed", top, left, width: tw };
  };

  if (!ready && !rect) return null;

  return (
    <>
      {/* Dark overlay with spotlight cutout – pointer-events-none so scroll works */}
      <div className="fixed inset-0 z-[9998] pointer-events-none">
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <mask id="tour-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {rect && (
                <rect x={rect.left} y={rect.top} width={rect.width} height={rect.height} rx="8" fill="black" />
              )}
            </mask>
          </defs>
          <rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.55)" mask="url(#tour-mask)" />
        </svg>
      </div>

      {/* Highlight ring */}
      {rect && (
        <motion.div
          key={`ring-${currentStep}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed rounded-lg ring-2 ring-accent ring-offset-2 ring-offset-transparent pointer-events-none z-[9999]"
          style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
        />
      )}

      {/* Tooltip card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`tip-${currentStep}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.2 }}
          className="fixed z-[10000] bg-popover text-popover-foreground rounded-xl shadow-2xl border border-border p-4"
          style={getTooltipStyle()}
        >
          <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={onFinish}>
            <X className="h-3.5 w-3.5" />
          </Button>

          <p className="text-sm font-bold text-foreground pr-6">{step?.title}</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{step?.description}</p>

          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-muted-foreground">{currentStep + 1} / {visibleSteps.length}</span>
            <div className="flex gap-2">
              {!isFirst && (
                <Button size="sm" variant="ghost" onClick={handlePrev} className="h-7 px-2 text-xs">
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Anterior
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
