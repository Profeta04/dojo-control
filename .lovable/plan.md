

# Plano: Remover Sistema de Responsável

## Resumo
Remover completamente o sistema de "responsável" (guardian). O responsável que precisar pagar mensalidades simplesmente fará login na conta do aluno e usará a senha do aluno na aba de pagamentos.

## Arquivos a Deletar
1. `src/pages/GuardianDependents.tsx` - Página de dependentes
2. `src/components/guardian/GuardianDashboard.tsx` - Dashboard do responsável
3. `src/components/guardian/GuardianMinorDetails.tsx` - Detalhes do dependente
4. `src/components/guardian/GuardianProfileCard.tsx` - Cards de perfil do responsável
5. `src/components/guardian/GuardianPaymentsSummaryCard.tsx` - Resumo financeiro
6. `src/components/auth/GuardianPasswordGate.tsx` - Gate de senha do responsável
7. `src/hooks/useGuardianMinors.ts` - Hook de menores vinculados

## Arquivos a Editar

### Rotas e Navegacao
1. **`src/App.tsx`** - Remover import e rota `/dependentes` do `GuardianDependents`
2. **`src/components/layout/StudentBottomNav.tsx`** - Remover `guardianPage1`, remover import `useGuardianMinors`, remover lógica `isGuardian` na seleção de páginas
3. **`src/components/layout/DashboardLayout.tsx`** - Remover import `useGuardianMinors`, remover lógica `isGuardian` e o botão de config do responsável
4. **`src/components/layout/sidebar/SidebarNavContent.tsx`** - Verificar se há itens específicos de guardian (provavelmente não, mas confirmar)

### Páginas
5. **`src/pages/StudentProfile.tsx`** - Remover branch `isGuardian` que renderiza `GuardianProfileCard`/`GuardianMinorsSummaryCard`/`GuardianPaymentsSummaryCard`. Manter apenas o fluxo de aluno normal
6. **`src/pages/StudentPayments.tsx`** - Remover import `useGuardianMinors`, remover lógica `isGuardian` na query de pagamentos (voltar a buscar apenas pagamentos do `user.id`), remover exibição de nome do dependente na tabela
7. **`src/pages/StudentPaymentHistory.tsx`** - Remover lógica de `isMinorWithGuardian` e `GuardianPasswordGate`
8. **`src/pages/Dashboard.tsx`** - Remover import `useGuardianMinors` e `GuardianDashboard`

### Componentes de Apoio
9. **`src/components/student/GuardianInfoCard.tsx`** - Remover este componente (exibe info do responsável no perfil do aluno) ou simplificar para apenas mostrar email/nome se houver `guardian_email` no perfil
10. **`src/components/help/HelpTutorials.tsx`** - Remover `guardianTutorials` e lógica `isGuardian`
11. **`src/components/help/tourData.ts`** - Remover `guardianTutorials` e parâmetro `isGuardian` da função `getTutorialForPath`
12. **`src/components/help/InteractiveTutorialDialog.tsx`** - Remover import `useGuardianMinors` e lógica `isGuardian`
13. **`src/components/notifications/InAppPaymentNotifier.tsx`** - Verificar se há lógica guardian-specific

### Páginas Admin
14. **`src/pages/Students.tsx`** - Remover filtro que exclui guardians da lista de alunos (guardians com `guardian_user_id`)
15. **`src/components/classes/ClassesTab.tsx`** - Remover filtro que exclui guardians dos alunos disponíveis

### Autenticação
16. **`src/pages/Auth.tsx`** - Remover o passo de cadastro que cria conta de responsável separada (signup do guardian). Manter apenas o campo `guardian_email` e `guardian_name` como informações de contato no perfil do aluno, sem criar conta separada

## Banco de Dados
- As RLS policies de guardian (`Guardians can view minor payments`, `Guardians can view minor attendance`, etc.) podem ser removidas via migração SQL
- A tabela `guardian_minors` pode ser mantida por ora (não causa problemas) ou removida se desejado
- Os campos `guardian_email` e `guardian_user_id` na tabela `profiles` serão mantidos como dados de contato informativos

## Detalhes Técnicos

### Migração SQL
```text
DROP POLICY IF EXISTS "Guardians can view minor payments" ON public.payments;
DROP POLICY IF EXISTS "Guardians can view minor attendance" ON public.attendance;
DROP POLICY IF EXISTS "Guardians can view minor enrollments" ON public.class_students;
DROP POLICY IF EXISTS "Guardians can view minor classes" ON public.classes;
DROP POLICY IF EXISTS "Guardians can view minor schedules" ON public.class_schedule;
DROP POLICY IF EXISTS "Guardians can view minor profiles" ON public.profiles;
```

### Edge Function
- `supabase/functions/verify-guardian-password/index.ts` - Pode ser deletada pois não será mais usada

### Impacto no Cadastro (Auth.tsx)
O fluxo de cadastro de menores será simplificado:
- Remover criação de conta do responsável via `supabase.auth.signUp` com `is_guardian: true`
- Manter campos de nome/email/telefone do responsável apenas como informação de contato salva no perfil do aluno
- O campo `guardian_user_id` não será mais preenchido no signup

