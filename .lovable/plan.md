

## Plano: Módulo "Estudos" (substitui "Tarefas")

### Visão geral

A aba "Tarefas" (`/tarefas`) será renomeada para "Estudos" (`/estudos`) com 4 sub-abas internas: **Tarefas** (quiz existente), **Apostilas**, **Simulados** e **Vídeos**. Fase 1 cobre apenas Judô.

```text
/estudos
├── Tarefas    (quiz existente — já funciona)
├── Apostilas  (PDFs: upload sensei + conteúdo fixo)
├── Simulados  (prova sem timer, banco separado)
└── Vídeos     (biblioteca fixa + YouTube sensei + upload)
```

---

### 1. Banco de dados — novas tabelas

**`study_materials`** (apostilas)

| Coluna | Tipo | Nota |
|---|---|---|
| id | uuid PK | |
| dojo_id | uuid | nullable para conteúdo global |
| title | text | |
| description | text | |
| martial_art | text | 'judo' |
| belt_level | text | faixa alvo |
| type | text | 'pdf' / 'embedded' |
| file_url | text | caminho no storage ou null |
| content | text | conteúdo HTML/markdown embutido |
| created_by | uuid | sensei que fez upload |
| created_at | timestamptz | |

RLS: Staff pode CRUD; alunos podem SELECT (filtrado por dojo ou global).

**`study_videos`** (vídeos)

| Coluna | Tipo | Nota |
|---|---|---|
| id | uuid PK | |
| dojo_id | uuid | nullable |
| title | text | |
| description | text | |
| martial_art | text | |
| belt_level | text | |
| source | text | 'youtube' / 'upload' / 'fixed' |
| video_url | text | URL ou caminho storage |
| thumbnail_url | text | |
| created_by | uuid | |
| created_at | timestamptz | |

RLS: mesma lógica.

**`exam_templates`** (banco de simulados — separado de task_templates)

| Coluna | Tipo | Nota |
|---|---|---|
| id | uuid PK | |
| title | text | |
| martial_art | text | |
| belt_level | text | |
| difficulty | text | |
| questions | jsonb | array de {question, options, correct_option} |
| total_questions | int | |
| created_by | uuid | |
| created_at | timestamptz | |

**`exam_attempts`** (tentativas do aluno)

| Coluna | Tipo | Nota |
|---|---|---|
| id | uuid PK | |
| student_id | uuid | |
| exam_template_id | uuid | |
| score | int | acertos |
| total | int | total de questões |
| answers | jsonb | respostas do aluno |
| completed_at | timestamptz | |

RLS: alunos veem apenas suas tentativas; staff vê tudo.

**Storage bucket**: `study-materials` (privado, para PDFs e uploads de vídeo).

---

### 2. Navegação — substituir "Tarefas" por "Estudos"

| Arquivo | Mudança |
|---|---|
| `src/App.tsx` | Renomear rota `/tarefas` → `/estudos`; lazy import `StudentStudies` |
| `src/components/layout/StudentBottomNav.tsx` | Item "Tarefas" → "Estudos" com href `/estudos` e ícone `BookOpen` |
| `src/components/layout/sidebar/SidebarNavContent.tsx` | Item "Tarefas" → "Estudos" com href `/estudos` |

---

### 3. Nova página `/estudos`

**`src/pages/StudentStudies.tsx`** — substitui `StudentTasks.tsx`

- Header "Estudos" + XPBar
- 4 sub-abas via componente de tabs customizado (mesmo estilo do ranking atual):
  - Tarefas | Apostilas | Simulados | Vídeos
- Sub-aba "Tarefas" renderiza `StudentTasksDashboard` + `LeaderboardPanel` (ranking fica dentro)
- Sub-aba "Apostilas" renderiza novo `StudyMaterialsList`
- Sub-aba "Simulados" renderiza novo `ExamsList`
- Sub-aba "Vídeos" renderiza novo `VideoLibrary`

---

### 4. Componentes novos

**Apostilas — `src/components/studies/StudyMaterialsList.tsx`**
- Lista cards de apostilas filtradas por arte marcial e faixa do aluno
- Card com título, descrição, badge de faixa, botão "Abrir PDF" ou render inline
- Busca na tabela `study_materials`

**Simulados — `src/components/studies/ExamsList.tsx`**
- Lista de simulados disponíveis com badge de dificuldade
- Ao clicar, abre `ExamRunner` em tela cheia
- Mostra histórico de tentativas anteriores (nota, data)

**Simulados — `src/components/studies/ExamRunner.tsx`**
- Renderiza questões uma a uma (sem timer)
- Ao final mostra resultado com score e revisão das respostas
- Salva tentativa em `exam_attempts` e concede XP

**Vídeos — `src/components/studies/VideoLibrary.tsx`**
- Grid de cards com thumbnail, título, badge de faixa
- Player inline (YouTube embed ou video nativo)
- Filtros por faixa

---

### 5. Painel do Sensei — gestão de conteúdo

Novo item no sidebar do staff: "Conteúdo" (`/content` ou seção dentro de Settings)

**`src/pages/ContentManagement.tsx`** (staff only)
- Tabs: Apostilas | Vídeos | Simulados
- Apostilas: upload PDF, título, faixa, arte
- Vídeos: cole link YouTube ou faça upload, título, faixa
- Simulados: criar exame com N questões (editor simples)

---

### 6. Conteúdo fixo embutido

- Arquivo `src/data/fixedStudyContent.ts` com apostilas e vídeos fixos de Judô
- Estes aparecem para todos os dojos independente de uploads do sensei
- Podem ser marcados como `type: 'embedded'` / `source: 'fixed'`

---

### 7. Ordem de implementação

1. Migration DB (4 tabelas + bucket + RLS)
2. Página `StudentStudies` com sub-abas e migração de navegação
3. Sub-aba Tarefas (mover lógica existente)
4. Sub-aba Vídeos (mais simples — lista + player)
5. Sub-aba Apostilas (lista + viewer)
6. Sub-aba Simulados (lista + runner + XP)
7. Painel do Sensei para gestão de conteúdo

### Detalhes técnicos

- Nenhuma alteração em `task_templates` ou `tasks` — a lógica de quizzes permanece intacta
- XP: simulados concedem XP via `grant_xp` existente (e.g. 20 XP por simulado completo com >70% acerto)
- Todos os componentes seguem o padrão visual existente (Cards, Progress, BeltBadge)
- Filtro por `martial_art = 'judo'` na fase 1; extensão para BJJ posterior

