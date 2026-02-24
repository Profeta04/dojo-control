/**
 * Shared PDF theming utilities for Dojo Control reports.
 * Converts dojo HSL/hex colors to RGB and provides consistent styling helpers.
 */

import jsPDF from "jspdf";

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

// ─── Shared Drawing Helpers ───

/** Draw a professional header with logo centered above title */
export function drawPdfHeader(
  doc: jsPDF,
  opts: {
    dojoName: string;
    subtitle: string;
    extraLine?: string;
    dateLine: string;
    headerBg: [number, number, number];
    accentBg: [number, number, number];
    logoBase64?: string | null;
  }
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const headerHeight = opts.logoBase64 ? 54 : 42;

  // Main header background
  doc.setFillColor(opts.headerBg[0], opts.headerBg[1], opts.headerBg[2]);
  doc.rect(0, 0, pageWidth, headerHeight, "F");

  // Accent strip at bottom of header
  doc.setFillColor(opts.accentBg[0], opts.accentBg[1], opts.accentBg[2]);
  doc.rect(0, headerHeight, pageWidth, 2.5, "F");

  let textY = 18;

  if (opts.logoBase64) {
    try {
      doc.addImage(opts.logoBase64, "PNG", 14, 7, 30, 30);
    } catch { /* logo failed */ }
    // Shift text to account for logo
    const textX = pageWidth / 2 + 12;
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text(opts.dojoName, textX, textY, { align: "center" });

    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text(opts.subtitle, textX, textY + 9, { align: "center" });

    let lineY = textY + 17;
    if (opts.extraLine) {
      doc.setFontSize(10);
      doc.text(opts.extraLine, textX, lineY, { align: "center" });
      lineY += 7;
    }

    doc.setFontSize(8);
    doc.setTextColor(220, 220, 220);
    doc.text(opts.dateLine, textX, lineY, { align: "center" });
  } else {
    const textX = pageWidth / 2;
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text(opts.dojoName, textX, textY, { align: "center" });

    doc.setFontSize(12);
    doc.text(opts.subtitle, textX, textY + 8, { align: "center" });

    doc.setFontSize(8);
    doc.setTextColor(220, 220, 220);
    doc.text(opts.dateLine, textX, textY + 16, { align: "center" });
  }

  return headerHeight + 2.5 + 10;
}

/** Draw a section title with colored underline and icon */
export function drawSectionTitle(
  doc: jsPDF,
  title: string,
  y: number,
  headerBg: [number, number, number],
  accentBg: [number, number, number]
) {
  doc.setFontSize(13);
  doc.setTextColor(headerBg[0], headerBg[1], headerBg[2]);
  doc.text(title, 20, y);
  doc.setDrawColor(accentBg[0], accentBg[1], accentBg[2]);
  doc.setLineWidth(1.5);
  doc.line(20, y + 2, 20 + doc.getTextWidth(title), y + 2);
  doc.setLineWidth(0.5);
}

/** Draw a row of metric cards with colored backgrounds */
export function drawMetricCards(
  doc: jsPDF,
  cards: Array<{ label: string; value: string; color?: [number, number, number] }>,
  y: number,
  headerBg: [number, number, number]
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const gap = 6;
  const availableWidth = pageWidth - margin * 2;
  const cardWidth = (availableWidth - gap * (cards.length - 1)) / cards.length;
  const cardHeight = 28;

  cards.forEach((card, i) => {
    const x = margin + i * (cardWidth + gap);
    const bg = card.color || headerBg;
    // Card background
    doc.setFillColor(
      Math.min(bg[0] + 180, 245),
      Math.min(bg[1] + 180, 245),
      Math.min(bg[2] + 180, 245)
    );
    doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3, "F");

    // Colored left strip
    doc.setFillColor(bg[0], bg[1], bg[2]);
    doc.rect(x, y, 3, cardHeight, "F");

    // Value
    doc.setFontSize(14);
    doc.setTextColor(bg[0], bg[1], bg[2]);
    doc.text(card.value, x + 10, y + 12);

    // Label
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(card.label, x + 10, y + 21);
  });

  return y + cardHeight + 10;
}

/** Draw a professional footer bar on every page */
export function drawPdfFooters(
  doc: jsPDF,
  text: string,
  headerBg: [number, number, number]
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.getHeight();
    // Footer bar
    doc.setFillColor(headerBg[0], headerBg[1], headerBg[2]);
    doc.rect(0, pageH - 14, pageWidth, 14, "F");
    // Accent line above footer
    doc.setDrawColor(headerBg[0], headerBg[1], headerBg[2]);
    doc.setLineWidth(0.5);
    // Text
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(
      `${text} — Página ${i} de ${pageCount}`,
      pageWidth / 2,
      pageH - 5,
      { align: "center" }
    );
  }
}

/** Standard autoTable config factory */
export function tableStyles(headerBg: [number, number, number], lightBg: [number, number, number]) {
  return {
    theme: "striped" as const,
    headStyles: {
      fillColor: headerBg,
      textColor: [255, 255, 255] as [number, number, number],
      fontStyle: "bold" as const,
      fontSize: 10,
    },
    alternateRowStyles: { fillColor: lightBg },
    styles: { fontSize: 10, cellPadding: 4 },
    margin: { left: 20, right: 20 },
  };
}

export function smallTableStyles(headerBg: [number, number, number], lightBg: [number, number, number]) {
  return {
    ...tableStyles(headerBg, lightBg),
    styles: { fontSize: 9, cellPadding: 3 },
  };
}

/** Status color helpers for payment tables */
export const STATUS_COLORS: Record<string, [number, number, number]> = {
  pago: [34, 139, 34],       // green
  pendente: [200, 150, 0],   // amber
  atrasado: [220, 53, 69],   // red
};

/** Check if we need a page break and add page if so */
export function checkPageBreak(doc: jsPDF, yPos: number, threshold = 200): number {
  if (yPos > threshold) {
    doc.addPage();
    return 20;
  }
  return yPos;
}
