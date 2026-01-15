import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Senseis from "./pages/Senseis";
import Classes from "./pages/Classes";
import Attendance from "./pages/Attendance";
import Graduations from "./pages/Graduations";
import Payments from "./pages/Payments";
import StudentPayments from "./pages/StudentPayments";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/students" element={<Students />} />
            <Route path="/senseis" element={<Senseis />} />
            <Route path="/classes" element={<Classes />} />
            <Route path="/schedule" element={<Dashboard />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/mensalidade" element={<StudentPayments />} />
            <Route path="/graduations" element={<Graduations />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
