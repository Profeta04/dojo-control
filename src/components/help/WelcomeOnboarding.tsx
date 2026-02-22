import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Slide {
  title: string;
  description: string;
  emoji: string;
}

const studentSlides: Slide[] = [
  {
    emoji: "🥋",
    title: "Bem-vindo ao Dojo Control!",
    description: "Seu aplicativo completo para acompanhar sua jornada nas artes marciais. Aqui você gerencia treinos, tarefas, pagamentos e muito mais!",
  },
  {
    emoji: "📋",
    title: "Complete Tarefas e Ganhe XP",
    description: "Você receberá tarefas e quizzes do seu sensei. Complete-as para ganhar pontos de experiência e subir no ranking do dojo!",
  },
  {
    emoji: "📱",
    title: "Check-in nos Treinos",
    description: "Use o QR Code do dojo para registrar sua presença nos treinos. Sua frequência é acompanhada automaticamente.",
  },
  {
    emoji: "🚀",
    title: "Explore e Evolua!",
    description: "Use o menu inferior para navegar entre as abas. Se tiver dúvidas, acesse a aba 'Ajuda' a qualquer momento. Oss! 🙏",
  },
];

const senseiSlides: Slide[] = [
  {
    emoji: "🥋",
    title: "Bem-vindo ao Dojo Control!",
    description: "Sua plataforma completa de gestão para o dojo. Gerencie alunos, turmas, presenças, pagamentos e muito mais, tudo em um só lugar!",
  },
  {
    emoji: "👥",
    title: "Gerencie seus Alunos",
    description: "Aprove novos cadastros, acompanhe o progresso de cada aluno, registre graduações e organize turmas facilmente.",
  },
  {
    emoji: "💰",
    title: "Controle Financeiro",
    description: "Gere cobranças mensais, acompanhe pagamentos, aprove comprovantes e exporte relatórios financeiros em PDF.",
  },
  {
    emoji: "⚙️",
    title: "Personalize seu Dojo",
    description: "Configure o logo, cores, chave PIX e outras opções do dojo em 'Configurações'. Se precisar de ajuda, acesse a aba 'Ajuda'. Oss! 🙏",
  },
];

export function WelcomeOnboarding() {
  const { canManageStudents, user } = useAuth();
  const { welcomeSeen, isLoading, markWelcomeSeen } = useOnboarding();
  const [step, setStep] = useState(0);

  const slides = canManageStudents ? senseiSlides : studentSlides;
  const isOpen = !!user && !isLoading && !welcomeSeen;

  const handleNext = () => {
    if (step < slides.length - 1) {
      setStep(step + 1);
    } else {
      markWelcomeSeen();
    }
  };

  const handlePrev = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSkip = () => {
    markWelcomeSeen();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="sr-only">Tutorial de boas-vindas</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center text-center py-4 space-y-4">
          <span className="text-6xl">{slides[step].emoji}</span>
          <h2 className="text-xl font-bold text-foreground">{slides[step].title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
            {slides[step].description}
          </p>

          {/* Step indicators */}
          <div className="flex gap-2 pt-2">
            {slides.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-300",
                  i === step ? "bg-primary w-6" : "bg-muted-foreground/30"
                )}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button variant="ghost" size="sm" onClick={handleSkip} className="text-muted-foreground">
            Pular
          </Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" size="sm" onClick={handlePrev}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
            )}
            <Button size="sm" onClick={handleNext}>
              {step === slides.length - 1 ? (
                <>
                  <Sparkles className="h-4 w-4 mr-1" />
                  Começar!
                </>
              ) : (
                <>
                  Próximo
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
