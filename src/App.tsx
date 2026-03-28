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

// Retry wrapper — retries up to 3 times with cache-busting
function lazyRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): React.LazyExoticComponent<T> {
  return lazy(() => {
    const attempt = (retries: number): Promise<{ default: T }> =>
      factory().catch((err) => {
        if (retries <= 0) {
          // Last resort: force full page reload to get fresh chunks
          if (
            err?.message?.includes("Failed to fetch dynamically imported module") ||
            err?.message?.includes("Loading chunk") ||
            err?.message?.includes("error loading dynamically imported module")
          ) {
            window.location.reload();
            // Return a never-resolving promise to avoid rendering errors during reload
            return new Promise<{ default: T }>(() => {});
          }
          throw err;
        }
        return new Promise<{ default: T }>((resolve) =>
          setTimeout(() => resolve(attempt(retries - 1)), 1000 * (4 - retries))
        );
      });
    return attempt(3);
  });
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
const StudentStudies = lazyRetry(() => import("./pages/StudentStudies"));
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
const Announcements = lazyRetry(() => import("./pages/Announcements"));
const ContentManagement = lazyRetry(() => import("./pages/ContentManagement"));
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

const PageFallback = (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <DojoLoadingSpinner />
  </div>
);

/** Wraps a lazy page with its own ErrorBoundary + Suspense so failures are isolated */
function SafePage({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={PageFallback}>
        <PageTransition>{children}</PageTransition>
      </Suspense>
    </ErrorBoundary>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<SafePage><Index /></SafePage>} />
        <Route path="/auth" element={<SafePage><Auth /></SafePage>} />
        <Route path="/reset-password" element={<SafePage><ResetPassword /></SafePage>} />
        <Route path="/dashboard" element={<SafePage><Dashboard /></SafePage>} />
        <Route path="/students" element={<SafePage><Students /></SafePage>} />
        <Route path="/senseis" element={<SafePage><Senseis /></SafePage>} />
        <Route path="/classes" element={<SafePage><Classes /></SafePage>} />
        <Route path="/agenda" element={<SafePage><StudentAgenda /></SafePage>} />
        <Route path="/payments" element={<SafePage><Payments /></SafePage>} />
        <Route path="/mensalidade" element={<SafePage><StudentPayments /></SafePage>} />
        <Route path="/payment-history" element={<SafePage><PaymentHistory /></SafePage>} />
        <Route path="/graduations" element={<SafePage><Graduations /></SafePage>} />
        <Route path="/settings" element={<SafePage><Settings /></SafePage>} />
        <Route path="/perfil" element={<SafePage><StudentProfile /></SafePage>} />
        <Route path="/estudos" element={<SafePage><StudentStudies /></SafePage>} />
        <Route path="/config" element={<SafePage><StudentConfig /></SafePage>} />
        <Route path="/progresso" element={<SafePage><StudentProgress /></SafePage>} />
        <Route path="/checkin/:token" element={<SafePage><Checkin /></SafePage>} />
        <Route path="/scanner" element={<SafePage><Scanner /></SafePage>} />
        <Route path="/attendance" element={<SafePage><Attendance /></SafePage>} />
        <Route path="/conquistas" element={<SafePage><StudentAchievements /></SafePage>} />
        <Route path="/meu-progresso" element={<SafePage><StudentMyProgress /></SafePage>} />
        <Route path="/historico-pagamentos" element={<SafePage><StudentPaymentHistory /></SafePage>} />
        <Route path="/subscription-approvals" element={<SafePage><SubscriptionApprovals /></SafePage>} />
        <Route path="/planos" element={<SafePage><Plans /></SafePage>} />
        <Route path="/ajuda" element={<SafePage><Help /></SafePage>} />
        <Route path="/announcements" element={<SafePage><Announcements /></SafePage>} />
        <Route path="/conteudo" element={<SafePage><ContentManagement /></SafePage>} />
        <Route path="/compartilhar" element={<SafePage><StudentPayments /></SafePage>} />
        <Route path="*" element={<SafePage><NotFound /></SafePage>} />
      </Routes>
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
