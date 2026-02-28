import {
  createHandler, verifyStaff, parseBody, getServiceClient,
  validateString,
  jsonResponse, errorResponse, safeLog,
} from "../_shared/validation.ts";

const THEMES = [
  { id: "tecnicas", label: "Técnicas (projeção, solo, finalização)", category: "technical" },
  { id: "historia", label: "História e filosofia", category: "theory" },
  { id: "regras", label: "Regras e competição", category: "theory" },
  { id: "prepfisica", label: "Preparação física e treino", category: "physical" },
];

const VALID_MARTIAL_ARTS = ["judo", "bjj"];
const VALID_BELTS = [
  "branca", "bordo", "cinza", "azul_escura", "azul", "amarela",
  "laranja", "verde", "roxa", "marrom", "preta_1dan", "preta_2dan",
  "preta_3dan", "preta_4dan", "preta_5dan",
];

function getBeltLabel(belt: string): string {
  const labels: Record<string, string> = {
    branca: "Branca", bordo: "Bordô (infantil)", cinza: "Cinza", azul_escura: "Azul Escura (infantil)",
    azul: "Azul", amarela: "Amarela", laranja: "Laranja", verde: "Verde",
    roxa: "Roxa", marrom: "Marrom", preta_1dan: "Preta 1º Dan",
  };
  return labels[belt] || belt;
}

function getDifficulty(belt: string): string {
  const easy = ["branca", "bordo", "cinza", "azul_escura"];
  const medium = ["azul", "amarela", "laranja", "verde"];
  if (easy.includes(belt)) return "easy";
  if (medium.includes(belt)) return "medium";
  return "hard";
}

Deno.serve(createHandler(async (req) => {
  const auth = await verifyStaff(req);
  if (auth instanceof Response) return auth;

  const body = await parseBody<Record<string, unknown>>(req);
  if (body instanceof Response) return body;

  const martial_art = validateString(body.martial_art, "martial_art", { maxLen: 20 });
  const belt = validateString(body.belt, "belt", { maxLen: 30 });
  const theme_id = validateString(body.theme_id, "theme_id", { maxLen: 30 });
  const audience = validateString(body.audience, "audience", { required: false, maxLen: 20 }) || "geral";

  if (!martial_art || !VALID_MARTIAL_ARTS.includes(martial_art)) {
    return errorResponse("Arte marcial inválida", 400);
  }
  if (!belt || !VALID_BELTS.includes(belt)) {
    return errorResponse("Faixa inválida", 400);
  }

  const theme = THEMES.find(t => t.id === theme_id);
  if (!theme) return errorResponse("Tema inválido", 400);

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return errorResponse("LOVABLE_API_KEY not configured", 500);
  }

  const supabase = getServiceClient();
  const artLabel = martial_art === "judo" ? "Judô" : "Jiu-Jitsu Brasileiro (BJJ)";
  const beltLabel = getBeltLabel(belt);
  const difficulty = getDifficulty(belt);
  const isKidBelt = ["branca", "bordo", "cinza", "azul_escura", "amarela", "laranja", "verde"].includes(belt);

  let toGenerate = typeof body.needed_count === "number" ? Math.min(Math.max(1, body.needed_count), 25) : null;

  if (!toGenerate) {
    const { count: existing } = await supabase
      .from("task_templates")
      .select("id", { count: "exact", head: true })
      .eq("martial_art", martial_art)
      .eq("belt_level", belt)
      .eq("category", theme.category)
      .eq("audience", audience);

    const target = 25;
    toGenerate = Math.max(0, target - (existing || 0));
  }

  if (toGenerate <= 0) {
    return jsonResponse({ message: "Already has enough", toGenerate: 0 });
  }

  toGenerate = Math.min(toGenerate, 25);

  const { data: existingTemplates } = await supabase
    .from("task_templates")
    .select("title")
    .eq("martial_art", martial_art)
    .eq("belt_level", belt)
    .eq("audience", audience);

  const existingTitles = new Set((existingTemplates || []).map((t: { title: string }) => t.title));
  const quizCount = Math.round(toGenerate * 0.6);
  const vfCount = toGenerate - quizCount;
  const isInfantil = audience === "infantil";

  const languageInstruction = isInfantil
    ? "- Use linguagem MUITO SIMPLES, divertida e acessível para crianças de 5 a 12 anos\n- Evite termos técnicos complexos\n- Use emojis nos títulos\n- Frases curtas e diretas"
    : `${isKidBelt ? "- Linguagem simples, adequada para iniciantes" : "- Linguagem adequada ao nível da faixa"}`;

  const prompt = `Você é um especialista em ${artLabel}. Crie exatamente ${toGenerate} questões educativas sobre "${theme.label}" para alunos de faixa ${beltLabel}.

REGRAS:
- ${quizCount} questões tipo "Quiz:" com 4 alternativas
- ${vfCount} questões tipo "V ou F:" com 2 alternativas ["Verdadeiro", "Falso"]
- Dificuldade: ${difficulty}
${languageInstruction}
- Todas em português brasileiro
- Título deve começar com "Quiz: " ou "V ou F: " e terminar com "?"
- NÃO repita conceitos entre as questões
- Tema: ${theme.label}
- Crie questões ÚNICAS e DIFERENTES

Retorne APENAS um array JSON válido sem markdown:
[{"title": "Quiz: Pergunta?", "description": "Breve contexto", "options": ["A", "B", "C", "D"], "correct_option": 0}]`;

  let totalCreated = 0;
  const errors: string[] = [];

  try {
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      return errorResponse(`AI error: ${aiResp.status}`, 500);
    }

    const aiData = await aiResp.json();
    let content = aiData.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const quizzes = JSON.parse(content);

    if (!Array.isArray(quizzes)) {
      return errorResponse("AI returned invalid format", 500);
    }

    for (const quiz of quizzes) {
      if (!quiz.title || !quiz.options || quiz.correct_option === undefined) continue;
      if (typeof quiz.title !== "string" || quiz.title.length > 500) continue;
      if (!Array.isArray(quiz.options) || quiz.options.length < 2 || quiz.options.length > 6) continue;
      if (typeof quiz.correct_option !== "number" || quiz.correct_option < 0 || quiz.correct_option >= quiz.options.length) continue;
      if (existingTitles.has(quiz.title)) continue;

      const { error: insertErr } = await supabase.from("task_templates").insert({
        title: quiz.title.slice(0, 500),
        description: (quiz.description || "").slice(0, 1000) || null,
        options: quiz.options.map((o: unknown) => String(o).slice(0, 200)),
        correct_option: quiz.correct_option,
        martial_art,
        belt_level: belt,
        category: theme.category,
        difficulty,
        audience,
      });

      if (insertErr) errors.push(insertErr.message);
      else { totalCreated++; existingTitles.add(quiz.title); }
    }
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }

  safeLog("QUIZZES_GENERATED", { martial_art, belt, created: totalCreated });

  return jsonResponse({
    martial_art, belt, theme: theme_id,
    requested: toGenerate, created: totalCreated,
    errors: errors.length > 0 ? errors : undefined,
  });
}));
