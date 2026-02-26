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
  Bell, QrCode, Shield, BarChart3, UserPlus,
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
      "Ative o modo escuro nas configurações do perfil.",
    ],
  },
  {
    id: "tarefas",
    title: "Tarefas e Quizzes",
    icon: <ClipboardList className="h-5 w-5" />,
    description: "Complete tarefas e quizzes para ganhar XP e subir no ranking do dojo.",
    steps: [
      "Acesse a aba 'Tarefas' para ver suas missões pendentes.",
      "Tarefas podem ser quizzes de múltipla escolha, vídeos ou atividades práticas.",
      "Nos quizzes, leia atentamente cada pergunta e selecione a resposta correta.",
      "Complete as tarefas e ganhe XP para subir de nível.",
      "Tarefas são filtradas pela sua faixa atual — conforme avança, novas tarefas aparecem.",
      "Confira o ranking para ver sua posição entre os colegas.",
    ],
  },
  {
    id: "checkin",
    title: "Check-in por QR Code",
    icon: <QrCode className="h-5 w-5" />,
    description: "Registre sua presença nos treinos escaneando o QR Code.",
    steps: [
      "No dia do treino, peça ao sensei para exibir o QR Code do dojo.",
      "Acesse a aba 'Check-in' ou use a câmera do celular.",
      "Escaneie o QR Code para registrar sua presença automaticamente.",
      "A presença via QR Code não pode ser alterada manualmente.",
      "Cada check-in gera XP e contribui para suas conquistas de frequência.",
    ],
  },
  {
    id: "agenda",
    title: "Agenda de Treinos",
    icon: <CalendarDays className="h-5 w-5" />,
    description: "Veja os horários dos treinos e aulas agendadas para a semana.",
    steps: [
      "Acesse a aba 'Agenda' para ver os próximos treinos.",
      "Veja os horários e dias da semana de cada aula.",
      "As aulas canceladas aparecem com indicação visual clara.",
      "Você só vê as aulas das turmas em que está matriculado.",
    ],
  },
  {
    id: "pagamentos",
    title: "Pagamentos e Mensalidades",
    icon: <CreditCard className="h-5 w-5" />,
    description: "Acompanhe suas mensalidades, envie comprovantes e veja o histórico.",
    steps: [
      "Acesse 'Pagamentos' para ver suas mensalidades e cobranças.",
      "Envie o comprovante de pagamento clicando no botão de upload.",
      "Você também pode compartilhar o comprovante diretamente do app do banco.",
      "Acompanhe o status: pendente, pago ou atrasado.",
      "Em caso de atraso, o sistema calcula automaticamente multas e juros conforme política do dojo.",
      "Veja o histórico completo na aba 'Histórico'.",
    ],
  },
  {
    id: "conquistas",
    title: "Conquistas e Recompensas",
    icon: <Trophy className="h-5 w-5" />,
    description: "Desbloqueie conquistas conforme evolui na arte marcial.",
    steps: [
      "Conquistas são desbloqueadas automaticamente ao atingir metas específicas.",
      "Cada conquista dá XP bônus — conquistas raras valem mais.",
      "Categorias incluem: frequência, graduação, tarefas e social.",
      "Algumas conquistas são anuais e resetam a cada ano.",
      "Confira todas as conquistas disponíveis e seu progresso na aba 'Conquistas'.",
    ],
  },
  {
    id: "progresso",
    title: "Meu Progresso",
    icon: <TrendingUp className="h-5 w-5" />,
    description: "Acompanhe sua evolução com gráficos, estatísticas e linha do tempo.",
    steps: [
      "Veja seu progresso de presenças ao longo do tempo.",
      "Acompanhe sua linha do tempo de graduações por arte marcial.",
      "Confira quantas tarefas completou em cada modalidade.",
      "Monitore seu streak (dias consecutivos de atividade).",
    ],
  },
  {
    id: "notificacoes",
    title: "Notificações Push",
    icon: <Bell className="h-5 w-5" />,
    description: "Receba alertas de pagamentos, tarefas e lembretes no celular.",
    steps: [
      "Clique no ícone de sino no topo da tela.",
      "Ative as notificações push pelo botão de toggle.",
      "Permita as notificações quando o navegador solicitar.",
      "Você receberá alertas de: novos pagamentos, lembretes de atraso, novas tarefas e lembretes de treino.",
      "Para desativar, clique novamente no toggle dentro do sino.",
    ],
  },
];

const senseiTutorials: Tutorial[] = [
  {
    id: "dashboard",
    title: "Dashboard e Analytics",
    icon: <LayoutDashboard className="h-5 w-5" />,
    description: "Visão geral do dojo com estatísticas, métricas e gráficos.",
    steps: [
      "Veja o total de alunos ativos, presenças do mês e pagamentos.",
      "Acompanhe gráficos de evolução do dojo ao longo do tempo.",
      "Analise métricas de frequência e inadimplência.",
      "Exporte relatórios gerais e financeiros em PDF.",
    ],
  },
  {
    id: "alunos",
    title: "Gestão de Alunos",
    icon: <Users className="h-5 w-5" />,
    description: "Aprove, gerencie, bloqueie e acompanhe todos os alunos.",
    steps: [
      "Novos alunos aparecem como 'Pendentes' para aprovação.",
      "Ao aprovar, defina a faixa inicial e adicione a uma turma.",
      "Veja dados completos de cada aluno clicando no nome.",
      "Use os filtros para encontrar alunos por nome, faixa ou status.",
      "Bloqueie alunos inadimplentes — eles são desbloqueados automaticamente ao pagar.",
      "Gere relatórios individuais de alunos em PDF.",
    ],
  },
  {
    id: "aprovacao",
    title: "Aprovação de Cadastros",
    icon: <UserPlus className="h-5 w-5" />,
    description: "Gerencie novos cadastros e aprove ou rejeite alunos.",
    steps: [
      "Quando um aluno se cadastra, você recebe uma notificação.",
      "Acesse 'Alunos' > aba 'Pendentes' para ver os novos cadastros.",
      "Revise os dados do aluno e defina a faixa inicial.",
      "Aprove o cadastro e adicione o aluno a uma ou mais turmas.",
      "Alunos rejeitados não conseguem acessar o sistema.",
    ],
  },
  {
    id: "turmas",
    title: "Turmas e Horários",
    icon: <GraduationCap className="h-5 w-5" />,
    description: "Crie e gerencie turmas com horários, alunos e cronogramas.",
    steps: [
      "Crie turmas com nome, arte marcial e descrição.",
      "Adicione alunos às turmas manualmente.",
      "Defina horários recorrentes no cronograma semanal.",
      "Gerencie agendamentos específicos para cada data.",
      "Desative turmas que não estão mais em uso.",
    ],
  },
  {
    id: "presencas",
    title: "Controle de Presenças",
    icon: <ClipboardCheck className="h-5 w-5" />,
    description: "Registre e acompanhe a presença dos alunos com múltiplos métodos.",
    steps: [
      "Selecione a turma e a data para marcar presenças manualmente.",
      "Alunos também podem fazer check-in via QR Code (plano Premium).",
      "Presenças via QR Code são protegidas contra alteração.",
      "Veja estatísticas de frequência por aluno e por turma.",
    ],
  },
  {
    id: "pagamentos-sensei",
    title: "Gestão Financeira",
    icon: <CreditCard className="h-5 w-5" />,
    description: "Gerencie cobranças, comprovantes, planos e inadimplência.",
    steps: [
      "Configure planos de mensalidade por arte marcial (Judô, Jiu-Jitsu ou combo).",
      "Gere cobranças mensais automaticamente com base nos planos.",
      "Crie cobranças avulsas por categoria: matrícula, material, exame, evento.",
      "Aprove ou rejeite comprovantes enviados pelos alunos.",
      "Configure multas, juros e dias de carência nas configurações.",
      "Veja o dashboard financeiro com métricas e inadimplentes.",
      "Exporte relatórios financeiros detalhados em PDF.",
    ],
  },
  {
    id: "graduacoes",
    title: "Graduações e Faixas",
    icon: <Trophy className="h-5 w-5" />,
    description: "Registre graduações, avanços de faixa e histórico.",
    steps: [
      "Selecione o aluno e a nova faixa para registrar a graduação.",
      "Para dojos multi-arte, selecione a arte marcial específica.",
      "O histórico de graduações fica registrado automaticamente.",
      "A faixa do aluno é atualizada em todo o sistema instantaneamente.",
    ],
  },
  {
    id: "config-dojo",
    title: "Configurações do Dojo",
    icon: <Landmark className="h-5 w-5" />,
    description: "Personalize o dojo com logo, cores, dados e integrações.",
    steps: [
      "Adicione o logo e as cores do seu dojo para personalizar toda a interface.",
      "Configure a chave PIX para facilitar pagamentos dos alunos.",
      "Gerencie o código de cadastro — compartilhe com novos alunos.",
      "Ajuste as configurações de multa, juros e dias de carência.",
      "Gerencie temporadas de XP e gamificação.",
      "Configure e visualize o QR Code de check-in do dojo.",
    ],
  },
  {
    id: "notificacoes-sensei",
    title: "Sistema de Notificações",
    icon: <Bell className="h-5 w-5" />,
    description: "Receba alertas de novos cadastros, pagamentos e atividades.",
    steps: [
      "Ative as notificações push clicando no sino no topo da tela.",
      "Receba alertas quando novos alunos se cadastrarem.",
      "Seja notificado sobre comprovantes de pagamento enviados.",
      "Receba alertas de pagamentos atrasados dos alunos.",
      "As notificações funcionam mesmo com o app fechado.",
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
