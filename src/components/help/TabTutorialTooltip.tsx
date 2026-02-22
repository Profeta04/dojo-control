import { useOnboarding } from "@/hooks/useOnboarding";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { X, Lightbulb } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TabTutorialConfig {
  tabId: string;
  title: string;
  description: string;
  tip?: string;
}

// Define tutorials for each tab - student
const studentTabTutorials: Record<string, TabTutorialConfig> = {
  "/perfil": {
    tabId: "perfil",
    title: "Seu Perfil",
    description: "Aqui você vê seu card de perfil, barra de XP e conquistas recentes. Toque no avatar para editar sua foto!",
    tip: "Mantenha seus dados atualizados para o sensei.",
  },
  "/tarefas": {
    tabId: "tarefas",
    title: "Suas Tarefas",
    description: "Complete tarefas e quizzes para ganhar XP. Use as abas para alternar entre missões, conquistas e ranking.",
    tip: "Tarefas com prazo dão XP bônus se completadas a tempo!",
  },
  "/agenda": {
    tabId: "agenda",
    title: "Agenda de Treinos",
    description: "Veja os próximos treinos da semana. Os horários são definidos pelo sensei da turma.",
  },
  "/mensalidade": {
    tabId: "mensalidade",
    title: "Seus Pagamentos",
    description: "Aqui você vê suas mensalidades. Envie o comprovante de pagamento para o sensei aprovar.",
    tip: "Mantenha os pagamentos em dia para evitar bloqueios.",
  },
  "/conquistas": {
    tabId: "conquistas",
    title: "Conquistas",
    description: "Desbloqueie conquistas conforme evolui. Cada uma dá XP bônus e mostra seu progresso!",
  },
  "/meu-progresso": {
    tabId: "meu-progresso",
    title: "Seu Progresso",
    description: "Acompanhe sua evolução com gráficos de presença e linha do tempo de graduações.",
  },
};

// Define tutorials for each tab - sensei/admin
const senseiTabTutorials: Record<string, TabTutorialConfig> = {
  "/dashboard": {
    tabId: "dashboard",
    title: "Dashboard",
    description: "Visão geral do dojo com estatísticas de alunos, presenças e pagamentos. Exporte relatórios em PDF.",
  },
  "/students": {
    tabId: "students",
    title: "Gestão de Alunos",
    description: "Veja alunos aprovados e pendentes. Aprove novos cadastros definindo faixa e turma.",
    tip: "Use a busca para encontrar alunos rapidamente.",
  },
  "/classes": {
    tabId: "classes",
    title: "Turmas",
    description: "Crie e gerencie turmas. Defina horários, arte marcial e adicione alunos.",
  },
  "/attendance": {
    tabId: "attendance",
    title: "Presenças",
    description: "Registre a presença dos alunos por turma e data. Alunos também podem fazer check-in via QR Code.",
  },
  "/payments": {
    tabId: "payments",
    title: "Pagamentos",
    description: "Gerencie cobranças e comprovantes. Gere cobranças mensais e aprove pagamentos recebidos.",
  },
  "/graduations": {
    tabId: "graduations",
    title: "Graduações",
    description: "Registre avanços de faixa dos alunos. O histórico fica registrado automaticamente.",
  },
  "/settings": {
    tabId: "settings",
    title: "Configurações do Dojo",
    description: "Personalize logo, cores, PIX e outras opções. Gerencie planos de mensalidade.",
  },
};

interface TabTutorialTooltipProps {
  currentPath: string;
}

export function TabTutorialTooltip({ currentPath }: TabTutorialTooltipProps) {
  const { canManageStudents, user } = useAuth();
  const { hasSeenTab, markTabSeen, welcomeSeen, isLoading } = useOnboarding();

  const tutorials = canManageStudents ? senseiTabTutorials : studentTabTutorials;
  const tutorial = tutorials[currentPath];

  if (!user || isLoading || !welcomeSeen || !tutorial || hasSeenTab(tutorial.tabId)) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="mb-4 p-4 rounded-xl border border-primary/20 bg-primary/5 relative"
      >
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={() => markTabSeen(tutorial.tabId)}
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="flex items-start gap-3 pr-8">
          <Lightbulb className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">{tutorial.title}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{tutorial.description}</p>
            {tutorial.tip && (
              <p className="text-xs text-primary/80 mt-1">💡 {tutorial.tip}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end mt-3">
          <Button size="sm" variant="outline" onClick={() => markTabSeen(tutorial.tabId)}>
            Entendi!
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
