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
    <div className="px-3.5 py-2">
      <button
        onClick={toggleDarkMode}
        className={cn(
          "group flex items-center gap-3.5 w-full px-3.5 py-3 rounded-lg text-sm font-medium",
          "transition-all duration-200 ease-out",
          "text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
          "active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        )}
        aria-label={isDarkMode ? "Ativar modo claro" : "Ativar modo escuro"}
      >
        <span className="flex-shrink-0 text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80 transition-all duration-200">
          {isDarkMode ? (
            <Sun className="h-[1.35rem] w-[1.35rem] transition-transform duration-300 group-hover:rotate-45" />
          ) : (
            <Moon className="h-[1.35rem] w-[1.35rem] transition-transform duration-300 group-hover:-rotate-12" />
          )}
        </span>
        <span>{isDarkMode ? "Modo Claro" : "Modo Escuro"}</span>
      </button>
    </div>
  );
}
