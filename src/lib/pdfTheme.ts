/**
 * Shared PDF theming utilities for Dojo Control reports.
 * Converts dojo HSL/hex colors to RGB and provides consistent styling helpers.
 */

export interface PdfDojoInfo {
  dojoName: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
}

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

/** Convert HSL string "H S% L%" to {r, g, b} */
function hslToRgb(h: number, s: number, l: number): RGBColor {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  return {
    r: Math.round(f(0) * 255),
    g: Math.round(f(8) * 255),
    b: Math.round(f(4) * 255),
  };
}

/** Parse color string — supports HSL "H S% L%" and hex "#RRGGBB" / "#RGB" */
export function parseColor(color: string | null | undefined): RGBColor | null {
  if (!color || !color.trim()) return null;
  const trimmed = color.trim();

  // Try hex
  if (trimmed.startsWith("#")) {
    const cleaned = trimmed.replace("#", "");
    if (cleaned.length === 3) {
      return {
        r: parseInt(cleaned[0] + cleaned[0], 16),
        g: parseInt(cleaned[1] + cleaned[1], 16),
        b: parseInt(cleaned[2] + cleaned[2], 16),
      };
    }
    if (cleaned.length === 6) {
      return {
        r: parseInt(cleaned.substring(0, 2), 16),
        g: parseInt(cleaned.substring(2, 4), 16),
        b: parseInt(cleaned.substring(4, 6), 16),
      };
    }
  }

  // Try HSL: "210 30% 18%" or "210, 30%, 18%" or "hsl(210, 30%, 18%)"
  const hslMatch = trimmed.match(
    /(?:hsl\s*\(\s*)?(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)%?[,\s]+(\d+(?:\.\d+)?)%?\s*\)?/
  );
  if (hslMatch) {
    const h = parseFloat(hslMatch[1]);
    const s = parseFloat(hslMatch[2]);
    const l = parseFloat(hslMatch[3]);
    return hslToRgb(h, s, l);
  }

  return null;
}

/** Lighten an RGB color towards white by a factor (0–1) */
export function lightenRgb(color: RGBColor, factor: number): RGBColor {
  return {
    r: Math.round(color.r + (255 - color.r) * factor),
    g: Math.round(color.g + (255 - color.g) * factor),
    b: Math.round(color.b + (255 - color.b) * factor),
  };
}

/** Darken an RGB color by a factor (0–1) */
export function darkenRgb(color: RGBColor, factor: number): RGBColor {
  return {
    r: Math.round(color.r * (1 - factor)),
    g: Math.round(color.g * (1 - factor)),
    b: Math.round(color.b * (1 - factor)),
  };
}

/** Returns resolved primary, secondary, and accent colors with fallbacks */
export function resolveDojoColors(info: PdfDojoInfo) {
  const primary = parseColor(info.primaryColor) || { r: 40, g: 40, b: 40 };
  const accent = parseColor(info.accentColor) || lightenRgb(primary, 0.4);
  const secondary = parseColor(info.secondaryColor) || lightenRgb(primary, 0.85);

  const headerBg: [number, number, number] = [primary.r, primary.g, primary.b];
  const accentBg: [number, number, number] = [accent.r, accent.g, accent.b];
  const secondaryBg: [number, number, number] = [secondary.r, secondary.g, secondary.b];
  const lightBg: [number, number, number] = [
    lightenRgb(primary, 0.92).r,
    lightenRgb(primary, 0.92).g,
    lightenRgb(primary, 0.92).b,
  ];

  return { primary, accent, secondary, headerBg, accentBg, secondaryBg, lightBg };
}
