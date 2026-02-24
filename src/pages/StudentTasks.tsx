import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { RequireApproval } from "@/components/auth/RequireApproval";
import { StudentTasksDashboard } from "@/components/tasks/StudentTasksDashboard";
import { LeaderboardPanel } from "@/components/gamification/LeaderboardPanel";
import { XPBar } from "@/components/gamification/XPBar";
import { Crown, ClipboardList } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function StudentTasks() {
  const { loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<"missions" | "ranking">("missions");

  if (authLoading) {
    return <DashboardLayout><LoadingSpinner /></DashboardLayout>;
  }

  return (
    <RequireApproval>
      <DashboardLayout>
        <PageHeader
          title="Tarefas"
          description="Complete tarefas, ganhe XP e suba no ranking!" />

        {/* XP Bar - collapses when ranking is active */}
        <AnimatePresence>
          {activeTab === "missions" && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: "auto", marginTop: 16, marginBottom: 24 }}
              exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <XPBar />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Custom tab buttons */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-muted/50 mb-6">
          <button
            onClick={() => setActiveTab("missions")}
            className={cn(
              "flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-200",
              activeTab === "missions"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ClipboardList className="h-4 w-4" />
            Tarefas
          </button>
          <button
            onClick={() => setActiveTab("ranking")}
            className={cn(
              "flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-200",
              activeTab === "ranking"
                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Crown className="h-4 w-4" />
            Ranking
          </button>
        </div>

        {/* Content with animation */}
        <AnimatePresence mode="wait">
          {activeTab === "missions" && (
            <motion.div
              key="missions"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <StudentTasksDashboard />
            </motion.div>
          )}
          {activeTab === "ranking" && (
            <motion.div
              key="ranking"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <LeaderboardPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </DashboardLayout>
    </RequireApproval>
  );
}
