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
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Senseis from "./pages/Senseis";
import Classes from "./pages/Classes";
import StudentAgenda from "./pages/StudentAgenda";
import Graduations from "./pages/Graduations";
import Payments from "./pages/Payments";
import PaymentHistory from "./pages/PaymentHistory";
import StudentPayments from "./pages/StudentPayments";
import Settings from "./pages/Settings";
import StudentProfile from "./pages/StudentProfile";
import StudentTasks from "./pages/StudentTasks";
import StudentConfig from "./pages/StudentConfig";
import StudentProgress from "./pages/StudentProgress";
import Checkin from "./pages/Checkin";
import Scanner from "./pages/Scanner";
import Attendance from "./pages/Attendance";
import StudentAchievements from "./pages/StudentAchievements";
import StudentMyProgress from "./pages/StudentMyProgress";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AnimatedRoutes() {
  const location = useLocation();
  
  return (
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
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
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
