

## Problema

As notificações push com o app fechado **não chegam** porque vários fluxos de disparo apenas inserem registros na tabela `notifications` (in-app) mas **nunca chamam** a Edge Function `send-push-notification`. Apenas 3 edge functions (cron jobs) fazem o disparo push corretamente. Fluxos manuais do frontend (cobranças, aprovações, etc.) ficam sem push.

Além disso, as notificações nativas do navegador são cinzas e genéricas — sem ícone personalizado nem visual atrativo.

## Diagnóstico Detalhado

Fluxos que **NÃO enviam push** (só in-app):
1. `handleSendNotifications` (Payments.tsx) — cobranças manuais
2. `NotificationBell` realtime inserts — só toca som local
3. Qualquer insert direto na tabela `notifications`

Fluxos que **enviam push** corretamente:
1. `notify-overdue-payments` (cron)
2. `notify-training-reminder` (cron)
3. `notify-new-student-registration` (edge function)
4. `announcementsService.ts` (mural de avisos)

## Plano de Implementação

### 1. Criar trigger de banco que dispara push automaticamente

Em vez de depender do frontend chamar a edge function manualmente, criar um **database webhook / pg_net trigger** que, ao inserir na tabela `notifications`, automaticamente chama `send-push-notification`.

**Abordagem**: Criar uma Edge Function `on-notification-insert` que é chamada via Database Webhook (Supabase) sempre que um INSERT acontece na tabela `notifications`. Essa função lê o `user_id` do registro inserido e chama `send-push-notification`.

**Alternativa mais simples (escolhida)**: Adicionar chamadas `send-push-notification` em todos os fluxos do frontend que inserem notificações. Isso é mais direto e não requer webhook.

### 2. Corrigir todos os fluxos de disparo no frontend

**Payments.tsx** — `handleSendNotifications`:
- Após inserir na tabela `notifications`, chamar `supabase.functions.invoke("send-push-notification")` com os `userIds` e o título/corpo da notificação.

**Students.tsx** — aprovação de cadastro:
- Já chama push (OK).

**announcementsService.ts**:
- Já chama push (OK).

### 3. Melhorar o visual das notificações nativas (Service Worker)

**sw.js** — Atualizar o handler de `push`:
- Usar ícones diferentes por tipo de notificação (cobrança, lembrete, aviso, etc.) passando um campo `type` no payload.
- Adicionar `image` ao payload para notificações com banner visual.
- Usar `actions` para botões rápidos (ex: "Ver pagamento", "Abrir app").
- Badge com ícone pequeno dedicado (criar `/badge-icon.png` 96x96 monocromático).

**Payload enriquecido** — Atualizar a Edge Function `send-push-notification`:
- Aceitar campo `type` no body.
- Mapear `type` para ícones específicos (`/icons/payment.png`, `/icons/warning.png`, `/icons/info.png`, `/icons/training.png`).
- Passar `actions` no payload conforme o tipo.

### 4. Criar ícones para notificações

Criar ícones PNG dedicados em `/public/icons/`:
- `payment.png` — ícone de pagamento (cartão/moeda)
- `warning.png` — ícone de alerta
- `training.png` — ícone de treino (judogi/tatame)
- `info.png` — ícone informativo
- `badge.png` — badge monocromático 96x96 para Android

### 5. Melhorar notificação no SW com actions

```text
Antes:
┌──────────────────────────┐
│ 🔔 Dojo Control          │
│ Nova notificação          │
└──────────────────────────┘

Depois:
┌──────────────────────────┐
│ 💳 Pagamento em Atraso   │
│ Sua mensalidade de R$... │
│ [Ver pagamento] [Fechar] │
└──────────────────────────┘
```

### Arquivos a editar

| Arquivo | Mudança |
|---|---|
| `src/pages/Payments.tsx` | Adicionar chamada push após insert de notificações |
| `public/sw.js` | Enriquecer visual: ícones por tipo, actions, badge |
| `supabase/functions/send-push-notification/index.ts` | Aceitar `type`, mapear para ícones e actions |
| `/public/icons/*.png` | Criar ícones dedicados (SVG inline convertidos) |

### Detalhes Técnicos

**Payments.tsx** — Adicionar após o insert:
```typescript
const studentIds = Array.from(studentPayments.keys());
supabase.functions.invoke("send-push-notification", {
  body: {
    userIds: studentIds,
    title: "💳 Lembrete de Pagamento",
    body: "Você tem pagamentos pendentes. Acesse o app para verificar.",
    url: "/mensalidade",
    type: "payment"
  }
}).catch(() => {});
```

**sw.js** — Notificação enriquecida:
```javascript
const TYPE_CONFIG = {
  payment: { icon: '/icons/payment.png', actions: [{ action: 'open', title: 'Ver pagamento' }] },
  warning: { icon: '/icons/warning.png', actions: [{ action: 'open', title: 'Verificar' }] },
  training: { icon: '/icons/training.png', actions: [{ action: 'open', title: 'Ver agenda' }] },
  default: { icon: '/favicon.png', actions: [] }
};
```

