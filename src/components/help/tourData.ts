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
      "Aqui você vê seu card de perfil, barra de XP e conquistas recentes. Toque no avatar para editar sua foto!",
    tip: "Mantenha seus dados atualizados para o sensei.",
    steps: [
      {
        selector: '[data-tour="profile-card"]',
        title: "Card de Perfil",
        description:
          "Seu card pessoal com nome, faixa e informações de contato. Toque no avatar para trocar sua foto.",
        position: "bottom",
      },
      {
        selector: '[data-tour="xp-bar"]',
        title: "Barra de XP",
        description:
          "Mostra seu nível atual e progresso até o próximo nível. Complete tarefas para ganhar XP!",
        position: "bottom",
      },
      {
        selector: '[data-tour="achievements-panel"]',
        title: "Conquistas Recentes",
        description:
          "Veja suas últimas conquistas desbloqueadas. Cada uma dá XP bônus!",
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
    steps: [
      {
        selector: '[data-tour="schedule-list"]',
        title: "Próximos Treinos",
        description:
          "Lista dos treinos agendados com dia, horário e turma. Treinos cancelados aparecem riscados.",
        position: "bottom",
      },
    ],
  },
  "/mensalidade": {
    tabId: "mensalidade",
    title: "Seus Pagamentos",
    summary:
      "Aqui você vê suas mensalidades. Envie o comprovante de pagamento para o sensei aprovar.",
    tip: "Mantenha os pagamentos em dia para evitar bloqueios.",
    steps: [
      {
        selector: '[data-tour="payment-list"]',
        title: "Lista de Pagamentos",
        description:
          "Suas mensalidades com status (pendente, pago, atrasado). Toque para enviar comprovante.",
        position: "bottom",
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
      "Visão geral do dojo com estatísticas de alunos, presenças e pagamentos. Exporte relatórios em PDF.",
    steps: [
      {
        selector: '[data-tour="stats-cards"]',
        title: "Cards de Estatísticas",
        description:
          "Resumo rápido: total de alunos, presenças do mês, pagamentos pendentes e receita.",
        position: "bottom",
      },
      {
        selector: '[data-tour="export-report"]',
        title: "Exportar Relatório",
        description:
          "Gere um PDF completo com todas as estatísticas do dojo para compartilhar ou imprimir.",
        position: "left",
      },
      {
        selector: '[data-tour="analytics-chart"]',
        title: "Gráficos Analíticos",
        description:
          "Visualize tendências de presenças e pagamentos ao longo do tempo.",
        position: "top",
      },
    ],
  },
  "/students": {
    tabId: "students",
    title: "Gestão de Alunos",
    summary:
      "Veja alunos aprovados e pendentes. Aprove novos cadastros definindo faixa e turma.",
    tip: "Use a busca para encontrar alunos rapidamente.",
    steps: [
      {
        selector: '[data-tour="student-search"]',
        title: "Busca de Alunos",
        description:
          "Digite o nome do aluno para filtrar a lista rapidamente.",
        position: "bottom",
      },
      {
        selector: '[role="tablist"]',
        title: "Abas de Status",
        description:
          "Alterne entre alunos Aprovados, Pendentes e Rejeitados.",
        position: "bottom",
      },
      {
        selector: '[data-tour="student-list"]',
        title: "Lista de Alunos",
        description:
          "Toque em um aluno para ver perfil, editar dados, graduar ou gerenciar pagamentos.",
        position: "top",
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
        selector: '[data-tour="attendance-class-select"]',
        title: "Selecionar Turma",
        description: "Escolha a turma para registrar presenças.",
        position: "bottom",
      },
      {
        selector: '[data-tour="attendance-date"]',
        title: "Data da Aula",
        description:
          "Selecione a data. Por padrão mostra o dia de hoje.",
        position: "bottom",
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
        title: "Gerar Cobranças",
        description:
          "Gere cobranças mensais automáticas para todos os alunos com plano ativo.",
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
        title: "Registrar Graduação",
        description:
          "Selecione o aluno e a nova faixa para registrar a graduação.",
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
          "Navegue entre Dojos e Tema para personalizar seu dojo.",
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
