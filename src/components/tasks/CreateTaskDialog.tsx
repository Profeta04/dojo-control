import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useTasks, TaskPriority, TaskCategory, CATEGORY_CONFIG } from "@/hooks/useTasks";
import { Plus, Loader2, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { TaskTemplatesDialog } from "./TaskTemplatesDialog";

const taskSchema = z.object({
  title: z.string().min(1, "Título obrigatório").max(100, "Máximo 100 caracteres"),
  description: z.string().max(500, "Máximo 500 caracteres").optional(),
  assigned_to: z.string().min(1, "Selecione um aluno"),
  due_date: z.string().optional(),
  priority: z.enum(["baixa", "normal", "alta"]),
  category: z.enum(["tecnica", "fisica", "administrativa", "outra", "technical", "physical", "administrative", "theory"]),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface Student {
  user_id: string;
  name: string;
}

export function CreateTaskDialog() {
  const [open, setOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const { createTask } = useTasks();

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      assigned_to: "",
      due_date: "",
      priority: "normal",
      category: "outra",
    },
  });

  useEffect(() => {
    if (open) {
      fetchStudents();
    }
  }, [open]);

  const fetchStudents = async () => {
    setLoadingStudents(true);
    try {
      // Fetch all approved students
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name")
        .eq("registration_status", "aprovado")
        .order("name");

      // Also get users with student role
      const { data: studentRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "student");

      const studentUserIds = new Set(studentRoles?.map(r => r.user_id) || []);
      
      // Filter profiles to only include students
      const studentProfiles = profiles?.filter(p => studentUserIds.has(p.user_id)) || [];
      
      setStudents(studentProfiles);
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setLoadingStudents(false);
    }
  };

  const onSubmit = async (data: TaskFormData) => {
    try {
      await createTask.mutateAsync({
        title: data.title,
        description: data.description,
        assigned_to: data.assigned_to,
        due_date: data.due_date || undefined,
        priority: data.priority as TaskPriority,
        category: data.category as TaskCategory,
      });



      toast.success("Tarefa criada com sucesso!");
      form.reset();
      setOpen(false);
    } catch {
      toast.error("Erro ao criar tarefa");
    }
  };

  const handleSelectTemplate = (template: any) => {
    // Map template category to form category
    const categoryMap: Record<string, TaskCategory> = {
      'technical': 'tecnica',
      'physical': 'fisica',
      'administrative': 'administrativa',
      'other': 'outra',
    };
    
    form.setValue('title', template.title);
    form.setValue('description', template.description || '');
    form.setValue('category', (categoryMap[template.category] || template.category || 'outra') as TaskCategory);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Tarefa
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Criar Nova Tarefa</DialogTitle>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={() => setTemplatesOpen(true)}
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Banco de Tarefas
            </Button>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Praticar ukemi" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detalhes sobre a tarefa..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assigned_to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Atribuir para</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={loadingStudents ? "Carregando..." : "Selecione um aluno"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.user_id} value={student.user_id}>
                          {student.name}
                        </SelectItem>
                      ))}
                      {students.length === 0 && !loadingStudents && (
                        <SelectItem value="none" disabled>
                          Nenhum aluno encontrado
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prazo (opcional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="baixa">Baixa</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="alta">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(Object.keys(CATEGORY_CONFIG) as TaskCategory[]).map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {CATEGORY_CONFIG[cat].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createTask.isPending}>
                {createTask.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar Tarefa
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

    <TaskTemplatesDialog
      open={templatesOpen}
      onOpenChange={setTemplatesOpen}
      onSelectTemplate={handleSelectTemplate}
    />
    </>
  );
}
