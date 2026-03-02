# Plano de Novas Funcionalidades — Dojo Control

## Visão Geral
Implementar 7 novos módulos, um por vez, na ordem abaixo.

---

## 1. 📢 Comunicação Interna (Mural de Avisos)

### Objetivo
Permitir que senseis/admins publiquem avisos para alunos do dojo.

### Banco de Dados
- **Tabela `announcements`**: `id`, `dojo_id`, `author_id`, `title`, `content` (texto rico), `priority` (normal/urgente), `pinned` (boolean), `expires_at` (nullable), `created_at`, `updated_at`
- **Tabela `announcement_reads`**: `id`, `announcement_id`, `user_id`, `read_at` — para marcar como lido
- RLS: alunos do dojo podem ler; senseis/admins podem criar/editar/deletar

### Frontend
- Nova página `/avisos` no menu lateral (ícone Megaphone)
- Card de avisos não lidos no Dashboard do aluno e do sensei
- Badge no menu lateral com contagem de não lidos
- Dialog para criar/editar aviso (título, conteúdo, prioridade, fixar, data de expiração)
- Lista com filtros: todos / não lidos / urgentes / fixados

### Notificações
- Push notification ao publicar aviso urgente
- Notificação in-app para todos os avisos

---

## 2. 📄 Gestão de Contratos

### Objetivo
Upload e acompanhamento de contratos/documentos dos alunos com alertas de vencimento.

### Banco de Dados
- **Tabela `contracts`**: `id`, `dojo_id`, `student_id`, `title`, `file_url` (storage), `signed_at`, `expires_at`, `status` (ativo/vencido/pendente), `notes`, `created_at`, `updated_at`
- RLS: staff pode CRUD; aluno pode ver os próprios

### Storage
- Bucket `contracts` (privado) com políticas por dojo/aluno

### Frontend
- Nova aba "Contratos" dentro da página de Alunos ou perfil do aluno
- Upload de PDF/imagem do contrato assinado
- Indicador visual de contratos vencendo nos próximos 30 dias
- Botão de download/visualização do contrato
- Filtros: ativos / vencidos / vencendo em breve

### Automação
- Edge function agendada (cron) para marcar contratos vencidos e enviar notificação

---

## 3. 🎥 Biblioteca de Técnicas

### Objetivo
Catálogo de vídeos/descrições de golpes organizados por faixa e arte marcial.

### Banco de Dados
- **Tabela `techniques`**: `id`, `dojo_id`, `title`, `description`, `video_url` (YouTube/Vimeo embed), `thumbnail_url`, `martial_art`, `belt_level`, `category` (nage-waza, katame-waza, etc.), `difficulty`, `created_by`, `created_at`, `updated_at`
- **Tabela `technique_favorites`**: `id`, `technique_id`, `user_id`, `created_at` — para alunos favoritarem
- RLS: todos do dojo podem ler; staff pode criar/editar/deletar

### Frontend
- Nova página `/tecnicas` no menu (ícone Video)
- Grid de cards com thumbnail, título, faixa e categoria
- Filtros: por arte marcial, faixa, categoria, busca por nome
- Player embed de vídeo ao clicar
- Botão de favoritar (coração) para alunos
- Aba "Meus Favoritos" para acesso rápido
- Sensei: formulário para adicionar/editar técnica

---

## 4. 📊 Avaliações Físicas

### Objetivo
Registrar e acompanhar métricas físicas dos alunos com gráficos de evolução.

### Banco de Dados
- **Tabela `physical_assessments`**: `id`, `student_id`, `dojo_id`, `assessed_by`, `assessment_date`, `weight_kg`, `height_cm`, `flexibility_score` (0-10), `endurance_score` (0-10), `strength_score` (0-10), `notes`, `created_at`
- RLS: staff pode criar/ver todos do dojo; aluno pode ver os próprios

### Frontend
- Nova aba "Avaliações" no perfil do aluno (visão aluno e visão sensei)
- Formulário para registrar avaliação (peso, altura, flexibilidade, resistência, força)
- Gráfico de evolução temporal (Recharts) por métrica
- Card resumo com última avaliação e tendência (↑↓→)
- Tabela histórica com todas as avaliações

---

## 5. 📝 Justificativa de Faltas

### Objetivo
Permitir que alunos enviem justificativas para faltas, com aprovação pelo sensei.

### Banco de Dados
- **Tabela `absence_justifications`**: `id`, `attendance_id`, `student_id`, `reason` (texto), `document_url` (opcional, atestado médico), `status` (pendente/aprovada/rejeitada), `reviewed_by`, `reviewed_at`, `created_at`
- RLS: aluno pode criar/ver os próprios; staff pode ver/aprovar todos do dojo

### Storage
- Bucket `justifications` (privado) para upload de atestados

### Frontend
- Botão "Justificar" ao lado de cada falta na aba de presenças do aluno
- Dialog com campo de texto + upload opcional de documento
- Badge de "justificativa pendente" na aba de presenças do sensei
- Lista de justificativas pendentes para aprovação (sensei)
- Status visual na lista de presenças (justificada ✓, pendente ⏳, rejeitada ✗)

---

## 6. 🎯 Simulados de Exame de Faixa

### Objetivo
Simulados completos que combinam quizzes existentes em provas formatadas por faixa.

### Banco de Dados
- **Tabela `belt_exams`**: `id`, `dojo_id`, `title`, `martial_art`, `target_belt`, `time_limit_minutes`, `passing_score` (%), `is_active`, `created_by`, `created_at`
- **Tabela `belt_exam_questions`**: `id`, `exam_id`, `template_id` (FK task_templates), `order`, `points`
- **Tabela `belt_exam_attempts`**: `id`, `exam_id`, `student_id`, `started_at`, `finished_at`, `score`, `total_points`, `passed`, `answers` (JSONB)
- RLS: staff cria/edita exames; alunos fazem tentativas e veem próprios resultados

### Frontend
- Nova página `/simulados` no menu do aluno
- Lista de simulados disponíveis para a faixa atual do aluno
- Tela de prova com timer, questões sequenciais, barra de progresso
- Resultado ao final: nota, aprovado/reprovado, correção detalhada
- Histórico de tentativas com gráfico de evolução
- Sensei: tela para montar simulados selecionando questões do banco (task_templates)

---

## 7. 📶 Modo Offline (PWA Aprimorado)

### Objetivo
Permitir marcação de presença e visualização de dados básicos sem internet.

### Implementação
- **Service Worker aprimorado**: cache de páginas principais e dados estáticos
- **IndexedDB local**: armazenar presenças marcadas offline
- **Sincronização**: ao reconectar, enviar presenças pendentes para o backend
- **Indicador visual**: banner "Modo Offline" quando sem conexão
- **Dados cacheados**: perfil do aluno, agenda da semana, últimos avisos

### Frontend
- Banner no topo quando offline (amarelo/laranja)
- Ícone de sync com badge de pendências
- Toast ao sincronizar dados com sucesso
- Página de presenças funcional offline (com fila de envio)

---

## Ordem de Implementação Sugerida

| # | Funcionalidade | Complexidade | Dependências |
|---|---------------|-------------|-------------|
| 1 | Comunicação Interna | Média | Nenhuma |
| 2 | Justificativa de Faltas | Baixa | Tabela attendance existente |
| 3 | Biblioteca de Técnicas | Média | Nenhuma |
| 4 | Simulados de Exame | Alta | task_templates existente |
| 5 | Avaliações Físicas | Média | Nenhuma |
| 6 | Gestão de Contratos | Média | Storage bucket |
| 7 | Modo Offline | Alta | PWA existente |

---

## Próximo Passo
Quando quiser começar, diga qual funcionalidade implementar primeiro!
