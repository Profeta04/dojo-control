import { useAuth } from "@/hooks/useAuth";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  LayoutDashboard, Users, GraduationCap, CreditCard, ClipboardList,
  CalendarDays, Trophy, TrendingUp, ClipboardCheck, Settings, Landmark,
} from "lucide-react";

interface Tutorial {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  steps: string[];
}

const studentTutorials: Tutorial[] = [
  {
    id: "perfil",
    title: "Meu Perfil",
    icon: <LayoutDashboard className="h-5 w-5" />,
    description: "Veja e edite suas informações pessoais, foto e dados de contato.",
    steps: [
      "Acesse a aba 'Dashboard' para ver seu perfil completo.",
      "Clique no avatar para alterar sua foto de perfil.",
      "Edite seus dados de contato como telefone e email.",
      "Veja sua faixa atual e progresso geral.",
    ],
  },
  {
    id: "tarefas",
    title: "Tarefas",
    icon: <ClipboardList className="h-5 w-5" />,
    description: "Complete tarefas para ganhar XP e subir no ranking do dojo.",
    steps: [
      "Acesse a aba 'Tarefas' para ver suas missões pendentes.",
      "Tarefas podem ser quizzes, vídeos ou atividades práticas.",
      "Complete as tarefas e ganhe XP para subir de nível.",
      "Confira o ranking para ver sua posição entre os colegas.",
    ],
  },
  {
    id: "agenda",
    title: "Agenda",
    icon: <CalendarDays className="h-5 w-5" />,
    description: "Veja os horários dos treinos e aulas agendadas.",
    steps: [
      "Acesse a aba 'Agenda' para ver os próximos treinos.",
      "Veja os horários e dias da semana de cada aula.",
      "As aulas canceladas aparecem com indicação visual.",
    ],
  },
  {
    id: "pagamentos",
    title: "Pagamentos",
    icon: <CreditCard className="h-5 w-5" />,
    description: "Acompanhe suas mensalidades e envie comprovantes.",
    steps: [
      "Acesse 'Pagamentos' para ver suas mensalidades.",
      "Envie o comprovante de pagamento clicando no botão de upload.",
      "Acompanhe o status: pendente, pago ou atrasado.",
      "Veja o histórico completo na aba 'Histórico'.",
    ],
  },
  {
    id: "conquistas",
    title: "Conquistas",
    icon: <Trophy className="h-5 w-5" />,
    description: "Desbloqueie conquistas conforme evolui no judô.",
    steps: [
      "Conquistas são desbloqueadas automaticamente ao atingir metas.",
      "Cada conquista dá XP bônus.",
      "Conquistas raras são mais difíceis e valem mais XP.",
    ],
  },
  {
    id: "progresso",
    title: "Meu Progresso",
    icon: <TrendingUp className="h-5 w-5" />,
    description: "Acompanhe sua evolução com gráficos e estatísticas.",
    steps: [
      "Veja seu progresso de presenças ao longo do tempo.",
      "Acompanhe sua linha do tempo de graduações.",
      "Confira suas estatísticas gerais de desempenho.",
    ],
  },
];

const senseiTutorials: Tutorial[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
    description: "Visão geral do dojo com estatísticas e métricas.",
    steps: [
      "Veja o total de alunos, presenças e pagamentos.",
      "Acompanhe gráficos de evolução do dojo.",
      "Exporte relatórios em PDF.",
    ],
  },
  {
    id: "alunos",
    title: "Gestão de Alunos",
    icon: <Users className="h-5 w-5" />,
    description: "Aprove, gerencie e acompanhe todos os alunos.",
    steps: [
      "Novos alunos aparecem como 'Pendentes' para aprovação.",
      "Ao aprovar, defina a faixa e adicione a uma turma.",
      "Veja dados completos de cada aluno clicando no nome.",
      "Use os filtros para encontrar alunos rapidamente.",
    ],
  },
  {
    id: "turmas",
    title: "Turmas",
    icon: <GraduationCap className="h-5 w-5" />,
    description: "Crie e gerencie turmas com horários e alunos.",
    steps: [
      "Crie turmas com nome, arte marcial e horário.",
      "Adicione alunos às turmas manualmente.",
      "Defina horários recorrentes no cronograma.",
      "Desative turmas que não estão mais em uso.",
    ],
  },
  {
    id: "presencas",
    title: "Presenças",
    icon: <ClipboardCheck className="h-5 w-5" />,
    description: "Registre e acompanhe a presença dos alunos.",
    steps: [
      "Selecione a turma e a data para marcar presenças.",
      "Alunos também podem fazer check-in via QR Code.",
      "Veja estatísticas de frequência por aluno.",
    ],
  },
  {
    id: "pagamentos-sensei",
    title: "Pagamentos",
    icon: <CreditCard className="h-5 w-5" />,
    description: "Gerencie cobranças e comprovantes dos alunos.",
    steps: [
      "Gere cobranças mensais automaticamente.",
      "Aprove ou rejeite comprovantes enviados pelos alunos.",
      "Veja o dashboard financeiro com métricas.",
      "Exporte relatórios financeiros em PDF.",
    ],
  },
  {
    id: "graduacoes",
    title: "Graduações",
    icon: <Trophy className="h-5 w-5" />,
    description: "Registre graduações e avanços de faixa.",
    steps: [
      "Selecione o aluno e a nova faixa.",
      "O histórico de graduações fica registrado automaticamente.",
      "A faixa do aluno é atualizada em todo o sistema.",
    ],
  },
  {
    id: "config-dojo",
    title: "Configurações do Dojo",
    icon: <Landmark className="h-5 w-5" />,
    description: "Personalize o dojo com logo, cores e dados.",
    steps: [
      "Adicione o logo e as cores do seu dojo.",
      "Configure a chave PIX para pagamentos.",
      "Gerencie o código de cadastro de novos alunos.",
      "Ajuste as configurações de multa e juros.",
    ],
  },
];

export function HelpTutorials() {
  const { canManageStudents } = useAuth();
  const tutorials = canManageStudents ? senseiTutorials : studentTutorials;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Clique em cada item para ver o passo-a-passo de como usar cada funcionalidade.
      </p>
      <Accordion type="single" collapsible className="w-full space-y-2">
        {tutorials.map((tutorial) => (
          <AccordionItem
            key={tutorial.id}
            value={tutorial.id}
            className="border border-border/60 rounded-lg px-4 bg-card"
          >
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-3">
                <span className="text-primary">{tutorial.icon}</span>
                <div className="text-left">
                  <p className="font-medium text-sm">{tutorial.title}</p>
                  <p className="text-xs text-muted-foreground">{tutorial.description}</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground ml-1">
                {tutorial.steps.map((step, i) => (
                  <li key={i} className="leading-relaxed">{step}</li>
                ))}
              </ol>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
