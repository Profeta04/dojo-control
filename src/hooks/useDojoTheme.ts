import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useDojoContext } from "./useDojoContext";

interface DojoTheme {
  color_primary: string;
  color_secondary: string;
  color_tertiary: string;
  dark_mode: boolean;
}

const DEFAULT_THEME: DojoTheme = {
  color_primary: "220 15% 20%",
  color_secondary: "220 10% 92%",
  color_tertiary: "4 85% 50%",
  dark_mode: false,
};

const DARK_THEME: DojoTheme = {
  color_primary: "220 15% 95%",
  color_secondary: "220 10% 18%",
  color_tertiary: "4 85% 55%",
  dark_mode: true,
};

// Parse HSL string "H S% L%" and return components
function parseHSL(hsl: string): { h: number; s: number; l: number } | null {
  const parts = hsl.trim().split(/\s+/);
  if (parts.length < 3) return null;
  return {
    h: parseFloat(parts[0]),
    s: parseFloat(parts[1].replace('%', '')),
    l: parseFloat(parts[2].replace('%', '')),
  };
}

// Invert lightness for dark mode: light colors become dark and vice versa
function invertForDarkMode(hsl: string): string {
  const parsed = parseHSL(hsl);
  if (!parsed) return hsl;
  // Invert lightness: 10% -> 90%, 20% -> 80%, 92% -> 8%
  const invertedL = 100 - parsed.l;
  return `${parsed.h} ${parsed.s}% ${invertedL}%`;
}

// Check if a color is "light" (lightness > 50%)
function isLightColor(hsl: string): boolean {
  const parsed = parseHSL(hsl);
  if (!parsed) return false;
  return parsed.l > 50;
}

// Ensure minimum lightness for readability
function ensureMinLightness(hsl: string, minL: number): string {
  const parsed = parseHSL(hsl);
  if (!parsed) return hsl;
  if (parsed.l < minL) {
    return `${parsed.h} ${parsed.s}% ${minL}%`;
  }
  return hsl;
}

// Ensure maximum lightness for readability on light backgrounds
function ensureMaxLightness(hsl: string, maxL: number): string {
  const parsed = parseHSL(hsl);
  if (!parsed) return hsl;
  if (parsed.l > maxL) {
    return `${parsed.h} ${parsed.s}% ${maxL}%`;
  }
  return hsl;
}

// Generate derived colors from the 3 main colors
function generateDerivedColors(theme: DojoTheme) {
  const isDark = theme.dark_mode;
  
  // For dark mode, we need to invert primary/secondary if they were designed for light mode
  let effectivePrimary = theme.color_primary;
  let effectiveSecondary = theme.color_secondary;
  
  if (isDark) {
    // If primary is dark (designed for light mode text), invert it for dark mode
    if (!isLightColor(effectivePrimary)) {
      effectivePrimary = invertForDarkMode(effectivePrimary);
    }
    // If secondary is light (designed for light mode backgrounds), invert it
    if (isLightColor(effectiveSecondary)) {
      effectiveSecondary = invertForDarkMode(effectiveSecondary);
    }
    // Ensure primary text is bright enough to read on dark backgrounds
    effectivePrimary = ensureMinLightness(effectivePrimary, 85);
    // Ensure secondary backgrounds are dark enough
    effectiveSecondary = ensureMaxLightness(effectiveSecondary, 20);
  }
  
  // Accent: bump lightness slightly in dark mode for visibility
  let effectiveAccent = theme.color_tertiary;
  if (isDark) {
    effectiveAccent = ensureMinLightness(effectiveAccent, 50);
  }

  return {
    // Core
    primary: effectivePrimary,
    secondary: effectiveSecondary,
    accent: effectiveAccent,
    
    // Background & foreground
    background: isDark ? "220 15% 8%" : "220 15% 98%",
    foreground: isDark ? "220 10% 93%" : "220 15% 10%",
    
    // Card
    card: isDark ? "220 15% 12%" : "0 0% 100%",
    cardForeground: isDark ? "220 10% 93%" : "220 15% 10%",
    
    // Popover
    popover: isDark ? "220 15% 12%" : "0 0% 100%",
    popoverForeground: isDark ? "220 10% 93%" : "220 15% 10%",
    
    // Primary foreground (contrasting)
    primaryForeground: isDark ? "220 15% 8%" : "0 0% 98%",
    
    // Secondary foreground
    secondaryForeground: isDark ? "220 10% 88%" : "220 15% 15%",
    
    // Accent foreground (always white for visibility)
    accentForeground: "0 0% 100%",
    
    // Muted
    muted: isDark ? "220 10% 18%" : "220 10% 94%",
    mutedForeground: isDark ? "220 10% 65%" : "220 10% 40%",
    
    // Destructive
    destructive: isDark ? "0 65% 55%" : "0 72% 51%",
    destructiveForeground: "0 0% 98%",
    
    // Border & input - slightly brighter in dark mode
    border: isDark ? "220 13% 25%" : "220 13% 88%",
    input: isDark ? "220 13% 25%" : "220 13% 88%",
    ring: effectiveAccent,
    
    // Sidebar - ensure readable in dark mode
    sidebarBackground: isDark ? "220 15% 6%" : theme.color_primary,
    sidebarForeground: isDark ? "220 10% 88%" : "0 0% 95%",
    sidebarPrimary: effectiveAccent,
    sidebarPrimaryForeground: "0 0% 100%",
    sidebarAccent: isDark ? "220 15% 16%" : "220 15% 30%",
    sidebarAccentForeground: isDark ? "220 10% 92%" : "0 0% 95%",
    sidebarBorder: isDark ? "220 15% 20%" : "220 15% 30%",
    sidebarRing: effectiveAccent,
  };
}

export function useDojoTheme() {
  const { user } = useAuth();
  const { currentDojoId } = useDojoContext();

  const dojoId = currentDojoId;

  // Fetch user's dark mode preference from profile
  const { data: userDarkMode } = useQuery({
    queryKey: ["user-dark-mode", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase
        .from("profiles")
        .select("dark_mode")
        .eq("user_id", user.id)
        .single();
      if (error || !data) return false;
      return data.dark_mode ?? false;
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
  });

  const { data: theme, isLoading } = useQuery({
    queryKey: ["dojo-theme", dojoId, userDarkMode],
    queryFn: async () => {
      const isDarkMode = userDarkMode ?? false;

      if (!dojoId) {
        return { ...DEFAULT_THEME, dark_mode: isDarkMode };
      }

      const { data, error } = await supabase
        .from("dojos")
        .select("color_primary, color_secondary, color_accent")
        .eq("id", dojoId)
        .single();

      if (error || !data) {
        return { ...DEFAULT_THEME, dark_mode: isDarkMode };
      }

      const baseTheme = isDarkMode ? DARK_THEME : DEFAULT_THEME;

      return {
        color_primary: data.color_primary || baseTheme.color_primary,
        color_secondary: data.color_secondary || baseTheme.color_secondary,
        color_tertiary: data.color_accent || baseTheme.color_tertiary,
        dark_mode: isDarkMode,
      } as DojoTheme;
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });

  // Apply theme to CSS variables and dark mode class
  useEffect(() => {
    const currentTheme = theme || DEFAULT_THEME;
    const root = document.documentElement;

    // Toggle dark mode class
    if (currentTheme.dark_mode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    const derived = generateDerivedColors(currentTheme);

    // Apply all CSS variables
    root.style.setProperty("--color-primary", currentTheme.color_primary);
    root.style.setProperty("--color-secondary", currentTheme.color_secondary);
    root.style.setProperty("--color-tertiary", currentTheme.color_tertiary);
    
    root.style.setProperty("--primary", derived.primary);
    root.style.setProperty("--primary-foreground", derived.primaryForeground);
    root.style.setProperty("--secondary", derived.secondary);
    root.style.setProperty("--secondary-foreground", derived.secondaryForeground);
    root.style.setProperty("--accent", derived.accent);
    root.style.setProperty("--accent-foreground", derived.accentForeground);
    
    root.style.setProperty("--background", derived.background);
    root.style.setProperty("--foreground", derived.foreground);
    root.style.setProperty("--card", derived.card);
    root.style.setProperty("--card-foreground", derived.cardForeground);
    root.style.setProperty("--popover", derived.popover);
    root.style.setProperty("--popover-foreground", derived.popoverForeground);
    root.style.setProperty("--muted", derived.muted);
    root.style.setProperty("--muted-foreground", derived.mutedForeground);
    root.style.setProperty("--border", derived.border);
    root.style.setProperty("--input", derived.input);
    root.style.setProperty("--ring", derived.ring);
    
    root.style.setProperty("--sidebar-background", derived.sidebarBackground);
    root.style.setProperty("--sidebar-foreground", derived.sidebarForeground);
    root.style.setProperty("--sidebar-primary", derived.sidebarPrimary);
    root.style.setProperty("--sidebar-primary-foreground", derived.sidebarPrimaryForeground);
    root.style.setProperty("--sidebar-accent", derived.sidebarAccent);
    root.style.setProperty("--sidebar-accent-foreground", derived.sidebarAccentForeground);
    root.style.setProperty("--sidebar-border", derived.sidebarBorder);
    root.style.setProperty("--sidebar-ring", derived.sidebarRing);
  }, [theme]);

  return { theme: theme || DEFAULT_THEME, isLoading };
}