import { lazy, Suspense } from "react";
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
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

// Lazy load all pages
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Students = lazy(() => import("./pages/Students"));
const Senseis = lazy(() => import("./pages/Senseis"));
const Classes = lazy(() => import("./pages/Classes"));
const StudentAgenda = lazy(() => import("./pages/StudentAgenda"));
const Graduations = lazy(() => import("./pages/Graduations"));
const Payments = lazy(() => import("./pages/Payments"));
const PaymentHistory = lazy(() => import("./pages/PaymentHistory"));
const StudentPayments = lazy(() => import("./pages/StudentPayments"));
const Settings = lazy(() => import("./pages/Settings"));
const StudentProfile = lazy(() => import("./pages/StudentProfile"));
const StudentTasks = lazy(() => import("./pages/StudentTasks"));
const StudentConfig = lazy(() => import("./pages/StudentConfig"));
const StudentProgress = lazy(() => import("./pages/StudentProgress"));
const Checkin = lazy(() => import("./pages/Checkin"));
const Scanner = lazy(() => import("./pages/Scanner"));
const Attendance = lazy(() => import("./pages/Attendance"));
const StudentAchievements = lazy(() => import("./pages/StudentAchievements"));
const StudentMyProgress = lazy(() => import("./pages/StudentMyProgress"));
const StudentPaymentHistory = lazy(() => import("./pages/StudentPaymentHistory"));
const SubscriptionApprovals = lazy(() => import("./pages/SubscriptionApprovals"));
const Plans = lazy(() => import("./pages/Plans"));
const Help = lazy(() => import("./pages/Help"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 min cache
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><LoadingSpinner /></div>}>
      <AnimatePresence mode="wait">
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
          <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
        </Routes>
      </AnimatePresence>
    </Suspense>
  );
}

const App = () => (
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
);

export default App;
