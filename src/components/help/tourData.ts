export interface TourStep {
  selector: string;
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right";
}

export interface TabTutorial {
  tabId: string;
  title: string;
  summary: string;
  tip?: string;
  steps: TourStep[];
}

// ── Student tutorials ──
const studentTutorials: Record<string, TabTutorial> = {
  "/perfil": {
    tabId: "perfil",
    title: "Seu Perfil",
    summary:
      "Aqui você vê seu card de perfil, próximos treinos, frequência e evolução. Toque no avatar para editar sua foto!",
    tip: "Mantenha seus dados atualizados para o sensei.",
    steps: [
      {
        selector: '[data-tour="profile-card"]',
        title: "Card de Perfil",
        description:
          "Seu card pessoal com nome, faixa, turmas e informações de contato. Toque no avatar para trocar sua foto.",
        position: "bottom",
      },
      {
        selector: '[data-tour="guardian-card"]',
        title: "Dados do Responsável",
        description:
          "Informações do seu responsável cadastrado, como nome, e-mail e telefone.",
        position: "bottom",
      },
      {
        selector: '[data-tour="graduation-timeline"]',
        title: "Histórico de Graduações",
        description:
          "Linha do tempo com todas as suas graduações de faixa registradas pelo sensei.",
        position: "top",
      },
      {
        selector: '[data-tour="schedule-list"]',
        title: "Próximos Treinos",
        description:
          "Veja os próximos treinos agendados com dia, horário e turma.",
        position: "bottom",
      },
      {
        selector: '[data-tour="attendance-stats"]',
        title: "Estatísticas de Presença",
        description:
          "Acompanhe sua frequência: total de aulas, presenças, faltas e sua sequência atual.",
        position: "top",
      },
      {
        selector: '[data-tour="xp-card"]',
        title: "XP e Conquistas",
        description:
          "Veja seu nível, barra de XP e as conquistas desbloqueadas. Continue treinando para subir de nível!",
        position: "top",
      },
    ],
  },
  "/tarefas": {
    tabId: "tarefas",
    title: "Suas Tarefas",
    summary:
      "Complete tarefas e quizzes para ganhar XP. Use as abas para alternar entre missões, conquistas e ranking.",
    tip: "Tarefas com prazo dão XP bônus se completadas a tempo!",
    steps: [
      {
        selector: '[data-tour="xp-bar"]',
        title: "Barra de XP",
        description:
          "Acompanhe seu nível e progresso. Cada tarefa completa enche a barra!",
        position: "bottom",
      },
      {
        selector: '[role="tablist"]',
        title: "Abas de Navegação",
        description:
          "Alterne entre Tarefas, Conquistas e Ranking usando estas abas.",
        position: "bottom",
      },
      {
        selector: '[data-tour="task-list"]',
        title: "Lista de Tarefas",
        description:
          "Suas missões aparecem aqui. Toque em uma para ver detalhes e responder quizzes.",
        position: "top",
      },
    ],
  },
  "/agenda": {
    tabId: "agenda",
    title: "Agenda de Treinos",
    summary:
      "Veja os próximos treinos da semana. Os horários são definidos pelo sensei da turma.",
    steps: [],
  },
  "/mensalidade": {
    tabId: "mensalidade",
    title: "Seus Pagamentos",
    summary:
      "Aqui você vê suas mensalidades. Envie o comprovante de pagamento para o sensei aprovar.",
    tip: "Mantenha os pagamentos em dia para evitar bloqueios.",
    steps: [
      {
        selector: '[data-tour="payment-stats"]',
        title: "Resumo de Pagamentos",
        description:
          "Cards com total, pendentes, atrasados e pagos. Visão rápida da sua situação.",
        position: "bottom",
      },
      {
        selector: '[data-tour="payment-list"]',
        title: "Lista de Pagamentos",
        description:
          "Suas mensalidades com status. Toque para enviar comprovante.",
        position: "top",
      },
    ],
  },
  "/conquistas": {
    tabId: "conquistas",
    title: "Conquistas",
    summary:
      "Desbloqueie conquistas conforme evolui. Cada uma dá XP bônus e mostra seu progresso!",
    steps: [],
  },
  "/meu-progresso": {
    tabId: "meu-progresso",
    title: "Seu Progresso",
    summary:
      "Acompanhe sua evolução com gráficos de presença e linha do tempo de graduações.",
    steps: [],
  },
};

// ── Sensei / Admin tutorials ──
const senseiTutorials: Record<string, TabTutorial> = {
  "/dashboard": {
    tabId: "dashboard",
    title: "Dashboard",
    summary:
      "Visão geral do dojo com estatísticas de alunos, presenças, pagamentos e análises de gamificação.",
    steps: [
      {
        selector: '[data-tour="stats-cards"]',
        title: "Cards de Estatísticas",
        description:
          "Resumo rápido: total de alunos, turmas ativas, aprovações pendentes e mais. Toque em um card para ir à seção correspondente.",
        position: "bottom",
      },
      {
        selector: '[data-tour="analytics-chart"]',
        title: "Análise de Gamificação",
        description:
          "Estatísticas de tarefas concluídas, ranking dos alunos com mais pontos e evolução mensal.",
        position: "top",
      },
      {
        selector: '[data-tour="export-report"]',
        title: "Exportar Relatório",
        description:
          "Gere um PDF completo com todas as estatísticas do dojo para compartilhar ou imprimir.",
        position: "bottom",
      },
    ],
  },
  "/students": {
    tabId: "students",
    title: "Gestão de Alunos",
    summary:
      "Veja alunos aprovados e pendentes. Aprove novos cadastros definindo faixa e turma.",
    tip: "Use as abas para filtrar alunos por status.",
    steps: [
      {
        selector: '[role="tablist"]',
        title: "Abas de Status",
        description:
          "Alterne entre alunos Pendentes, Aprovados, Rejeitados e Responsáveis.",
        position: "bottom",
      },
    ],
  },
  "/classes": {
    tabId: "classes",
    title: "Turmas",
    summary:
      "Crie e gerencie turmas. Defina horários, arte marcial e adicione alunos.",
    steps: [
      {
        selector: '[role="tablist"]',
        title: "Turmas e Agenda",
        description:
          "Alterne entre a lista de turmas e a agenda semanal de aulas.",
        position: "bottom",
      },
      {
        selector: '[data-tour="create-class"]',
        title: "Criar Turma",
        description:
          "Crie uma nova turma definindo nome, arte marcial, horário e limite de alunos.",
        position: "bottom",
      },
    ],
  },
  "/attendance": {
    tabId: "attendance",
    title: "Presenças",
    summary:
      "Registre a presença dos alunos por turma e data. Alunos podem fazer check-in via QR Code.",
    steps: [
      {
        selector: '[data-tour="attendance-date"]',
        title: "Selecionar Data",
        description: "Escolha a data da aula. Por padrão mostra o dia de hoje.",
        position: "bottom",
      },
      {
        selector: '[data-tour="attendance-class-select"]',
        title: "Turmas do Dia",
        description:
          "Veja as turmas com aula nesta data. Toque em uma para fazer a chamada.",
        position: "top",
      },
    ],
  },
  "/payments": {
    tabId: "payments",
    title: "Pagamentos",
    summary:
      "Gerencie cobranças e comprovantes. Gere cobranças mensais e aprove pagamentos recebidos.",
    steps: [
      {
        selector: '[data-tour="payment-stats"]',
        title: "Resumo Financeiro",
        description:
          "Cards com total recebido, pendente e atrasado do mês.",
        position: "bottom",
      },
      {
        selector: '[data-tour="generate-payments"]',
        title: "Ações de Pagamento",
        description:
          "Notifique alunos com pagamentos pendentes, crie cobranças individuais ou em lote.",
        position: "bottom",
      },
    ],
  },
  "/graduations": {
    tabId: "graduations",
    title: "Graduações",
    summary:
      "Registre avanços de faixa dos alunos. O histórico fica registrado automaticamente.",
    steps: [
      {
        selector: '[data-tour="graduation-form"]',
        title: "Alunos por Turma",
        description:
          "Selecione a turma e toque em 'Promover' para registrar a graduação do aluno.",
        position: "bottom",
      },
    ],
  },
  "/settings": {
    tabId: "settings",
    title: "Configurações do Dojo",
    summary:
      "Personalize logo, cores, PIX e outras opções. Gerencie planos de mensalidade.",
    steps: [
      {
        selector: '[role="tablist"]',
        title: "Seções de Configuração",
        description:
          "Navegue entre Dojos/Informações e Tema para personalizar seu dojo.",
        position: "bottom",
      },
    ],
  },
};

export function getTutorialForPath(
  path: string,
  canManageStudents: boolean
): TabTutorial | null {
  const map = canManageStudents ? senseiTutorials : studentTutorials;
  return map[path] || null;
}
