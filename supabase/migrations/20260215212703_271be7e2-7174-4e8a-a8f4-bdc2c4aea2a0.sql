
-- Create the update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Seasons table
CREATE TABLE public.seasons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  theme TEXT NOT NULL,
  year INTEGER NOT NULL,
  quarter INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  xp_multiplier NUMERIC NOT NULL DEFAULT 1.0,
  color_primary TEXT NOT NULL DEFAULT '0 0% 50%',
  color_accent TEXT NOT NULL DEFAULT '0 0% 50%',
  icon TEXT NOT NULL DEFAULT '☀️',
  title_reward TEXT,
  border_style TEXT DEFAULT 'none',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Season XP tracking
CREATE TABLE public.season_xp (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, season_id)
);

-- Season rewards
CREATE TABLE public.season_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  reward_type TEXT NOT NULL,
  reward_value TEXT NOT NULL,
  final_rank INTEGER,
  final_xp INTEGER DEFAULT 0,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, season_id, reward_type)
);

-- RLS
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_xp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view seasons" ON public.seasons FOR SELECT USING (true);
CREATE POLICY "Users can view own season XP" ON public.season_xp FOR SELECT USING (auth.uid() = user_id OR public.is_staff(auth.uid()));
CREATE POLICY "Users can insert own season XP" ON public.season_xp FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own season XP" ON public.season_xp FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view season rewards" ON public.season_rewards FOR SELECT USING (true);
CREATE POLICY "System can insert rewards" ON public.season_rewards FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_staff(auth.uid()));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.season_xp;

-- Trigger
CREATE TRIGGER update_season_xp_updated_at
  BEFORE UPDATE ON public.season_xp
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed 2026 seasons
INSERT INTO public.seasons (name, slug, theme, year, quarter, start_date, end_date, is_active, color_primary, color_accent, icon, title_reward, border_style) VALUES
  ('Verão 2026', 'verao-2026', 'verao', 2026, 1, '2026-01-01', '2026-03-31', true, '25 95% 53%', '39 100% 50%', '☀️', 'Guerreiro do Verão', 'ring-2 ring-orange-400'),
  ('Outono 2026', 'outono-2026', 'outono', 2026, 2, '2026-04-01', '2026-06-30', false, '30 60% 45%', '15 75% 40%', '🍂', 'Sentinela do Outono', 'ring-2 ring-amber-700'),
  ('Inverno 2026', 'inverno-2026', 'inverno', 2026, 3, '2026-07-01', '2026-09-30', false, '200 80% 55%', '210 90% 70%', '❄️', 'Guardião do Inverno', 'ring-2 ring-blue-400'),
  ('Primavera 2026', 'primavera-2026', 'primavera', 2026, 4, '2026-10-01', '2026-12-31', false, '140 60% 45%', '160 70% 50%', '🌸', 'Flor da Primavera', 'ring-2 ring-green-400');
