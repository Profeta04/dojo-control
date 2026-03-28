// Fixed Judo study content available to all dojos

export interface FixedStudyMaterial {
  id: string;
  title: string;
  description: string;
  martial_art: string;
  belt_level: string;
  type: 'embedded';
  content: string;
}

export interface FixedStudyVideo {
  id: string;
  title: string;
  description: string;
  martial_art: string;
  belt_level: string;
  source: 'fixed';
  video_url: string;
  thumbnail_url?: string;
}

export const fixedMaterials: FixedStudyMaterial[] = [
  {
    id: "fixed-mat-001",
    title: "História do Judô",
    description: "Conheça a origem e evolução do Judô, desde Jigoro Kano até os dias atuais.",
    martial_art: "judo",
    belt_level: "branca",
    type: "embedded",
    content: `# História do Judô

## Origem
O Judô foi criado por **Jigoro Kano** em 1882, no Japão. Kano estudou diversas escolas de Jiu-Jitsu e selecionou as melhores técnicas, eliminando as mais perigosas, criando um sistema educacional completo.

## Princípios Fundamentais
- **Seiryoku Zenyo** (最善活用) — Máxima eficiência com mínimo esforço
- **Jita Kyoei** (自他共栄) — Prosperidade e benefício mútuos

## O Kodokan
Em 1882, Kano fundou o **Kodokan** (講道館) em Tóquio, com apenas 12 tatames e 9 alunos. Hoje é o centro mundial do Judô.

## Judô no Brasil
O Judô chegou ao Brasil em 1908, com os primeiros imigrantes japoneses. **Mitsuyo Maeda** (Conde Koma) foi um dos grandes responsáveis pela difusão das artes marciais japonesas no país.

## Judô Olímpico
- **1964** — Tóquio: primeira aparição como esporte olímpico
- **1972** — Munique: tornou-se esporte olímpico permanente
- **1992** — Barcelona: inclusão do judô feminino

## Faixas e Graduação
O sistema de faixas foi criado por Kano para indicar o nível de conhecimento:
- Faixas coloridas (Kyu): branca → preta
- Faixas pretas (Dan): 1º ao 10º Dan`
  },
  {
    id: "fixed-mat-002",
    title: "Etiqueta no Dojô (Reishiki)",
    description: "Regras de comportamento e respeito dentro do dojô.",
    martial_art: "judo",
    belt_level: "branca",
    type: "embedded",
    content: `# Etiqueta no Dojô — Reishiki (礼式)

## Saudação (Rei)
- **Ritsurei** — saudação em pé (inclinação de 30°)
- **Zarei** — saudação ajoelhado (seiza)
- Sempre saudar ao entrar e sair do tatame

## Regras Básicas
1. Manter o judogi (kimono) limpo e em bom estado
2. Unhas cortadas (mãos e pés)
3. Cabelos presos
4. Não usar acessórios (relógio, brincos, anéis)
5. Chegar no horário
6. Respeitar o sensei e os colegas

## Durante o Treino
- Atenção total durante as explicações
- Não conversar durante a demonstração técnica
- Ajudar os colegas menos graduados
- Nunca recusar um treino com colega de qualquer faixa

## Filosofia
> "O Judô começa e termina com saudação" — Jigoro Kano`
  },
  {
    id: "fixed-mat-003",
    title: "Nage-Waza: Técnicas de Projeção",
    description: "Visão geral das principais técnicas de projeção do Judô.",
    martial_art: "judo",
    belt_level: "amarela",
    type: "embedded",
    content: `# Nage-Waza — Técnicas de Projeção

## Classificação
As projeções são divididas em:

### Te-Waza (Técnicas de mão/braço)
- **Seoi-nage** — projeção por cima do ombro
- **Ippon-seoi-nage** — projeção por um braço
- **Tai-otoshi** — queda do corpo
- **Morote-seoi-nage** — projeção com duas mãos

### Koshi-Waza (Técnicas de quadril)
- **O-goshi** — grande projeção de quadril
- **Uki-goshi** — quadril flutuante
- **Harai-goshi** — varredura de quadril
- **Tsuri-komi-goshi** — puxar e encaixar no quadril

### Ashi-Waza (Técnicas de perna)
- **O-soto-gari** — grande ceifada externa
- **O-uchi-gari** — grande ceifada interna
- **De-ashi-barai** — varredura do pé avançado
- **Ko-uchi-gari** — pequena ceifada interna

### Sutemi-Waza (Técnicas de sacrifício)
- **Tomoe-nage** — projeção em círculo
- **Sumi-gaeshi** — reversão de canto
- **Ura-nage** — projeção para trás`
  },
  {
    id: "fixed-mat-004",
    title: "Katame-Waza: Técnicas de Solo",
    description: "Imobilizações, estrangulamentos e chaves de braço.",
    martial_art: "judo",
    belt_level: "laranja",
    type: "embedded",
    content: `# Katame-Waza — Técnicas de Solo

## Osaekomi-Waza (Imobilizações)
- **Kesa-gatame** — controle lateral
- **Yoko-shiho-gatame** — controle lateral com 4 pontos
- **Kami-shiho-gatame** — controle por cima com 4 pontos
- **Tate-shiho-gatame** — montada com 4 pontos

### Regras de Pontuação
- **Ippon** — imobilização por 20 segundos
- **Waza-ari** — imobilização por 10-19 segundos

## Shime-Waza (Estrangulamentos)
- **Hadaka-jime** — estrangulamento sem kimono
- **Okuri-eri-jime** — estrangulamento deslizante com gola
- **Kata-ha-jime** — estrangulamento com controle do braço

## Kansetsu-Waza (Chaves articulares)
- **Juji-gatame** — chave de braço cruzada
- **Ude-garami** — chave de braço com torção
- **Ude-gatame** — chave de braço estendida

⚠️ Chaves e estrangulamentos são permitidos apenas a partir da faixa laranja em competições juvenis.`
  },
];

export const fixedVideos: FixedStudyVideo[] = [
  {
    id: "fixed-vid-001",
    title: "O-Soto-Gari — Técnica Básica",
    description: "Demonstração detalhada do O-Soto-Gari, uma das primeiras técnicas aprendidas no Judô.",
    martial_art: "judo",
    belt_level: "branca",
    source: "fixed",
    video_url: "https://www.youtube.com/watch?v=TjNqEH8x5OI",
  },
  {
    id: "fixed-vid-002",
    title: "Ippon-Seoi-Nage — Projeção por cima do ombro",
    description: "Tutorial completo do Ippon-Seoi-Nage com detalhes de pegada e entrada.",
    martial_art: "judo",
    belt_level: "branca",
    source: "fixed",
    video_url: "https://www.youtube.com/watch?v=PgVf7MgJEKk",
  },
  {
    id: "fixed-vid-003",
    title: "Ukemi — Quedas no Judô",
    description: "Aprenda as quedas fundamentais: Mae-ukemi, Ushiro-ukemi, Yoko-ukemi e Zenpo-kaiten.",
    martial_art: "judo",
    belt_level: "branca",
    source: "fixed",
    video_url: "https://www.youtube.com/watch?v=J1qWsMKbEfI",
  },
  {
    id: "fixed-vid-004",
    title: "Harai-Goshi — Varredura de Quadril",
    description: "Técnica de projeção de nível intermediário usando o quadril.",
    martial_art: "judo",
    belt_level: "amarela",
    source: "fixed",
    video_url: "https://www.youtube.com/watch?v=S-6rVF0cW2s",
  },
  {
    id: "fixed-vid-005",
    title: "Juji-Gatame — Chave de Braço",
    description: "A técnica de solo mais icônica do Judô. Aprenda o posicionamento correto.",
    martial_art: "judo",
    belt_level: "laranja",
    source: "fixed",
    video_url: "https://www.youtube.com/watch?v=MjsOrO_TI7Y",
  },
];
