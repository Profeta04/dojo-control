import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Wand2, Loader2, Users, BookOpen, Dumbbell, FileText, MoreHorizontal } from "lucide-react";
import { BeltBadge } from "@/components/shared/BeltBadge";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface TaskTemplate {
  id: string;
  title: string;
  description: string | null;
  category: string;
  belt_level: string;
  martial_art: string;
  difficulty: string;
  options: string[] | null;
  correct_option: number | null;
}

interface Student {
  user_id: string;
  name: string;
  belt_grade: string | null;
}

const CATEGORY_CONFIG: Record<string, { icon: any; label: string }> = {
  technical: { icon: BookOpen, label: "Técnico" },
  physical: { icon: Dumbbell, label: "Físico" },
  administrative: { icon: FileText, label: "Administrativo" },
  other: { icon: MoreHorizontal, label: "Outro" },
};

const BELT_ORDER = [
  "branca", "cinza", "azul", "amarela", "laranja", "verde", "roxa", "marrom",
  "preta_1dan", "preta_2dan", "preta_3dan"
];

export function AutoAssignTasksDialog() {
  const [open, setOpen] = useState(false);
  const [selectedMartialArt, setSelectedMartialArt] = useState<string>("judo");
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch students with their belt grades
  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ["students-with-belts"],
    queryFn: async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, belt_grade")
        .eq("registration_status", "aprovado")
        .order("name");

      const { data: studentRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "student");

      const studentUserIds = new Set(studentRoles?.map(r => r.user_id) || []);
      
      return (profiles?.filter(p => studentUserIds.has(p.user_id)) || []) as Student[];
    },
    enabled: open,
  });

  // Fetch task templates
  const { data: templates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ["task-templates", selectedMartialArt],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_templates")
        .select("*")
        .eq("martial_art", selectedMartialArt)
        .order("belt_level")
        .order("category");
      
      if (error) throw error;
      return data as TaskTemplate[];
    },
    enabled: open,
  });

  // Group students by belt
  const studentsByBelt = students.reduce((acc, student) => {
    const belt = student.belt_grade || "branca";
    if (!acc[belt]) acc[belt] = [];
    acc[belt].push(student);
    return acc;
  }, {} as Record<string, Student[]>);

  // Get templates for selected students' belts
  const getRelevantTemplates = () => {
    const selectedBelts = new Set(
      students
        .filter(s => selectedStudents.has(s.user_id))
        .map(s => s.belt_grade || "branca")
    );
    
    return templates.filter(t => selectedBelts.has(t.belt_level));
  };

  // Auto-select templates based on students' belts
  const autoSelectTemplates = () => {
    const relevantTemplates = getRelevantTemplates();
    setSelectedTemplates(new Set(relevantTemplates.map(t => t.id)));
  };

  // Select all students
  const selectAllStudents = () => {
    setSelectedStudents(new Set(students.map(s => s.user_id)));
  };

  // Assign tasks mutation
  const assignTasks = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Não autenticado");
      
      const tasksToCreate: any[] = [];
      
      for (const studentId of selectedStudents) {
        const student = students.find(s => s.user_id === studentId);
        if (!student) continue;
        
        const studentBelt = student.belt_grade || "branca";
        
        for (const templateId of selectedTemplates) {
          const template = templates.find(t => t.id === templateId);
          if (!template) continue;
          
          // Only assign if template belt matches student belt
          if (template.belt_level === studentBelt) {
            const categoryMap: Record<string, string> = {
              'technical': 'tecnica',
              'physical': 'fisica',
              'administrative': 'administrativa',
              'other': 'outra',
            };
            
            tasksToCreate.push({
              title: template.title,
              description: template.description,
              assigned_to: studentId,
              assigned_by: user.id,
              category: categoryMap[template.category] || 'outra',
              priority: template.difficulty === 'hard' ? 'alta' : template.difficulty === 'easy' ? 'baixa' : 'normal',
              status: 'pendente',
            });
          }
        }
      }
      
      if (tasksToCreate.length === 0) {
        throw new Error("Nenhuma tarefa correspondente às faixas dos alunos selecionados");
      }
      
      const { error } = await supabase.from("tasks").insert(tasksToCreate);
      if (error) throw error;
      
      return tasksToCreate.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} tarefas atribuídas com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setOpen(false);
      setSelectedStudents(new Set());
      setSelectedTemplates(new Set());
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao atribuir tarefas");
    },
  });

  const toggleStudent = (userId: string) => {
    const newSet = new Set(selectedStudents);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedStudents(newSet);
  };

  const toggleTemplate = (templateId: string) => {
    const newSet = new Set(selectedTemplates);
    if (newSet.has(templateId)) {
      newSet.delete(templateId);
    } else {
      newSet.add(templateId);
    }
    setSelectedTemplates(newSet);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Wand2 className="h-4 w-4" />
          Aplicar por Faixa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Aplicar Tarefas Automaticamente por Faixa
          </DialogTitle>
          <DialogDescription>
            Selecione alunos e as tarefas serão atribuídas automaticamente baseadas em suas faixas
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Select value={selectedMartialArt} onValueChange={setSelectedMartialArt}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="judo">Judô</SelectItem>
              <SelectItem value="jiu-jitsu">Jiu-Jitsu</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={selectAllStudents}>
            <Users className="h-4 w-4 mr-2" />
            Selecionar Todos
          </Button>
          <Button variant="outline" size="sm" onClick={autoSelectTemplates} disabled={selectedStudents.size === 0}>
            <Wand2 className="h-4 w-4 mr-2" />
            Auto-Selecionar Tarefas
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Students Column */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Alunos ({selectedStudents.size} selecionados)
            </h3>
            <ScrollArea className="h-[300px]">
              {loadingStudents ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : (
                <div className="space-y-4">
                  {BELT_ORDER.filter(belt => studentsByBelt[belt]?.length > 0).map(belt => (
                    <div key={belt}>
                      <div className="flex items-center gap-2 mb-2">
                        <BeltBadge grade={belt as any} size="sm" />
                        <span className="text-xs text-muted-foreground">
                          ({studentsByBelt[belt].length})
                        </span>
                      </div>
                      <div className="space-y-1 ml-2">
                        {studentsByBelt[belt].map(student => (
                          <label
                            key={student.user_id}
                            className="flex items-center gap-2 p-2 rounded hover:bg-accent cursor-pointer"
                          >
                            <Checkbox
                              checked={selectedStudents.has(student.user_id)}
                              onCheckedChange={() => toggleStudent(student.user_id)}
                            />
                            <span className="text-sm">{student.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Templates Column */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Tarefas ({selectedTemplates.size} selecionadas)
            </h3>
            <ScrollArea className="h-[300px]">
              {loadingTemplates ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : (
                <div className="space-y-4">
                  {BELT_ORDER.filter(belt => 
                    templates.some(t => t.belt_level === belt)
                  ).map(belt => {
                    const beltTemplates = templates.filter(t => t.belt_level === belt);
                    return (
                      <div key={belt}>
                        <div className="flex items-center gap-2 mb-2">
                          <BeltBadge grade={belt as any} size="sm" />
                          <span className="text-xs text-muted-foreground">
                            ({beltTemplates.length})
                          </span>
                        </div>
                        <div className="space-y-1 ml-2">
                          {beltTemplates.map(template => {
                            const CategoryIcon = CATEGORY_CONFIG[template.category]?.icon || MoreHorizontal;
                            return (
                              <label
                                key={template.id}
                                className="flex items-center gap-2 p-2 rounded hover:bg-accent cursor-pointer"
                              >
                                <Checkbox
                                  checked={selectedTemplates.has(template.id)}
                                  onCheckedChange={() => toggleTemplate(template.id)}
                                />
                                <CategoryIcon className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm truncate">{template.title}</span>
                                {template.options && (
                                  <Badge variant="outline" className="text-xs ml-auto">
                                    Quiz
                                  </Badge>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={() => assignTasks.mutate()} 
            disabled={assignTasks.isPending || selectedStudents.size === 0 || selectedTemplates.size === 0}
          >
            {assignTasks.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Atribuir Tarefas
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}