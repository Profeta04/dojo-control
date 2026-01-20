import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Users, CalendarDays, Trophy, Shield, ChevronRight } from "lucide-react";

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:p-8 text-center safe-area-inset">
        <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary mb-4 sm:mb-6 shadow-lg">
          <span className="text-4xl sm:text-5xl">🥋</span>
        </div>
        
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3 sm:mb-4 tracking-tight">
          Dojo Manager
        </h1>
        
        <p className="text-base sm:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-md px-2">
          Sistema completo de gestão para seu dojo de judô
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs sm:max-w-none sm:w-auto">
          {user ? (
            <Button asChild size="lg" className="bg-accent hover:bg-accent/90 h-12 sm:h-11 text-base w-full sm:w-auto">
              <Link to="/dashboard" className="flex items-center justify-center gap-2">
                Acessar Dashboard
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild size="lg" className="bg-accent hover:bg-accent/90 h-12 sm:h-11 text-base w-full sm:w-auto">
                <Link to="/auth">Entrar</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 sm:h-11 text-base w-full sm:w-auto">
                <Link to="/auth">Criar Conta</Link>
              </Button>
            </>
          )}
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-10 sm:mt-16 w-full max-w-4xl px-2">
          <div className="p-4 sm:p-6 rounded-xl bg-card border border-border shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-accent/10 mb-3 mx-auto">
              <Users className="h-6 w-6 text-accent" />
            </div>
            <h3 className="font-semibold mb-1.5 text-sm sm:text-base">Gestão de Alunos</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">Cadastro e acompanhamento completo</p>
          </div>
          <div className="p-4 sm:p-6 rounded-xl bg-card border border-border shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-accent/10 mb-3 mx-auto">
              <CalendarDays className="h-6 w-6 text-accent" />
            </div>
            <h3 className="font-semibold mb-1.5 text-sm sm:text-base">Controle de Turmas</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">Agenda e organização das aulas</p>
          </div>
          <div className="p-4 sm:p-6 rounded-xl bg-card border border-border shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-accent/10 mb-3 mx-auto">
              <Trophy className="h-6 w-6 text-accent" />
            </div>
            <h3 className="font-semibold mb-1.5 text-sm sm:text-base">Graduações</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">Histórico de faixas e progressão</p>
          </div>
          <div className="p-4 sm:p-6 rounded-xl bg-card border border-border shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-accent/10 mb-3 mx-auto">
              <Shield className="h-6 w-6 text-accent" />
            </div>
            <h3 className="font-semibold mb-1.5 text-sm sm:text-base">Presenças</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">Controle de frequência</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 sm:py-6 text-center text-xs sm:text-sm text-muted-foreground border-t border-border px-4 safe-area-inset-bottom">
        <p>© {new Date().getFullYear()} Dojo Manager - Sistema de Gestão de Judô</p>
      </footer>
    </div>
  );
};

export default Index;
