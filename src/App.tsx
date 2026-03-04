import { lazy, Suspense, ComponentType } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AuthProvider } from "@/hooks/useAuth";
import { DojoProvider } from "@/hooks/useDojoContext";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import { PageTransition } from "@/components/shared/PageTransition";
import { DojoLoadingSpinner } from "@/components/shared/DojoLoadingSpinner";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { PWAInstallGate } from "@/components/pwa/PWAInstallGate";

// Retry wrapper for lazy imports (handles chunk load failures in PWA)
function lazyRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): React.LazyExoticComponent<T> {
  return lazy(() =>
    factory().catch(() =>
      // Wait 1s and retry once on chunk load failure
      new Promise<{ default: T }>((resolve) =>
        setTimeout(() => resolve(factory()), 1000)
      )
    )
  );
}

// Lazy load all pages with retry
const Index = lazyRetry(() => import("./pages/Index"));
const Auth = lazyRetry(() => import("./pages/Auth"));
const ResetPassword = lazyRetry(() => import("./pages/ResetPassword"));
const Dashboard = lazyRetry(() => import("./pages/Dashboard"));
const Students = lazyRetry(() => import("./pages/Students"));
const Senseis = lazyRetry(() => import("./pages/Senseis"));
const Classes = lazyRetry(() => import("./pages/Classes"));
const StudentAgenda = lazyRetry(() => import("./pages/StudentAgenda"));
const Graduations = lazyRetry(() => import("./pages/Graduations"));
const Payments = lazyRetry(() => import("./pages/Payments"));
const PaymentHistory = lazyRetry(() => import("./pages/PaymentHistory"));
const StudentPayments = lazyRetry(() => import("./pages/StudentPayments"));
const Settings = lazyRetry(() => import("./pages/Settings"));
const StudentProfile = lazyRetry(() => import("./pages/StudentProfile"));

const StudentTasks = lazyRetry(() => import("./pages/StudentTasks"));
const StudentConfig = lazyRetry(() => import("./pages/StudentConfig"));
const StudentProgress = lazyRetry(() => import("./pages/StudentProgress"));
const Checkin = lazyRetry(() => import("./pages/Checkin"));
const Scanner = lazyRetry(() => import("./pages/Scanner"));
const Attendance = lazyRetry(() => import("./pages/Attendance"));
const StudentAchievements = lazyRetry(() => import("./pages/StudentAchievements"));
const StudentMyProgress = lazyRetry(() => import("./pages/StudentMyProgress"));
const StudentPaymentHistory = lazyRetry(() => import("./pages/StudentPaymentHistory"));
const SubscriptionApprovals = lazyRetry(() => import("./pages/SubscriptionApprovals"));
const Plans = lazyRetry(() => import("./pages/Plans"));
const Help = lazyRetry(() => import("./pages/Help"));
const NotFound = lazyRetry(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Suspense
        key={location.pathname}
        fallback={<div className="min-h-screen flex items-center justify-center bg-background"><DojoLoadingSpinner /></div>}
      >
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageTransition><Index /></PageTransition>} />
          <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
          <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
          <Route path="/dashboard" element={<PageTransition><Dashboard /></PageTransition>} />
          <Route path="/students" element={<PageTransition><Students /></PageTransition>} />
          <Route path="/senseis" element={<PageTransition><Senseis /></PageTransition>} />
          <Route path="/classes" element={<PageTransition><Classes /></PageTransition>} />
          <Route path="/agenda" element={<PageTransition><StudentAgenda /></PageTransition>} />
          <Route path="/payments" element={<PageTransition><Payments /></PageTransition>} />
          <Route path="/mensalidade" element={<PageTransition><StudentPayments /></PageTransition>} />
          <Route path="/payment-history" element={<PageTransition><PaymentHistory /></PageTransition>} />
          <Route path="/graduations" element={<PageTransition><Graduations /></PageTransition>} />
          <Route path="/settings" element={<PageTransition><Settings /></PageTransition>} />
          <Route path="/perfil" element={<PageTransition><StudentProfile /></PageTransition>} />
          
          <Route path="/tarefas" element={<PageTransition><StudentTasks /></PageTransition>} />
          <Route path="/config" element={<PageTransition><StudentConfig /></PageTransition>} />
          <Route path="/progresso" element={<PageTransition><StudentProgress /></PageTransition>} />
          <Route path="/checkin/:token" element={<PageTransition><Checkin /></PageTransition>} />
          <Route path="/scanner" element={<PageTransition><Scanner /></PageTransition>} />
          <Route path="/attendance" element={<PageTransition><Attendance /></PageTransition>} />
          <Route path="/conquistas" element={<PageTransition><StudentAchievements /></PageTransition>} />
          <Route path="/meu-progresso" element={<PageTransition><StudentMyProgress /></PageTransition>} />
          <Route path="/historico-pagamentos" element={<PageTransition><StudentPaymentHistory /></PageTransition>} />
          <Route path="/subscription-approvals" element={<PageTransition><SubscriptionApprovals /></PageTransition>} />
          <Route path="/planos" element={<PageTransition><Plans /></PageTransition>} />
          <Route path="/ajuda" element={<PageTransition><Help /></PageTransition>} />
          <Route path="/compartilhar" element={<PageTransition><StudentPayments /></PageTransition>} />
          <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}

const App = () => (
  <ErrorBoundary>
    <PWAInstallGate>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <DojoProvider>
            <ThemeProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <AnimatedRoutes />
                </BrowserRouter>
              </TooltipProvider>
            </ThemeProvider>
          </DojoProvider>
        </AuthProvider>
      </QueryClientProvider>
    </PWAInstallGate>
  </ErrorBoundary>
);

export default App;
