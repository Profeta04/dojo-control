import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const JUDO_BELTS = ["branca", "bordo", "cinza", "azul_escura", "azul", "amarela", "laranja", "verde", "roxa", "marrom", "preta_1dan"];
const BJJ_BELTS = ["branca", "cinza", "amarela", "laranja", "verde", "azul", "roxa", "marrom", "preta_1dan"];

const THEMES = [
  { id: "tecnicas", label: "Técnicas (projeção, solo, finalização)", count: 25 },
  { id: "historia", label: "História e filosofia", count: 25 },
  { id: "regras", label: "Regras e competição", count: 25 },
  { id: "prepfisica", label: "Preparação física e treino", count: 25 },
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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not set" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { martial_art, belt, theme_id } = await req.json();

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

  // Check existing count for this combo
  const { count: existing } = await supabase
    .from("task_templates")
    .select("id", { count: "exact", head: true })
    .eq("martial_art", martial_art)
    .eq("belt_level", belt)
    .eq("category", theme_id === "tecnicas" ? "technical" : theme_id === "prepfisica" ? "physical" : "theory");

  const target = theme.count;
  const toGenerate = Math.max(0, target - (existing || 0));

  if (toGenerate <= 0) {
    return new Response(JSON.stringify({ message: "Already has enough", existing }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Generate in sub-batches of 10, single batch per call to avoid timeout
  let totalCreated = 0;
  const errors: string[] = [];
  const batchSize = 10;

  for (let batch = 0; batch < Math.min(1, Math.ceil(toGenerate / batchSize)); batch++) {
    const count = Math.min(batchSize, toGenerate - batch * batchSize);
    const quizCount = Math.round(count * 0.6);
    const vfCount = count - quizCount;

    const prompt = `Você é um especialista em ${artLabel}. Crie exatamente ${count} questões educativas sobre "${theme.label}" para alunos de faixa ${beltLabel}.

REGRAS:
- ${quizCount} questões tipo "Quiz:" com 4 alternativas
- ${vfCount} questões tipo "V ou F:" com 2 alternativas ["Verdadeiro", "Falso"]
- Dificuldade: ${difficulty}${isKidBelt ? " (linguagem simples, adequada para crianças/iniciantes)" : ""}
- Todas em português brasileiro
- Título deve começar com "Quiz: " ou "V ou F: " e terminar com "?"
- As perguntas devem ser ESPECÍFICAS de ${artLabel} para faixa ${beltLabel}
- NÃO repita conceitos entre as questões
- Tema: ${theme.label}
- Lote ${batch + 1} — crie questões DIFERENTES das anteriores

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
        errors.push(`AI batch ${batch}: ${aiResp.status} - ${errText.substring(0, 100)}`);
        if (aiResp.status === 429) {
          await new Promise(r => setTimeout(r, 3000));
        }
        continue;
      }

      const aiData = await aiResp.json();
      let content = aiData.choices?.[0]?.message?.content || "";
      content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

      const quizzes = JSON.parse(content);
      const category = theme_id === "tecnicas" ? "technical" : theme_id === "prepfisica" ? "physical" : "theory";

      for (const quiz of quizzes) {
        if (!quiz.title || !quiz.options || quiz.correct_option === undefined) continue;

        const { error: insertErr } = await supabase
          .from("task_templates")
          .insert({
            title: quiz.title,
            description: quiz.description || null,
            options: quiz.options,
            correct_option: quiz.correct_option,
            martial_art: martial_art,
            belt_level: belt,
            category: category,
            difficulty: difficulty,
          });

        if (insertErr) {
          errors.push(`Insert: ${insertErr.message}`);
        } else {
          totalCreated++;
        }
      }
    } catch (e) {
      errors.push(`Batch ${batch}: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Delay between batches
    await new Promise(r => setTimeout(r, 2000));
  }

  return new Response(
    JSON.stringify({
      martial_art, belt, theme: theme_id,
      target: toGenerate, created: totalCreated,
      errors: errors.length > 0 ? errors : undefined,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
