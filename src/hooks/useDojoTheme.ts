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

// Generate derived colors from the 3 main colors
function generateDerivedColors(theme: DojoTheme) {
  const isDark = theme.dark_mode;
  
  return {
    // Core
    primary: theme.color_primary,
    secondary: theme.color_secondary,
    accent: theme.color_tertiary,
    
    // Background & foreground
    background: isDark ? "220 15% 8%" : "220 15% 98%",
    foreground: isDark ? "220 10% 95%" : "220 15% 10%",
    
    // Card
    card: isDark ? "220 15% 12%" : "0 0% 100%",
    cardForeground: isDark ? "220 10% 95%" : "220 15% 10%",
    
    // Popover
    popover: isDark ? "220 15% 12%" : "0 0% 100%",
    popoverForeground: isDark ? "220 10% 95%" : "220 15% 10%",
    
    // Primary foreground (contrasting)
    primaryForeground: isDark ? "220 15% 8%" : "0 0% 98%",
    
    // Secondary foreground
    secondaryForeground: isDark ? "220 10% 90%" : "220 15% 15%",
    
    // Accent foreground (always white for visibility)
    accentForeground: "0 0% 100%",
    
    // Muted
    muted: isDark ? "220 10% 18%" : "220 10% 94%",
    mutedForeground: isDark ? "220 10% 60%" : "220 10% 40%",
    
    // Border & input
    border: isDark ? "220 13% 22%" : "220 13% 88%",
    input: isDark ? "220 13% 22%" : "220 13% 88%",
    ring: theme.color_tertiary,
    
    // Sidebar
    sidebarBackground: isDark ? "220 15% 5%" : theme.color_primary,
    sidebarForeground: isDark ? "220 10% 90%" : "0 0% 95%",
    sidebarPrimary: theme.color_tertiary,
    sidebarPrimaryForeground: "0 0% 100%",
    sidebarAccent: isDark ? "220 15% 15%" : "220 15% 30%",
    sidebarAccentForeground: isDark ? "220 10% 90%" : "0 0% 95%",
    sidebarBorder: isDark ? "220 15% 18%" : "220 15% 30%",
    sidebarRing: theme.color_tertiary,
  };
}

export function useDojoTheme() {
  const { user } = useAuth();
  const { currentDojoId } = useDojoContext();

  const dojoId = currentDojoId;

  const { data: theme, isLoading } = useQuery({
    queryKey: ["dojo-theme", dojoId],
    queryFn: async () => {
      if (!dojoId) return DEFAULT_THEME;

      const { data, error } = await supabase
        .from("dojos")
        .select("color_primary, color_secondary, color_accent, dark_mode")
        .eq("id", dojoId)
        .single();

      if (error || !data) return DEFAULT_THEME;

      const isDarkMode = data.dark_mode ?? false;
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