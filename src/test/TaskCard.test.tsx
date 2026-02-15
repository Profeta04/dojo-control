import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/hooks/useXP", () => ({
  useXP: () => ({
    grantXP: { mutateAsync: vi.fn().mockResolvedValue({ xpGranted: 10, multiplier: 1, leveledUp: false, newLevel: 1, newTotal: 10 }) },
    currentStreak: 3,
    totalXp: 100,
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
          eq: () => Promise.resolve({ count: 5 }),
        }),
      }),
    }),
  },
}));

import { TaskCard } from "@/components/tasks/TaskCard";

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const basePendingTask = {
  id: "task-001",
  title: "Praticar De-ashi-barai",
  description: "Varredura no pé avançado do oponente",
  assigned_to: "student-001",
  assigned_by: "sensei-001",
  due_date: "2026-03-15",
  status: "pendente" as const,
  priority: "normal" as const,
  category: "tecnica" as const,
  completed_at: null,
  created_at: "2026-02-01T10:00:00Z",
  updated_at: "2026-02-01T10:00:00Z",
  assignee_name: "Carlos Silva",
  assigner_name: "Sensei Yamamoto",
};

const completedTask = {
  ...basePendingTask,
  id: "task-002",
  title: "Executar Mae Ukemi corretamente",
  status: "concluida" as const,
  completed_at: "2026-02-10T14:00:00Z",
};

describe("JoinVictus - TaskCard", () => {
  it("renderiza título e descrição da tarefa", () => {
    const { getByText } = render(<TaskCard task={basePendingTask} onStatusChange={vi.fn()} />, { wrapper: createWrapper() });
    expect(getByText("Praticar De-ashi-barai")).toBeInTheDocument();
    expect(getByText("Varredura no pé avançado do oponente")).toBeInTheDocument();
  });

  it("exibe badge de XP para tarefa pendente", () => {
    const { getByText } = render(<TaskCard task={basePendingTask} onStatusChange={vi.fn()} xpValue={15} />, { wrapper: createWrapper() });
    expect(getByText("15 XP")).toBeInTheDocument();
  });

  it("não exibe badge de XP para tarefa concluída", () => {
    const { queryByText } = render(<TaskCard task={completedTask} onStatusChange={vi.fn()} xpValue={15} />, { wrapper: createWrapper() });
    expect(queryByText("15 XP")).not.toBeInTheDocument();
  });

  it("exibe nome do responsável pela atribuição", () => {
    const { getByText } = render(<TaskCard task={basePendingTask} onStatusChange={vi.fn()} />, { wrapper: createWrapper() });
    expect(getByText("Por: Sensei Yamamoto")).toBeInTheDocument();
  });

  it("exibe nome do aluno quando showAssignee=true", () => {
    const { getByText } = render(<TaskCard task={basePendingTask} onStatusChange={vi.fn()} showAssignee />, { wrapper: createWrapper() });
    expect(getByText("Para: Carlos Silva")).toBeInTheDocument();
  });

  it("exibe badge de prioridade", () => {
    const { getByText } = render(<TaskCard task={basePendingTask} onStatusChange={vi.fn()} />, { wrapper: createWrapper() });
    expect(getByText("Normal")).toBeInTheDocument();
  });

  it("exibe badge de categoria 'Técnica'", () => {
    const { getByText } = render(<TaskCard task={basePendingTask} onStatusChange={vi.fn()} />, { wrapper: createWrapper() });
    expect(getByText("Técnica")).toBeInTheDocument();
  });

  it("aplica estilo de conclusão na tarefa concluída", () => {
    const { container } = render(<TaskCard task={completedTask} onStatusChange={vi.fn()} />, { wrapper: createWrapper() });
    const card = container.querySelector('[role="article"]');
    expect(card?.className).toContain("opacity-60");
  });

  it("não exibe vídeo (funcionalidade removida)", () => {
    const { container, queryByText } = render(<TaskCard task={basePendingTask} onStatusChange={vi.fn()} />, { wrapper: createWrapper() });
    expect(container.querySelector("a[href*='youtube']")).toBeNull();
    expect(queryByText("Assistir vídeo")).not.toBeInTheDocument();
  });

  it("exibe botão de excluir quando onDelete é fornecido", () => {
    const { getByLabelText } = render(<TaskCard task={basePendingTask} onStatusChange={vi.fn()} onDelete={vi.fn()} />, { wrapper: createWrapper() });
    expect(getByLabelText(`Excluir tarefa: ${basePendingTask.title}`)).toBeInTheDocument();
  });
});
