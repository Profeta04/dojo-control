
-- Clean up old achievements and related records
DELETE FROM student_achievements;
DELETE FROM achievements;

-- =============================================
-- CATEGORY: tarefas (tasks_completed) — 24 achievements
-- =============================================
INSERT INTO achievements (name, description, icon, category, criteria_type, criteria_value, rarity, xp_reward, is_annual) VALUES
('Primeira Tarefa', 'Complete sua primeira tarefa', '✅', 'tarefas', 'tasks_completed', 1, 'common', 5, false),
('Iniciante', 'Complete 3 tarefas', '📝', 'tarefas', 'tasks_completed', 3, 'common', 10, false),
('Primeiros Passos', 'Complete 5 tarefas', '👣', 'tarefas', 'tasks_completed', 5, 'common', 15, false),
('Dedicado', 'Complete 10 tarefas', '💪', 'tarefas', 'tasks_completed', 10, 'common', 25, false),
('Esforçado', 'Complete 15 tarefas', '🔨', 'tarefas', 'tasks_completed', 15, 'common', 30, false),
('Persistente', 'Complete 20 tarefas', '🎯', 'tarefas', 'tasks_completed', 20, 'common', 35, false),
('Guerreiro', 'Complete 25 tarefas', '⚔️', 'tarefas', 'tasks_completed', 25, 'rare', 50, false),
('Disciplinado', 'Complete 30 tarefas', '🥋', 'tarefas', 'tasks_completed', 30, 'rare', 55, false),
('Incansável', 'Complete 40 tarefas', '🏋️', 'tarefas', 'tasks_completed', 40, 'rare', 65, false),
('Samurai', 'Complete 50 tarefas', '⛩️', 'tarefas', 'tasks_completed', 50, 'rare', 80, false),
('Mestre em Treino', 'Complete 60 tarefas', '🎓', 'tarefas', 'tasks_completed', 60, 'rare', 90, false),
('Veterano', 'Complete 75 tarefas', '🏅', 'tarefas', 'tasks_completed', 75, 'rare', 100, false),
('Centurião', 'Complete 100 tarefas', '🛡️', 'tarefas', 'tasks_completed', 100, 'epic', 120, false),
('Implacável', 'Complete 125 tarefas', '🔥', 'tarefas', 'tasks_completed', 125, 'epic', 140, false),
('Forja de Aço', 'Complete 150 tarefas', '⚒️', 'tarefas', 'tasks_completed', 150, 'epic', 160, false),
('Espírito Inabalável', 'Complete 175 tarefas', '💎', 'tarefas', 'tasks_completed', 175, 'epic', 180, false),
('Mestre do Dojo', 'Complete 200 tarefas', '🏯', 'tarefas', 'tasks_completed', 200, 'epic', 200, false),
('Guardião', 'Complete 250 tarefas', '🦁', 'tarefas', 'tasks_completed', 250, 'epic', 230, false),
('Shodan', 'Complete 300 tarefas — nível 1º Dan', '🥇', 'tarefas', 'tasks_completed', 300, 'legendary', 280, false),
('Nidan', 'Complete 400 tarefas — nível 2º Dan', '🥈', 'tarefas', 'tasks_completed', 400, 'legendary', 360, false),
('Sandan', 'Complete 500 tarefas — nível 3º Dan', '🥉', 'tarefas', 'tasks_completed', 500, 'legendary', 400, false),
('Yondan', 'Complete 600 tarefas — nível 4º Dan', '🐉', 'tarefas', 'tasks_completed', 600, 'legendary', 450, false),
('Godan', 'Complete 750 tarefas — nível 5º Dan', '🐲', 'tarefas', 'tasks_completed', 750, 'legendary', 500, false),
('Grande Mestre', 'Complete 1000 tarefas', '👑', 'tarefas', 'tasks_completed', 1000, 'legendary', 600, false),

-- =============================================
-- CATEGORY: streak (streak_days) — 24 achievements
-- =============================================
('Começando', 'Mantenha um streak de 2 dias', '🌱', 'streak', 'streak_days', 2, 'common', 10, false),
('Consistente', 'Mantenha um streak de 3 dias', '📆', 'streak', 'streak_days', 3, 'common', 15, false),
('Aquecendo', 'Mantenha um streak de 5 dias', '🔥', 'streak', 'streak_days', 5, 'common', 20, false),
('Uma Semana', 'Mantenha um streak de 7 dias', '📅', 'streak', 'streak_days', 7, 'common', 30, false),
('Firme', 'Mantenha um streak de 10 dias', '💪', 'streak', 'streak_days', 10, 'common', 40, false),
('Determinado', 'Mantenha um streak de 12 dias', '🎯', 'streak', 'streak_days', 12, 'common', 45, false),
('Duas Semanas', 'Mantenha um streak de 14 dias', '🗓️', 'streak', 'streak_days', 14, 'rare', 55, false),
('Resistente', 'Mantenha um streak de 17 dias', '🧱', 'streak', 'streak_days', 17, 'rare', 65, false),
('Três Semanas', 'Mantenha um streak de 21 dias', '🏔️', 'streak', 'streak_days', 21, 'rare', 75, false),
('Disciplina de Ferro', 'Mantenha um streak de 25 dias', '⚙️', 'streak', 'streak_days', 25, 'rare', 85, false),
('Um Mês', 'Mantenha um streak de 30 dias', '🌙', 'streak', 'streak_days', 30, 'rare', 100, false),
('Fortaleza', 'Mantenha um streak de 35 dias', '🏰', 'streak', 'streak_days', 35, 'rare', 110, false),
('Inabalável', 'Mantenha um streak de 40 dias', '⛰️', 'streak', 'streak_days', 40, 'epic', 125, false),
('Sem Parar', 'Mantenha um streak de 45 dias', '🚀', 'streak', 'streak_days', 45, 'epic', 140, false),
('Meio Centurião', 'Mantenha um streak de 50 dias', '🎖️', 'streak', 'streak_days', 50, 'epic', 155, false),
('Dois Meses', 'Mantenha um streak de 60 dias', '🌟', 'streak', 'streak_days', 60, 'epic', 180, false),
('Montanha', 'Mantenha um streak de 70 dias', '🗻', 'streak', 'streak_days', 70, 'epic', 200, false),
('Titânio', 'Mantenha um streak de 80 dias', '🔩', 'streak', 'streak_days', 80, 'epic', 220, false),
('Três Meses', 'Mantenha um streak de 90 dias', '🏆', 'streak', 'streak_days', 90, 'legendary', 260, false),
('Centenário', 'Mantenha um streak de 100 dias', '💯', 'streak', 'streak_days', 100, 'legendary', 300, false),
('Quatro Meses', 'Mantenha um streak de 120 dias', '🌋', 'streak', 'streak_days', 120, 'legendary', 350, false),
('Meio Ano', 'Mantenha um streak de 180 dias', '☀️', 'streak', 'streak_days', 180, 'legendary', 450, false),
('Nove Meses', 'Mantenha um streak de 270 dias', '🐉', 'streak', 'streak_days', 270, 'legendary', 550, false),
('Um Ano Inteiro', 'Mantenha um streak de 365 dias', '👑', 'streak', 'streak_days', 365, 'legendary', 700, false),

-- =============================================
-- CATEGORY: xp (xp_total) — 23 achievements
-- =============================================
('Faísca', 'Alcance 50 XP', '✨', 'xp', 'xp_total', 50, 'common', 5, false),
('Centelha', 'Alcance 100 XP', '💡', 'xp', 'xp_total', 100, 'common', 10, false),
('Chama', 'Alcance 200 XP', '🕯️', 'xp', 'xp_total', 200, 'common', 15, false),
('Fogueira', 'Alcance 350 XP', '🔥', 'xp', 'xp_total', 350, 'common', 20, false),
('Tocha', 'Alcance 500 XP', '🔦', 'xp', 'xp_total', 500, 'common', 30, false),
('Brilhante', 'Alcance 750 XP', '💫', 'xp', 'xp_total', 750, 'common', 40, false),
('Milhar', 'Alcance 1.000 XP', '🌟', 'xp', 'xp_total', 1000, 'rare', 50, false),
('Ascensão', 'Alcance 1.500 XP', '📈', 'xp', 'xp_total', 1500, 'rare', 60, false),
('Poder', 'Alcance 2.000 XP', '⚡', 'xp', 'xp_total', 2000, 'rare', 75, false),
('Força Interior', 'Alcance 2.500 XP', '🧘', 'xp', 'xp_total', 2500, 'rare', 85, false),
('Energia', 'Alcance 3.000 XP', '🔋', 'xp', 'xp_total', 3000, 'rare', 100, false),
('Aura', 'Alcance 4.000 XP', '🌀', 'xp', 'xp_total', 4000, 'rare', 115, false),
('Espírito', 'Alcance 5.000 XP', '👻', 'xp', 'xp_total', 5000, 'epic', 130, false),
('Essência', 'Alcance 6.500 XP', '💎', 'xp', 'xp_total', 6500, 'epic', 150, false),
('Radiância', 'Alcance 8.000 XP', '☀️', 'xp', 'xp_total', 8000, 'epic', 170, false),
('Dez Mil', 'Alcance 10.000 XP', '🔟', 'xp', 'xp_total', 10000, 'epic', 200, false),
('Transcendência', 'Alcance 12.500 XP', '🌈', 'xp', 'xp_total', 12500, 'epic', 230, false),
('Iluminação', 'Alcance 15.000 XP', '🧿', 'xp', 'xp_total', 15000, 'epic', 260, false),
('Vinte Mil', 'Alcance 20.000 XP', '🏛️', 'xp', 'xp_total', 20000, 'legendary', 300, false),
('Supernova', 'Alcance 25.000 XP', '💥', 'xp', 'xp_total', 25000, 'legendary', 350, false),
('Trinta Mil', 'Alcance 30.000 XP', '🌍', 'xp', 'xp_total', 30000, 'legendary', 400, false),
('Cinquenta Mil', 'Alcance 50.000 XP', '🌌', 'xp', 'xp_total', 50000, 'legendary', 600, false),
('Infinito', 'Alcance 100.000 XP', '♾️', 'xp', 'xp_total', 100000, 'legendary', 1000, false),

-- =============================================
-- CATEGORY: anual (annual) — 4 achievements
-- =============================================
('Campeão do Ano', 'Termine o ano em 1º lugar no ranking', '🏆', 'anual', 'annual_podium', 1, 'legendary', 500, true),
('Vice-Campeão', 'Termine o ano em 2º lugar no ranking', '🥈', 'anual', 'annual_podium', 2, 'epic', 300, true),
('3º Lugar', 'Termine o ano em 3º lugar no ranking', '🥉', 'anual', 'annual_podium', 3, 'epic', 200, true),
('Elite do Dojo', 'Termine o ano no Top 10 do ranking', '⭐', 'anual', 'annual_top10', 10, 'rare', 100, true);
