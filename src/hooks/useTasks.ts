import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useDojoContext } from "./useDojoContext";
import { useEffect } from "react";

export type TaskStatus = "pendente" | "concluida" | "cancelada";
export type TaskPriority = "baixa" | "normal" | "alta";
export type TaskCategory = "tecnica" | "fisica" | "administrativa" | "outra" | "technical" | "physical" | "administrative" | "theory";

export const CATEGORY_CONFIG: Record<TaskCategory, { label: string; color: string; bgColor: string }> = {
  tecnica: { label: "Técnica", color: "text-info", bgColor: "bg-info/10" },
  technical: { label: "Técnica", color: "text-info", bgColor: "bg-info/10" },
  fisica: { label: "Física", color: "text-success", bgColor: "bg-success/10" },
  physical: { label: "Física", color: "text-success", bgColor: "bg-success/10" },
  administrativa: { label: "Administrativa", color: "text-accent", bgColor: "bg-accent/10" },
  administrative: { label: "Administrativa", color: "text-accent", bgColor: "bg-accent/10" },
  outra: { label: "Outra", color: "text-muted-foreground", bgColor: "bg-muted" },
  theory: { label: "Teoria", color: "text-warning", bgColor: "bg-warning/10" },
};

// Normalize category to Portuguese canonical form
export function normalizeCategory(cat: string): TaskCategory {
  const map: Record<string, TaskCategory> = {
    technical: "tecnica",
    physical: "fisica",
    administrative: "administrativa",
    theory: "outra",
  };
  return (map[cat] || cat) as TaskCategory;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string;
  assigned_by: string;
  due_date: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  category: TaskCategory;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  evidence_text: string | null;
}

export interface TaskWithAssignee extends Task {
  assignee_name?: string;
  assigner_name?: string;
}

export function useTasks() {
  const { user, isStudent, canManageStudents } = useAuth();
  const { currentDojoId } = useDojoContext();
  const queryClient = useQueryClient();

  // Fetch tasks for current user (students see their own, admins/senseis see dojo-filtered)
  const { data: tasks = [], isLoading, refetch } = useQuery({
    queryKey: ["tasks", user?.id, currentDojoId],
    queryFn: async () => {
      if (!user) return [];

      // Students only see their own tasks
      if (isStudent && !canManageStudents) {
        const { data, error } = await supabase
          .from("tasks")
          .select("*")
          .eq("assigned_to", user.id)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return enrichTasks(data || []);
      }

      // Staff: filter by dojo students for multi-tenant isolation
      if (currentDojoId) {
        const { data: dojoProfiles } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("dojo_id", currentDojoId);

        const studentIds = (dojoProfiles || []).map(p => p.user_id);
        if (studentIds.length === 0) return [];

        const { data, error } = await supabase
          .from("tasks")
          .select("*")
          .in("assigned_to", studentIds)
          .order("created_at", { ascending: false })
          .limit(500);
        if (error) throw error;
        return enrichTasks(data || []);
      }

      // Admin without dojo filter: all tasks (limited)
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return enrichTasks(data || []);
    },
    enabled: !!user,
    staleTime: 15_000,
  });

  // Helper to enrich tasks with profile names
  async function enrichTasks(data: any[]): Promise<TaskWithAssignee[]> {
    if (data.length === 0) return [];

    const userIds = [...new Set([
      ...data.map(t => t.assigned_to),
      ...data.map(t => t.assigned_by)
    ])];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, name")
      .in("user_id", userIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p.name]) || []);

    return data.map(task => ({
      ...task,
      assignee_name: profileMap.get(task.assigned_to) || "Desconhecido",
      assigner_name: profileMap.get(task.assigned_by) || "Desconhecido",
    })) as TaskWithAssignee[];
  }

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("tasks-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refetch]);

  // Task creation removed — tasks are managed via curriculum (admin-only DB inserts)

  // Update task status mutation
  const updateTaskStatus = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: TaskStatus }) => {
      const updateData: { status: TaskStatus; completed_at?: string | null } = { status };
      
      if (status === "concluida") {
        updateData.completed_at = new Date().toISOString();
      } else {
        updateData.completed_at = null;
      }

      const { data, error } = await supabase
        .from("tasks")
        .update(updateData)
        .eq("id", taskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  // Delete task mutation
  const deleteTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  // Bulk delete tasks mutation
  const deleteBatchTasks = useMutation({
    mutationFn: async (taskIds: string[]) => {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .in("id", taskIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  // Delete all tasks for a specific student
  const deleteTasksByStudent = useMutation({
    mutationFn: async (studentId: string) => {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("assigned_to", studentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  return {
    tasks,
    isLoading,
    updateTaskStatus,
    deleteTask,
    deleteBatchTasks,
    deleteTasksByStudent,
  };
}
