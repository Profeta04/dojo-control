/**
 * Belt progression order for organizing study content.
 * From 11º KYŪ (beginner) to 1º KYŪ (advanced).
 */
export const BELT_SECTIONS = [
  { key: "geral", label: "📚 Conteúdo Geral", color: "bg-muted" },
  { key: "branca", label: "⬜ Faixa Branca Ponta Bordô — 11º KYŪ", color: "bg-white border" },
  { key: "cinza", label: "🩶 Faixa Cinza — 10º KYŪ", color: "bg-gray-300" },
  { key: "cinza_ponta_azul", label: "🩶🔵 Faixa Cinza Ponta Azul Escura — 9º KYŪ", color: "bg-gray-400" },
  { key: "azul", label: "🔵 Faixa Azul Escura — 8º KYŪ", color: "bg-blue-800" },
  { key: "azul_ponta_amarela", label: "🔵🟡 Faixa Azul Ponta Amarela — 7º KYŪ", color: "bg-blue-600" },
  { key: "amarela", label: "🟡 Faixa Amarela — 6º KYŪ", color: "bg-yellow-400" },
  { key: "amarela_ponta_laranja", label: "🟡🟠 Faixa Amarela Ponta Laranja — 5º KYŪ", color: "bg-yellow-500" },
  { key: "laranja", label: "🟠 Faixa Laranja — 4º KYŪ", color: "bg-orange-500" },
  { key: "verde", label: "🟢 Faixa Verde — 3º KYŪ", color: "bg-green-600" },
  { key: "roxa", label: "🟣 Faixa Roxa — 2º KYŪ", color: "bg-purple-600" },
  { key: "marrom", label: "🟤 Faixa Marrom — 1º KYŪ", color: "bg-amber-800" },
] as const;

/**
 * Maps a belt_level value from the database to a section key.
 * Returns "geral" for unrecognized values.
 */
export function getBeltSectionKey(beltLevel: string, title?: string): string {
  // Check if the title suggests it's a general topic
  if (title) {
    const t = title.toLowerCase();
    if (
      t.includes("introdução") ||
      t.includes("vocabulário") ||
      t.includes("técnicas oficiais") ||
      t.includes("geral")
    ) {
      return "geral";
    }
  }

  const mapping: Record<string, string> = {
    branca: "branca",
    cinza: "cinza",
    cinza_ponta_azul: "cinza_ponta_azul",
    cinza_ponta_azul_escura: "cinza_ponta_azul",
    azul: "azul",
    azul_escura: "azul",
    azul_ponta_amarela: "azul_ponta_amarela",
    amarela: "amarela",
    amarela_ponta_laranja: "amarela_ponta_laranja",
    laranja: "laranja",
    verde: "verde",
    roxa: "roxa",
    marrom: "marrom",
  };

  return mapping[beltLevel] || "geral";
}
