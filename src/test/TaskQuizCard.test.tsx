import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/hooks/useTasks", () => ({
  useTasks: () => ({
    updateTaskStatus: { mutate: vi.fn(), isPending: false },
  }),
}));

vi.mock("@/hooks/useXP", () => ({
  useXP: () => ({
    grantXP: { mutateAsync: vi.fn().mockResolvedValue({ xpGranted: 10, multiplier: 1, leveledUp: false, newLevel: 2, newTotal: 50 }) },
    currentStreak: 5,
    totalXp: 40,
  }),
}));

vi.mock("@/hooks/useAchievements", () => ({
  useAchievements: () => ({
    checkAndUnlock: { mutate: vi.fn() },
  }),
}));

vi.mock("@/hooks/useSeasons", () => ({
  useSeasons: () => ({
    grantSeasonXP: { mutate: vi.fn() },
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => Promise.resolve({ count: 3 }),
        }),
      }),
    }),
  },
}));

vi.mock("@/lib/confetti", () => ({
  fireConfetti: vi.fn(),
}));

import { TaskQuizCard } from "@/components/tasks/TaskQuizCard";

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const quizTask = {
  id: "quiz-001",
  title: "Quiz: O que é Ippon?",
  description: "Identifique a pontuação máxima no Judô",
  assigned_to: "student-001",
  assigned_by: "sensei-001",
  due_date: null,
  status: "pendente" as const,
  priority: "normal" as const,
  category: "outra" as const,
  completed_at: null,
  created_at: "2026-02-01T10:00:00Z",
  updated_at: "2026-02-01T10:00:00Z",
  assignee_name: "Ana Santos",
  assigner_name: "Sensei Yamamoto",
};

const options = [
  "Uma penalidade grave",
  "A pontuação máxima que encerra a luta",
  "Uma imobilização de 10 segundos",
  "Um tipo de queda"
];

describe("JoinVictus - TaskQuizCard", () => {
  it("renderiza título do quiz", () => {
    render(<TaskQuizCard task={quizTask} options={options} correctOption={1} />, { wrapper: createWrapper() });
    expect(screen.getByText("Quiz: O que é Ippon?")).toBeInTheDocument();
  });

  it("renderiza todas as opções", () => {
    render(<TaskQuizCard task={quizTask} options={options} correctOption={1} />, { wrapper: createWrapper() });
    options.forEach(opt => {
      expect(screen.getByText(opt)).toBeInTheDocument();
    });
  });

  it("exibe badge de XP e Quiz", () => {
    render(<TaskQuizCard task={quizTask} options={options} correctOption={1} xpValue={20} />, { wrapper: createWrapper() });
    expect(screen.getByText("20 XP")).toBeInTheDocument();
    expect(screen.getByText("Quiz")).toBeInTheDocument();
  });

  it("botão 'Verificar Resposta' desabilitado sem seleção", () => {
    render(<TaskQuizCard task={quizTask} options={options} correctOption={1} />, { wrapper: createWrapper() });
    const button = screen.getByText("Verificar Resposta");
    expect(button.closest("button")).toBeDisabled();
  });

  it("não exibe link de vídeo (funcionalidade removida)", () => {
    const { container } = render(<TaskQuizCard task={quizTask} options={options} correctOption={1} />, { wrapper: createWrapper() });
    expect(container.querySelector("a[href*='youtube']")).toBeNull();
    expect(screen.queryByText("Assistir vídeo de apoio")).not.toBeInTheDocument();
  });
});
