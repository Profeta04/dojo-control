import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, BookOpen, Loader2, Youtube, RotateCcw, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTasks, TaskWithAssignee } from "@/hooks/useTasks";
import { useXP } from "@/hooks/useXP";
import { useAchievements } from "@/hooks/useAchievements";
import { useSeasons } from "@/hooks/useSeasons";
import { toast } from "sonner";
import { fireConfetti } from "@/lib/confetti";
import { XPNotification } from "@/components/gamification/XPNotification";

interface TaskQuizCardProps {
  task: TaskWithAssignee;
  options: string[];
  correctOption: number;
  videoUrl?: string;
  xpValue?: number;
}

export function TaskQuizCard({ task, options, correctOption, videoUrl, xpValue = 10 }: TaskQuizCardProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isSliding, setIsSliding] = useState(false);
  const [xpNotif, setXpNotif] = useState<{ amount: number; multiplier: number; leveledUp: boolean; newLevel: number } | null>(null);
  const { updateTaskStatus } = useTasks();
  const { grantXP, currentStreak, totalXp } = useXP();
  const { checkAndUnlock } = useAchievements();
  const { grantSeasonXP } = useSeasons();

  const handleSubmit = async () => {
    if (selectedOption === null) return;
    
    const selectedIndex = parseInt(selectedOption);
    const correct = selectedIndex === correctOption;
    
    setIsCorrect(correct);
    setHasAnswered(true);
    
    if (correct) {
      fireConfetti();
      setIsSliding(true);
      toast.success("Resposta correta! 🎉");
      
      // Grant XP
      try {
        const result = await grantXP.mutateAsync({ baseXP: xpValue, reason: "quiz" });
        // Also grant season XP
        grantSeasonXP.mutate({ baseXP: xpValue });
        setXpNotif({
          amount: result.xpGranted,
          multiplier: result.multiplier,
          leveledUp: result.leveledUp,
          newLevel: result.newLevel,
        });
        // Check achievements
        const completedCount = (await import("@/integrations/supabase/client")).supabase
          .from("tasks").select("id", { count: "exact" })
          .eq("assigned_to", task.assigned_to).eq("status", "concluida");
        const count = (await completedCount).count || 0;
        checkAndUnlock.mutate({ tasksCompleted: count + 1, currentStreak, totalXp: result.newTotal });
      } catch {}

      setTimeout(() => {
        updateTaskStatus.mutate({ taskId: task.id, status: "concluida" });
        setIsSliding(false);
      }, 600);
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
    <Card className={cn(
      "transition-all duration-500 hover:shadow-md overflow-hidden",
      hasAnswered && isCorrect && "ring-2 ring-success/40",
      hasAnswered && !isCorrect && "ring-2 ring-destructive/40",
      isSliding && "translate-x-4 opacity-0 scale-95"
    )}>
      {/* Accent bar */}
      <div className={cn(
        "h-1 w-full",
        hasAnswered && isCorrect ? "bg-success" : hasAnswered && !isCorrect ? "bg-destructive" : "bg-primary"
      )} />
      
      <CardHeader className="pb-3 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 min-w-0">
            <div className={cn(
              "flex-shrink-0 mt-0.5 p-2 rounded-lg",
              hasAnswered && isCorrect ? "bg-success/10" : "bg-primary/10"
            )}>
              <BookOpen className={cn(
                "h-4 w-4",
                hasAnswered && isCorrect ? "text-success" : "text-primary"
              )} />
            </div>
            <div className="min-w-0">
              <h4 className="font-semibold text-sm leading-tight">{task.title}</h4>
              {task.description && (
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{task.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Badge variant="secondary" className="text-xs font-medium flex items-center gap-1">
              <Zap className="h-3 w-3 text-accent" />
              {xpValue} XP
            </Badge>
            <Badge variant="secondary" className="text-xs font-medium">
              Quiz
            </Badge>
          </div>
        </div>
        {videoUrl && (
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-3 text-xs text-destructive hover:text-destructive/80 font-medium transition-colors bg-destructive/5 px-3 py-1.5 rounded-md w-fit"
          >
            <Youtube className="h-3.5 w-3.5" />
            Assistir vídeo de apoio
          </a>
        )}
      </CardHeader>

      <CardContent className="pb-4">
        <RadioGroup
          value={selectedOption ?? undefined}
          onValueChange={setSelectedOption}
          className="space-y-2"
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
                  "flex items-center space-x-3 px-3 py-2.5 rounded-lg border transition-all duration-200 cursor-pointer",
                  !showResult && isSelected && "border-primary bg-primary/5 shadow-sm",
                  !showResult && !isSelected && "border-border hover:border-primary/40 hover:bg-muted/50",
                  showResult && isCorrectOption && "border-success bg-success/5",
                  showResult && isSelected && !isCorrectOption && "border-destructive bg-destructive/5",
                )}
              >
                <RadioGroupItem
                  value={String(index)}
                  id={`${task.id}-option-${index}`}
                  className={cn(
                    "flex-shrink-0",
                    showResult && isCorrectOption && "border-success text-success",
                    showResult && isSelected && !isCorrectOption && "border-destructive text-destructive"
                  )}
                />
                <Label
                  htmlFor={`${task.id}-option-${index}`}
                  className={cn(
                    "flex-1 cursor-pointer text-sm leading-snug",
                    showResult && isCorrectOption && "text-success font-medium",
                    showResult && isSelected && !isCorrectOption && "text-destructive"
                  )}
                >
                  {option}
                </Label>
                {showResult && isCorrectOption && (
                  <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                )}
                {showResult && isSelected && !isCorrectOption && (
                  <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                )}
              </div>
            );
          })}
        </RadioGroup>

        <div className="flex justify-end gap-2 mt-4">
          {hasAnswered && !isCorrect && (
            <Button variant="outline" size="sm" onClick={handleRetry} className="gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" />
              Tentar Novamente
            </Button>
          )}
          {!hasAnswered && (
            <Button 
              onClick={handleSubmit} 
              size="sm"
              disabled={selectedOption === null || updateTaskStatus.isPending}
              className="gap-1.5"
            >
              {updateTaskStatus.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Verificar Resposta
            </Button>
          )}
          {hasAnswered && isCorrect && (
            <div className="flex items-center gap-2 text-success text-sm">
              <CheckCircle2 className="h-4 w-4" />
              <span className="font-medium">Concluída!</span>
            </div>
          )}
        </div>
      </CardContent>
      
      {xpNotif && (
        <XPNotification
          xpAmount={xpNotif.amount}
          multiplier={xpNotif.multiplier}
          leveledUp={xpNotif.leveledUp}
          newLevel={xpNotif.newLevel}
          show={!!xpNotif}
          onComplete={() => setXpNotif(null)}
        />
      )}
    </Card>
  );
}
