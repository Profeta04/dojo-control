import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DojoSettings {
  dojo_name: string;
  dojo_phone: string;
  dojo_email: string;
  dojo_address: string;
  monthly_fee: string;
  payment_due_day: string;
  pix_key: string;
  welcome_message: string;
}

const DEFAULT_SETTINGS: DojoSettings = {
  dojo_name: "Dojo Manager",
  dojo_phone: "",
  dojo_email: "",
  dojo_address: "",
  monthly_fee: "150.00",
  payment_due_day: "10",
  pix_key: "",
  welcome_message: "",
};

export function useDojoSettings() {
  const { data: settings, isLoading, error } = useQuery({
    queryKey: ["dojo-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("key, value")
        .order("key");

      if (error) throw error;

      const settingsMap: Record<string, string> = {};
      data.forEach((item) => {
        settingsMap[item.key] = item.value || "";
      });

      return {
        dojo_name: settingsMap.dojo_name || DEFAULT_SETTINGS.dojo_name,
        dojo_phone: settingsMap.dojo_phone || DEFAULT_SETTINGS.dojo_phone,
        dojo_email: settingsMap.dojo_email || DEFAULT_SETTINGS.dojo_email,
        dojo_address: settingsMap.dojo_address || DEFAULT_SETTINGS.dojo_address,
        monthly_fee: settingsMap.monthly_fee || DEFAULT_SETTINGS.monthly_fee,
        payment_due_day: settingsMap.payment_due_day || DEFAULT_SETTINGS.payment_due_day,
        pix_key: settingsMap.pix_key || DEFAULT_SETTINGS.pix_key,
        welcome_message: settingsMap.welcome_message || DEFAULT_SETTINGS.welcome_message,
      } as DojoSettings;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  return {
    settings: settings || DEFAULT_SETTINGS,
    isLoading,
    error,
  };
}
