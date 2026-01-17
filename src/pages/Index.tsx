import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary mb-6">
          <span className="text-5xl">🥋</span>
        </div>
        
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
          Dojo Manager
        </h1>
        
        <p className="text-xl text-muted-foreground mb-8 max-w-md">
          Sistema completo de gestão para seu dojo de judô
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          {user ? (
            <Button asChild size="lg" className="bg-accent hover:bg-accent/90">
              <Link to="/dashboard">Acessar Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild size="lg" className="bg-accent hover:bg-accent/90">
                <Link to="/auth">Entrar</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/auth">Criar Conta</Link>
              </Button>
            </>
          )}
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mt-16 max-w-4xl">
          <div className="p-6 rounded-lg bg-card border border-border">
            <div className="text-3xl mb-3">👥</div>
            <h3 className="font-semibold mb-2">Gestão de Alunos</h3>
            <p className="text-sm text-muted-foreground">Cadastro, aprovação e acompanhamento completo</p>
          </div>
          <div className="p-6 rounded-lg bg-card border border-border">
            <div className="text-3xl mb-3">📅</div>
            <h3 className="font-semibold mb-2">Controle de Turmas</h3>
            <p className="text-sm text-muted-foreground">Agenda, presenças e organização das aulas</p>
          </div>
          <div className="p-6 rounded-lg bg-card border border-border">
            <div className="text-3xl mb-3">🏆</div>
            <h3 className="font-semibold mb-2">Graduações</h3>
            <p className="text-sm text-muted-foreground">Histórico completo de faixas e progressão</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-muted-foreground border-t border-border">
        <p>© {new Date().getFullYear()} Dojo Manager - Sistema de Gestão de Judô</p>
      </footer>
    </div>
  );
};

export default Index;
