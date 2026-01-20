import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Dojo {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  description: string | null;
  logo_url: string | null;
  color_primary: string | null;
  color_secondary: string | null;
  color_accent: string | null;
  dark_mode: boolean | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface DojoOwner {
  id: string;
  dojo_id: string;
  user_id: string;
  created_at: string;
}

export interface DojoSensei {
  id: string;
  dojo_id: string;
  sensei_id: string;
  created_at: string;
}

export function useDojos() {
  const { user, roles } = useAuth();
  const isSuperAdmin = roles.includes("super_admin");

  return useQuery({
    queryKey: ["dojos", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dojos")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as Dojo[];
    },
    enabled: !!user && isSuperAdmin,
  });
}

export function useDojoOwners(dojoId?: string) {
  return useQuery({
    queryKey: ["dojo-owners", dojoId],
    queryFn: async () => {
      let query = supabase.from("dojo_owners").select("*");
      
      if (dojoId) {
        query = query.eq("dojo_id", dojoId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as DojoOwner[];
    },
    enabled: !!dojoId,
  });
}

export function useDojoSenseis(dojoId?: string) {
  return useQuery({
    queryKey: ["dojo-senseis", dojoId],
    queryFn: async () => {
      let query = supabase.from("dojo_senseis").select("*");
      
      if (dojoId) {
        query = query.eq("dojo_id", dojoId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as DojoSensei[];
    },
    enabled: !!dojoId,
  });
}

export function useIsSuperAdmin() {
  const { roles } = useAuth();
  return roles.includes("super_admin");
}

export function useIsDono() {
  const { roles } = useAuth();
  return roles.includes("dono");
}
