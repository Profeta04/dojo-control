import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const THEMES = [
  { id: "tecnicas", label: "Técnicas (projeção, solo, finalização)", category: "technical" },
  { id: "historia", label: "História e filosofia", category: "theory" },
  { id: "regras", label: "Regras e competição", category: "theory" },
  { id: "prepfisica", label: "Preparação física e treino", category: "physical" },
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // --- AUTH: Require staff (admin/sensei) ---
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Allow service role key directly (for cron/internal calls)
  const token = authHeader.replace("Bearer ", "");
  const isServiceRole = token === serviceRoleKey;

  if (!isServiceRole) {
    // Validate user token and check staff role
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await userClient.auth.getUser();
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Check staff role using service role client
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: isStaff } = await adminClient.rpc("is_staff", { _user_id: claimsData.user.id });
    if (!isStaff) {
      return new Response(JSON.stringify({ error: "Forbidden: staff only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not set" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.json();
  const { martial_art, belt, theme_id, needed_count, audience } = body;
  const targetAudience = audience || "geral";

  if (!martial_art || !belt || !theme_id) {
    return new Response(JSON.stringify({ error: "Required: martial_art, belt, theme_id" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const theme = THEMES.find(t => t.id === theme_id);
  if (!theme) {
    return new Response(JSON.stringify({ error: "Invalid theme_id" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const artLabel = martial_art === "judo" ? "Judô" : "Jiu-Jitsu Brasileiro (BJJ)";
  const beltLabel = getBeltLabel(belt);
  const difficulty = getDifficulty(belt);
  const isKidBelt = ["branca", "bordo", "cinza", "azul_escura", "amarela", "laranja", "verde"].includes(belt);

  // Determine how many to generate
  let toGenerate = needed_count;
  if (!toGenerate) {
    const { count: existing } = await supabase
      .from("task_templates")
      .select("id", { count: "exact", head: true })
      .eq("martial_art", martial_art)
      .eq("belt_level", belt)
      .eq("category", theme.category)
      .eq("audience", targetAudience);

    const target = 25;
    toGenerate = Math.max(0, target - (existing || 0));
  }

  if (toGenerate <= 0) {
    return new Response(JSON.stringify({ message: "Already has enough", toGenerate: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  toGenerate = Math.min(toGenerate, 25);

  let totalCreated = 0;
  const errors: string[] = [];

  const { data: existingTemplates } = await supabase
    .from("task_templates")
    .select("title")
    .eq("martial_art", martial_art)
    .eq("belt_level", belt)
    .eq("audience", targetAudience);
  
  const existingTitles = new Set((existingTemplates || []).map(t => t.title));

  const quizCount = Math.round(toGenerate * 0.6);
  const vfCount = toGenerate - quizCount;

  const isInfantil = targetAudience === "infantil";
  const languageInstruction = isInfantil
    ? "- Use linguagem MUITO SIMPLES, divertida e acessível para crianças de 5 a 12 anos\n- Evite termos técnicos complexos, use explicações curtas e claras\n- Use emojis nos títulos para tornar mais lúdico\n- Frases curtas e diretas"
    : `${isKidBelt ? "- Linguagem simples, adequada para iniciantes" : "- Linguagem adequada ao nível da faixa"}`;

  const prompt = `Você é um especialista em ${artLabel}. Crie exatamente ${toGenerate} questões educativas sobre "${theme.label}" para alunos de faixa ${beltLabel}.

REGRAS:
- ${quizCount} questões tipo "Quiz:" com 4 alternativas
- ${vfCount} questões tipo "V ou F:" com 2 alternativas ["Verdadeiro", "Falso"]
- Dificuldade: ${difficulty}
${languageInstruction}
- Todas em português brasileiro
- Título deve começar com "Quiz: " ou "V ou F: " e terminar com "?"
- As perguntas devem ser ESPECÍFICAS de ${artLabel} para faixa ${beltLabel}
- NÃO repita conceitos entre as questões
- Tema: ${theme.label}
- Crie questões ÚNICAS e DIFERENTES

Retorne APENAS um array JSON válido sem markdown:
[{
  "title": "Quiz: Pergunta aqui?",
  "description": "Breve contexto educativo",
  "options": ["A", "B", "C", "D"],
  "correct_option": 0
}]`;

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
      return new Response(JSON.stringify({ error: `AI error: ${aiResp.status}`, details: errText.substring(0, 200) }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    let content = aiData.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const quizzes = JSON.parse(content);

    for (const quiz of quizzes) {
      if (!quiz.title || !quiz.options || quiz.correct_option === undefined) continue;
      if (existingTitles.has(quiz.title)) continue;

      const { error: insertErr } = await supabase
        .from("task_templates")
        .insert({
          title: quiz.title,
          description: quiz.description || null,
          options: quiz.options,
          correct_option: quiz.correct_option,
          martial_art: martial_art,
          belt_level: belt,
          category: theme.category,
          difficulty: difficulty,
          audience: targetAudience,
        });

      if (insertErr) {
        errors.push(`Insert: ${insertErr.message}`);
      } else {
        totalCreated++;
        existingTitles.add(quiz.title);
      }
    }
  } catch (e) {
    errors.push(`Error: ${e instanceof Error ? e.message : String(e)}`);
  }

  return new Response(
    JSON.stringify({
      martial_art, belt, theme: theme_id,
      requested: toGenerate, created: totalCreated,
      errors: errors.length > 0 ? errors : undefined,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
