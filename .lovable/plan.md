

## Plano: Mover Justificativas para "Meu Progresso" e Dashboard do Aluno

### O que muda

As justificativas de faltas deixam de ter uma página própria (`/justificativas`) e passam a ser exibidas embutidas em duas páginas existentes:

1. **Meu Progresso** (`/meu-progresso`) — seção de justificativas no final da página, após a timeline de graduação
2. **Perfil / Dashboard do aluno** (`/perfil`) — seção de justificativas logo abaixo do `AnnouncementsBanner`

### Alterações

| Arquivo | Mudança |
|---|---|
| `src/pages/StudentMyProgress.tsx` | Importar e renderizar `StudentJustificationForm` após `GraduationTimeline` |
| `src/pages/StudentProfile.tsx` | Importar e renderizar `StudentJustificationForm` abaixo do `AnnouncementsBanner` |
| `src/App.tsx` | Remover a rota `/justificativas` e o lazy import de `StudentJustifications` |
| `src/pages/StudentJustifications.tsx` | Deletar o arquivo (página dedicada não mais necessária) |
| `src/components/layout/StudentBottomNav.tsx` | Remover o item "Faltas" (`/justificativas`) da navegação inferior |
| `src/components/layout/sidebar/SidebarNavContent.tsx` | Remover o item "Faltas" do menu lateral |

### Layout

**Meu Progresso** — no final:
```text
... stats cards ...
... graduação timeline ...
── Justificativa de Faltas ──   ← nova seção
   [formulário + histórico]
```

**Perfil (Dashboard do aluno)** — após avisos:
```text
── Mural de Avisos ──
── Justificativa de Faltas ──   ← nova seção
── Meus Dados / Cards ──
```

### Detalhes técnicos

- O componente `StudentJustificationForm` já é auto-contido (busca faltas, exibe formulário e histórico). Basta importá-lo e renderizá-lo.
- Nenhuma mudança de banco de dados necessária.
- A aba "Justificativas" no painel do Sensei (página Presenças) permanece inalterada.

