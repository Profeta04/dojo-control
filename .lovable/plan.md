# Plano: Comunicação Interna (Mural de Avisos)

## Decisões Finais
- **Autores:** Admin + Senseis
- **Conteúdo:** Texto + 1 imagem (opcional)
- **Segmentação:** Para todo o dojo (sem filtro por turma)
- **Expiração:** Opcional por aviso (sensei decide se coloca data ou não)
- **Notificação:** Push notification para todos os avisos novos
- **Edição:** Editável após publicação
- **Visualização:** Lista com cards, exibida no topo da dashboard do aluno

---

## Banco de Dados

### Tabela `announcements`
```sql
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dojo_id uuid NOT NULL REFERENCES public.dojos(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  image_url text,
  priority text NOT NULL DEFAULT 'normal', -- 'normal' | 'urgente'
  pinned boolean NOT NULL DEFAULT false,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Membros do dojo podem ver avisos (não expirados)
CREATE POLICY "Dojo members can view announcements"
  ON public.announcements FOR SELECT
  USING (
    dojo_id = get_user_dojo_id_safe(auth.uid())
    OR (is_staff(auth.uid()) AND dojo_id IN (SELECT get_sensei_dojo_ids(auth.uid())))
  );

-- Staff pode criar avisos do próprio dojo
CREATE POLICY "Staff can insert announcements"
  ON public.announcements FOR INSERT
  WITH CHECK (
    is_staff(auth.uid())
    AND (dojo_id IN (SELECT get_sensei_dojo_ids(auth.uid())) OR has_role(auth.uid(), 'admin'))
  );

-- Staff pode editar avisos do próprio dojo
CREATE POLICY "Staff can update announcements"
  ON public.announcements FOR UPDATE
  USING (
    is_staff(auth.uid())
    AND (dojo_id IN (SELECT get_sensei_dojo_ids(auth.uid())) OR has_role(auth.uid(), 'admin'))
  );

-- Staff pode deletar avisos do próprio dojo
CREATE POLICY "Staff can delete announcements"
  ON public.announcements FOR DELETE
  USING (
    is_staff(auth.uid())
    AND (dojo_id IN (SELECT get_sensei_dojo_ids(auth.uid())) OR has_role(auth.uid(), 'admin'))
  );

-- Trigger de updated_at
CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

### Tabela `announcement_reads`
```sql
CREATE TABLE public.announcement_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

-- Usuário pode ver próprias leituras
CREATE POLICY "Users can view own reads"
  ON public.announcement_reads FOR SELECT
  USING (user_id = auth.uid());

-- Usuário pode marcar como lido
CREATE POLICY "Users can insert own reads"
  ON public.announcement_reads FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Staff pode ver todas as leituras do dojo (para analytics)
CREATE POLICY "Staff can view all reads"
  ON public.announcement_reads FOR SELECT
  USING (is_staff(auth.uid()));
```

### Storage
```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('announcement-images', 'announcement-images', true);

CREATE POLICY "Staff can upload announcement images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'announcement-images' AND is_staff(auth.uid()));

CREATE POLICY "Anyone can view announcement images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'announcement-images');

CREATE POLICY "Staff can delete announcement images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'announcement-images' AND is_staff(auth.uid()));
```

---

## Frontend — Arquivos a Criar/Editar

### Novos Arquivos
1. **`src/pages/Announcements.tsx`** — Página principal `/avisos`
   - Lista de avisos em cards
   - Filtros: todos / não lidos / urgentes / fixados
   - Ordenação: fixados primeiro, depois urgentes, depois por data
   - Avisos expirados não aparecem para alunos (filtra `expires_at`)
   - Sensei: botão "Novo Aviso" no header

2. **`src/components/announcements/AnnouncementCard.tsx`** — Card individual
   - Badge de urgente (vermelho)
   - Ícone de fixado (pin)
   - Imagem (se houver) com aspect-ratio
   - Título, prévia do conteúdo (truncado), data, autor
   - Indicador de "não lido" (bolinha azul)
   - Ao clicar: expande o conteúdo completo + marca como lido

3. **`src/components/announcements/AnnouncementFormDialog.tsx`** — Dialog criar/editar
   - Campos: título, conteúdo (textarea), upload de imagem, prioridade (toggle normal/urgente), fixar (checkbox), data de expiração (date picker opcional)
   - Validação: título obrigatório (max 100 chars), conteúdo obrigatório (max 2000 chars)
   - Ao salvar: insere no banco + dispara push notification

4. **`src/components/announcements/DashboardAnnouncementsBanner.tsx`** — Banner no dashboard do aluno
   - Mostra os últimos 3 avisos não lidos no topo da dashboard
   - Card compacto com título + badge urgente + "Ver todos →"
   - Some quando não há avisos não lidos

5. **`src/hooks/useAnnouncements.ts`** — Hook de dados
   - Query de avisos do dojo atual (filtrando expirados para alunos)
   - Query de contagem de não lidos
   - Mutations: criar, editar, deletar, marcar como lido

### Arquivos a Editar
6. **`src/App.tsx`** — Adicionar rota `/avisos` → `Announcements`
7. **`src/components/layout/sidebar/SidebarNavContent.tsx`** — Adicionar item "Avisos" com badge de contagem
8. **`src/components/layout/StudentBottomNav.tsx`** — Adicionar ícone de avisos na nav mobile do aluno
9. **`src/pages/Dashboard.tsx`** — Importar e renderizar `DashboardAnnouncementsBanner` no topo (para alunos)

### Push Notification
10. Reusar a edge function `send-push-notification` existente
    - Ao criar aviso: buscar todos os `push_subscriptions` dos alunos do dojo + enviar push com título do aviso

---

## Fluxos de Uso

### Sensei publica aviso
1. Sensei vai em `/avisos` → clica "Novo Aviso"
2. Preenche título, conteúdo, opcionalmente imagem/prioridade/fixar/expiração
3. Clica "Publicar"
4. Sistema insere na tabela `announcements`
5. Sistema busca todos os alunos do dojo com push subscription
6. Envia push notification para cada um: "📢 [Título do aviso]"
7. Aviso aparece na lista e no dashboard dos alunos

### Aluno vê aviso
1. Aluno abre o app → vê banner no topo da dashboard com avisos não lidos
2. Clica em um aviso → card expande mostrando conteúdo completo
3. Sistema insere registro em `announcement_reads`
4. Badge de não lido some

### Sensei edita aviso
1. Sensei vai em `/avisos` → clica no menu ⋮ do aviso → "Editar"
2. Altera campos desejados → salva
3. Não reenvia push notification

### Aviso expira
1. Aviso com `expires_at` no passado não aparece para alunos
2. Sensei ainda pode vê-lo na lista (com indicador "expirado")

---

## Próximo Passo
Quando quiser implementar, diga "vamos!" e começo pela migração SQL.
