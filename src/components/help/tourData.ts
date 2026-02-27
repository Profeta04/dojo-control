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
      "Responda quizzes para ganhar XP! As perguntas começam fáceis e vão ficando mais difíceis conforme você acerta.",
    tip: "Quanto mais você acerta seguido, mais desafiador fica — como subir de fase num jogo!",
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
      "Veja os próximos treinos da semana, calendário de presenças e detalhes de cada dia.",
    tip: "Toque em um dia no calendário para ver os treinos e presenças daquele dia.",
    steps: [
      {
        selector: '[data-tour="agenda-today"]',
        title: "Treino de Hoje",
        description:
          "Alerta com os treinos do dia atual, incluindo turma e horário. Aparece só quando há treino hoje.",
        position: "bottom",
      },
      {
        selector: '[data-tour="agenda-calendar"]',
        title: "Calendário",
        description:
          "Calendário mensal com dias de treino, presenças (verde) e faltas (vermelho). Toque em um dia para ver detalhes.",
        position: "bottom",
      },
      {
        selector: '[data-tour="agenda-details"]',
        title: "Detalhes do Dia",
        description:
          "Mostra os treinos e registros de presença do dia selecionado. Você pode justificar faltas aqui.",
        position: "top",
      },
    ],
  },
  "/mensalidade": {
    tabId: "mensalidade",
    title: "Seus Pagamentos",
    summary:
      "Aqui você vê suas mensalidades, envia comprovantes e acompanha o status de cada pagamento.",
    tip: "Mantenha os pagamentos em dia para evitar bloqueios e taxas.",
    steps: [
      {
        selector: '[data-tour="payment-stats"]',
        title: "Resumo de Pagamentos",
        description:
          "Cards com total de cobranças, pendentes, atrasados e pagos. Visão rápida da sua situação financeira.",
        position: "bottom",
      },
      {
        selector: '[data-tour="payment-summary"]',
        title: "Total e Vencimento",
        description:
          "Cards com o total devido (incluindo multas se houver atraso) e a data do próximo vencimento.",
        position: "bottom",
      },
      {
        selector: '[data-tour="pix-card"]',
        title: "Pagar via QR Code Pix",
        description:
          "Cada cobrança tem um QR Code Pix com o valor já embutido. Abra o app do seu banco, escolha 'Pagar com Pix', aponte a câmera para o QR Code e confirme. O valor já aparece preenchido! Depois de pagar, volte aqui e envie o comprovante.",
        position: "top",
      },
      {
        selector: '[data-tour="pix-copy"]',
        title: "Copiar Chave Pix",
        description:
          "Se preferir, você também pode copiar a chave Pix e colar manualmente no app do banco. Toque no botão 'Copiar' ao lado da chave.",
        position: "top",
      },
      {
        selector: '[data-tour="payment-list"]',
        title: "Lista de Pagamentos",
        description:
          "Suas mensalidades organizadas por status. Toque em 'Enviar Comprovante' para anexar o recibo.",
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
  "/config": {
    tabId: "config",
    title: "Configurações",
    summary:
      "Gerencie seu perfil, foto, tema e preferências de navegação.",
    tip: "Você pode alternar entre barra inferior e menu lateral na seção de preferências.",
    steps: [
      {
        selector: '[data-tour="config-avatar"]',
        title: "Foto e Faixa",
        description:
          "Altere sua foto de perfil e veja sua faixa atual e status de federação.",
        position: "bottom",
      },
      {
        selector: '[data-tour="config-personal"]',
        title: "Dados Pessoais",
        description:
          "Atualize seu nome, e-mail e telefone. Não esqueça de salvar as alterações.",
        position: "bottom",
      },
      {
        selector: '[data-tour="config-preferences"]',
        title: "Preferências",
        description:
          "Ative o modo escuro e escolha entre navegação por barra inferior ou menu lateral.",
        position: "top",
      },
    ],
  },
};

// ── Sensei / Admin tutorials ──
const senseiTutorials: Record<string, TabTutorial> = {
  "/dashboard": {
    tabId: "dashboard",
    title: "Dashboard",
    summary:
      "Visão geral do dojo com estatísticas de alunos, presenças, pagamentos e análises de gamificação.",
    tip: "Toque nos cards para navegar diretamente à seção correspondente.",
    steps: [
      {
        selector: '[data-tour="stats-cards"]',
        title: "Cards de Estatísticas",
        description:
          "Resumo rápido do dojo: total de alunos ativos, turmas em funcionamento, aprovações pendentes e presenças do mês. Cada card é interativo — toque nele para ir direto à seção correspondente.",
        position: "bottom",
      },
      {
        selector: '[data-tour="attendance-chart"]',
        title: "Presenças do Mês",
        description:
          "Gráfico circular com a taxa de presença do mês atual. Mostra o percentual de alunos presentes vs ausentes e o total de registros.",
        position: "bottom",
      },
      {
        selector: '[data-tour="analytics-chart"]',
        title: "Análise de Gamificação",
        description:
          "Estatísticas detalhadas do sistema de XP: total de tarefas concluídas, ranking dos top alunos por pontuação e gráfico de evolução mensal. Use para acompanhar o engajamento.",
        position: "top",
      },
      {
        selector: '[data-tour="export-report"]',
        title: "Exportar Relatório PDF",
        description:
          "Gere um relatório completo em PDF com todas as estatísticas do dojo — alunos, presenças, pagamentos e gamificação. Ideal para reuniões ou prestação de contas.",
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
          "Filtre os alunos por status: Pendentes (aguardando aprovação), Aprovados (ativos no dojo), Rejeitados e Responsáveis (pais/guardiões vinculados).",
        position: "bottom",
      },
      {
        selector: '[data-tour="student-search"]',
        title: "Busca de Alunos",
        description:
          "Use a barra de pesquisa para encontrar rapidamente um aluno pelo nome ou e-mail. A busca filtra em tempo real conforme você digita.",
        position: "bottom",
      },
      {
        selector: '[data-tour="student-list"]',
        title: "Lista de Alunos",
        description:
          "Cada card mostra o nome, faixa, turma e status do aluno. Toque no card para ver o perfil completo, editar dados ou gerenciar a matrícula.",
        position: "top",
      },
      {
        selector: '[data-tour="student-actions"]',
        title: "Ações do Aluno",
        description:
          "No perfil do aluno, você pode: editar dados pessoais, alterar faixa, trocar de turma, bloquear/desbloquear acesso e gerar relatório individual em PDF.",
        position: "top",
      },
    ],
  },
  "/classes": {
    tabId: "classes",
    title: "Turmas",
    summary:
      "Crie e gerencie turmas do dojo. Defina horários, arte marcial, limite de alunos e vincule turmas a planos.",
    tip: "Turmas sem horário definido não aparecerão na agenda dos alunos.",
    steps: [
      {
        selector: '[role="tablist"]',
        title: "Turmas e Agenda",
        description:
          "Alterne entre duas visões: 'Turmas' mostra a lista de todas as turmas cadastradas, e 'Agenda' exibe a programação semanal em formato de calendário.",
        position: "bottom",
      },
      {
        selector: '[data-tour="create-class"]',
        title: "Criar Nova Turma",
        description:
          "Crie uma turma definindo: nome, arte marcial, dias e horários das aulas, limite máximo de alunos e descrição. Após criar, você pode adicionar alunos à turma.",
        position: "bottom",
      },
      {
        selector: '[data-tour="class-list"]',
        title: "Lista de Turmas",
        description:
          "Cada card de turma mostra: nome, arte marcial, horários, número de alunos matriculados e status (ativa/inativa). Toque para editar ou gerenciar os alunos da turma.",
        position: "top",
      },
    ],
  },
  "/attendance": {
    tabId: "attendance",
    title: "Presenças",
    summary:
      "Registre a presença dos alunos por turma e data. Alunos podem fazer check-in via QR Code.",
    tip: "Imprima o cartaz com QR Code e cole no dojo para check-in automático!",
    steps: [
      {
        selector: '[data-tour="attendance-date"]',
        title: "Selecionar Data",
        description:
          "Escolha a data da aula para fazer a chamada. Por padrão mostra o dia de hoje. Você pode voltar a datas anteriores para corrigir presenças.",
        position: "bottom",
      },
      {
        selector: '[data-tour="attendance-class-select"]',
        title: "Turmas do Dia",
        description:
          "Lista as turmas que têm aula na data selecionada. Toque em uma turma para expandir a lista de alunos e marcar presença individualmente.",
        position: "top",
      },
      {
        selector: '[data-tour="attendance-student-list"]',
        title: "Lista de Chamada",
        description:
          "Marque cada aluno como presente ou ausente. O sistema registra quem fez a marcação e quando. Presenças via QR Code aparecem com o selo 'Self check-in'.",
        position: "top",
      },
      {
        selector: '[data-tour="attendance-qrcode"]',
        title: "QR Code de Presença",
        description:
          "Gere um cartaz com QR Code exclusivo do dojo. Os alunos escaneiam com o celular para registrar presença automaticamente. Acesse pela aba 'QR Code'.",
        position: "top",
      },
    ],
  },
  "/payments": {
    tabId: "payments",
    title: "Pagamentos",
    summary:
      "Gerencie cobranças, aprove comprovantes e acompanhe o fluxo financeiro do dojo.",
    tip: "Configure planos de mensalidade para gerar cobranças automáticas todo mês.",
    steps: [
      {
        selector: '[data-tour="payment-stats"]',
        title: "Resumo Financeiro",
        description:
          "Visão rápida do mês: total recebido, valores pendentes, atrasados e quantidade de comprovantes aguardando análise. Os valores são filtrados pelo dojo selecionado.",
        position: "bottom",
      },
      {
        selector: '[data-tour="financial-chart"]',
        title: "Gráfico Financeiro",
        description:
          "Dashboard visual com a evolução de receitas ao longo dos meses. Acompanhe tendências de pagamento e identifique meses com maior inadimplência.",
        position: "bottom",
      },
      {
        selector: '[data-tour="generate-payments"]',
        title: "Ações de Cobrança",
        description:
          "Gere cobranças mensais em lote (para todos os alunos de um plano), crie cobranças individuais ou envie notificações de pagamentos atrasados direto pelo app.",
        position: "bottom",
      },
      {
        selector: '[data-tour="payment-list"]',
        title: "Lista de Pagamentos",
        description:
          "Todas as cobranças organizadas por status. Para cada pagamento, você pode: aprovar/rejeitar comprovantes, marcar como pago manualmente ou enviar lembrete ao aluno.",
        position: "top",
      },
      {
        selector: '[data-tour="monthly-plans"]',
        title: "Planos de Mensalidade",
        description:
          "Crie e gerencie planos com valores e vencimentos diferentes. Vincule turmas a cada plano para gerar cobranças automáticas no início do mês.",
        position: "top",
      },
    ],
  },
  "/graduations": {
    tabId: "graduations",
    title: "Graduações",
    summary:
      "Registre avanços de faixa dos alunos. O histórico completo fica registrado automaticamente no perfil de cada aluno.",
    steps: [
      {
        selector: '[data-tour="graduation-form"]',
        title: "Selecionar Turma e Aluno",
        description:
          "Escolha a turma e veja os alunos matriculados com suas faixas atuais. Use o botão 'Promover' ao lado do aluno que será graduado.",
        position: "bottom",
      },
      {
        selector: '[data-tour="graduation-dialog"]',
        title: "Registrar Graduação",
        description:
          "No diálogo de promoção, selecione a nova faixa, grau (dan) se aplicável, e adicione observações. A graduação anterior é registrada automaticamente no histórico.",
        position: "bottom",
      },
      {
        selector: '[data-tour="graduation-history"]',
        title: "Histórico de Graduações",
        description:
          "Linha do tempo com todas as promoções registradas no dojo. Mostra data, faixa anterior, nova faixa e quem autorizou a graduação.",
        position: "top",
      },
    ],
  },
  "/senseis": {
    tabId: "senseis",
    title: "Senseis",
    summary:
      "Gerencie os senseis (instrutores) vinculados ao dojo. Adicione novos senseis ou ajuste permissões.",
    steps: [
      {
        selector: '[data-tour="sensei-list"]',
        title: "Lista de Senseis",
        description:
          "Todos os senseis vinculados ao dojo com nome, e-mail e status. Toque em um sensei para ver detalhes ou gerenciar suas permissões.",
        position: "bottom",
      },
      {
        selector: '[data-tour="add-sensei"]',
        title: "Adicionar Sensei",
        description:
          "Convide um novo sensei informando nome e e-mail. Ele receberá acesso ao painel de gestão do dojo com permissões de instrutor.",
        position: "bottom",
      },
    ],
  },
  "/settings": {
    tabId: "settings",
    title: "Configurações do Dojo",
    summary:
      "Personalize logo, cores, chave PIX, QR Code e gerencie planos de assinatura e temporadas de gamificação.",
    tip: "Configure as cores do tema para personalizar a identidade visual do seu dojo.",
    steps: [
      {
        selector: '[role="tablist"]',
        title: "Seções de Configuração",
        description:
          "Navegue entre as abas: 'Config. Dojo' para informações e identidade visual, 'Tema' para personalizar cores, e 'Temporadas' para gerenciar seasons de gamificação.",
        position: "bottom",
      },
      {
        selector: '[data-tour="dojo-info"]',
        title: "Informações do Dojo",
        description:
          "Edite nome, endereço, telefone, e-mail e chave PIX do dojo. Configure também a taxa de multa por atraso e dias de carência para pagamentos.",
        position: "bottom",
      },
      {
        selector: '[data-tour="dojo-logo"]',
        title: "Logo e QR Code",
        description:
          "Faça upload do logo do dojo (aparece na sidebar e relatórios) e gere o QR Code de cadastro para novos alunos escanearem e se inscreverem.",
        position: "bottom",
      },
      {
        selector: '[data-tour="dojo-theme"]',
        title: "Personalização de Tema",
        description:
          "Escolha uma paleta predefinida ou defina cores personalizadas (primária, secundária e destaque). O preview em tempo real mostra como ficará a interface.",
        position: "top",
      },
      {
        selector: '[data-tour="subscription-plan"]',
        title: "Plano de Assinatura",
        description:
          "Veja seu plano atual, limites de alunos e turmas, e envie comprovante de pagamento para renovação.",
        position: "top",
      },
    ],
  },
};

// ── Guardian tutorials ──
const guardianTutorials: Record<string, TabTutorial> = {
  "/perfil": {
    tabId: "guardian-perfil",
    title: "Seus Dados Pessoais",
    summary:
      "Aqui você vê suas informações de contato e um resumo dos seus dependentes vinculados ao dojo.",
    tip: "Mantenha seus dados atualizados para que o dojo possa entrar em contato.",
    steps: [
      {
        selector: '[data-tour="guardian-profile-card"]',
        title: "Seu Card de Perfil",
        description:
          "Mostra seu nome, e-mail e telefone cadastrados. Esses são os dados que o dojo usa para entrar em contato com você.",
        position: "bottom",
      },
      {
        selector: '[data-tour="guardian-minors-summary"]',
        title: "Resumo dos Dependentes",
        description:
          "Lista rápida de todos os filhos ou dependentes que estão vinculados a você no dojo, com o nome e a faixa atual de cada um.",
        position: "top",
      },
    ],
  },
  "/dependentes": {
    tabId: "guardian-dependentes",
    title: "Seus Dependentes",
    summary:
      "Veja os detalhes de cada filho ou dependente matriculado no dojo: presenças, faixa, pagamentos e progresso.",
    tip: "Toque no nome de um dependente para ver todos os detalhes dele.",
    steps: [
      {
        selector: '[data-tour="guardian-minor-list"]',
        title: "Lista de Dependentes",
        description:
          "Todos os seus filhos ou dependentes aparecem aqui. Cada card mostra o nome, a faixa atual e a turma em que está matriculado.",
        position: "bottom",
      },
      {
        selector: '[data-tour="guardian-minor-details"]',
        title: "Detalhes do Dependente",
        description:
          "Ao tocar em um dependente, você vê informações detalhadas: presenças recentes, próximos treinos, faixa e histórico de graduações.",
        position: "top",
      },
    ],
  },
  "/mensalidade": {
    tabId: "guardian-mensalidade",
    title: "Pagamentos dos Dependentes",
    summary:
      "Aqui você acompanha as mensalidades e cobranças de todos os seus dependentes. Envie comprovantes e veja o que está pendente.",
    tip: "Pagamentos em dia evitam bloqueios no acesso dos seus dependentes.",
    steps: [
      {
        selector: '[data-tour="payment-stats"]',
        title: "Resumo de Pagamentos",
        description:
          "Cards mostrando quantas cobranças estão pendentes, pagas ou atrasadas. Dá uma visão rápida da situação financeira.",
        position: "bottom",
      },
      {
        selector: '[data-tour="pix-card"]',
        title: "Pagar pelo QR Code Pix",
        description:
          "Cada cobrança tem um QR Code Pix com o valor já incluído. Abra o aplicativo do seu banco no celular, escolha a opção 'Pagar com Pix', aponte a câmera para o QR Code na tela e confirme o pagamento. O valor já aparece preenchido automaticamente! Depois que pagar, volte aqui no app e envie o comprovante.",
        position: "top",
      },
      {
        selector: '[data-tour="pix-copy"]',
        title: "Copiar Chave Pix",
        description:
          "Se não conseguir usar o QR Code, você pode copiar a chave Pix tocando no botão 'Copiar'. Depois cole no app do banco na opção 'Pix Copia e Cola'.",
        position: "top",
      },
      {
        selector: '[data-tour="payment-list"]',
        title: "Lista de Cobranças",
        description:
          "Todas as mensalidades organizadas por status. Toque em 'Enviar Comprovante' para anexar o recibo de pagamento.",
        position: "top",
      },
    ],
  },
  "/config": {
    tabId: "guardian-config",
    title: "Configurações",
    summary:
      "Altere suas preferências pessoais como modo escuro e dados de contato.",
    steps: [
      {
        selector: '[data-tour="config-personal"]',
        title: "Dados Pessoais",
        description:
          "Atualize seu nome, e-mail e telefone. Não esqueça de salvar as alterações depois de editar.",
        position: "bottom",
      },
      {
        selector: '[data-tour="config-preferences"]',
        title: "Preferências",
        description:
          "Ative ou desative o modo escuro para deixar a tela mais confortável para seus olhos.",
        position: "top",
      },
    ],
  },
  "/ajuda": {
    tabId: "guardian-ajuda",
    title: "Ajuda e Suporte",
    summary:
      "Encontre tutoriais, perguntas frequentes e envie relatos de problemas.",
    steps: [],
  },
};

export function getTutorialForPath(
  path: string,
  canManageStudents: boolean,
  isGuardian?: boolean
): TabTutorial | null {
  if (isGuardian && guardianTutorials[path]) {
    return guardianTutorials[path];
  }
  const map = canManageStudents ? senseiTutorials : studentTutorials;
  return map[path] || null;
}
