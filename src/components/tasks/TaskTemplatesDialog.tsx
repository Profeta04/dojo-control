import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, BookOpen, Dumbbell, FileText, MoreHorizontal, Plus, HelpCircle } from "lucide-react";
import { BeltBadge } from "@/components/shared/BeltBadge";

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

interface TaskTemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: TaskTemplate) => void;
}

const CATEGORY_CONFIG: Record<string, { icon: any; label: string; color: string }> = {
  technical: { icon: BookOpen, label: "Técnico", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  physical: { icon: Dumbbell, label: "Físico", color: "bg-green-500/10 text-green-600 border-green-500/20" },
  administrative: { icon: FileText, label: "Administrativo", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  other: { icon: MoreHorizontal, label: "Outro", color: "bg-gray-500/10 text-gray-600 border-gray-500/20" },
};

const DIFFICULTY_LABELS: Record<string, { label: string; color: string }> = {
  easy: { label: "Fácil", color: "bg-green-100 text-green-700" },
  medium: { label: "Médio", color: "bg-yellow-100 text-yellow-700" },
  hard: { label: "Difícil", color: "bg-red-100 text-red-700" },
};

const BELT_ORDER = [
  "branca", "cinza", "azul", "amarela", "laranja", "verde", "roxa", "marrom",
  "preta_1dan", "preta_2dan", "preta_3dan"
];

export function TaskTemplatesDialog({ open, onOpenChange, onSelectTemplate }: TaskTemplatesDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMartialArt, setFilterMartialArt] = useState<string>("all");
  const [filterBeltLevel, setFilterBeltLevel] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["task-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_templates")
        .select("*")
        .order("martial_art")
        .order("belt_level")
        .order("category");
      
      if (error) throw error;
      return data as TaskTemplate[];
    },
    enabled: open,
  });

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = 
      template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesMartialArt = filterMartialArt === "all" || template.martial_art === filterMartialArt;
    const matchesBelt = filterBeltLevel === "all" || template.belt_level === filterBeltLevel;
    const matchesCategory = filterCategory === "all" || template.category === filterCategory;

    return matchesSearch && matchesMartialArt && matchesBelt && matchesCategory;
  });

  // Group templates by belt level
  const groupedTemplates = filteredTemplates.reduce((acc, template) => {
    const key = `${template.martial_art}-${template.belt_level}`;
    if (!acc[key]) {
      acc[key] = {
        martialArt: template.martial_art,
        beltLevel: template.belt_level,
        templates: [],
      };
    }
    acc[key].templates.push(template);
    return acc;
  }, {} as Record<string, { martialArt: string; beltLevel: string; templates: TaskTemplate[] }>);

  // Sort groups by martial art and belt order
  const sortedGroups = Object.values(groupedTemplates).sort((a, b) => {
    if (a.martialArt !== b.martialArt) {
      return a.martialArt.localeCompare(b.martialArt);
    }
    return BELT_ORDER.indexOf(a.beltLevel) - BELT_ORDER.indexOf(b.beltLevel);
  });

  const handleSelectTemplate = (template: TaskTemplate) => {
    onSelectTemplate(template);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Banco de Tarefas
          </DialogTitle>
          <DialogDescription>
            Selecione uma tarefa pré-definida para aplicar ao aluno
          </DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar tarefa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterMartialArt} onValueChange={setFilterMartialArt}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Arte Marcial" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="judo">Judô</SelectItem>
              <SelectItem value="jiu-jitsu">Jiu-Jitsu</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterBeltLevel} onValueChange={setFilterBeltLevel}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Faixa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {BELT_ORDER.map((belt) => (
                <SelectItem key={belt} value={belt}>
                  {belt.charAt(0).toUpperCase() + belt.slice(1).replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="technical">Técnico</SelectItem>
              <SelectItem value="physical">Físico</SelectItem>
              <SelectItem value="administrative">Administrativo</SelectItem>
              <SelectItem value="other">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Templates List */}
        <ScrollArea className="h-[500px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">Carregando tarefas...</p>
            </div>
          ) : sortedGroups.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">Nenhuma tarefa encontrada</p>
            </div>
          ) : (
            <div className="space-y-6">
              {sortedGroups.map((group) => (
                <div key={`${group.martialArt}-${group.beltLevel}`}>
                  <div className="flex items-center gap-2 mb-3 sticky top-0 bg-background py-2">
                    <Badge variant="outline" className="capitalize">
                      {group.martialArt === 'jiu-jitsu' ? 'Jiu-Jitsu' : 'Judô'}
                    </Badge>
                    <BeltBadge grade={group.beltLevel as any} size="sm" />
                    <span className="text-sm text-muted-foreground">
                      ({group.templates.length} tarefas)
                    </span>
                  </div>
                  <div className="grid gap-2">
                    {group.templates.map((template) => {
                      const categoryConfig = CATEGORY_CONFIG[template.category] || CATEGORY_CONFIG.other;
                      const CategoryIcon = categoryConfig.icon;
                      const difficultyConfig = DIFFICULTY_LABELS[template.difficulty] || DIFFICULTY_LABELS.medium;

                      return (
                        <div
                          key={template.id}
                          className="flex items-start gap-3 p-3 rounded-lg border hover:border-primary/50 hover:bg-accent/5 transition-colors cursor-pointer group"
                          onClick={() => handleSelectTemplate(template)}
                        >
                          <div className={`p-2 rounded-md ${categoryConfig.color}`}>
                            <CategoryIcon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h4 className="font-medium text-sm truncate">{template.title}</h4>
                              <Badge variant="secondary" className={`text-xs ${difficultyConfig.color}`}>
                                {difficultyConfig.label}
                              </Badge>
                              {template.options && template.options.length > 0 && (
                                <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-300">
                                  <HelpCircle className="h-3 w-3 mr-1" />
                                  Quiz
                                </Badge>
                              )}
                            </div>
                            {template.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {template.description}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Usar
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
