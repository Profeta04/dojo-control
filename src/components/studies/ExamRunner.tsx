import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, CheckCircle2, XCircle, Trophy, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface ExamQuestion {
  question: string;
  options: string[];
  correct_option: number;
  correct?: number;
}

function getCorrect(q: ExamQuestion): number {
  return q.correct_option ?? q.correct ?? -1;
}

interface ExamRunnerProps {
  exam: {
    id: string;
    title: string;
    questions: ExamQuestion[];
    total_questions: number;
  };
  onFinish: () => void;
}

export function ExamRunner({ exam, onFinish }: ExamRunnerProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const rawQ = typeof exam.questions === 'string' ? JSON.parse(exam.questions) : exam.questions;
  const questions: ExamQuestion[] = Array.isArray(rawQ) ? rawQ : [];
  const total = questions.length;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(new Array(total).fill(null));
  const [showResult, setShowResult] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);

  const currentQ = questions[currentIndex];
  const progress = ((currentIndex + 1) / total) * 100;
  const answered = answers.filter(a => a !== null).length;

  const selectAnswer = (optionIndex: number) => {
    if (showResult) return;
    const newAnswers = [...answers];
    newAnswers[currentIndex] = optionIndex;
    setAnswers(newAnswers);
  };

  const submitExam = async () => {
    if (!profile) return;
    setSubmitting(true);
    const score = questions.reduce((acc, q, i) => acc + (answers[i] === getCorrect(q) ? 1 : 0), 0);

    try {
      await supabase.from("exam_attempts").insert({
        student_id: profile.user_id,
        exam_template_id: exam.id,
        score,
        total,
        answers: answers as any,
      });

      // Grant XP if score > 70%
      const percentage = (score / total) * 100;
      if (percentage >= 70) {
        await supabase.rpc("grant_xp", { _user_id: profile.user_id, _base_xp: 20 });
      }

      queryClient.invalidateQueries({ queryKey: ["exam-attempts"] });
      queryClient.invalidateQueries({ queryKey: ["student-xp"] });
      setShowResult(true);

      if (percentage >= 70) {
        toast({ title: "🎉 Parabéns!", description: `Você acertou ${score}/${total} e ganhou 20 XP!` });
      }
    } catch {
      toast({ title: "Erro", description: "Erro ao salvar resultado.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // Result screen
  if (showResult) {
    const score = questions.reduce((acc, q, i) => acc + (answers[i] === getCorrect(q) ? 1 : 0), 0);
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;
    const passed = pct >= 70;

    if (reviewMode) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setReviewMode(false)} className="flex-shrink-0">
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
            <h3 className="font-semibold text-sm leading-tight">Revisão — {exam.title}</h3>
          </div>
          {questions.map((q, i) => {
            const correct = answers[i] === getCorrect(q);
            return (
              <Card key={i} className={cn("border-l-4", correct ? "border-l-green-500" : "border-l-red-500")}>
                <CardContent className="pt-4">
                  <p className="text-sm font-medium mb-2">{i + 1}. {q.question}</p>
                  <div className="space-y-1">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className={cn(
                        "text-xs px-3 py-1.5 rounded",
                        oi === getCorrect(q) && "bg-green-500/10 text-green-700 font-medium",
                        oi === answers[i] && oi !== getCorrect(q) && "bg-red-500/10 text-red-700 line-through",
                      )}>
                        {oi === getCorrect(q) && <CheckCircle2 className="h-3 w-3 inline mr-1" />}
                        {oi === answers[i] && oi !== getCorrect(q) && <XCircle className="h-3 w-3 inline mr-1" />}
                        {opt}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      );
    }

    return (
      <Card className="text-center">
        <CardContent className="py-8 space-y-4">
          <div className={cn("mx-auto w-16 h-16 rounded-full flex items-center justify-center", passed ? "bg-green-500/10" : "bg-red-500/10")}>
            <Trophy className={cn("h-8 w-8", passed ? "text-green-500" : "text-red-500")} />
          </div>
          <div>
            <h2 className="text-xl font-bold">{pct}%</h2>
            <p className="text-muted-foreground text-sm">{score} de {total} acertos</p>
          </div>
          {passed ? (
            <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Aprovado! +20 XP</Badge>
          ) : (
            <Badge variant="outline" className="text-red-500 border-red-500/20">Tente novamente (mínimo 70%)</Badge>
          )}
          <div className="flex gap-2 justify-center pt-2">
            <Button variant="outline" size="sm" onClick={() => setReviewMode(true)}>
              Revisar Respostas
            </Button>
            <Button variant="outline" size="sm" onClick={onFinish}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onFinish}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Sair
        </Button>
        <span className="text-sm text-muted-foreground">{currentIndex + 1} / {total}</span>
      </div>

      <Progress value={progress} className="h-2" />

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base leading-snug">{currentQ?.question}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {currentQ?.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => selectAnswer(i)}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-lg border text-sm transition-all",
                    answers[currentIndex] === i
                      ? "border-primary bg-primary/10 font-medium"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  <span className="font-medium mr-2 text-muted-foreground">
                    {String.fromCharCode(65 + i)}.
                  </span>
                  {opt}
                </button>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
        </Button>

        {currentIndex < total - 1 ? (
          <Button
            size="sm"
            onClick={() => setCurrentIndex(i => Math.min(total - 1, i + 1))}
            disabled={answers[currentIndex] === null}
          >
            Próxima <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={submitExam}
            disabled={answered < total || submitting}
          >
            {submitting ? "Enviando..." : "Finalizar"}
          </Button>
        )}
      </div>
    </div>
  );
}
