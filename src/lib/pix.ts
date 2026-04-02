export type PixKeyKind = "email" | "phone" | "cpf" | "cnpj" | "random" | "unknown";

const digitsOnly = (value: string) => value.replace(/\D/g, "");

export function detectPixKeyKind(value: string): PixKeyKind {
  const trimmed = value.trim();
  const digits = digitsOnly(trimmed);

  if (!trimmed) return "unknown";
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "email";
  if (/^[0-9a-fA-F]{32}$/.test(trimmed) || /^[0-9a-fA-F-]{36}$/.test(trimmed)) return "random";
  if (trimmed.startsWith("+") && /^\+\d{12,13}$/.test(trimmed)) return "phone";
  if (digits.length === 10 || digits.length === 11 || digits.length === 12 || digits.length === 13) return "phone";
  if (digits.length === 11) return "cpf";
  if (digits.length === 14) return "cnpj";

  return "unknown";
}

export function normalizePixKey(value: string): string {
  const trimmed = value.trim();
  const digits = digitsOnly(trimmed);
  const kind = detectPixKeyKind(trimmed);

  switch (kind) {
    case "email":
      return trimmed.toLowerCase();
    case "phone": {
      if (trimmed.startsWith("+")) return `+${digits}`;
      if (digits.length === 10 || digits.length === 11) return `+55${digits}`;
      if (digits.length === 12 || digits.length === 13) return `+${digits}`;
      return trimmed;
    }
    case "cpf":
    case "cnpj":
      return digits;
    case "random":
      return trimmed.toLowerCase();
    default:
      return trimmed;
  }
}

export function isValidPixKey(value: string): boolean {
  const trimmed = value.trim();
  const normalized = normalizePixKey(trimmed);
  const digits = digitsOnly(normalized);
  const kind = detectPixKeyKind(trimmed);

  switch (kind) {
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
    case "phone":
      return /^\+\d{12,13}$/.test(normalized) && (digits.length === 12 || digits.length === 13);
    case "cpf":
      return digits.length === 11;
    case "cnpj":
      return digits.length === 14;
    case "random":
      return /^[0-9a-f]{32}$/.test(normalized) || /^[0-9a-f-]{36}$/.test(normalized);
    default:
      return false;
  }
}
