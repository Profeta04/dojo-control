-- Add multiple choice options to task_templates for theoretical questions
ALTER TABLE public.task_templates
ADD COLUMN options JSONB DEFAULT NULL,
ADD COLUMN correct_option INTEGER DEFAULT NULL;

-- Update existing technical tasks with multiple choice options
UPDATE public.task_templates SET options = jsonb_build_array(
  'Hajime significa "começar"',
  'Hajime significa "parar"',
  'Hajime significa "cumprimentar"',
  'Hajime significa "projetar"'
), correct_option = 0 WHERE title = 'Memorizar terminologia básica' AND martial_art = 'judo';

UPDATE public.task_templates SET options = jsonb_build_array(
  'Kodokan foi fundado em 1882 por Jigoro Kano',
  'Kodokan foi fundado em 1900 por Mitsuyo Maeda',
  'Kodokan foi fundado em 1850 por Kanō Jigorō',
  'Kodokan foi fundado em 1920 por Masahiko Kimura'
), correct_option = 0 WHERE title = 'Aprender história do Judô' AND martial_art = 'judo';

UPDATE public.task_templates SET options = jsonb_build_array(
  'Seiryoku Zenyo significa "máxima eficiência com mínimo esforço"',
  'Seiryoku Zenyo significa "vencer a qualquer custo"',
  'Seiryoku Zenyo significa "respeito aos mais velhos"',
  'Seiryoku Zenyo significa "força bruta"'
), correct_option = 0 WHERE title = 'Estudar princípios do Judô' AND martial_art = 'judo';

UPDATE public.task_templates SET options = jsonb_build_array(
  'Ippon vale 10 pontos e encerra a luta',
  'Waza-ari vale 5 pontos',
  'Acumular 2 shidos resulta em hansoku-make',
  'Golden score dura no máximo 3 minutos'
), correct_option = 0 WHERE title = 'Estudar regras de competição' AND martial_art = 'judo';

UPDATE public.task_templates SET options = jsonb_build_array(
  'O centro de gravidade mais baixo oferece maior estabilidade',
  'A força muscular é mais importante que a alavanca',
  'O momento angular não influencia nas projeções',
  'A velocidade é irrelevante nas técnicas de projeção'
), correct_option = 0 WHERE title = 'Estudar biomecânica das técnicas' AND martial_art = 'judo';

UPDATE public.task_templates SET options = jsonb_build_array(
  'Nage-no-kata contém 15 técnicas divididas em 5 grupos',
  'Nage-no-kata contém 10 técnicas divididas em 2 grupos',
  'Nage-no-kata contém 20 técnicas divididas em 4 grupos',
  'Nage-no-kata contém 8 técnicas divididas em 3 grupos'
), correct_option = 0 WHERE title LIKE 'Estudar Nage-no-kata%' AND martial_art = 'judo';

UPDATE public.task_templates SET options = jsonb_build_array(
  'Katame-no-kata é o kata de técnicas de controle no solo',
  'Katame-no-kata é o kata de técnicas de projeção',
  'Katame-no-kata é o kata de defesa pessoal',
  'Katame-no-kata é o kata de katas livres'
), correct_option = 0 WHERE title = 'Estudar Katame-no-kata' AND martial_art = 'judo';

-- JIU-JITSU technical questions with options
UPDATE public.task_templates SET options = jsonb_build_array(
  'Hélio Gracie adaptou o judô japonês para criar o BJJ no Brasil',
  'Bruce Lee criou o BJJ nos Estados Unidos',
  'Jigoro Kano criou o BJJ no Japão',
  'Mitsuyo Maeda criou o BJJ na Argentina'
), correct_option = 0 WHERE title = 'Estudar história do BJJ' AND martial_art = 'jiu-jitsu';

UPDATE public.task_templates SET options = jsonb_build_array(
  'Alavancas permitem usar ossos como pontos de fulcro para maximizar força',
  'Força bruta é sempre mais eficiente que técnica',
  'O peso corporal não influencia nas finalizações',
  'A flexibilidade é irrelevante nas técnicas de submissão'
), correct_option = 0 WHERE title = 'Estudar conceitos de alavanca' AND martial_art = 'jiu-jitsu';

UPDATE public.task_templates SET options = jsonb_build_array(
  'Vantagens são critérios de desempate e valem menos que pontos',
  'Passagem de guarda vale 2 pontos',
  'Montada e costas valem 3 pontos cada',
  'Raspagem vale 4 pontos'
), correct_option = 0 WHERE title = 'Estudar estratégia de competição' AND martial_art = 'jiu-jitsu';

-- Add new theoretical questions with options
INSERT INTO public.task_templates (title, description, category, belt_level, martial_art, difficulty, options, correct_option) VALUES
-- JUDO Theory
('Identificar técnicas do Gokyo', 'Responda qual grupo do Gokyo pertence cada técnica apresentada.', 'technical', 'amarela', 'judo', 'medium', 
 '["Dai-Ikkyo contém as técnicas mais básicas", "Dai-Ikkyo contém apenas técnicas de sacrifício", "Dai-Gokyo é o primeiro grupo de técnicas", "O Gokyo possui apenas 3 grupos"]'::jsonb, 0),

('Princípios de Kuzushi', 'Explique o conceito de desequilíbrio no judô.', 'technical', 'azul', 'judo', 'medium',
 '["Kuzushi é o desequilíbrio que precede a projeção", "Kuzushi significa a queda em si", "Kuzushi é opcional nas técnicas", "Kuzushi só se aplica em ne-waza"]'::jsonb, 0),

('Fases da técnica (Kuzushi-Tsukuri-Kake)', 'Identifique as três fases de uma projeção.', 'technical', 'cinza', 'judo', 'easy',
 '["Kuzushi (desequilíbrio), Tsukuri (entrada), Kake (execução)", "Rei, Hajime, Matte", "Osae-komi, Toketa, Ippon", "Uchi-komi, Randori, Shiai"]'::jsonb, 0),

('Vocabulário de Ne-waza', 'Identifique os termos corretos para técnicas de solo.', 'technical', 'cinza', 'judo', 'easy',
 '["Osae-komi-waza são técnicas de imobilização", "Shime-waza são técnicas de projeção", "Kansetsu-waza são técnicas de estrangulamento", "Nage-waza são técnicas de solo"]'::jsonb, 0),

-- JIU-JITSU Theory
('Hierarquia de posições', 'Qual a ordem correta de dominância das posições no BJJ?', 'technical', 'branca', 'jiu-jitsu', 'easy',
 '["Costas > Montada > Joelho na barriga > Side control > Meia-guarda > Guarda", "Guarda é a melhor posição sempre", "Side control é melhor que montada", "Meia-guarda é posição dominante"]'::jsonb, 0),

('Conceito de Guarda', 'O que caracteriza uma guarda no jiu-jitsu?', 'technical', 'branca', 'jiu-jitsu', 'easy',
 '["Guarda é quando você está por baixo controlando o oponente com as pernas", "Guarda é quando você está montado", "Guarda é sinônimo de side control", "Guarda só existe na guarda fechada"]'::jsonb, 0),

('Pontuação no BJJ', 'Quantos pontos vale cada posição conquistada?', 'technical', 'azul', 'jiu-jitsu', 'medium',
 '["Passagem=3, Montada=4, Costas=4, Raspagem=2, Joelho na barriga=2", "Todas posições valem 2 pontos", "Montada vale mais que costas", "Passagem de guarda vale 4 pontos"]'::jsonb, 0),

('Leg locks legais por faixa', 'Quais ataques de perna são permitidos para faixa azul adulto IBJJF?', 'technical', 'azul', 'jiu-jitsu', 'hard',
 '["Apenas straight ankle lock (footlock)", "Kneebar e toe hold são permitidos", "Heel hooks são permitidos", "Nenhum ataque de perna é legal"]'::jsonb, 0),

('Escape vs Defesa', 'Qual a diferença entre escape e defesa no BJJ?', 'technical', 'azul', 'jiu-jitsu', 'medium',
 '["Defesa evita a finalização, escape reposiciona você para uma posição melhor", "São sinônimos", "Escape é para iniciantes, defesa é para avançados", "Defesa só se aplica em pé"]'::jsonb, 0);