
-- =============================================
-- FASE 1: Schema completo do sistema de gamificação
-- =============================================

-- 1. Tabela student_xp - Armazena XP, nível e streaks por aluno
CREATE TABLE public.student_xp (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  total_xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_activity_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.student_xp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own xp" ON public.student_xp
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own xp" ON public.student_xp
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert own xp" ON public.student_xp
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Staff can manage all xp" ON public.student_xp
  FOR ALL USING (is_staff(auth.uid()));

-- Leaderboard: todos os alunos aprovados podem ver XP de outros do mesmo dojo
CREATE POLICY "Students can view dojo leaderboard" ON public.student_xp
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p1
      JOIN profiles p2 ON p1.dojo_id = p2.dojo_id
      WHERE p1.user_id = auth.uid()
        AND p2.user_id = student_xp.user_id
        AND p1.registration_status = 'aprovado'
    )
  );

-- 2. Tabela achievements - Definições de conquistas
CREATE TABLE public.achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  icon text NOT NULL DEFAULT '🏅',
  category text NOT NULL DEFAULT 'geral',
  criteria_type text NOT NULL, -- 'tasks_completed', 'streak_days', 'xp_total', 'quiz_score', 'annual_podium', 'annual_top10'
  criteria_value integer NOT NULL DEFAULT 1,
  xp_reward integer NOT NULL DEFAULT 0,
  is_annual boolean NOT NULL DEFAULT false,
  annual_year integer, -- NULL para conquistas permanentes, ano para anuais
  rarity text NOT NULL DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary'
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view achievements" ON public.achievements
  FOR SELECT USING (true);

CREATE POLICY "Staff can manage achievements" ON public.achievements
  FOR ALL USING (is_staff(auth.uid()));

-- 3. Tabela student_achievements - Conquistas desbloqueadas por aluno
CREATE TABLE public.student_achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  achievement_id uuid NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE public.student_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievements" ON public.student_achievements
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own achievements" ON public.student_achievements
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Staff can manage all achievements" ON public.student_achievements
  FOR ALL USING (is_staff(auth.uid()));

-- Outros alunos podem ver conquistas de colegas do dojo (para perfil/ranking)
CREATE POLICY "Students can view dojo achievements" ON public.student_achievements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p1
      JOIN profiles p2 ON p1.dojo_id = p2.dojo_id
      WHERE p1.user_id = auth.uid()
        AND p2.user_id = student_achievements.user_id
        AND p1.registration_status = 'aprovado'
    )
  );

-- 4. Alterar tabela tasks - Adicionar campos para fluxo híbrido e XP
ALTER TABLE public.tasks
  ADD COLUMN xp_value integer NOT NULL DEFAULT 10,
  ADD COLUMN evidence_text text,
  ADD COLUMN reviewed_by uuid,
  ADD COLUMN review_note text,
  ADD COLUMN reviewed_at timestamp with time zone,
  ADD COLUMN template_id uuid REFERENCES public.task_templates(id);

-- 5. Tabela leaderboard_history - Histórico anual de rankings
CREATE TABLE public.leaderboard_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  dojo_id uuid NOT NULL REFERENCES public.dojos(id),
  year integer NOT NULL,
  final_xp integer NOT NULL DEFAULT 0,
  final_rank integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, dojo_id, year)
);

ALTER TABLE public.leaderboard_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone in dojo can view history" ON public.leaderboard_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
        AND p.dojo_id = leaderboard_history.dojo_id
    )
  );

CREATE POLICY "Staff can manage leaderboard history" ON public.leaderboard_history
  FOR ALL USING (is_staff(auth.uid()));

-- 6. Trigger para atualizar updated_at em student_xp
CREATE TRIGGER update_student_xp_updated_at
  BEFORE UPDATE ON public.student_xp
  FOR EACH ROW
  EXECUTE FUNCTION public.update_task_updated_at();

-- 7. Habilitar realtime para XP e achievements
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_xp;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_achievements;
