import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useDojoContext } from "@/hooks/useDojoContext";
import { useDojoSettings } from "@/hooks/useDojoSettings";
import { Users, CalendarDays, Trophy, Shield, ChevronRight } from "lucide-react";
import dojoLogo from "@/assets/dojo-control-logo.png";

const features = [
  { 
    icon: Users, 
    title: "Gestão de Alunos", 
    desc: "Cadastro e acompanhamento completo",
    gradient: "from-blue-500/15 to-blue-600/5",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  { 
    icon: CalendarDays, 
    title: "Controle de Turmas", 
    desc: "Agenda e organização das aulas",
    gradient: "from-emerald-500/15 to-emerald-600/5",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  { 
    icon: Trophy, 
    title: "Graduações", 
    desc: "Histórico de faixas e progressão",
    gradient: "from-amber-500/15 to-amber-600/5",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  { 
    icon: Shield, 
    title: "Presenças", 
    desc: "Controle de frequência",
    gradient: "from-violet-500/15 to-violet-600/5",
    iconColor: "text-violet-600 dark:text-violet-400",
  },
];

const Index = () => {
  const { user, isStudent, canManageStudents } = useAuth();
  const { userDojos } = useDojoContext();
  const { settings } = useDojoSettings();
  const isStudentOnly = isStudent && !canManageStudents;
  const homeLink = isStudentOnly ? "/perfil" : "/dashboard";

  const currentDojo = userDojos.length > 0 ? userDojos[0] : null;
  const subtitle = user && settings.welcome_message
    ? settings.welcome_message
    : "Sistema completo de gestão para seu dojo de judô";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:p-8 text-center safe-area-inset relative">
        {/* Decorative background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-accent/[0.04] rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col items-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-accent/10 rounded-full blur-xl scale-150" />
            <img src={dojoLogo} alt="Dojo Control" className="relative w-24 h-24 sm:w-28 sm:h-28 border-2 border-border rounded-full shadow-xl" />
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-foreground mb-3 sm:mb-4 tracking-tight">
            Dojo Control
          </h1>
          
          <p className="text-base sm:text-lg text-muted-foreground mb-8 sm:mb-10 max-w-md px-2 leading-relaxed">
            {subtitle}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs sm:max-w-none sm:w-auto">
            {user ? (
              <Button asChild size="lg" className="bg-accent hover:bg-accent/90 h-12 sm:h-11 text-base font-semibold w-full sm:w-auto shadow-lg shadow-accent/20">
                <Link to={homeLink} className="flex items-center justify-center gap-2">
                  {isStudentOnly ? "Acessar Perfil" : "Acessar Dashboard"}
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg" className="bg-accent hover:bg-accent/90 h-12 sm:h-11 text-base font-semibold w-full sm:w-auto shadow-lg shadow-accent/20">
                  <Link to="/auth">Entrar</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-12 sm:h-11 text-base font-semibold w-full sm:w-auto border-border/80">
                  <Link to="/auth">Criar Conta</Link>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5 mt-12 sm:mt-16 w-full max-w-4xl px-2 relative z-10">
          {features.map(({ icon: Icon, title, desc, gradient, iconColor }) => (
            <div 
              key={title} 
              className="p-5 sm:p-6 rounded-2xl bg-card border border-border/60 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            >
              <div className={`flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} mb-4 mx-auto`}>
                <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${iconColor}`} />
              </div>
              <h3 className="font-bold mb-1.5 text-sm sm:text-base text-card-foreground">{title}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 sm:py-6 text-center text-xs sm:text-sm text-muted-foreground border-t border-border/60 px-4 safe-area-inset-bottom">
        <p>© {new Date().getFullYear()} Dojo Control - Sistema de Gestão de Judô</p>
      </footer>
    </div>
  );
};

export default Index;
