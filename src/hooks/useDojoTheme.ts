import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useDojoContext } from "./useDojoContext";

interface DojoTheme {
  color_primary: string;
  color_secondary: string;
  color_background: string;
  color_foreground: string;
  color_accent: string;
  color_muted: string;
  color_primary_foreground: string;
  color_secondary_foreground: string;
  color_accent_foreground: string;
  dark_mode: boolean;
}

const DEFAULT_THEME: DojoTheme = {
  color_primary: "0 0% 8%",
  color_secondary: "40 10% 92%",
  color_background: "40 20% 97%",
  color_foreground: "0 0% 10%",
  color_accent: "4 85% 50%",
  color_muted: "40 10% 92%",
  color_primary_foreground: "0 0% 98%",
  color_secondary_foreground: "0 0% 10%",
  color_accent_foreground: "0 0% 100%",
  dark_mode: false,
};

const DARK_THEME: DojoTheme = {
  color_primary: "0 0% 98%",
  color_secondary: "0 0% 20%",
  color_background: "0 0% 7%",
  color_foreground: "0 0% 98%",
  color_accent: "4 85% 50%",
  color_muted: "0 0% 15%",
  color_primary_foreground: "0 0% 10%",
  color_secondary_foreground: "0 0% 98%",
  color_accent_foreground: "0 0% 100%",
  dark_mode: true,
};

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
        .select(
          "color_primary, color_secondary, color_background, color_foreground, color_accent, color_muted, color_primary_foreground, color_secondary_foreground, color_accent_foreground, dark_mode"
        )
        .eq("id", dojoId)
        .single();

      if (error || !data) return DEFAULT_THEME;

      const isDarkMode = data.dark_mode ?? false;
      const baseTheme = isDarkMode ? DARK_THEME : DEFAULT_THEME;

      return {
        color_primary: data.color_primary || baseTheme.color_primary,
        color_secondary: data.color_secondary || baseTheme.color_secondary,
        color_background: data.color_background || baseTheme.color_background,
        color_foreground: data.color_foreground || baseTheme.color_foreground,
        color_accent: data.color_accent || baseTheme.color_accent,
        color_muted: data.color_muted || baseTheme.color_muted,
        color_primary_foreground: data.color_primary_foreground || baseTheme.color_primary_foreground,
        color_secondary_foreground: data.color_secondary_foreground || baseTheme.color_secondary_foreground,
        color_accent_foreground: data.color_accent_foreground || baseTheme.color_accent_foreground,
        dark_mode: isDarkMode,
      } as DojoTheme;
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
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

    root.style.setProperty("--primary", currentTheme.color_primary);
    root.style.setProperty("--secondary", currentTheme.color_secondary);
    root.style.setProperty("--background", currentTheme.color_background);
    root.style.setProperty("--foreground", currentTheme.color_foreground);
    root.style.setProperty("--accent", currentTheme.color_accent);
    root.style.setProperty("--muted", currentTheme.color_muted);

    // Also update dependent colors
    root.style.setProperty("--card", currentTheme.color_background);
    root.style.setProperty("--card-foreground", currentTheme.color_foreground);
    root.style.setProperty("--popover", currentTheme.color_background);
    root.style.setProperty("--popover-foreground", currentTheme.color_foreground);
    root.style.setProperty("--primary-foreground", currentTheme.color_primary_foreground);
    root.style.setProperty("--secondary-foreground", currentTheme.color_secondary_foreground);
    root.style.setProperty("--accent-foreground", currentTheme.color_accent_foreground);
    root.style.setProperty("--muted-foreground", currentTheme.dark_mode ? "0 0% 65%" : "0 0% 45%");
  }, [theme]);

  return { theme: theme || DEFAULT_THEME, isLoading };
}

