import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

export function SidebarDarkModeToggle() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: isDarkMode = false } = useQuery({
    queryKey: ["user-dark-mode", profile?.user_id],
    queryFn: async () => {
      if (!profile?.user_id) return false;
      const { data, error } = await supabase
        .from("profiles")
        .select("dark_mode")
        .eq("user_id", profile.user_id)
        .maybeSingle();
      if (error || !data) return false;
      return data.dark_mode ?? false;
    },
    enabled: !!profile?.user_id,
    staleTime: 10 * 60 * 1000,
  });

  const toggleDarkMode = async () => {
    if (!profile) return;
    const newValue = !isDarkMode;
    queryClient.setQueryData(["user-dark-mode", profile.user_id], newValue);
    const { error } = await supabase
      .from("profiles")
      .update({ dark_mode: newValue })
      .eq("user_id", profile.user_id);
    if (error) {
      queryClient.setQueryData(["user-dark-mode", profile.user_id], isDarkMode);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["user-dark-mode"] });
    queryClient.invalidateQueries({ queryKey: ["dojo-theme"] });
  };

  if (!profile) return null;

  return (
    <div className="px-4 py-2.5">
      <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-sidebar-accent/30">
        <div className="flex items-center gap-2.5">
          <span className={cn(
            "flex-shrink-0 transition-all duration-300",
            isDarkMode ? "text-amber-400" : "text-sidebar-foreground/50"
          )}>
            {isDarkMode ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </span>
          <span className="text-xs font-medium text-sidebar-foreground/70">
            {isDarkMode ? "Escuro" : "Claro"}
          </span>
        </div>

        {/* Pill toggle */}
        <button
          onClick={toggleDarkMode}
          className={cn(
            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar",
            isDarkMode
              ? "bg-sidebar-primary"
              : "bg-sidebar-foreground/20"
          )}
          role="switch"
          aria-checked={isDarkMode}
          aria-label={isDarkMode ? "Ativar modo claro" : "Ativar modo escuro"}
        >
          {/* Sun icon on left */}
          <Sun className={cn(
            "absolute left-1 h-3 w-3 transition-opacity duration-200",
            isDarkMode ? "opacity-0" : "opacity-60 text-amber-500"
          )} />
          {/* Moon icon on right */}
          <Moon className={cn(
            "absolute right-1 h-3 w-3 transition-opacity duration-200",
            isDarkMode ? "opacity-80 text-sidebar-primary-foreground" : "opacity-0"
          )} />
          {/* Thumb */}
          <span
            className={cn(
              "inline-block h-4 w-4 rounded-full bg-white shadow-md transition-transform duration-300 ease-out",
              isDarkMode ? "translate-x-[22px]" : "translate-x-[3px]"
            )}
          />
        </button>
      </div>
    </div>
  );
}
