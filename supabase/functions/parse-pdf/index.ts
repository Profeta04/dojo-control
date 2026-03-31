import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify user is staff
    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: isStaff } = await adminClient.rpc("is_staff", {
      _user_id: user.id,
    });
    if (!isStaff) {
      return new Response(JSON.stringify({ error: "Acesso restrito" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const includeImages = formData.get("include_images") === "true";

    if (!file) {
      return new Response(
        JSON.stringify({ error: "Nenhum arquivo enviado" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: "Arquivo excede 20MB" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (file.type !== "application/pdf") {
      return new Response(
        JSON.stringify({ error: "Apenas arquivos PDF são aceitos" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Extract text from PDF using raw parsing (no external lib needed for text extraction)
    const pdfText = extractTextFromPdf(bytes);
    const markdown = convertToMarkdown(pdfText, file.name);

    // If include_images, also extract image references
    let imageInfo: string[] = [];
    if (includeImages) {
      imageInfo = extractImageReferences(bytes);
    }

    return new Response(
      JSON.stringify({
        success: true,
        markdown,
        title: extractTitle(pdfText, file.name),
        pageCount: estimatePageCount(pdfText),
        imageCount: imageInfo.length,
        hasImages: imageInfo.length > 0,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("PDF parse error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao processar PDF" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

/**
 * Basic PDF text extraction from raw bytes.
 * Handles most text-based PDFs by reading text streams.
 */
function extractTextFromPdf(bytes: Uint8Array): string {
  const text = new TextDecoder("latin1").decode(bytes);
  const textBlocks: string[] = [];

  // Extract text from PDF streams (BT...ET blocks)
  const streamRegex = /stream\r?\n([\s\S]*?)endstream/g;
  let match;

  while ((match = streamRegex.exec(text)) !== null) {
    const streamContent = match[1];

    // Try to decompress FlateDecode streams
    // For simplicity, handle uncompressed text first
    const tjRegex = /\[(.*?)\]\s*TJ/g;
    let tjMatch;
    while ((tjMatch = tjRegex.exec(streamContent)) !== null) {
      const parts = tjMatch[1];
      // Extract strings within parentheses
      const strRegex = /\((.*?)\)/g;
      let strMatch;
      let line = "";
      while ((strMatch = strRegex.exec(parts)) !== null) {
        line += decodeLatinStr(strMatch[1]);
      }
      if (line.trim()) textBlocks.push(line.trim());
    }

    // Also handle Tj operator (single string)
    const singleTjRegex = /\((.*?)\)\s*Tj/g;
    let singleMatch;
    while ((singleMatch = singleTjRegex.exec(streamContent)) !== null) {
      const decoded = decodeLatinStr(singleMatch[1]);
      if (decoded.trim()) textBlocks.push(decoded.trim());
    }
  }

  // If no text extracted via streams, try a simpler approach
  if (textBlocks.length === 0) {
    // Fallback: extract any readable text between parentheses in the PDF
    const fallbackRegex = /\(([^)]{2,})\)/g;
    let fbMatch;
    while ((fbMatch = fallbackRegex.exec(text)) !== null) {
      const decoded = decodeLatinStr(fbMatch[1]);
      // Filter out binary/metadata noise
      if (
        decoded.trim().length > 2 &&
        /[a-zA-ZÀ-ÿ]/.test(decoded) &&
        !/^[A-Z]{4,}$/.test(decoded.trim())
      ) {
        textBlocks.push(decoded.trim());
      }
    }
  }

  return textBlocks.join("\n");
}

function decodeLatinStr(s: string): string {
  // Handle PDF escape sequences
  return s
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\");
}

/**
 * Convert extracted text into structured Markdown.
 */
function convertToMarkdown(rawText: string, fileName: string): string {
  if (!rawText.trim()) {
    return `# ${fileName.replace(/\.pdf$/i, "")}\n\n> ⚠️ Não foi possível extrair texto deste PDF. O arquivo pode conter apenas imagens escaneadas.\n\nPor favor, adicione o conteúdo manualmente ou use um PDF com texto selecionável.`;
  }

  const lines = rawText.split("\n").filter((l) => l.trim());
  const markdownLines: string[] = [];
  let currentSection = "";
  let listMode = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Detect potential headings (short lines, often uppercase or followed by content)
    const isShortLine = line.length < 80;
    const isAllCaps = line === line.toUpperCase() && line.length > 3 && /[A-ZÀ-Ÿ]/.test(line);
    const nextLineExists = i + 1 < lines.length;
    const nextLineIsLonger =
      nextLineExists && lines[i + 1].trim().length > line.length;

    // Detect numbered/bulleted items
    const isNumberedItem = /^\d+[\.\)]\s/.test(line);
    const isBulletItem = /^[\-•●◦▪]\s/.test(line);

    if (isAllCaps && isShortLine) {
      // Major heading
      if (markdownLines.length > 0) markdownLines.push("");
      markdownLines.push(`## ${titleCase(line)}`);
      markdownLines.push("");
      currentSection = line;
      listMode = false;
    } else if (
      isShortLine &&
      !isNumberedItem &&
      !isBulletItem &&
      nextLineIsLonger &&
      line.length < 50 &&
      /^[A-ZÀ-Ÿ]/.test(line)
    ) {
      // Subsection heading
      if (markdownLines.length > 0) markdownLines.push("");
      markdownLines.push(`### ${line}`);
      markdownLines.push("");
      listMode = false;
    } else if (isNumberedItem) {
      const content = line.replace(/^\d+[\.\)]\s/, "");
      markdownLines.push(`${listMode ? "" : "\n"}${line.match(/^\d+/)![0]}. ${content}`);
      listMode = true;
    } else if (isBulletItem) {
      const content = line.replace(/^[\-•●◦▪]\s/, "");
      markdownLines.push(`- ${content}`);
      listMode = true;
    } else {
      if (listMode) {
        markdownLines.push("");
        listMode = false;
      }
      markdownLines.push(line);
    }
  }

  // Add title if not already present
  const firstHeading = markdownLines.find((l) => l.startsWith("## "));
  const title = firstHeading
    ? firstHeading.replace("## ", "")
    : fileName.replace(/\.pdf$/i, "");

  // Clean up multiple empty lines
  let result = markdownLines.join("\n").replace(/\n{3,}/g, "\n\n");

  // If no heading found, add one
  if (!result.startsWith("#")) {
    result = `# ${title}\n\n${result}`;
  }

  return result;
}

function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function extractTitle(rawText: string, fileName: string): string {
  const lines = rawText.split("\n").filter((l) => l.trim());
  if (lines.length > 0) {
    const first = lines[0].trim();
    if (first.length < 100 && first.length > 2) {
      return first.length > 60 ? first.substring(0, 60) + "..." : first;
    }
  }
  return fileName.replace(/\.pdf$/i, "");
}

function estimatePageCount(text: string): number {
  // Rough estimate: ~3000 chars per page
  return Math.max(1, Math.ceil(text.length / 3000));
}

function extractImageReferences(bytes: Uint8Array): string[] {
  const text = new TextDecoder("latin1").decode(bytes);
  const images: string[] = [];

  // Count XObject image references
  const imageRegex = /\/Subtype\s*\/Image/g;
  let match;
  while ((match = imageRegex.exec(text)) !== null) {
    images.push(`image_${images.length + 1}`);
  }

  return images;
}
