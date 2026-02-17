

## Reorganizar Pagamentos e Historico

### Resumo

Separar claramente as responsabilidades entre as duas paginas:
- **Pagamentos** (`/payments`): Gestao financeira (PIX, planos, taxas) + nova seccao "Comprovantes a Aprovar"
- **Historico** (`/payment-history`): Lista completa de todos os pagamentos agrupados por status

No modo mobile (navbar inferior), o historico continua dentro da aba Pagamentos como ja esta.

### Mudancas

#### 1. `src/pages/Payments.tsx`
- **Remover** o bloco `lg:hidden` que mostra o historico completo no mobile (linhas ~804-940) -- isso ja nao e necessario pois o historico no mobile deve ficar acessivel pela mesma aba
- **Manter e expandir** a seccao "Comprovantes para Verificar" removendo a classe `hidden lg:block` para que apareca em **todos os tamanhos de tela** (desktop e mobile)
- A seccao mostra pagamentos com `receipt_status === 'pendente_verificacao'` para aprovacao rapida pelo admin/sensei

#### 2. `src/pages/Payments.tsx` (mobile)
- Adicionar o historico completo (stats, filtros, seccoes agrupadas) **apenas no mobile** (`lg:hidden`) abaixo da seccao de comprovantes -- mantendo a experiencia atual onde tudo fica na mesma pagina no mobile

**Resultado final:**
- **Desktop (sidebar):** Pagamentos mostra gestao + comprovantes a aprovar. Historico e uma pagina separada acessivel pela sidebar.
- **Mobile (bottom nav):** Pagamentos mostra tudo (gestao + comprovantes + historico) numa unica pagina, pois nao ha link separado para historico na navbar inferior.

### Detalhes Tecnicos

- Remover `hidden lg:block` da div do bloco de comprovantes pendentes (linha ~704) para tornar visivel em todos os tamanhos
- Manter o bloco `lg:hidden` com o historico completo para mobile
- Nenhuma mudanca na sidebar (`SidebarNavContent.tsx`) -- "Pagamentos" e "Historico" continuam como itens separados
- Nenhuma mudanca no `PaymentHistory.tsx` -- a pagina dedicada continua funcionando
- Nenhuma mudanca no `StudentBottomNav.tsx` -- historico nao aparece na navbar inferior

