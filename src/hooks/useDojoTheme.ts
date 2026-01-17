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
          "color_primary, color_secondary, color_background, color_foreground, color_accent, color_muted, color_primary_foreground, color_secondary_foreground, color_accent_foreground"
        )
        .eq("id", dojoId)
        .single();

      if (error || !data) return DEFAULT_THEME;

      return {
        color_primary: data.color_primary || DEFAULT_THEME.color_primary,
        color_secondary: data.color_secondary || DEFAULT_THEME.color_secondary,
        color_background: data.color_background || DEFAULT_THEME.color_background,
        color_foreground: data.color_foreground || DEFAULT_THEME.color_foreground,
        color_accent: data.color_accent || DEFAULT_THEME.color_accent,
        color_muted: data.color_muted || DEFAULT_THEME.color_muted,
        color_primary_foreground: data.color_primary_foreground || DEFAULT_THEME.color_primary_foreground,
        color_secondary_foreground: data.color_secondary_foreground || DEFAULT_THEME.color_secondary_foreground,
        color_accent_foreground: data.color_accent_foreground || DEFAULT_THEME.color_accent_foreground,
      } as DojoTheme;
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });

  // Apply theme to CSS variables
  useEffect(() => {
    const currentTheme = theme || DEFAULT_THEME;
    const root = document.documentElement;

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
    root.style.setProperty("--muted-foreground", "0 0% 45%");
  }, [theme]);

  return { theme: theme || DEFAULT_THEME, isLoading };
}

