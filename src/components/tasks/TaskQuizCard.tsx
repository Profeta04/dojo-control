import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, BookOpen, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTasks, TaskWithAssignee } from "@/hooks/useTasks";
import { toast } from "sonner";

interface TaskQuizCardProps {
  task: TaskWithAssignee;
  options: string[];
  correctOption: number;
}

export function TaskQuizCard({ task, options, correctOption }: TaskQuizCardProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const { updateTaskStatus } = useTasks();

  const handleSubmit = () => {
    if (selectedOption === null) return;
    
    const selectedIndex = parseInt(selectedOption);
    const correct = selectedIndex === correctOption;
    
    setIsCorrect(correct);
    setHasAnswered(true);
    
    if (correct) {
      toast.success("Resposta correta! 🎉");
      // Mark task as completed
      updateTaskStatus.mutate({ taskId: task.id, status: "concluida" });
    } else {
      toast.error("Resposta incorreta. Tente novamente!");
    }
  };

  const handleRetry = () => {
    setSelectedOption(null);
    setHasAnswered(false);
    setIsCorrect(false);
  };

  return (
    <Card className="border-2 border-blue-200 bg-blue-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-base">{task.title}</CardTitle>
          </div>
          <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
            Questão Teórica
          </Badge>
        </div>
        {task.description && (
          <p className="text-sm text-muted-foreground mt-2">{task.description}</p>
        )}
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={selectedOption ?? undefined}
          onValueChange={setSelectedOption}
          className="space-y-3"
          disabled={hasAnswered && isCorrect}
        >
          {options.map((option, index) => {
            const isSelected = selectedOption === String(index);
            const isCorrectOption = index === correctOption;
            const showResult = hasAnswered;
            
            return (
              <div
                key={index}
                className={cn(
                  "flex items-center space-x-3 p-3 rounded-lg border transition-colors",
                  !showResult && isSelected && "border-blue-400 bg-blue-50",
                  !showResult && !isSelected && "border-border hover:border-blue-300 hover:bg-blue-50/50",
                  showResult && isCorrectOption && "border-green-400 bg-green-50",
                  showResult && isSelected && !isCorrectOption && "border-red-400 bg-red-50",
                )}
              >
                <RadioGroupItem
                  value={String(index)}
                  id={`${task.id}-option-${index}`}
                  className={cn(
                    showResult && isCorrectOption && "border-green-500 text-green-500",
                    showResult && isSelected && !isCorrectOption && "border-red-500 text-red-500"
                  )}
                />
                <Label
                  htmlFor={`${task.id}-option-${index}`}
                  className={cn(
                    "flex-1 cursor-pointer text-sm",
                    showResult && isCorrectOption && "text-green-700 font-medium",
                    showResult && isSelected && !isCorrectOption && "text-red-700"
                  )}
                >
                  {option}
                </Label>
                {showResult && isCorrectOption && (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                )}
                {showResult && isSelected && !isCorrectOption && (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
              </div>
            );
          })}
        </RadioGroup>

        <div className="flex justify-end gap-2 mt-4">
          {hasAnswered && !isCorrect && (
            <Button variant="outline" onClick={handleRetry}>
              Tentar Novamente
            </Button>
          )}
          {!hasAnswered && (
            <Button 
              onClick={handleSubmit} 
              disabled={selectedOption === null || updateTaskStatus.isPending}
            >
              {updateTaskStatus.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Verificar Resposta
            </Button>
          )}
          {hasAnswered && isCorrect && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Tarefa Concluída!</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}