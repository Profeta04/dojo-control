

# QR Code Pix com Valor Embutido

## Objetivo
Gerar QR Codes Pix (BR Code / padrão EMV) com o valor exato da cobrança embutido, tanto para pagamentos de mensalidades dos alunos quanto para assinaturas de planos dos dojos. O aluno/sensei escaneia o QR Code no app do banco e o valor já vem preenchido automaticamente.

## Como funciona o Pix Estático
O padrão BR Code (definido pelo Banco Central) permite codificar em uma string: chave Pix, nome do recebedor, cidade, e **valor da transacao**. Essa string vira um QR Code que qualquer app bancário lê. Usaremos a biblioteca **pix-utils** que implementa esse padrão.

**Limitacao importante**: O QR Code estático nao confirma pagamento automaticamente. O fluxo de comprovantes (upload + verificacao) continua igual.

---

## Etapas

### 1. Instalar dependencia `pix-utils`
Biblioteca TypeScript leve que gera a string BR Code no padrao EMV do Banco Central.

### 2. Criar componente compartilhado `PixQRCodePayment`
Novo arquivo `src/components/payments/PixQRCodePayment.tsx`:
- Recebe: `pixKey`, `amount`, `merchantName`, `city` (opcional), `description` (opcional)
- Usa `pix-utils` para gerar a string BR Code com valor embutido
- Usa a biblioteca `qrcode` (ja instalada) para renderizar o QR Code em canvas
- Exibe o valor formatado abaixo do QR Code
- Inclui botao "Copiar Pix Copia e Cola" que copia a string BR Code completa
- Tratamento de erro caso a chave Pix nao esteja configurada

### 3. Atualizar tela de Pagamentos do Aluno (`StudentPayments.tsx`)
- Substituir o card generico de "Pagar via Pix" (que so mostra a chave) por um sistema contextual
- Ao clicar em um pagamento pendente/atrasado, abrir um dialog com o `PixQRCodePayment` ja com o valor exato (incluindo multas/juros se aplicavel)
- Manter o botao de upload de comprovante no mesmo dialog
- O card geral de Pix continua visivel mas agora indica "Clique em um pagamento para gerar o QR Code com valor"

### 4. Atualizar tela de Assinatura do Sensei (`SenseiSubscriptionView.tsx`)
- No dialog de pagamento PIX (que hoje mostra uma imagem estatica `pix-qrcode.png`), substituir pela geracao dinamica do QR Code
- O valor sera o preco calculado do plano (ja com descontos/cupons aplicados)
- A chave Pix usada sera a `admin_pix_key` dos settings
- Manter o fluxo de upload de comprovante

---

## Detalhes Tecnicos

### Componente `PixQRCodePayment`

```text
+----------------------------------+
|         [QR Code Canvas]         |
|           280 x 280              |
|                                  |
|     Valor: R$ 150,00             |
|                                  |
|  [====== BR Code string ======]  |
|  [   Copiar Pix Copia e Cola  ]  |
+----------------------------------+
```

Logica principal:
- `createStaticPix()` do `pix-utils` gera o BR Code
- `QRCode.toCanvas()` (ja usado no projeto) renderiza
- Props: `pixKey`, `amount`, `merchantName`, `merchantCity?`, `description?`

### Fluxo do Aluno
1. Aluno ve lista de pagamentos pendentes/atrasados
2. Clica no botao "Pagar" de um pagamento especifico
3. Dialog abre com QR Code Pix contendo o valor exato (com multas se aplicavel)
4. Aluno escaneia com app do banco -- valor ja preenchido
5. Aluno faz upload do comprovante no mesmo dialog
6. Comprovante vai para verificacao do sensei/admin

### Fluxo do Sensei (Assinatura)
1. Sensei escolhe plano e clica "Assinar"
2. Dialog abre com QR Code Pix dinamico com o valor do plano (com descontos)
3. Sensei escaneia e paga
4. Upload do comprovante
5. Admin aprova

### Arquivos modificados
| Arquivo | Alteracao |
|---------|-----------|
| `src/components/payments/PixQRCodePayment.tsx` | **Novo** - Componente compartilhado |
| `src/pages/StudentPayments.tsx` | Dialog de pagamento com QR Code por cobranca |
| `src/components/settings/SenseiSubscriptionView.tsx` | QR Code dinamico no dialog de assinatura |

### Sem alteracoes no banco de dados
Nenhuma migracao necessaria. Toda a geracao do QR Code acontece no frontend.

