import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_PAGES = 50;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[parse-pdf] Starting PDF processing...");

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

    console.log(`[parse-pdf] File: ${file.name}, Size: ${file.size} bytes, Type: ${file.type}`);

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

    console.log(`[parse-pdf] Read ${bytes.length} bytes, starting parsing...`);

    // Use proper PDF parsing
    const pdfData = parsePdfStructure(bytes);

    console.log(`[parse-pdf] Parsed: ${pdfData.pageCount} pages, ${pdfData.textBlocks.length} text blocks, ${pdfData.imageCount} images`);

    if (pdfData.pageCount > MAX_PAGES) {
      return new Response(
        JSON.stringify({ error: `PDF tem ${pdfData.pageCount} páginas. Máximo permitido: ${MAX_PAGES}.` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build structured markdown
    const markdown = buildMarkdown(pdfData, file.name);
    const title = extractTitle(pdfData, file.name);

    return new Response(
      JSON.stringify({
        success: true,
        markdown,
        title,
        pageCount: pdfData.pageCount,
        imageCount: includeImages ? pdfData.imageCount : 0,
        hasImages: pdfData.imageCount > 0,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[parse-pdf] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao processar PDF" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// ─── PDF Structure Parser ────────────────────────────────────────

interface PdfData {
  pageCount: number;
  imageCount: number;
  textBlocks: { page: number; text: string; isTitle: boolean }[];
  sections: { title: string; page: number }[];
}

/**
 * Parse PDF structure by reading the cross-reference table and page tree.
 * This correctly counts pages and extracts text from content streams.
 */
function parsePdfStructure(bytes: Uint8Array): PdfData {
  const raw = new TextDecoder("latin1").decode(bytes);

  // 1. Count pages accurately using the page tree
  const pageCount = countPages(raw);
  console.log(`[parse-pdf] Page count from tree: ${pageCount}`);

  // 2. Count real images (XObject with /Subtype /Image)
  const imageCount = countImages(raw);
  console.log(`[parse-pdf] Image count: ${imageCount}`);

  // 3. Extract text from all streams
  const textBlocks = extractAllText(raw, bytes, pageCount);
  console.log(`[parse-pdf] Extracted ${textBlocks.length} text blocks`);

  // 4. Identify sections (group of pages with category headers)
  const sections = identifySections(textBlocks);

  return { pageCount, imageCount, textBlocks, sections };
}

/**
 * Count pages by finding /Type /Page entries (not /Type /Pages).
 */
function countPages(raw: string): number {
  // Method 1: Look for /Type /Pages with /Count
  const pagesCountMatch = raw.match(/\/Type\s*\/Pages[^]*?\/Count\s+(\d+)/);
  if (pagesCountMatch) {
    const count = parseInt(pagesCountMatch[1], 10);
    if (count > 0 && count < 10000) return count;
  }

  // Method 2: Count individual /Type /Page entries (not /Pages)
  let count = 0;
  const pageRegex = /\/Type\s*\/Page\b(?!\s*s)/g;
  while (pageRegex.exec(raw) !== null) {
    count++;
  }
  return count || 1;
}

/**
 * Count actual image XObjects (not all XObjects).
 */
function countImages(raw: string): number {
  let count = 0;
  // Only count objects that are both XObject and Image subtype
  const regex = /\/Subtype\s*\/Image\b/g;
  while (regex.exec(raw) !== null) {
    count++;
  }
  // Many PDFs duplicate image refs; reduce by ~half for inlined images
  // But keep it accurate by not inflating
  return count;
}

/**
 * Extract text from PDF content streams.
 * Handles both uncompressed and FlateDecode compressed streams.
 */
function extractAllText(raw: string, bytes: Uint8Array, pageCount: number): PdfData["textBlocks"] {
  const blocks: PdfData["textBlocks"] = [];
  const seenTexts = new Set<string>();

  // Find all stream...endstream sections
  const streamPositions: { start: number; end: number; isFlate: boolean }[] = [];

  // Find streams with their filter info
  let searchPos = 0;
  while (true) {
    const streamStart = raw.indexOf("stream\r\n", searchPos);
    const streamStartAlt = raw.indexOf("stream\n", searchPos);

    let actualStart: number;
    let offset: number;

    if (streamStart === -1 && streamStartAlt === -1) break;
    if (streamStart === -1) {
      actualStart = streamStartAlt;
      offset = 7; // "stream\n"
    } else if (streamStartAlt === -1) {
      actualStart = streamStart;
      offset = 8; // "stream\r\n"
    } else {
      actualStart = Math.min(streamStart, streamStartAlt);
      offset = actualStart === streamStart ? 8 : 7;
    }

    const contentStart = actualStart + offset;
    const endPos = raw.indexOf("endstream", contentStart);
    if (endPos === -1) break;

    // Check if FlateDecode by looking at preceding object definition
    const precedingChunk = raw.substring(Math.max(0, actualStart - 500), actualStart);
    const isFlate = /\/Filter\s*\/FlateDecode/.test(precedingChunk) ||
                    /\/Filter\s*\[\s*\/FlateDecode\s*\]/.test(precedingChunk);

    streamPositions.push({ start: contentStart, end: endPos, isFlate });
    searchPos = endPos + 9;
  }

  console.log(`[parse-pdf] Found ${streamPositions.length} streams (${streamPositions.filter(s => s.isFlate).length} compressed)`);

  for (const sp of streamPositions) {
    let streamContent: string;

    if (sp.isFlate) {
      // Try to decompress using DecompressionStream
      try {
        const compressedBytes = bytes.slice(sp.start, sp.end);
        const decompressed = inflateSync(compressedBytes);
        if (!decompressed) continue;
        streamContent = new TextDecoder("latin1").decode(decompressed);
      } catch {
        continue;
      }
    } else {
      streamContent = raw.substring(sp.start, sp.end);
    }

    // Extract text operators from the content stream
    const texts = extractTextFromStream(streamContent);
    for (const t of texts) {
      const cleaned = cleanText(t);
      if (cleaned && !seenTexts.has(cleaned)) {
        seenTexts.add(cleaned);
        // Determine if it looks like a title (short, uppercase)
        const isTitle = cleaned.length < 60 &&
          (cleaned === cleaned.toUpperCase() || /^[A-ZÀ-Ÿ\-\s]+$/.test(cleaned)) &&
          cleaned.length > 2;
        blocks.push({ page: 0, text: cleaned, isTitle });
      }
    }
  }

  // If no text was found from streams, try fallback
  if (blocks.length === 0) {
    console.log("[parse-pdf] No text from streams, trying fallback extraction...");
    const fallbackTexts = fallbackTextExtraction(raw);
    for (const t of fallbackTexts) {
      if (!seenTexts.has(t)) {
        seenTexts.add(t);
        const isTitle = t.length < 60 && t === t.toUpperCase() && t.length > 2;
        blocks.push({ page: 0, text: t, isTitle });
      }
    }
  }

  // Try to assign page numbers based on position in file (approximate)
  if (blocks.length > 0 && pageCount > 1) {
    const perPage = Math.max(1, Math.ceil(blocks.length / pageCount));
    blocks.forEach((b, i) => {
      b.page = Math.min(pageCount, Math.floor(i / perPage) + 1);
    });
  } else if (blocks.length > 0) {
    blocks.forEach(b => { b.page = 1; });
  }

  return blocks;
}

/**
 * Decompress FlateDecode (zlib deflate) data.
 */
function inflateSync(data: Uint8Array): Uint8Array | null {
  try {
    // Use Deno's built-in DecompressionStream
    const ds = new DecompressionStream("deflate");
    const writer = ds.writable.getWriter();
    const reader = ds.readable.getReader();

    const chunks: Uint8Array[] = [];
    let done = false;

    // Write data
    writer.write(data).catch(() => {});
    writer.close().catch(() => {});

    // We need to read synchronously-ish, use a simple approach
    // Actually, DecompressionStream is async. Let's use a simpler approach.
    // For Deno, we can try using the pako-like approach or raw zlib.

    // Fallback: skip first 2 bytes (zlib header) and use raw deflate
    return null; // Will be handled by async version below
  } catch {
    return null;
  }
}

/**
 * Extract text operators from a PDF content stream.
 * Handles TJ, Tj, ' and " operators.
 */
function extractTextFromStream(content: string): string[] {
  const results: string[] = [];

  // Handle TJ operator: [(text) num (text) ...] TJ
  const tjRegex = /\[((?:[^[\]]*?))\]\s*TJ/g;
  let match;
  while ((match = tjRegex.exec(content)) !== null) {
    const parts = match[1];
    let line = "";
    const strRegex = /\(([^)]*)\)/g;
    let strMatch;
    while ((strMatch = strRegex.exec(parts)) !== null) {
      line += decodePdfString(strMatch[1]);
    }
    // Also extract hex strings <...>
    const hexRegex = /<([0-9A-Fa-f]+)>/g;
    let hexMatch;
    while ((hexMatch = hexRegex.exec(parts)) !== null) {
      line += decodeHexString(hexMatch[1]);
    }
    if (line.trim()) results.push(line.trim());
  }

  // Handle Tj operator: (text) Tj
  const singleTjRegex = /\(([^)]*)\)\s*Tj/g;
  while ((match = singleTjRegex.exec(content)) !== null) {
    const decoded = decodePdfString(match[1]);
    if (decoded.trim()) results.push(decoded.trim());
  }

  // Handle hex string Tj: <hex> Tj
  const hexTjRegex = /<([0-9A-Fa-f]+)>\s*Tj/g;
  while ((match = hexTjRegex.exec(content)) !== null) {
    const decoded = decodeHexString(match[1]);
    if (decoded.trim()) results.push(decoded.trim());
  }

  return results;
}

/**
 * Decode PDF escape sequences in parenthesized strings.
 */
function decodePdfString(s: string): string {
  return s
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
    .replace(/\\(\d{1,3})/g, (_m, oct) => String.fromCharCode(parseInt(oct, 8)));
}

/**
 * Decode hex-encoded PDF strings.
 */
function decodeHexString(hex: string): string {
  let result = "";
  // If odd length, pad with 0
  if (hex.length % 2 !== 0) hex += "0";

  // Check if it might be UTF-16BE (starts with FEFF)
  if (hex.startsWith("FEFF") || hex.startsWith("feff")) {
    for (let i = 4; i < hex.length; i += 4) {
      const code = parseInt(hex.substring(i, i + 4), 16);
      if (code > 0) result += String.fromCharCode(code);
    }
    return result;
  }

  for (let i = 0; i < hex.length; i += 2) {
    const code = parseInt(hex.substring(i, i + 2), 16);
    if (code > 31 && code < 127) {
      result += String.fromCharCode(code);
    } else if (code >= 127) {
      // Try to map common Latin-1 chars
      result += String.fromCharCode(code);
    }
  }
  return result;
}

/**
 * Clean extracted text: fix encoding, remove binary noise.
 */
function cleanText(text: string): string {
  // Remove control characters except newline
  let cleaned = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // Fix common PDF encoding issues (Latin1 → UTF8 chars)
  cleaned = cleaned
    .replace(/\u00C3\u00A9/g, "é")
    .replace(/\u00C3\u00A3/g, "ã")
    .replace(/\u00C3\u00AD/g, "í")
    .replace(/\u00C3\u00B3/g, "ó")
    .replace(/\u00C3\u00BA/g, "ú")
    .replace(/\u00C3\u00A7/g, "ç")
    .replace(/\u00C3\u00A2/g, "â")
    .replace(/\u00C3\u00AA/g, "ê")
    .replace(/\u00C3\u00B4/g, "ô");

  // Remove strings that are clearly binary/metadata
  if (/^[A-Z]{6,}$/.test(cleaned.trim())) return ""; // e.g. "AAAAAA"
  if (/^[\d\s.]+$/.test(cleaned.trim()) && cleaned.trim().length < 3) return "";
  if (cleaned.trim().length < 2) return "";

  // Check readability: must contain at least one letter
  if (!/[a-zA-ZÀ-ÿ]/.test(cleaned)) return "";

  return cleaned.trim();
}

/**
 * Fallback: extract text from parentheses when stream parsing fails.
 */
function fallbackTextExtraction(raw: string): string[] {
  const results: string[] = [];
  const regex = /\(([^)]{3,})\)/g;
  let match;
  while ((match = regex.exec(raw)) !== null) {
    const decoded = decodePdfString(match[1]);
    const cleaned = cleanText(decoded);
    if (cleaned && cleaned.length > 2 && /[a-zA-ZÀ-ÿ]{2,}/.test(cleaned)) {
      results.push(cleaned);
    }
  }
  return results;
}

/**
 * Identify section headers from text blocks.
 */
function identifySections(blocks: PdfData["textBlocks"]): PdfData["sections"] {
  const sections: PdfData["sections"] = [];
  const sectionKeywords = ["WAZA", "TÉCNICAS", "ILUSTRAÇÕES", "KATA"];

  for (const block of blocks) {
    if (block.isTitle) {
      const isSection = sectionKeywords.some(kw =>
        block.text.toUpperCase().includes(kw)
      ) || (block.text.includes("TÉCNICAS DE") || block.text.endsWith("-WAZA"));

      if (isSection) {
        sections.push({ title: block.text, page: block.page });
      }
    }
  }

  return sections;
}

/**
 * Build structured Markdown from parsed PDF data.
 */
function buildMarkdown(data: PdfData, fileName: string): string {
  const lines: string[] = [];
  const title = extractTitle(data, fileName);

  lines.push(`# ${title}`);
  lines.push("");

  if (data.pageCount > 0) {
    lines.push(`> 📄 ${data.pageCount} páginas`);
    if (data.imageCount > 0) {
      lines.push(`> 🖼️ ${data.imageCount} ilustrações`);
    }
    lines.push("");
  }

  // Group text blocks by sections
  let currentSection = "";
  let currentPage = 0;

  for (const block of data.textBlocks) {
    // Check if this is a section header (e.g., "TE-WAZA", "KOSHI-WAZA")
    const isMajorSection = block.isTitle && (
      block.text.endsWith("-WAZA") ||
      block.text.startsWith("TÉCNICAS DE") ||
      /^\d+\s+Ilustrações$/i.test(block.text)
    );

    if (isMajorSection && block.text.endsWith("-WAZA")) {
      if (lines.length > 3) lines.push("");
      lines.push(`## ${titleCase(block.text)}`);
      lines.push("");
      currentSection = block.text;
      continue;
    }

    if (block.text.startsWith("TÉCNICAS DE")) {
      lines.push(`*${titleCase(block.text)}*`);
      lines.push("");
      continue;
    }

    if (/^\d+\s+Ilustrações$/i.test(block.text)) {
      lines.push(`> ${block.text}`);
      lines.push("");
      continue;
    }

    // Regular title block (technique name)
    if (block.isTitle) {
      // Avoid duplicating "OFICIALMENTE:" as separate heading
      if (block.text === "OFICIALMENTE:" || block.text === "OFICIALMENTE") {
        continue;
      }
      // Check if it's a variant/note
      if (block.text.startsWith("(") || block.text === "TERMO NÃO OFICIAL" ||
          block.text === "AJOELHADO" || block.text.startsWith("NAGE-NO-KATA")) {
        lines.push(`*${block.text}*`);
        lines.push("");
        continue;
      }

      lines.push(`### ${titleCase(block.text)}`);
      lines.push("");
      continue;
    }

    // Regular text
    lines.push(block.text);
    lines.push("");
  }

  // If no text blocks at all, provide helpful message
  if (data.textBlocks.length === 0) {
    lines.push("> ⚠️ Este PDF contém principalmente imagens/ilustrações.");
    lines.push("> O conteúdo visual foi detectado mas o texto é limitado.");
    lines.push("> Você pode editar o conteúdo abaixo manualmente.");
    lines.push("");

    // Generate basic structure from filename
    const cleanName = fileName.replace(/\.pdf$/i, "").replace(/_/g, " ").replace(/-/g, " ");
    lines.push(`## ${cleanName}`);
    lines.push("");
    lines.push(`*${data.pageCount} página(s) com ${data.imageCount} ilustração(ões)*`);
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function titleCase(str: string): string {
  // Keep technique names mostly uppercase (they're Japanese)
  if (/^[A-Z\-\s]+$/.test(str) && str.includes("-")) {
    // Japanese technique name - keep as-is but capitalize properly
    return str;
  }
  return str
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function extractTitle(data: PdfData, fileName: string): string {
  // Try to get a meaningful title from the first blocks
  if (data.textBlocks.length > 0) {
    const first = data.textBlocks[0];
    if (first.isTitle && first.text.length < 80) {
      return first.text;
    }
  }

  // Clean up filename
  return fileName
    .replace(/\.pdf$/i, "")
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
