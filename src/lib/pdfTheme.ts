/**
 * Shared PDF theming utilities for Dojo Control reports.
 * Converts dojo hex colors to RGB and provides consistent styling helpers.
 */

export interface PdfDojoInfo {
  dojoName: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
}

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

/** Convert hex (#RRGGBB or #RGB) to {r, g, b} */
export function hexToRgb(hex: string | null | undefined): RGBColor | null {
  if (!hex) return null;
  const cleaned = hex.replace("#", "");
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
  return null;
}

/** Darken an RGB color by a factor (0–1) */
export function darkenRgb(color: RGBColor, factor: number): RGBColor {
  return {
    r: Math.round(color.r * (1 - factor)),
    g: Math.round(color.g * (1 - factor)),
    b: Math.round(color.b * (1 - factor)),
  };
}

/** Lighten an RGB color towards white by a factor (0–1) */
export function lightenRgb(color: RGBColor, factor: number): RGBColor {
  return {
    r: Math.round(color.r + (255 - color.r) * factor),
    g: Math.round(color.g + (255 - color.g) * factor),
    b: Math.round(color.b + (255 - color.b) * factor),
  };
}

/** Returns resolved primary and accent colors, with fallbacks */
export function resolveDojoColors(info: PdfDojoInfo) {
  const primary = hexToRgb(info.primaryColor) || { r: 40, g: 40, b: 40 };
  const accent = hexToRgb(info.accentColor) || lightenRgb(primary, 0.6);
  const headerBg: [number, number, number] = [primary.r, primary.g, primary.b];
  const accentBg: [number, number, number] = [accent.r, accent.g, accent.b];
  const lightBg: [number, number, number] = [
    lightenRgb(primary, 0.92).r,
    lightenRgb(primary, 0.92).g,
    lightenRgb(primary, 0.92).b,
  ];
  return { primary, accent, headerBg, accentBg, lightBg };
}
