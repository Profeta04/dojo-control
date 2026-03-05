

## Plano: Corrigir 4 Bugs Críticos

### 1. Race Condition no `useAuth.tsx`
**Problema:** `getSession()` e `onAuthStateChange` podem ambos disparar `fetchUserData`, causando duplo fetch.
**Correção:** Remover o bloco `getSession().then(...)` redundante. O `onAuthStateChange` com `INITIAL_SESSION` já cobre o caso inicial. Usar um ref `isMounted` para evitar updates após unmount.

### 2. `handlePermanentDelete` sem transação (`Students.tsx`)
**Problema:** 12+ deletes sequenciais no client-side; falha no meio = dados órfãos.
**Correção:** Criar uma **stored procedure** `delete_student_cascade(target_user_id UUID)` que faz todos os deletes dentro de uma transação SQL. No frontend, chamar via `supabase.rpc('delete_student_cascade', { target_user_id })` seguido da edge function `delete-user` para remover de `auth.users`. Incluir tabelas faltantes: `push_subscriptions`, `season_rewards`, `season_xp`, `leaderboard_history`, `user_onboarding`.

### 3. Aba de Responsáveis inacessível (`Students.tsx`)
**Problema:** O conteúdo `TabsContent value="guardians"` existe mas falta o `TabsTrigger` correspondente no `TabsList`.
**Correção:** Adicionar `<TabsTrigger value="guardians">Responsáveis</TabsTrigger>` no `TabsList`, ao lado das demais abas.

### 4. Redirect do Dashboard com `navigate()` durante render
**Problema:** `navigate()` é chamado dentro de `useEffect` mas pode causar flash de conteúdo antes do redirect para alunos.
**Correção:** Adicionar early return **antes** do JSX principal: se `isStudent && !canManageStudents`, retornar `null` ou `<Navigate to="/perfil" replace />` imediatamente, evitando renderizar o dashboard por um frame.

### Arquivos afetados
| Arquivo | Mudança |
|---|---|
| `src/hooks/useAuth.tsx` | Remover `getSession` redundante, adicionar ref de controle |
| `src/pages/Students.tsx` | Adicionar TabsTrigger "Responsáveis", substituir deletes por RPC |
| `src/pages/Dashboard.tsx` | Early return com `<Navigate>` para alunos |
| **Nova migration SQL** | Criar função `delete_student_cascade` |

