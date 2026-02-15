import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, BookOpen, Loader2, RotateCcw, Sparkles, Zap, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTasks, TaskWithAssignee } from "@/hooks/useTasks";
import { useXP } from "@/hooks/useXP";
import { useAchievements } from "@/hooks/useAchievements";
import { useSeasons } from "@/hooks/useSeasons";
import { toast } from "sonner";
import { fireConfetti } from "@/lib/confetti";
import { XPNotification } from "@/components/gamification/XPNotification";

interface QuizQuestion {
  task: TaskWithAssignee;
  options: string[];
  correctOption: number;
  xpValue: number;
}

interface SequentialQuizCardProps {
  questions: QuizQuestion[];
  groupLabel: string;
}

export function SequentialQuizCard({ questions, groupLabel }: SequentialQuizCardProps) {
  const [currentIndex, setCurrentIndex] = useState(() => {
    // Start at first pending (non-completed) question
    const firstPending = questions.findIndex(q => q.task.status !== "concluida");
    return firstPending === -1 ? questions.length : firstPending;
  });
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [xpNotif, setXpNotif] = useState<{ amount: number; multiplier: number; leveledUp: boolean; newLevel: number } | null>(null);

  const { updateTaskStatus } = useTasks();
  const { grantXP, currentStreak, totalXp } = useXP();
  const { checkAndUnlock } = useAchievements();
  const { grantSeasonXP } = useSeasons();

  const completedCount = questions.filter(q => q.task.status === "concluida").length + 
    (currentIndex > questions.findIndex(q => q.task.status !== "concluida") ? 
      questions.slice(questions.findIndex(q => q.task.status !== "concluida"), currentIndex)
        .filter(q => q.task.status !== "concluida").length : 0);
  
  const totalCount = questions.length;
  const allDone = currentIndex >= totalCount;
  const progressPercent = Math.round((Math.min(currentIndex, totalCount) / totalCount) * 100);

  const currentQuestion = allDone ? null : questions[currentIndex];

  const handleSubmit = async () => {
    if (selectedOption === null || !currentQuestion) return;

    const selectedIndex = parseInt(selectedOption);
    const correct = selectedIndex === currentQuestion.correctOption;

    setIsCorrect(correct);
    setHasAnswered(true);

    if (correct) {
      fireConfetti();
      toast.success("Resposta correta! 🎉");

      try {
        const result = await grantXP.mutateAsync({ baseXP: currentQuestion.xpValue, reason: "quiz" });
        grantSeasonXP.mutate({ baseXP: currentQuestion.xpValue });
        setXpNotif({
          amount: result.xpGranted,
          multiplier: result.multiplier,
          leveledUp: result.leveledUp,
          newLevel: result.newLevel,
        });
        const completedCount = (await import("@/integrations/supabase/client")).supabase
          .from("tasks").select("id", { count: "exact" })
          .eq("assigned_to", currentQuestion.task.assigned_to).eq("status", "concluida");
        const count = (await completedCount).count || 0;
        checkAndUnlock.mutate({ tasksCompleted: count + 1, currentStreak, totalXp: result.newTotal });
      } catch {}

      updateTaskStatus.mutate({ taskId: currentQuestion.task.id, status: "concluida" });

      // Transition to next question after delay
      setTimeout(() => {
        setIsTransitioning(true);
        setTimeout(() => {
          setCurrentIndex(prev => prev + 1);
          setSelectedOption(null);
          setHasAnswered(false);
          setIsCorrect(false);
          setIsTransitioning(false);
        }, 300);
      }, 1200);
    } else {
      toast.error("Resposta incorreta. Tente novamente!");
    }
  };

  const handleRetry = () => {
    setSelectedOption(null);
    setHasAnswered(false);
    setIsCorrect(false);
  };

  if (allDone) {
    return (
      <Card className="overflow-hidden">
        <div className="h-1 w-full bg-success" />
        <CardContent className="p-6 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mb-3">
            <CheckCircle2 className="h-7 w-7 text-success" />
          </div>
          <h4 className="font-semibold text-sm">{groupLabel} — Completo!</h4>
          <p className="text-xs text-muted-foreground mt-1">
            Todas as {totalCount} questões foram respondidas! 🏆
          </p>
          <Progress value={100} className="mt-3 h-1.5" />
        </CardContent>
      </Card>
    );
  }

  if (!currentQuestion) return null;

  return (
    <Card className={cn(
      "transition-all duration-300 overflow-hidden",
      hasAnswered && isCorrect && "ring-2 ring-success/40",
      hasAnswered && !isCorrect && "ring-2 ring-destructive/40",
      isTransitioning && "opacity-0 scale-95"
    )}>
      {/* Accent bar */}
      <div className={cn(
        "h-1 w-full",
        hasAnswered && isCorrect ? "bg-success" : hasAnswered && !isCorrect ? "bg-destructive" : "bg-primary"
      )} />

      <CardHeader className="pb-3 pt-4">
        {/* Progress indicator */}
        <div className="flex items-center gap-3 mb-3">
          <Progress value={progressPercent} className="flex-1 h-2" />
          <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
            {currentIndex + 1} de {totalCount}
          </span>
        </div>

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
              <h4 className="font-semibold text-sm leading-tight">{currentQuestion.task.title}</h4>
              {currentQuestion.task.description && (
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{currentQuestion.task.description}</p>
              )}
            </div>
          </div>
          <Badge variant="secondary" className="text-xs font-medium flex items-center gap-1 flex-shrink-0">
            <Zap className="h-3 w-3 text-accent" />
            {currentQuestion.xpValue} XP
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pb-4">
        <RadioGroup
          value={selectedOption ?? undefined}
          onValueChange={setSelectedOption}
          className="space-y-2"
          disabled={hasAnswered && isCorrect}
        >
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedOption === String(index);
            const isCorrectOption = index === currentQuestion.correctOption;
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
                  id={`${currentQuestion.task.id}-option-${index}`}
                  className={cn(
                    "flex-shrink-0",
                    showResult && isCorrectOption && "border-success text-success",
                    showResult && isSelected && !isCorrectOption && "border-destructive text-destructive"
                  )}
                />
                <Label
                  htmlFor={`${currentQuestion.task.id}-option-${index}`}
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

        <div className="flex justify-between items-center mt-4">
          <div className="text-xs text-muted-foreground">
            {hasAnswered && isCorrect && (
              <span className="flex items-center gap-1.5 text-success font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Próxima questão em breve...
              </span>
            )}
          </div>
          <div className="flex gap-2">
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
          </div>
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
