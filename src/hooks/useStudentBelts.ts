import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StudentBelt {
  martial_art: string;
  belt_grade: string;
  degree: number;
}

/**
 * Fetches student belts filtered by class enrollment.
 * Only returns belts for martial arts where the student is enrolled in a class.
 * This prevents showing belts that were accidentally registered by parents.
 */
export function useStudentBelts(userId?: string) {
  return useQuery({
    queryKey: ["student-belts", userId],
    queryFn: async () => {
      if (!userId) return [];

      // Fetch belts and enrolled class martial arts in parallel
      const [beltsRes, enrollmentsRes] = await Promise.all([
        supabase
          .from("student_belts")
          .select("martial_art, belt_grade, degree")
          .eq("user_id", userId),
        supabase
          .from("class_students")
          .select("class_id, classes(martial_art)")
          .eq("student_id", userId),
      ]);

      if (beltsRes.error) throw beltsRes.error;
      const belts = (beltsRes.data || []) as StudentBelt[];
      const enrollments = enrollmentsRes.data || [];

      // Collect enrolled martial arts (normalize bjj/jiu-jitsu)
      const enrolledArts = new Set<string>();
      enrollments.forEach((e: any) => {
        const art = e.classes?.martial_art;
        if (art) {
          enrolledArts.add(art);
          // Normalize: if enrolled in jiu-jitsu class, also match bjj belt
          if (art === "jiu-jitsu") enrolledArts.add("bjj");
          if (art === "bjj") enrolledArts.add("jiu-jitsu");
        }
      });

      // If no enrollments found, return all belts (student may not be enrolled yet)
      if (enrolledArts.size === 0) return belts;

      // Filter belts to only show those matching enrolled martial arts
      return belts.filter((b) => enrolledArts.has(b.martial_art));
    },
    enabled: !!userId,
  });
}
