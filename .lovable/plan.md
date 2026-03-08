

## Plano: Filtro por turma na Agenda e Próximas Aulas

Adicionar um seletor de turma nos três componentes de agenda para filtrar aulas exibidas.

### Componentes afetados

| Componente | Contexto |
|---|---|
| `StudentSchedule.tsx` | Agenda do aluno (calendário + histórico) |
| `UpcomingTrainingsCard.tsx` | Card "Próximos Treinos" no perfil do aluno |
| `ScheduleTab.tsx` | Aba Agenda do sensei/admin (turmas) |

### Implementação

**1. StudentSchedule.tsx**
- Adicionar estado `selectedClassId` (default `"all"`)
- Renderizar um `<Select>` acima do calendário com as opções vindas de `myClasses` (já carregadas)
- Filtrar `scheduledClasses`, `attendanceHistory`, e os memos derivados (`datesWithClasses`, `selectedDateSchedules`, `upcomingToday`) pelo `selectedClassId` quando diferente de `"all"`

**2. UpcomingTrainingsCard.tsx**
- Adicionar estado `selectedClassId`
- Buscar as turmas ativas do aluno (já feito na query) e exibir um `<Select>` compacto no header do card
- Filtrar a lista de `trainings` no render pelo `selectedClassId`

**3. ScheduleTab.tsx**
- Adicionar estado `selectedClassId`
- Renderizar um `<Select>` ao lado do título do calendário, populado com `classes` (já carregadas)
- Filtrar `enrichedSchedules` pelo `selectedClassId`, o que automaticamente filtra calendário, detalhe do dia e próximas aulas

### UX
- Select compacto com ícone de filtro, label "Todas as turmas" como default
- Posicionado no header de cada card/seção, sem ocupar espaço extra

