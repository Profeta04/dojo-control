import { useXP } from "@/hooks/useXP";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, ArrowUp } from "lucide-react";
import { useState, useEffect } from "react";

interface XPNotificationProps {
  xpAmount: number;
  multiplier: number;
  leveledUp: boolean;
  newLevel: number;
  show: boolean;
  onComplete: () => void;
}

export function XPNotification({ xpAmount, multiplier, leveledUp, newLevel, show, onComplete }: XPNotificationProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onComplete, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-2"
          initial={{ opacity: 0, y: 30, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          {leveledUp && (
            <motion.div
              className="px-4 py-2 rounded-xl bg-accent text-accent-foreground shadow-xl shadow-accent/30 flex items-center gap-2"
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ delay: 0.3 }}
            >
              <ArrowUp className="h-4 w-4" />
              <span className="text-sm font-bold">Nível {newLevel}!</span>
            </motion.div>
          )}
          <motion.div
            className="px-4 py-2 rounded-xl bg-card border border-accent/30 shadow-xl flex items-center gap-2"
            initial={{ x: 20 }}
            animate={{ x: 0 }}
          >
            <Zap className="h-4 w-4 text-accent" />
            <span className="text-sm font-bold text-accent">+{xpAmount} XP</span>
            {multiplier > 1 && (
              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                {multiplier}x streak
              </span>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
