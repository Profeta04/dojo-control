import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useEffect } from "react";

export type TaskStatus = "pendente" | "concluida" | "cancelada";
export type TaskPriority = "baixa" | "normal" | "alta";
export type TaskCategory = "tecnica" | "fisica" | "administrativa" | "outra" | "technical" | "physical" | "administrative" | "theory";

export const CATEGORY_CONFIG: Record<TaskCategory, { label: string; color: string; bgColor: string }> = {
  tecnica: { label: "Técnica", color: "text-blue-700", bgColor: "bg-blue-100" },
  technical: { label: "Técnica", color: "text-blue-700", bgColor: "bg-blue-100" },
  fisica: { label: "Física", color: "text-green-700", bgColor: "bg-green-100" },
  physical: { label: "Física", color: "text-green-700", bgColor: "bg-green-100" },
  administrativa: { label: "Administrativa", color: "text-purple-700", bgColor: "bg-purple-100" },
  administrative: { label: "Administrativa", color: "text-purple-700", bgColor: "bg-purple-100" },
  outra: { label: "Outra", color: "text-gray-700", bgColor: "bg-gray-100" },
  theory: { label: "Teoria", color: "text-amber-700", bgColor: "bg-amber-100" },
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
  const queryClient = useQueryClient();

  // Fetch tasks for current user (students see their own, admins/senseis see all)
  const { data: tasks = [], isLoading, refetch } = useQuery({
    queryKey: ["tasks", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // First get tasks
      let query = supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });

      // Students only see their own tasks
      if (isStudent && !canManageStudents) {
        query = query.eq("assigned_to", user.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch profile names for assigned_to and assigned_by
      if (data && data.length > 0) {
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

      return data as TaskWithAssignee[];
    },
    enabled: !!user,
  });

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

  // Create task mutation
  const createTask = useMutation({
    mutationFn: async (taskData: {
      title: string;
      description?: string;
      assigned_to: string;
      due_date?: string;
      priority?: TaskPriority;
      category?: TaskCategory;
    }) => {
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("tasks")
        .insert({
          title: taskData.title,
          description: taskData.description || null,
          assigned_to: taskData.assigned_to,
          assigned_by: user.id,
          due_date: taskData.due_date || null,
          priority: taskData.priority || "normal",
          category: taskData.category || "outra",
        })
        .select()
        .single();

      if (error) throw error;

      // Fire push notification for the assigned student (non-blocking)
      if (data && taskData.assigned_to !== user.id) {
        supabase.functions.invoke("send-push-notification", {
          body: {
            userId: taskData.assigned_to,
            title: "📋 Nova Tarefa Atribuída",
            body: taskData.title,
            url: "/tarefas",
          },
        }).catch(() => {/* silent fail — push is optional */});
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

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
    createTask,
    updateTaskStatus,
    deleteTask,
    deleteBatchTasks,
    deleteTasksByStudent,
  };
}
