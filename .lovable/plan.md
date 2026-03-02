# Plano de Novas Funcionalidades — Dojo Control

## Visão Geral
Implementar 6 novos módulos, um por vez, na ordem abaixo.

---

## 1. 📢 Comunicação Interna (Mural de Avisos)

### Objetivo
Permitir que senseis/admins publiquem avisos para alunos do dojo.

### Decisões
- **Quem cria:** Admin + Senseis
- **Anexos:** Texto + 1 imagem
- **Segmentação:** Para todo o dojo (sem filtro por turma)

### Banco de Dados
- **Tabela `announcements`**: `id` (uuid PK), `dojo_id` (uuid FK dojos), `author_id` (uuid), `title` (text NOT NULL), `content` (text NOT NULL), `image_url` (text nullable), `priority` (text default 'normal' — valores: normal/urgente), `pinned` (boolean default false), `expires_at` (timestamptz nullable), `created_at`, `updated_at`
- **Tabela `announcement_reads`**: `id` (uuid PK), `announcement_id` (uuid FK announcements), `user_id` (uuid), `read_at` (timestamptz default now()) — unique(announcement_id, user_id)
- RLS: membros do dojo podem SELECT; staff pode INSERT/UPDATE/DELETE

### Storage
- Bucket `announcement-images` (público) com policy por dojo

### Frontend
- Nova página `/avisos` no menu lateral (ícone Megaphone) — visível para todos
- Lista de avisos com: título, prévia do conteúdo, badge urgente, ícone de fixado, imagem (se houver)
- Card de "avisos não lidos" no Dashboard (aluno e sensei)
- Badge com contagem de não lidos no menu lateral
- Dialog para criar/editar aviso (título, conteúdo, imagem, prioridade, fixar, expiração)
- Marcar como lido automaticamente ao abrir o aviso
- Filtros: todos / não lidos / urgentes / fixados

### Notificações
- Push notification ao publicar aviso urgente
- Notificação in-app para todos os avisos novos

---

## 2. 📄 Gestão de Contratos / Documentos

### Objetivo
Upload e acompanhamento de contratos, atestados médicos e termos de responsabilidade com alertas de vencimento.

### Decisões
- **Tipos:** Contrato de matrícula + Atestado médico + Termo de responsabilidade
- **Upload:** Aluno pode enviar, sensei aprova

### Banco de Dados
- **Tabela `student_documents`**: `id` (uuid PK), `dojo_id` (uuid FK dojos), `student_id` (uuid), `document_type` (text NOT NULL — valores: contrato/atestado_medico/termo_responsabilidade), `title` (text NOT NULL), `file_url` (text NOT NULL), `status` (text default 'pendente' — valores: pendente/aprovado/rejeitado/vencido), `expires_at` (date nullable), `notes` (text nullable), `reviewed_by` (uuid nullable), `reviewed_at` (timestamptz nullable), `uploaded_by` (uuid NOT NULL), `created_at`, `updated_at`
- RLS: staff pode CRUD completo; aluno pode INSERT próprio + SELECT próprio

### Storage
- Bucket `student-documents` (privado) com políticas por dojo/aluno

### Frontend
- Nova aba "Documentos" no perfil do aluno (visível para aluno e sensei)
- Upload de PDF/imagem com seleção de tipo (contrato, atestado, termo)
- Lista com status visual: pendente ⏳, aprovado ✓, rejeitado ✗, vencido ⚠️
- Sensei: lista de documentos pendentes de aprovação com botões aprovar/rejeitar
- Indicador visual de documentos vencendo nos próximos 30 dias no dashboard do sensei
- Botão de download/visualização do documento

### Automação
- Edge function cron para marcar documentos vencidos (expires_at < hoje) e enviar notificação

---

## 3. 🎥 Biblioteca de Técnicas

### Objetivo
Catálogo de vídeos/descrições de golpes organizados por faixa, arte marcial e categoria.

### Decisões
- **Fonte de vídeos:** Links externos (YouTube/Vimeo) + Upload direto
- **Categorias:** Judô clássico + BJJ clássico + sensei pode criar categorias personalizadas

### Banco de Dados
- **Tabela `techniques`**: `id` (uuid PK), `dojo_id` (uuid FK dojos), `title` (text NOT NULL), `description` (text nullable), `video_url` (text nullable — link externo), `video_file_url` (text nullable — upload), `thumbnail_url` (text nullable), `martial_art` (text NOT NULL), `belt_level` (text NOT NULL), `category` (text NOT NULL), `difficulty` (text default 'medium'), `created_by` (uuid), `created_at`, `updated_at`
- **Tabela `technique_categories`**: `id` (uuid PK), `dojo_id` (uuid FK dojos), `martial_art` (text NOT NULL), `name` (text NOT NULL), `icon` (text default '🥋'), `sort_order` (int default 0), `created_at` — unique(dojo_id, martial_art, name)
- **Tabela `technique_favorites`**: `id` (uuid PK), `technique_id` (uuid FK techniques), `user_id` (uuid), `created_at` — unique(technique_id, user_id)
- RLS: membros do dojo podem SELECT; staff pode INSERT/UPDATE/DELETE; alunos podem gerenciar próprios favoritos
- Seed: inserir categorias padrão de Judô e BJJ na primeira criação

### Storage
- Bucket `technique-videos` (privado) para uploads diretos

### Frontend
- Nova página `/tecnicas` no menu (ícone Video) — visível para todos
- Grid de cards com thumbnail, título, faixa, categoria e arte marcial
- Filtros: por arte marcial, faixa, categoria, busca por nome
- Player embed (YouTube/Vimeo) ou player nativo para uploads
- Botão de favoritar (coração) para alunos
- Aba "Meus Favoritos" para acesso rápido
- Sensei: formulário para adicionar/editar técnica + gerenciar categorias personalizadas

---

## 4. 📝 Justificativa de Faltas

### Objetivo
Permitir que alunos registrem justificativas para faltas, sem necessidade de aprovação.

### Decisões
- **Aprovação:** Sem aprovação — aluno justifica e fica registrado
- **Anexo:** Upload opcional de atestado médico

### Banco de Dados
- **Tabela `absence_justifications`**: `id` (uuid PK), `attendance_id` (uuid FK attendance), `student_id` (uuid), `reason` (text NOT NULL), `document_url` (text nullable), `created_at`
- RLS: aluno pode INSERT/SELECT próprio; staff pode SELECT todos do dojo

### Storage
- Reusar bucket `student-documents` para atestados

### Frontend
- Botão "Justificar" ao lado de cada falta na aba de presenças do aluno
- Dialog simples: campo de texto (motivo) + upload opcional de documento
- Status visual na lista de presenças: falta com justificativa 📝 vs falta sem justificativa ✗
- Sensei: pode ver justificativas ao clicar na falta do aluno

---

## 5. 🎯 Simulados de Exame de Faixa

### Objetivo
Simulados completos que combinam quizzes existentes em provas formatadas por faixa.

### Decisões
- **Tentativas:** Ilimitadas
- **Timer:** Sem cronômetro — aluno faz no próprio ritmo

### Banco de Dados
- **Tabela `belt_exams`**: `id` (uuid PK), `dojo_id` (uuid FK dojos), `title` (text NOT NULL), `martial_art` (text NOT NULL), `target_belt` (text NOT NULL), `passing_score` (int NOT NULL — porcentagem 0-100), `is_active` (boolean default true), `created_by` (uuid), `created_at`, `updated_at`
- **Tabela `belt_exam_questions`**: `id` (uuid PK), `exam_id` (uuid FK belt_exams), `template_id` (uuid FK task_templates), `sort_order` (int NOT NULL), `points` (int default 1)
- **Tabela `belt_exam_attempts`**: `id` (uuid PK), `exam_id` (uuid FK belt_exams), `student_id` (uuid), `started_at` (timestamptz default now()), `finished_at` (timestamptz nullable), `score` (int nullable), `total_points` (int nullable), `passed` (boolean nullable), `answers` (jsonb nullable)
- RLS: staff cria/edita exames e questões; alunos podem INSERT tentativas próprias + SELECT próprias

### Frontend
- Nova página `/simulados` no menu do aluno (ícone ClipboardCheck)
- Lista de simulados disponíveis filtrados pela faixa atual do aluno
- Tela de prova: questões sequenciais com barra de progresso, sem timer
- Resultado ao final: nota, aprovado/reprovado, correção detalhada questão a questão
- Histórico de tentativas com gráfico de evolução (Recharts)
- Sensei: tela para montar simulados selecionando questões do banco (task_templates), definir faixa-alvo e nota mínima

---

## 6. 📄 Gestão de Contratos (Automação de Vencimento)

*(Cron job complementar ao item 2)*

### Edge Function: `check-document-expiry`
- Roda diariamente via pg_cron
- Busca documentos com `expires_at < hoje` e `status = 'aprovado'`
- Atualiza status para `'vencido'`
- Envia notificação in-app + push para o aluno e senseis do dojo

---

## Ordem de Implementação

| # | Funcionalidade | Complexidade | Prioridade |
|---|---------------|-------------|-----------|
| 1 | Comunicação Interna (Avisos) | Média | Alta |
| 2 | Justificativa de Faltas | Baixa | Alta |
| 3 | Gestão de Documentos | Média | Média |
| 4 | Biblioteca de Técnicas | Média-Alta | Média |
| 5 | Simulados de Exame | Alta | Média |

---

## Próximo Passo
Quando quiser começar, diga qual funcionalidade implementar primeiro!
