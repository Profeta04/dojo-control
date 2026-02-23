import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StudentBelt {
  martial_art: string;
  belt_grade: string;
  degree: number;
}

export function useStudentBelts(userId?: string) {
  return useQuery({
    queryKey: ["student-belts", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("student_belts")
        .select("martial_art, belt_grade, degree")
        .eq("user_id", userId);
      if (error) throw error;
      return (data || []) as StudentBelt[];
    },
    enabled: !!userId,
  });
}
