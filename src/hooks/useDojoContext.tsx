import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { Dojo } from "./useMultiDojo";

interface DojoContextType {
  currentDojoId: string | null;
  setCurrentDojoId: (id: string | null) => void;
  userDojos: Dojo[];
  isLoadingDojos: boolean;
  filterByDojo: boolean;
  setFilterByDojo: (value: boolean) => void;
}

const DojoContext = createContext<DojoContextType | undefined>(undefined);

export function DojoProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin } = useAuth();
  const [currentDojoId, setCurrentDojoId] = useState<string | null>(null);
  const [filterByDojo, setFilterByDojo] = useState(true);

  // Fetch all dojos the user has access to
  const { data: userDojos = [], isLoading: isLoadingDojos } = useQuery({
    queryKey: ["user-dojos", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Admins can see all dojos
      if (isAdmin) {
        const { data, error } = await supabase
          .from("dojos")
          .select("*")
          .eq("is_active", true)
          .order("name");

        if (error) throw error;
        return data as Dojo[];
      }

      // For other users, get dojos they're linked to via dojo_senseis or dojo_owners
      const { data: dojoIds } = await supabase
        .rpc("get_user_dojos", { _user_id: user.id });

      if (!dojoIds || dojoIds.length === 0) {
        // Fall back to user's profile dojo_id
        const { data: profile } = await supabase
          .from("profiles")
          .select("dojo_id")
          .eq("user_id", user.id)
          .single();

        if (profile?.dojo_id) {
          const { data: dojo } = await supabase
            .from("dojos")
            .select("*")
            .eq("id", profile.dojo_id)
            .single();
          
          return dojo ? [dojo as Dojo] : [];
        }
        return [];
      }

      const dojoIdsList = dojoIds.map((d: Dojo) => d.id);
      const { data: dojos, error } = await supabase
        .from("dojos")
        .select("*")
        .in("id", dojoIdsList)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return dojos as Dojo[];
    },
    enabled: !!user,
  });

  // Auto-select first dojo if user has only one
  useEffect(() => {
    if (userDojos.length === 1 && !currentDojoId) {
      setCurrentDojoId(userDojos[0].id);
    }
  }, [userDojos, currentDojoId]);

  return (
    <DojoContext.Provider
      value={{
        currentDojoId,
        setCurrentDojoId,
        userDojos,
        isLoadingDojos,
        filterByDojo,
        setFilterByDojo,
      }}
    >
      {children}
    </DojoContext.Provider>
  );
}

export function useDojoContext() {
  const context = useContext(DojoContext);
  if (context === undefined) {
    throw new Error("useDojoContext must be used within a DojoProvider");
  }
  return context;
}

// Utility hook to get the dojo filter for queries
export function useDojoFilter() {
  const { currentDojoId, filterByDojo } = useDojoContext();
  
  return {
    dojoId: filterByDojo ? currentDojoId : null,
    shouldFilter: filterByDojo && !!currentDojoId,
  };
}
