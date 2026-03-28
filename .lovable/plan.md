

## Plano: Módulo "Estudos" — IMPLEMENTADO ✅

A aba "Tarefas" foi renomeada para "Estudos" (`/estudos`) com 4 sub-abas: Tarefas, Apostilas, Simulados e Vídeos.

### O que foi feito

1. **Banco de dados**: 4 novas tabelas (`study_materials`, `study_videos`, `exam_templates`, `exam_attempts`) + bucket `study-materials` + RLS
2. **Navegação**: Rota `/tarefas` → `/estudos`, sidebar e bottom nav atualizados com ícone `BookOpen`
3. **Página `/estudos`**: 4 sub-abas com animação — Tarefas (quiz + ranking), Apostilas, Simulados, Vídeos
4. **Apostilas**: Conteúdo fixo de Judô embutido + suporte a upload PDF pelo sensei
5. **Vídeos**: Biblioteca fixa + YouTube links pelo sensei
6. **Simulados**: Prova sem timer, revisão de respostas, XP por aprovação (≥70%)
7. **Gestão de Conteúdo**: Página `/conteudo` para staff gerenciar apostilas, vídeos e simulados
8. **Conteúdo fixo**: `src/data/fixedStudyContent.ts` com materiais e vídeos oficiais de Judô
